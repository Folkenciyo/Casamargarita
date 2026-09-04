/**
 * Textos de la siembra de demostración.
 *
 * Están aquí y no en `seed-demo-art.ts` para que el script se lea como lo que
 * hace —descargar, recortar, guardar— sin trescientas líneas de prosa por
 * medio. Todo esto es inventado y se borra cuando entre el contenido real.
 */

export const ARTIST = {
  name: "Cristina Vela",
  statement: "Óleo sobre lienzo. La materia antes que el motivo.",
  bio: `Pinto desde el taller que da al norte de una casa de pueblo, con una ventana que solo sirve tres horas al día. El resto del tiempo lo paso mirando lo que hice con esa luz.

Vengo del dibujo. Durante años pensé que el color era un añadido, algo que se ponía encima de una estructura que ya estaba resuelta. Tardé bastante en entender que en el óleo pasa lo contrario: la materia decide, y el dibujo aparece cuando la materia lo permite.

Trabajo por series, casi siempre en invierno. Empiezo con manchas muy diluidas para encontrar dónde cae el peso del cuadro, y voy cargando la pintura según se seca. Las últimas capas van con espátula y son las que dan el relieve que se ve de cerca. Un cuadro mediano me lleva entre tres semanas y dos meses, y buena parte de ese tiempo es esperar.

No hago encargos de fotografías. Sí de un lugar, si puedo ir a verlo.`,
  email: "taller@casamargarita.art",
  instagram: "@casamargarita.taller",
};

export const SERIES = [
  {
    title: "Marinas de invierno",
    description: `Doce salidas al mismo tramo de costa entre noviembre y febrero, casi siempre con mal tiempo.

Lo que buscaba no era el mar sino la luz que queda cuando el sol no llega a salir del todo: un gris que no es gris, que tiene verde debajo y a veces un naranja muy sucio en el horizonte. Se pinta rápido porque dura poco.`,
  },
  {
    title: "Interiores con luz de norte",
    description: `La ventana del taller y lo que hay delante de ella.

Es la serie más lenta que he hecho. Al no depender del tiempo que haga, se puede volver al mismo cuadro semanas después y encontrar la misma luz, así que las capas se acumulan hasta que la pintura pesa de verdad.`,
  },
  {
    title: "Cuadernos de campo",
    description: `Formatos pequeños, pintados del tirón y sin corregir.

Empezaron como apuntes para cuadros grandes y acabaron siendo lo que más me gusta enseñar. Se ve la mano dudando, que es algo que en los cuadros grandes se acaba tapando.`,
  },
];

export const MILESTONES = [
  { kind: "EXHIBITION", title: "Lo que queda del invierno", place: "Sala Municipal de Exposiciones, Segovia", year: 2026 },
  { kind: "EXHIBITION", title: "Cuatro pintoras figurativas", place: "Galería Arco Norte, Madrid", year: 2025 },
  { kind: "EXHIBITION", title: "Marinas", place: "Casa de Cultura, Llanes", year: 2024 },
  { kind: "EXHIBITION", title: "Primera individual", place: "Espacio Trapecio, Valladolid", year: 2022 },
  { kind: "AWARD", title: "Primer premio de pintura", place: "Certamen Nacional de Artes Plásticas de Ávila", year: 2025 },
  { kind: "AWARD", title: "Mención de honor", place: "Bienal de Pintura Ciudad de Soria", year: 2023 },
  { kind: "COLLECTION", title: "Fondo de arte contemporáneo", place: "Diputación de Segovia", year: 2025 },
  { kind: "COLLECTION", title: "Colección particular", place: "Bilbao", year: 2024 },
  {
    kind: "PRESS",
    title: "«La pintura lenta de Cristina Vela»",
    place: "Suplemento cultural, El Norte",
    year: 2026,
    url: "https://example.com/prensa-cristina-vela",
  },
  { kind: "PRESS", title: "Entrevista en Radio Segovia", place: "Programa «A media tarde»", year: 2025 },
] as const;

