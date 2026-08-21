import { TEXTURES, type Daisy, windAt } from "./daisy-field";

/**
 * Dibuja el campo de margaritas: un quad texturizado por flor en una escena
 * con cámara en perspectiva.
 *
 * WebGL a pelo, como la capa de óleo y por el mismo motivo: three.js entraría
 * en el bundle de todas las páginas públicas —seiscientos y pico kilobytes—
 * para colocar tres rectángulos. Las matrices caben en treinta líneas.
 */

const FOV = (48 * Math.PI) / 180;

/**
 * Cuánto baja la base de la flor por debajo del borde inferior, en fracción
 * del semialto visible. Por encima de 1 el tallo nace fuera de cuadro, que es
 * lo que hace pensar en un campo y no en tres pegatinas flotando.
 */
const BASE_DROP = 1.18;

/** Proporción de la textura: el lienzo es 512×1024. */
const TEXTURE_ASPECT = 0.5;

/**
 * Tinte y opacidad de la marca de agua. Las margaritas son blanco roto y el
 * fondo del sitio es lienzo crudo: sin oscurecerlas un poco hacia el gris de
 * la tinta suave, sobre `--color-canvas` no se distinguirían del papel.
 */
const TINT: readonly [number, number, number] = [0x6b / 255, 0x65 / 255, 0x5d / 255];
const TINT_MIX = 0.55;
const MAX_OPACITY = 0.19;

/** Tope del parallax en metros: el fondo acompaña al scroll, no se escapa. */
const PARALLAX_M = 0.85;
const PARALLAX_FALLOFF_PX = 900;

const vertexShader = `
attribute vec2 aCorner;
uniform mat4 uMatrix;
varying vec2 vUv;

void main() {
  // El quad va de -0,5 a 0,5 en horizontal y de 0 a 1 en vertical: el origen
  // local cae en la base, que es el punto por el que la flor se dobla.
  vUv = vec2(aCorner.x + 0.5, 1.0 - aCorner.y);
  gl_Position = uMatrix * vec4(aCorner, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uBlur;
uniform vec3 uTint;
uniform float uTintMix;

void main() {
  // El sesgo de mip hace el desenfoque de las lejanas sin costar un solo
  // muestreo extra: se lee de un nivel ya reducido en vez de emborronar a mano.
  vec4 tex = texture2D(uTexture, vUv, uBlur);
  // La textura sube premultiplicada, así que el tinte también se premultiplica
  // antes de mezclar; si no, los bordes suaves se ensucian.
  vec3 colour = mix(tex.rgb, uTint * tex.a, uTintMix);
  gl_FragColor = vec4(colour, tex.a) * uOpacity;
}
`;

