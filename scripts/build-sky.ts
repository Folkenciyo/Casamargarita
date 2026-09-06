/**
 * Parte cada cielo HDR de la sala 3D en las dos cosas para las que se usaba,
 * que no necesitan lo mismo:
 *
 *  - `<nombre>-sky.webp` — el cielo que se ve por encima de las paredes.
 *    Necesita resolución, pero no rango dinámico: es una imagen. Va en webp
 *    a 1024×512, unos 90 kB.
 *  - `<nombre>-env.bin` — la luz de entorno. Necesita el rango dinámico
 *    entero (el sol vale mucho más que 1, y de ahí sale el brillo de los
 *    materiales), pero no resolución: el `PMREMGenerator` la difumina de
 *    todas formas. Van los mismos valores del EXR, reducidos a 256×128 y en
 *    coma flotante de media precisión.
 *
 * Juntos pesan la tercera parte que el `.exr` del que salen —el de noche,
 * la quinta— y además se acabó descomprimir PIZ en el hilo principal, que
 * costaba entre 160 y 190 ms con la sala parada esperando.
 *
 * El webp se guarda **sin** curva de exposición: solo lineal a sRGB, con los
 * valores por encima de 1 recortados. El tono se lo sigue dando el
 * `ACESFilmicToneMapping` del renderer, igual que antes; si se aplicara aquí
 * también, el cielo saldría con la exposición puesta dos veces.
 *
 * Se ejecuta a mano cuando cambien los cielos originales:
 *   docker compose exec web pnpm build:sky
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DataUtils } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

const ROOM_DIR = path.join(process.cwd(), "public", "Sala");

/** Ancho del cielo visible. Es el del original: lo que se ve, se ve. */
const SKY_WIDTH = 1024;

/**
 * El webp guarda el cielo **ya revelado**: pasado por el mismo ACES que usa el
 * renderer, pero con su propia exposición.
 *
 * Que sea propia es el asunto. El `toneMappingExposure` del renderer vale 0,5
 * y está puesto para que el HDRI no queme de blanco la pared clara de la sala;
 * revelar el cielo con ese mismo número lo dejaba en azul marino, de noche
 * cerrada a mediodía. Antes no se notaba porque cielo e iluminación salían del
 * mismo sitio y no había forma de separarlos. Ahora la luz va por el `.bin`, y
 * el cielo puede revelarse a su gusto sin tocar ni un material de la sala.
 *
 * Los números salen de comparar el mismo cielo a varias exposiciones:
 *  - de día, con 0,5 es azul marino y con 3 se lava hasta perder el azul del
 *    cenit; en 2 se lee como un día claro con las nubes bien dibujadas.
 *  - de noche va al revés: subir de 1 convierte el negro en un gris lechoso y
 *    se acaba la noche. En 0,9 el cielo sigue cerrado y la aurora se ve.
 *
 * Antes de esto se probó guardar los valores crudos y recortar lo que pasara
 * de 1. Parecía inofensivo —de día eso es el 0,3 % de los píxeles— pero son
 * justo los que tienen la luz: el sol vale 57.000 y su halo va de 1 a 5. Sin
 * ellos no había ni sol ni relieve en las nubes.
 *
 * El cielo se pinta con `toneMapped: false` (ver `Room3D.tsx`): si el renderer
 * volviera a aplicarle su curva, llevaría la exposición puesta dos veces.
 */
const SKY_EXPOSURE: Record<string, number> = { day: 2, night: 0.9 };
const EXPOSICION_POR_DEFECTO = 1.2;

/**
 * Cuánto se adelgazan las estrellas del cielo nocturno. Elevar el brillo a una
 * potencia mayor que 1 hunde el halo de cada estrella mucho más que su núcleo,
 * así que quedan más finas y se leen como más lejanas, que es como se ven de
 * verdad. Antes esto no hacía falta porque el fondo era el cubo de reflejos y
 * salía desenfocado; con la imagen nítida, las estrellas se veían encima.
 */
