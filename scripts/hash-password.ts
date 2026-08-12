import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashPassword } from "../lib/auth/password.ts";

// Uso: docker compose exec web pnpm hash-password
// Imprime el valor para ADMIN_PASSWORD_HASH. La contraseña no se guarda
// en ningún fichero ni queda en el historial del shell.
const rl = createInterface({ input: stdin, output: stdout });

const password = await rl.question("Contraseña (mínimo 12 caracteres): ");
const repeat = await rl.question("Repite la contraseña: ");
rl.close();

if (password !== repeat) {
  console.error("Las contraseñas no coinciden.");
  process.exit(1);
}

console.log("\nADMIN_PASSWORD_HASH=" + (await hashPassword(password)));
