import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { scriptNonce } from "@/lib/http/nonce";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// next/font descarga y autoaloja las fuentes en el build: cero peticiones a
// Google en producción y sin salto de texto al cargar.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display-loaded",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // La og:image la aporta app/opengraph-image.tsx; aquí solo el marco.
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  alternates: { canonical: "/" },
  // El panel es privado; el resto se indexa con normalidad.
  robots: { index: true, follow: true },
  // La margarita, en los tamaños que pide cada sitio: 16 y 32 para la pestaña,
  // 48 para el acceso directo de escritorio y 180 para la pantalla de inicio
  // de iOS. Los de 192 y 512 los declara el manifiesto.
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: { url: "/favicon-180x180.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f0e8",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El idioma del documento sale de la ruta, que el middleware deja en una
  // cabecera. Sin esto, las páginas en inglés se anunciarían como españolas a
  // los lectores de pantalla y a los buscadores.
  const [pathname, nonce] = await Promise.all([
    headers().then((h) => h.get("x-pathname") ?? "/"),
    scriptNonce(),
  ]);
  const lang = pathname.startsWith("/en") ? "en" : "es";

  return (
    <html lang={lang} className={`${display.variable} ${sans.variable}`}>
      <head>
        {/* Pone el tema guardado antes de pintar nada: sin esto, quien
            eligió oscuro vería un parpadeo claro en cada carga. No toca la
            sala 3D directamente —Room3D lee `data-theme` al montarse—. */}
        {/* suppressHydrationWarning: el navegador borra el nonce real del
            DOM en cuanto lo usa (para que no se pueda leer y reutilizar) —
            React ve un valor distinto al que puso el servidor y avisa de un
            desajuste que no es tal. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("theme")==="dark"){document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark"}}catch(e){}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
