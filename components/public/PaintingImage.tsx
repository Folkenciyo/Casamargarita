import { imageUrl, responsiveWidths, srcSet } from "@/lib/images/urls";

type Props = {
  basePath: string;
  widths: number[];
  alt: string;
  /** Atributo sizes: cuánto ocupa la imagen en cada breakpoint. */
  sizes: string;
  width: number;
  height: number;
  blurDataUrl: string;
  priority?: boolean;
  className?: string;
};

/**
 * `<picture>` propio en lugar de next/image: las variantes ya están generadas
 * en disco al subir la obra, no hace falta el optimizador en cada request.
 * El placeholder borroso va de fondo y desaparece al pintarse la imagen.
 */
export function PaintingImage({
  basePath,
  widths,
  alt,
  sizes,
  width,
  height,
  blurDataUrl,
  priority = false,
  className = "",
}: Props) {
  // El ancho de zoom queda fuera del srcset: pesa demasiado para que un
  // navegador lo elija solo por tener la pantalla grande. Se pide aparte,
  // desde el visor de detalle, y únicamente si alguien lo abre.
  const navegables = responsiveWidths(widths);
  const anchos = navegables.length > 0 ? navegables : widths;
  const fallbackWidth = anchos.at(-1) ?? 400;

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={srcSet(basePath, anchos, "avif")}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={srcSet(basePath, anchos, "webp")}
        sizes={sizes}
      />
      <img
        src={imageUrl(basePath, fallbackWidth, "webp")}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={className}
        style={{
          // El placeholder solo se ve mientras la imagen carga; en cuanto
          // pinta, la tapa. Sin `no-repeat` asomaría por los lados en las
          // obras que no llenan la caja.
          backgroundImage: `url(${blurDataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </picture>
  );
}
