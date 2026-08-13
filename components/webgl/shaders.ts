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
 *  - uMode 0 (intro): la pintura cubre la pantalla y se retira desde el centro.
 *  - uMode 1 (brochazo): la mano mancha el lienzo y luego lo despeja.
 *
 * `uReveal` decide el sentido: 0 mancha, 1 retira. **No es simétrico en el
 * tiempo**: quien lo llama pasa el progreso siempre de 0 a 1 y es este uniforme
 * el que invierte el resultado.
 *
 * El brochazo no es un barrido único. Son tres pasadas con ángulos y tiempos
 * ligeramente distintos, como quien vuelve sobre lo ya pintado: con una sola,
 * el frente avanza tan limpio que se lee como una cortina de color.
 */
export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uProgress;   // 0..1
  uniform float uMode;       // 0 = intro, 1 = brochazo
  uniform float uAngle;      // inclinación del barrido
  uniform float uAspect;
  uniform vec3  uPaint;      // óleo, luz
  uniform vec3  uPaintDeep;  // óleo, sombra
  uniform float uReveal;     // 0 = mancha, 1 = retira
  uniform float uTime;       // segundos; solo para que la materia respire

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

  // Tres octavas y no cuatro: son tres trazos por fotograma y la cuarta no se
  // aprecia a esta escala, pero se paga en cada píxel de la pantalla.
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  /**
   * Cuánta pintura deja una pasada de brocha en este punto, de 0 a 1.
   * El borde no es una línea: lo desplaza un ruido muy estirado en la
   * dirección del gesto, que es lo que dibuja las cerdas y el arrastre.
   */
  float pasada(vec2 c, float ang, float prog, float ancho, float semilla) {
    float co = cos(ang);
    float si = sin(ang);
    vec2 along = vec2(dot(c, vec2(co, si)), dot(c, vec2(-si, co)));

    float cerdas = fbm(vec2(along.x * 2.2 + semilla * 4.0, along.y * 36.0));
    float cuerpo = fbm(along * 3.1 + semilla * 9.0);
    float campo = (along.x * 0.5 + 0.5) + cerdas * 0.17 + cuerpo * 0.13;

    // Se pasa de largo por los dos extremos para que no queden ni claros al
    // cubrir ni restos de pintura al retirar.
    float borde = mix(-0.45, 1.52, prog);
    return 1.0 - smoothstep(borde - ancho, borde + ancho, campo);
  }

  void main() {
    vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
    float cobertura;

    if (uMode < 0.5) {
      // Intro: la materia se retira desde el centro hacia fuera.
      float cerdas = fbm(vec2(c.x * 2.0, c.y * 34.0));
      float cuerpo = fbm(c * 3.4 + 11.0);
      float campo = length(c) * 0.85 + cuerpo * 0.45 + cerdas * 0.10;
      float borde = mix(-0.35, 1.45, uProgress);
      cobertura = 1.0 - smoothstep(borde - 0.16, borde + 0.16, campo);
    } else {
      // Tres pasadas escalonadas. La primera abre camino y va por delante; las
      // otras entran después y más rápido, y rellenan lo que dejó la anterior.
      //
      // Los factores están medidos para que la última cierre cerca del final
      // del tiempo, no a media fase: con valores más altos el lienzo quedaba
      // cubierto al 60 % del recorrido y el resto era una pausa sin gesto.
      float p1 = clamp(uProgress * 1.22, 0.0, 1.0);
      float p2 = clamp((uProgress - 0.09) * 1.30, 0.0, 1.0);
      float p3 = clamp((uProgress - 0.18) * 1.40, 0.0, 1.0);

      float t1 = pasada(c, uAngle,        p1, 0.15, 1.0);
      float t2 = pasada(c, uAngle + 0.17, p2, 0.12, 5.0);
      float t3 = pasada(c, uAngle - 0.14, p3, 0.10, 9.0);

      cobertura = max(t1, max(t2, t3));
    }

    // uReveal invierte el sentido: con 0 la pintura entra, con 1 se va.
    float alpha = mix(cobertura, 1.0 - cobertura, uReveal);
    if (alpha < 0.003) discard;

    // Veta: el óleo no es un color, es una mezcla mal removida. Se mueve muy
    // despacio para que la pantalla cubierta no parezca una imagen congelada.
    float veta = fbm(c * 4.2 + vec2(uTime * 0.05, uTime * 0.03));
    vec3 color = mix(uPaintDeep, uPaint, 0.30 + 0.70 * veta);

    // Impasto: la carga se acumula en el frente del trazo, justo donde la
    // cobertura está a medias. Es lo que da el relieve que faltaba.
    float frente = cobertura * (1.0 - cobertura) * 4.0;
    color += frente * frente * 0.18;

    // Grano de lienzo, al límite de lo perceptible: sin él el plano grande de
    // color se ve digital.
    float grano = noise(vUv * vec2(uAspect, 1.0) * 480.0);
    color += (grano - 0.5) * 0.045;

    gl_FragColor = vec4(color, alpha);
  }
`;