export const JOURNAL = [
  {
    title: "La primera mancha nunca es el cuadro",
    summary: "Por qué empiezo siempre con algo que voy a tapar entero.",
    body: `La primera sesión de un cuadro no sirve para pintar: sirve para saber dónde cae el peso. Trabajo con la pintura muy diluida, casi aguada, y me permito ser injusta con el motivo. Si el mar tiene que ser una banda marrón para entender la composición, es una banda marrón.

Todo eso desaparece después. Pero desaparece de una manera concreta: por debajo de las capas siguientes queda un tono que tiñe todo lo que viene encima. Un cuadro empezado sobre ocre y otro empezado sobre gris no acaban igual aunque pinte lo mismo.

La gente que ve el proceso siempre pregunta lo mismo en este punto: si no da pena tapar. No. Da más pena lo contrario, quedarse con algo que funcionaba a medias por no atreverse a cubrirlo.`,
  },
  {
    title: "Veladuras: pintar con lo que casi no se ve",
    summary: "Capas transparentes, una sesión por capa, y la paciencia de esperar a que sequen.",
    body: `Una veladura es óleo muy diluido en médium, tan transparente que por sí sola no se ve. Lo que hace es modificar lo que hay debajo: un azul sobre un ocre no da verde de paleta, da un verde con luz dentro, porque la luz atraviesa la capa y rebota en la de abajo.

El problema es el tiempo. Cada veladura necesita que la anterior esté seca de verdad, no seca al tacto. En invierno eso puede ser una semana. Por eso siempre tengo tres o cuatro cuadros a la vez: mientras uno espera, trabajo en otro.

En esta obra hay siete veladuras en la zona del cielo. En la foto de detalle se ve que el color no es plano en ningún punto.`,
  },
  {
    title: "El empaste, o cuándo dejar de tocar",
    summary: "La última capa va con espátula y es la que se ve de cerca.",
    body: `Cuando el cuadro ya está resuelto, viene lo que más me gusta y menos dura: cargar pintura. Espátula, óleo casi puro, y unos pocos gestos que no admiten corrección. Si me equivoco aquí, hay que raspar y esperar otra semana.

El empaste no es decoración. Es lo que hace que un cuadro cambie según desde dónde lo mires, porque el relieve recoge la luz de la sala. Una reproducción fotográfica nunca lo transmite; por eso en las fichas hay fotos de detalle, para que al menos se intuya.

Sé que está terminado cuando quiero seguir tocándolo y no se me ocurre para qué.`,
  },
  {
    title: "Barnizar, seis meses después",
    summary: "El paso que casi nadie ve y que decide cómo se conserva el cuadro.",
    body: `El óleo tarda meses en secar del todo, no días. Barnizar antes de tiempo encierra disolvente dentro de la capa y con los años eso se paga en grietas.

Así que los cuadros se quedan en el taller, apoyados contra la pared y mirando hacia dentro para que no les dé polvo. Cuando pasan seis meses, barnizo. El barniz iguala los brillos —el óleo seca desigual y hay zonas que quedan mates y otras satinadas— y protege la superficie.

Es el momento en que un cuadro deja de ser mío del todo.`,
  },
  {
    title: "Qué pregunta la gente cuando ve un cuadro de cerca",
    summary: "Notas de una jornada de puertas abiertas en el taller.",
    body: `Este sábado vinieron unas treinta personas al taller. Anoto lo que preguntaron, que me sirve más que cualquier estadística:

Cuánto tardas. Siempre es la primera. La respuesta honesta —entre tres semanas y dos meses, pero trabajando en varios a la vez— nunca satisface a nadie.

De dónde sacas los sitios. De ir. No pinto de fotografía salvo para comprobar un detalle concreto.

Si se puede tocar. No, pero acerca la cara todo lo que quieras: el empaste se entiende a veinte centímetros y no se entiende a dos metros.

Y una que me dejó pensando: si me da pena venderlos. Algunos sí.`,
  },
];

export const INQUIRIES = [
  { name: "Marta Ibáñez", email: "marta.ibanez@example.com", message: "Buenas tardes. Me interesa esta obra para el salón, que tiene una pared de unos tres metros. ¿Sería posible verla en persona algún día entre semana? Vivo en Segovia.", answered: true },
  { name: "Joaquín Ferrer", email: "j.ferrer@example.com", message: "¿El precio incluye el marco? Y si no, ¿podría recomendarme algún enmarcador que trabaje con este tipo de obra?", answered: true },
  { name: "Laura Company", email: "laura.company@example.com", message: "Hola, escribo desde una pequeña galería en Valencia. Estamos preparando una colectiva de pintura figurativa para la primavera y me gustaría saber si estaría interesada en participar.", answered: false },
  { name: "Peter Hoffmann", email: "p.hoffmann@example.com", message: "Good afternoon. Is shipping to Germany possible for this painting? I would need an estimate including insurance.", answered: false },
  { name: "Nieves Aranda", email: "nieves.aranda@example.com", message: "Me he quedado mirando esta obra un buen rato. ¿Podría enviarme alguna foto más del detalle de la esquina inferior derecha, donde parece que la pintura está más cargada?", answered: false },
  { name: "Sergio Belmonte", email: "sergio.belmonte@example.com", message: "¿Sigue disponible? Vi la exposición de Segovia y me quedé con las ganas.", answered: true },
];

export const COMMISSIONS = [
  { name: "Familia Otero", email: "otero.family@example.com", brief: "Nos gustaría un cuadro de la casa del pueblo de mi madre, en Asturias, para regalárselo por sus ochenta años. Es una casa de piedra con una parra delante. Podemos llevarla a verla si hace falta.", widthCm: 80, heightCm: 60, deadline: "Antes de junio, que es su cumpleaños" },
  { name: "Restaurante La Cepa", email: "reservas@lacepa.example.com", brief: "Buscamos tres piezas para el comedor nuevo. Nos gusta mucho la serie de marinas. Formato apaisado y tonos que no compitan con la madera.", widthCm: 120, heightCm: 50, deadline: "" },
  { name: "Ana Ruescas", email: "ana.ruescas@example.com", brief: "Un pequeño, del tamaño de los cuadernos de campo, del olivar de mi abuelo. Tengo fotos pero entiendo que prefiera ir. Está a cuarenta minutos de Segovia.", widthCm: 30, heightCm: 24, deadline: "Sin prisa" },
  { name: "Ignacio Vidal", email: "i.vidal@example.com", brief: "Quiero regalar un retrato a mi mujer. Sé que no hace retratos, pero pregunto por si acaso.", widthCm: null, heightCm: null, deadline: "Para Navidad" },
];

/** Pies para las fotos de detalle, en el orden en que se generan. */
export const DETAIL_CAPTIONS = [
  "Detalle: la carga de materia en la zona de luz",
  "Detalle: el empaste a espátula de las últimas capas",
  "Detalle: la trama del lienzo bajo las veladuras",
];
