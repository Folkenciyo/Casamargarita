import { imageUrl, srcSet } from "@/lib/images/urls";

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
  const fallbackWidth = widths.at(-1) ?? widths[0] ?? 400;

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={srcSet(basePath, widths, "avif")}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={srcSet(basePath, widths, "webp")}
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