export type DaisyRenderer = {
  /** `scroll` en píxeles; `time` en segundos. */
  draw: (field: Daisy[], time: number, scroll: number) => void;
  resize: () => void;
  dispose: () => void;
};

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader no compila: ${log}`);
  }
  return shader;
}

/**
 * Matriz de proyección · vista · modelo para una flor, en column-major.
 *
 * El modelo es escala → inclinación en Z → giro en Y → traslación, en ese
 * orden: al escalar primero y girar después alrededor del origen local, la
 * flor pivota sobre su base como si estuviera plantada. Con el orden inverso
 * giraría alrededor de su centro y parecería una hélice.
 */
function daisyMatrix(
  proj: Float32Array,
  cameraY: number,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  tilt: number,
  turn: number,
): Float32Array {
  const cz = Math.cos(tilt);
  const sz = Math.sin(tilt);
  const cy = Math.cos(turn);
  const sy = Math.sin(turn);

  // Columnas del modelo ya combinadas: Ry · Rz · S.
  const m00 = cy * cz * width;
  const m01 = sz * width;
  const m02 = -sy * cz * width;

  const m10 = -cy * sz * height;
  const m11 = cz * height;
  const m12 = sy * sz * height;

  const tx = x;
  const ty = y - cameraY;
  const tz = z;

  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    const c0 = proj[column]!;
    const c1 = proj[4 + column]!;
    const c2 = proj[8 + column]!;
    const c3 = proj[12 + column]!;

    out[column] = c0 * m00 + c1 * m01 + c2 * m02;
    out[4 + column] = c0 * m10 + c1 * m11 + c2 * m12;
    out[8 + column] = c2;
    out[12 + column] = c0 * tx + c1 * ty + c2 * tz + c3;
  }
  return out;
}

function perspective(aspect: number): Float32Array {
  const f = 1 / Math.tan(FOV / 2);
  const near = 0.1;
  const far = 60;
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function createDaisyRenderer(
  canvas: HTMLCanvasElement,
): DaisyRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    // El fondo se repinta entero en cada fotograma; conservar el anterior solo
    // gasta memoria de vídeo.
    preserveDrawingBuffer: false,
  }) as WebGLRenderingContext | null;
  if (!gl) return null;

  const program = gl.createProgram();
  if (!program) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, vertexShader);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Programa no enlaza: ${gl.getProgramInfoLog(program)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    // Dos triángulos: base izquierda, base derecha, punta izquierda, punta
    // derecha, en tira.
    new Float32Array([-0.5, 0, 0.5, 0, -0.5, 1, 0.5, 1]),
    gl.STATIC_DRAW,
  );
  const corner = gl.getAttribLocation(program, "aCorner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    matrix: gl.getUniformLocation(program, "uMatrix"),
    texture: gl.getUniformLocation(program, "uTexture"),
    opacity: gl.getUniformLocation(program, "uOpacity"),
    blur: gl.getUniformLocation(program, "uBlur"),
    tint: gl.getUniformLocation(program, "uTint"),
    tintMix: gl.getUniformLocation(program, "uTintMix"),
  };

  gl.uniform1i(uniforms.texture, 0);
  gl.uniform3fv(uniforms.tint, TINT);
  gl.uniform1f(uniforms.tintMix, TINT_MIX);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  // Una textura por imagen, cargada en cuanto llega. Mientras no esté, esa
  // flor sencillamente no se dibuja: nada de placeholders parpadeando.
  const ready = TEXTURES.map(() => false);
  const textures = TEXTURES.map((url, index) => {
    const texture = gl.createTexture();
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      // Los lados son potencia de dos (512×1024), así que WebGL 1 admite
      // mipmaps: hacen falta para el desenfoque de las lejanas y para que no
      // hiervan los pétalos al reducirse.
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      ready[index] = true;
    };
    image.src = url;
    return { texture, image };
  });

  function resize() {
    // DPR a 1,5: es un fondo desenfocado, nadie va a contarle los píxeles, y
    // cada punto de más son píxeles que sombrear en cada fotograma.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl!.viewport(0, 0, width, height);
  }

  resize();

  return {
    resize,
    draw(field, time, scroll) {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const proj = perspective(aspect);
      // Saturante y no lineal: en una página larga el campo se iría de cuadro
      // a la mitad del scroll. Así se desplaza al principio y luego se asienta.
      const cameraY = PARALLAX_M * (1 - Math.exp(-scroll / PARALLAX_FALLOFF_PX));

      // De la más lejana a la más cercana: sin buffer de profundidad, el orden
      // de dibujo es el único que decide qué tapa a qué.
      const ordered = [...field].sort((a, b) => a.z - b.z);

      for (const daisy of ordered) {
        if (daisy.opacity <= 0.001) continue;
        const slot = textures[daisy.texture];
        if (!slot || !ready[daisy.texture]) continue;

        const halfV = Math.tan(FOV / 2) * -daisy.z;
        const halfH = halfV * aspect;
        const height = halfV * 2 * daisy.height;
        const width = height * TEXTURE_ASPECT;

        const wind = windAt(time + daisy.phase, daisy.x * 4);
        // El giro respira con el viento: la flor se ofrece y se retira de la
        // luz en vez de quedarse clavada de frente.
        const turn = daisy.turn + wind * 1.6;

        const matrix = daisyMatrix(
          proj,
          cameraY,
          // La flexión acompaña a la inclinación: la cabeza se va con el aire.
          daisy.x * halfH + wind * height * 0.18,
          -halfV * BASE_DROP,
          daisy.z,
          width,
          height,
          wind,
          turn,
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, slot.texture);
        gl.uniformMatrix4fv(uniforms.matrix, false, matrix);
        gl.uniform1f(uniforms.opacity, daisy.opacity * MAX_OPACITY);
        // La profundidad de campo es lo que separa los planos cuando todos son
        // la misma estampa plana. Viene resuelto del campo: cada carril decide
        // cuánta bruma le toca.
        gl.uniform1f(uniforms.blur, daisy.blur);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    },
    dispose() {
      for (const slot of textures) {
        slot.image.onload = null;
        slot.image.src = "";
        gl.deleteTexture(slot.texture);
      }
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
