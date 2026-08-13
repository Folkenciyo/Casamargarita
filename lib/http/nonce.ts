import { headers } from "next/headers";
import { NONCE_HEADER } from "./security-headers";

/**
 * El nonce que puso el middleware en esta petición, para los `<script>` que
 * escribimos a mano (los bloques de datos estructurados).
 *
 * Devuelve `undefined` si no hay ninguno — en un test aislado, por ejemplo.
 * Es lo correcto: sin nonce el atributo no se escribe, y si algún día
 * llegara una petición sin pasar por el middleware, el navegador bloquea el
 * script en vez de aceptarlo con una firma inventada.
 */
export async function scriptNonce(): Promise<string | undefined> {
  return (await headers()).get(NONCE_HEADER) ?? undefined;
}
