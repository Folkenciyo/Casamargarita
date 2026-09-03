import {
  Circle,
  Document,
  Image,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDimensions } from "@/lib/catalog";

/**
 * El mismo certificado que se ve en pantalla (ver
 * app/admin/(dashboard)/obras/[id]/certificado/page.tsx), pero con las
 * primitivas propias de @react-pdf/renderer: no renderiza HTML/CSS, así que
 * es una plantilla aparte y no un componente compartido. Sin fuentes
 * externas a propósito — Times-Roman y Helvetica son de las 14 que trae el
 * propio PDF, sin depender de una descarga en el momento de generarlo.
 */

const INK = "#1a1714";
const INK_SOFT = "#6b655d";
const OIL = "#8c3f24";
const CANVAS = "#f4f0e8";

const styles = StyleSheet.create({
  page: {
    backgroundColor: CANVAS,
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: INK,
  },
  marco: {
    flex: 1,
    borderWidth: 1,
    borderColor: OIL,
    padding: 6,
  },
  marcoInterior: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: OIL,
    padding: 36,
    alignItems: "center",
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },
  etiqueta: {
    marginTop: 18,
    fontSize: 9,
    letterSpacing: 3,
    color: INK_SOFT,
    textTransform: "uppercase",
  },
  titulo: {
    marginTop: 12,
    fontFamily: "Times-Roman",
    fontSize: 22,
    textAlign: "center",
  },
  portada: {
    marginTop: 22,
    maxHeight: 220,
    objectFit: "contain",
  },
  parrafo: {
    marginTop: 26,
    lineHeight: 1.6,
    textAlign: "left",
    alignSelf: "stretch",
  },
  negrita: { fontFamily: "Helvetica-Bold" },
  tabla: {
    marginTop: 20,
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filaTabla: { width: "50%", flexDirection: "row", marginBottom: 6 },
  dt: { width: 70, color: INK_SOFT },
  firmas: {
    marginTop: 48,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  firma: { width: "38%" },
  lineaFirma: {
    borderBottomWidth: 1,
    borderBottomColor: INK,
    height: 30,
  },
  nombreFirma: { marginTop: 6, fontSize: 10 },
  piePequeno: { fontSize: 8, color: INK_SOFT, marginTop: 2 },
});

function Sello() {
  const puntos = Array.from({ length: 8 }, (_, i) => {
    const angulo = (i / 8) * Math.PI * 2;
    return { x: 18 + Math.cos(angulo) * 8, y: 18 + Math.sin(angulo) * 8 };
  });
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={17} stroke={OIL} strokeWidth={0.7} fill="none" />
      <Circle cx={18} cy={18} r={14} stroke={OIL} strokeWidth={0.35} fill="none" />
      {puntos.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={1.4} fill={OIL} />
      ))}
      <Circle cx={18} cy={18} r={2.2} fill={OIL} />
    </Svg>
  );
}

export type CertificadoPdfProps = {
  painting: {
    title: string;
    year: number | null;
    technique: string;
    widthCm: number;
    heightCm: number;
    slug: string;
  };
  artistName: string;
  /** URL absoluta: el generador de PDF corre en el navegador, no en el
      servidor, así que una ruta relativa a /api/uploads/... también vale. */
  coverUrl: string | null;
  logoUrl: string;
};

export function CertificadoPdf({
  painting,
  artistName,
  coverUrl,
  logoUrl,
}: CertificadoPdfProps) {
  const medidas = formatDimensions(painting.widthCm, painting.heightCm);
  return (
    <Document title={`Certificado de autenticidad · ${painting.title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.marco}>
          <View style={styles.marcoInterior}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={styles.logo} />
            <Text style={styles.etiqueta}>Certificado de autenticidad</Text>
            <Text style={styles.titulo}>{painting.title}</Text>

            {coverUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={coverUrl} style={styles.portada} />
            ) : null}

            <Text style={styles.parrafo}>
              Por la presente certifico que la obra titulada{" "}
              <Text style={styles.negrita}>«{painting.title}»</Text>
              {painting.year ? `, realizada en ${painting.year},` : ""} es
              original, única y de mi autoría, ejecutada en{" "}
              {painting.technique.toLowerCase()}, con unas medidas de{" "}
              {medidas}.
            </Text>

            <View style={styles.tabla}>
              <View style={styles.filaTabla}>
                <Text style={styles.dt}>Técnica</Text>
                <Text>{painting.technique}</Text>
              </View>
              <View style={styles.filaTabla}>
                <Text style={styles.dt}>Medidas</Text>
                <Text>{medidas}</Text>
              </View>
              {painting.year ? (
                <View style={styles.filaTabla}>
                  <Text style={styles.dt}>Año</Text>
                  <Text>{painting.year}</Text>
                </View>
              ) : null}
              <View style={styles.filaTabla}>
                <Text style={styles.dt}>Referencia</Text>
                <Text>{painting.slug}</Text>
              </View>
            </View>

            <View style={styles.firmas}>
              <View style={styles.firma}>
                <View style={styles.lineaFirma} />
                <Text style={styles.nombreFirma}>{artistName}</Text>
                <Text style={styles.piePequeno}>Firma de la autora</Text>
              </View>

              <Sello />

              <View style={styles.firma}>
                <View style={styles.lineaFirma} />
                <Text style={styles.nombreFirma}>Lugar y fecha</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
