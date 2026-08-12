import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
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

const publicUrl = process.env.PUBLIC_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(publicUrl),
  title: {
    default: "Galería de óleos",
    template: "%s · Galería de óleos",
  },
  description:
    "Obra original al óleo: catálogo con medidas, técnica y disponibilidad.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
