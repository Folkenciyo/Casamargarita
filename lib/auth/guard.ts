import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSession, type Session } from "./session";

/**
 * Segunda barrera, además del middleware: toda Server Action y toda página de
 * administración la llama. Si el middleware cambiara, esto sigue protegiendo.
 */
export async function requireAdmin(): Promise<Session> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) redirect("/admin/login");
  return session;
}
