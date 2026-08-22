/**
 * Los topes de una subida, en un módulo sin dependencias.
 *
 * Aparte de `pipeline.ts` a propósito: esto lo importa `next.config.ts`, que se
 * carga antes de que exista nada del servidor, y el pipeline arrastra sharp y
 * `node:fs`. También lo importan componentes de cliente para avisar antes de
 * enviar un fichero imposible.
 */

/** Lo más grande que acepta el pipeline. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Lado máximo en píxeles; por encima, sharp se comería la memoria. */
export const MAX_DIMENSION = 12000;

/**
 * Techo del cuerpo de una Server Action.
 *
 * Next lo deja en 1 MB si nadie dice otra cosa, y ese silencio costó caro: el
 * panel rechazaba con un 413 cualquier foto de cámara —el pipeline, que dice
 * admitir 25 MB, ni siquiera llegaba a ejecutarse— y quien subía solo veía un
 * «no se pudo subir».
 *
 * El megabyte de más no es un descuido: el cuerpo va como multipart y lleva
 * cabeceras, separadores y los demás campos del formulario. Sin ese margen, un
 * fichero de justo 25 MB se caería con el 413 críptico de Next en vez de con el
 * mensaje del pipeline, que sí explica qué pasa.
 */
export const UPLOAD_BODY_LIMIT_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024;

/** Para los mensajes: «máximo 25 MB». */
export const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);

/**
 * Qué decirle a quien elige una foto imposible, o `null` si cabe.
 *
 * Se avisa en el navegador antes de enviar nada: subir cuarenta megas por una
 * línea doméstica lleva su rato, y terminar ese rato con un error es la peor
 * manera de enterarse.
 */
export function tooLargeMessage(bytes: number): string | null {
  if (bytes <= MAX_UPLOAD_BYTES) return null;
  const mb = (bytes / 1024 / 1024).toFixed(1).replace(".", ",");
  return `Esta foto pesa ${mb} MB y el máximo son ${MAX_UPLOAD_MB} MB. Redúcela y vuelve a intentarlo.`;
}
