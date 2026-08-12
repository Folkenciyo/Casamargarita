// GLSL ES 1.00: funciona en WebGL 1 y 2, sin depender de ninguna librería.
export const vertexShader = /* glsl */ `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

/**
 * Una sola pasada para los dos efectos:
 *  - uMode 0 (intro): la pintura cubre la pantalla y se retira desde el centro,
 *    como óleo extendido con espátula.
 *  - uMode 1 (brochazo): banda diagonal con borde fibroso que tapa o descubre.
 *
 * El borde no es una línea: se desplaza con fbm alargado en la dirección del
 * barrido, que es lo que produce las cerdas y el arrastre de materia.
 */
export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uProgress;   // 0..1
  uniform float uMode;       // 0 = intro, 1 = brochazo
  uniform float uAngle;      // inclinación del barrido
  uniform float uAspect;
  uniform vec3  uPaint;      // color del óleo
  uniform float uReveal;     // 1 = descubre, 0 = cubre

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 centered = (vUv - 0.5) * vec2(uAspect, 1.0);

    // Cerdas: ruido muy estirado en la dirección del barrido.
    float c = cos(uAngle);
    float s = sin(uAngle);
    vec2 along = vec2(dot(centered, vec2(c, s)), dot(centered, vec2(-s, c)));
    float bristles = fbm(vec2(along.x * 2.0, along.y * 34.0));
    float body = fbm(along * 3.4 + 11.0);

    float field;
    if (uMode < 0.5) {
      // Intro: la materia se retira desde el centro hacia fuera.
      field = length(centered) * 0.85 + body * 0.45 + bristles * 0.10;
    } else {
      // Brochazo: barrido lineal de un borde al opuesto.
      field = (along.x * 0.5 + 0.5) + bristles * 0.16 + body * 0.14;
    }

    // Umbral que avanza con el progreso, con margen para que no queden
    // restos de pintura al terminar.
    float edge = mix(-0.35, 1.45, uProgress);
    float width = 0.16;
    float covered = 1.0 - smoothstep(edge - width, edge + width, field);
    float alpha = mix(1.0 - covered, covered, uReveal);

    if (alpha < 0.002) discard;

    // Impasto: el borde brilla un poco donde la carga de pintura es mayor.
    float relief = smoothstep(0.0, 0.35, abs(field - edge));
    vec3 color = uPaint + (1.0 - relief) * 0.16 * (0.5 + bristles);

    gl_FragColor = vec4(color, alpha);
  }
`;
