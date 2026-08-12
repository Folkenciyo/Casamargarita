import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { forbiddenIfCrossOrigin } from "@/lib/http/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const crossOrigin = forbiddenIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