const STAR_GAMMA = 1.7;
/** Ancho de la luz de entorno. `PMREMGenerator` monta su cubo con un lado de
 * un cuarto del ancho que le den, así que 256 deja caras de 64 px: de sobra
 * para una sala de paredes rugosas y cuadros mate, donde no hay un solo
 * material que refleje nítido. */
const ENV_WIDTH = 256;

function halfAFloat(h: number): number {
  const signo = (h & 0x8000) >> 15;
  const exponente = (h & 0x7c00) >> 10;
  const fraccion = h & 0x03ff;
  if (exponente === 0) return (signo ? -1 : 1) * Math.pow(2, -14) * (fraccion / 1024);
  if (exponente === 31) return fraccion ? Number.NaN : (signo ? -1 : 1) * Infinity;
  return (signo ? -1 : 1) * Math.pow(2, exponente - 15) * (1 + fraccion / 1024);
}

/** Lineal a sRGB, la misma curva que usa el navegador para interpretar el webp. */
function aSRGB(v: number): number {
  const c = Math.min(Math.max(v, 0), 1);
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

/** El tramo curvo del ACES, tal cual está en el shader de three. */
function ajusteACES(v: number): number {
  return (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
}

/**
 * `ACESFilmicToneMapping` con la exposición del renderer, copiado de
 * `tonemapping_pars_fragment.glsl`: entra brillo sin techo y sale un color
 * mostrable. Es lo que convierte un sol de 57.000 en un disco blanco con su
 * halo alrededor, en vez de en un recorte plano.
 */
function revelar(
  r: number,
  g: number,
  b: number,
  exposicion: number,
): [number, number, number] {
  const er = r * exposicion;
  const eg = g * exposicion;
  const eb = b * exposicion;
  // A espacio ACES (las columnas de `ACESInputMat`).
  const x = ajusteACES(0.59719 * er + 0.35458 * eg + 0.04823 * eb);
  const y = ajusteACES(0.076 * er + 0.90834 * eg + 0.01566 * eb);
  const z = ajusteACES(0.0284 * er + 0.13383 * eg + 0.83777 * eb);
  // Y de vuelta (`ACESOutputMat`).
  return [
    1.60475 * x - 0.53108 * y - 0.07367 * z,
    -0.10208 * x + 1.10813 * y - 0.00605 * z,
    -0.00327 * x - 0.07276 * y + 1.07602 * z,
  ];
}

/** Lee el EXR y devuelve sus valores ya en coma flotante, canal a canal. */
function leerEXR(buffer: Buffer): { width: number; height: number; pixels: Float32Array } {
  const copia = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const textura = new EXRLoader().parse(copia as ArrayBuffer);
  const datos = textura.data as unknown as Uint16Array;
  const pixels = new Float32Array(datos.length);
  for (let i = 0; i < datos.length; i++) pixels[i] = halfAFloat(datos[i]!);
  return { width: textura.width, height: textura.height, pixels };
}

/**
 * Reduce promediando bloques enteros, y **en lineal**: es donde la media de
 * dos brillos significa lo que parece. Promediar después de la curva de sRGB
 * apagaría el sol, que es justo el valor que da carácter a la iluminación.
 */
function reducir(
  pixels: Float32Array,
  width: number,
  height: number,
  destino: number,
): { width: number; height: number; pixels: Float32Array } {
  const alto = Math.max(1, Math.round((destino * height) / width));
  const bloqueX = width / destino;
  const bloqueY = height / alto;
  const salida = new Float32Array(destino * alto * 4);

  for (let y = 0; y < alto; y++) {
    const desdeY = Math.floor(y * bloqueY);
    const hastaY = Math.max(desdeY + 1, Math.floor((y + 1) * bloqueY));
    for (let x = 0; x < destino; x++) {
      const desdeX = Math.floor(x * bloqueX);
      const hastaX = Math.max(desdeX + 1, Math.floor((x + 1) * bloqueX));
      const suma = [0, 0, 0, 0];
      let cuenta = 0;
      for (let sy = desdeY; sy < hastaY; sy++) {
        for (let sx = desdeX; sx < hastaX; sx++) {
          const i = (sy * width + sx) * 4;
          for (let c = 0; c < 4; c++) suma[c]! += pixels[i + c]!;
          cuenta++;
        }
      }
      const destinoIndice = (y * destino + x) * 4;
      for (let c = 0; c < 4; c++) salida[destinoIndice + c] = suma[c]! / cuenta;
    }
  }
  return { width: destino, height: alto, pixels: salida };
}

/**
 * Estrecha el halo de cada estrella sin apagar el cielo: eleva el brillo a
 * `STAR_GAMMA` —lo que hunde los valores medios mucho más que los picos— y
 * después devuelve el conjunto a su brillo medio de antes. Sin esa segunda
 * parte la noche se quedaría casi negra en vez de solo más contrastada.
 */
function adelgazarEstrellas(pixels: Float32Array): Float32Array {
  let sumaAntes = 0;
  let sumaDespues = 0;
  const salida = new Float32Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = Math.max(pixels[i + c]!, 0);
      const curvo = Math.pow(v, STAR_GAMMA);
      salida[i + c] = curvo;
      sumaAntes += v;
      sumaDespues += curvo;
    }
    salida[i + 3] = pixels[i + 3]!;
  }
  const compensa = sumaDespues > 0 ? sumaAntes / sumaDespues : 1;
  for (let i = 0; i < salida.length; i += 4) {
    for (let c = 0; c < 3; c++) salida[i + c]! *= compensa;
  }
  return salida;
}

