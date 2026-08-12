import { fragmentShader, vertexShader } from "./shaders";

/**
 * Renderer mínimo para la capa de óleo: un triángulo a pantalla completa con
 * un fragment shader. Sin three.js ni react-three-fiber — para un quad no
 * aportan nada y sí un montón de máquinas de medir contenedores.
 */
export type OilUniforms = {
  progress: number;
  /** 0 = intro (radial), 1 = brochazo (barrido) */
  mode: 0 | 1;
  angle: number;
  /** 1 = descubre, 0 = cubre */
  reveal: 0 | 1;
};

const PAINT: [number, number, number] = [0x8c / 255, 0x3f / 255, 0x24 / 255];

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

export type OilRenderer = {
  draw: (uniforms: OilUniforms) => void;
  resize: () => void;
  dispose: () => void;
};

export function createOilRenderer(canvas: HTMLCanvasElement): OilRenderer | null {
  const gl =
    (canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
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

  // Un solo triángulo que cubre el viewport: menos vértices que un quad y
  // evita la costura de la diagonal.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    progress: gl.getUniformLocation(program, "uProgress"),
    mode: gl.getUniformLocation(program, "uMode"),
    angle: gl.getUniformLocation(program, "uAngle"),
    aspect: gl.getUniformLocation(program, "uAspect"),
    paint: gl.getUniformLocation(program, "uPaint"),
    reveal: gl.getUniformLocation(program, "uReveal"),
  };

  gl.uniform3fv(uniforms.paint, PAINT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  function resize() {
    // DPR limitado a 2: por encima no se aprecia y cuesta el doble de píxeles.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    draw(values) {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.progress, values.progress);
      gl.uniform1f(uniforms.mode, values.mode);
      gl.uniform1f(uniforms.angle, values.angle);
      gl.uniform1f(uniforms.reveal, values.reveal);
      gl.uniform1f(
        uniforms.aspect,
        canvas.width / Math.max(canvas.height, 1),
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
