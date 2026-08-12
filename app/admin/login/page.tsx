import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Solo rutas internas: nunca redirigir a un dominio externo.
  const target = next?.startsWith("/admin") ? next : "/admin";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 display text-2xl">
        Acceso
      </h1>
      <LoginForm next={target} />
    </main>
  );
}