async function construirCielo(nombre: string, buffer: Buffer): Promise<void> {
  const { width, height, pixels } = leerEXR(buffer);

  // --- El cielo visible -----------------------------------------------------
  // Solo el de noche tiene estrellas que adelgazar; el de día, ni una.
  const visible = nombre === "night" ? adelgazarEstrellas(pixels) : pixels;
  const exposicion = SKY_EXPOSURE[nombre] ?? EXPOSICION_POR_DEFECTO;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const color = revelar(
      visible[i * 4]!,
      visible[i * 4 + 1]!,
      visible[i * 4 + 2]!,
      exposicion,
    );
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = aSRGB(color[c]!);
  }
  const destinoSky = path.join(ROOM_DIR, `${nombre}-sky.webp`);
  const escrito = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .resize(SKY_WIDTH, Math.round((SKY_WIDTH * height) / width))
    .webp({ quality: 88, effort: 6 })
    .toFile(destinoSky);

  // --- La luz de entorno ----------------------------------------------------
  const chico = reducir(pixels, width, height, ENV_WIDTH);
  // Ocho bytes de cabecera con las medidas: quien lo lee no tiene que saberse
  // de memoria a qué resolución se generó.
  const bin = Buffer.alloc(8 + chico.pixels.length * 2);
  bin.writeUInt32LE(chico.width, 0);
  bin.writeUInt32LE(chico.height, 4);
  for (let i = 0; i < chico.pixels.length; i++) {
    bin.writeUInt16LE(DataUtils.toHalfFloat(chico.pixels[i]!), 8 + i * 2);
  }
  const destinoEnv = path.join(ROOM_DIR, `${nombre}-env.bin`);
  await writeFile(destinoEnv, bin);

  console.log(
    `${nombre}-1k.exr (${Math.round(buffer.length / 1024)} kB) → ` +
      `${nombre}-sky.webp (${Math.round(escrito.size / 1024)} kB) + ` +
      `${nombre}-env.bin (${Math.round(bin.length / 1024)} kB)`,
  );
}

async function main(): Promise<void> {
  const ficheros = (await readdir(ROOM_DIR)).filter((f) => f.endsWith("-sky-1k.exr"));
  if (ficheros.length === 0) {
    console.error("No hay ningún *-sky-1k.exr en public/Sala");
    process.exitCode = 1;
    return;
  }
  const { readFile } = await import("node:fs/promises");
  for (const fichero of ficheros) {
    const nombre = fichero.replace("-sky-1k.exr", "");
    await construirCielo(nombre, await readFile(path.join(ROOM_DIR, fichero)));
  }
}

await main();
