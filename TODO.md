# Sala 3D — ideas para más adelante

Notas tal cual las fue soltando el usuario, para retomar en otra sesión. Nada
de esto está implementado todavía — es una libreta, no un plan.

## Entorno: reconfiguración del edificio

El cielo y la luz ya son un HDRI de cielo limpio (`day-sky-1k.exr`,
`scene.environment` + `scene.background` en `components/webgl/Room3D.tsx` —
sustituyó al `meadow-1k.exr` de antes, que se quedó sin usar en disco). Eso
ya está hecho. Lo que queda pendiente es la parte que dependía de los planos
nuevos: las paredes siguen con su textura de museo, y el plano de las salas
(entradas, amplitud, apertura) no se ha tocado.

**Pendiente del usuario**: va a traer planos nuevos con la reconfiguración
de algunas cosas del edificio. Hay que pedírselos cuando se retome esto; no
inventar el plano sin ellos.

## Modo nocturno — hecho

Cielo oscuro y los apliques como luz principal sobre los cuadros. No lleva
interruptor propio: lo manda el de claro/oscuro del sitio (`ThemeToggle`),
que lanza un evento `theme-change`; `Room3D.tsx` lo escucha, cambia el HDRI
a `night-sky-1k.exr` y baja a la vez las luces de relleno (`FILL_BY_THEME`)
—sin eso la sala no llegaba a verse de noche por mucho que cambiara el
cielo—. Un botón propio de la sala se descartó: quien nunca lo toca no
llegaría a verlo.

## Pájaros en bandada, muy lejanos

Cruzando el cielo de vez en cuando, a mucha distancia. Explícitamente
**no** modelos 3D realistas de pájaro — algo estilizado (siluetas, sprites),
del mismo espíritu que el resto de la sala, no un intento de fotorrealismo.

## Camino de piedra — hecho en parte

Implementado con `TilesTerracottaBeigeSquareStacked001` (`buildPath` en
`components/webgl/build-room.ts`): un pasillo central por sala, de puerta a
puerta, más un tramo perpendicular frente a los cuadros marcando la zona de
visita (distancia aproximada, no la exacta de `generalViewPosition` — no
merecía la pena enlazarlo con el cálculo de la cámara, que depende del FOV).

**Queda pendiente**: el pasillo solo conecta las salas apiladas en la misma
columna (comparten centro en X). La puerta este-oeste entre columnas —la que
usan "Marinas de invierno" y "Cuadernos de campo"— todavía no tiene su
propio tramo de camino.

## Árboles en los cruces entre columnas — hecho

`tree 3d model free.zip` (826 kB de `.fbx` + 4 texturas PNG, 6 MB en total)
integrado en `buildCornerTrees` (`components/webgl/build-room.ts`), llamado
desde `Room3D.tsx`. Texturas convertidas a webp con `pnpm build:tree-textures`
(`scripts/build-tree-textures.ts`), ~288 kB en total, en
`public/Sala/arbol/`. Se carga el modelo una sola vez y se clona por cada
árbol —comparten geometría y materiales—.

La posición no es el centro de ninguna sala: es el cruce donde se tocan la
pared compartida entre dos columnas y la línea de la pared de entrada —el
mismo punto en el que se cruzan los caminos—. `treeSpots` en
`components/webgl/floor-plan.ts` (con sus tests) recorre cada frontera
interna entre columnas contiguas y pone un árbol ahí si al menos 3 de las 4
salas que la rodean (las dos filas de cada columna) ya existen. Con 3 salas
sale un árbol en el único cruce que hay; con la cuadrícula completa sale uno
por cada frontera —un edificio de 4 columnas saca 3 árboles—. Si el número de
salas cambia, se mueven o aparecen solos.

**Ojo con la escala si se cambia el modelo**: el `.fbx` no trae el factor de
escala de su exportador — carga a más de 700 m de alto tal cual. Hay que
medirlo (`Box3` sobre sus vértices en mundo) y ajustar `TREE_SCALE` en
`build-room.ts` a mano; no se puede asumir escala 1:1 con un `.fbx` nuevo.

La regla de qué pared se construye cerca del árbol no es simétrica en las 4
direcciones, y **no es un recorte**: es una omisión completa. Un brazo entre
dos salas que **existen las dos** es un muro interior —ya tiene su puerta en
otro punto de su propia pared, no necesita ningún tramo cerca del cruce— y
no se construye en absoluto, ni un cabo suelto; un brazo que da directamente
al hueco de la sala que falta es de verdad frontera con el exterior y se
construye entero, tocando el cruce. Con 3 salas eso da una esquina limpia de
2 muros sólidos (los que dan al hueco) y el otro lado (entre las 2 salas
reales) queda completamente abierto —nada de losas sueltas cerca del árbol,
ni cortas ni largas—. `TreeSpot` (`floor-plan.ts`) lleva
`interiorNorth/South/West/East`, calculados de qué salas existen a cada lado
del cruce; `keepNearTreeSpots` filtra el segmento entero (no lo recorta) si
toca el cruce por un brazo interior. Afecta a `wallSegments`, así que
colisión y dibujado quedan sincronizados solos. Con las 4 salas presentes en
un cruce (cuadrícula completa), los 4 brazos son interiores y se omiten los
4 por igual, dejando una plaza abierta alrededor del árbol.

## Mobiliario y decoración del jardín

Elementos sueltos junto al camino o el cartel para reforzar la sensación de
jardín. **Casi lo último de esta lista**: hace falta buscar varios modelos
distintos de cada tipo (no repetir siempre el mismo banco), si no queda
monótono nada más verlo dos veces.

El usuario ya encontró varios candidatos, sin comprobar todavía si su peso
es asumible (la lección del árbol de arriba aplica aquí también — revisar
tamaño/polígonos antes de integrar cualquiera):
- `C:\Users\folkencillo\Downloads\WoodBench.zip` — banco, encaja directo con
  esta idea.
- `C:\Users\folkencillo\Downloads\PlantOrchid001.zip`,
  `PlantMonstera001.zip` (hay dos, uno con `(1)` en el nombre — comprobar
  si son el mismo archivo repetido o distinto), `PlantAgave002.zip`,
  `PlantSucculentEcheveria001.zip` — plantas sueltas, decoración general.
- `C:\Users\folkencillo\Downloads\RockBoulderLarge049.zip` — roca.
- `C:\Users\folkencillo\Downloads\TreeLog008.zip` — tronco caído, no un
  árbol en pie; no sirve para el hueco de la esquina de arriba, es decoración
  aparte.
- `C:\Users\folkencillo\Downloads\philodendron subincisum interior plants
  set.zip` — set de plantas. **Bloqueado, y no solo por peso**: son 261 MB,
  casi todo mapas PNG sin comprimir (el de normales solo, 31 MB) más un
  `.max` de 44 MB —formato propio de 3ds Max, sin loader en three.js—. No
  trae ningún `.fbx`/`.obj`/`.glb`: sin malla en un formato utilizable, no
  hay nada que cargar todavía aunque se recorten las texturas.

### Luces sueltas (linternas y farolas)

Dos ideas nuevas del usuario, con sus propios modelos ya localizados:

- **Linternas de suelo con luz suave en colores pastel**, repartidas por el
  jardín. Modelo: `C:\Users\folkencillo\Downloads\kitchen lantern 1.zip`
  (18,6 MB, `.fbx` + PBR completo — color, altura, metalness, AO, normal
  ×2, opacidad, roughness). Pesado pero manejable: el normal
  "OpenGL" pesa 7,5 MB él solo y sobra el render de previsualización
  (`PropRndr42.png`, 4 MB) — con eso descartado y las texturas a 1K/webp
  debería quedar ligero de sobra.
- **Farolas japonesas**, para un toque zen. Modelo:
  `C:\Users\folkencillo\Downloads\simple japanese lamp.zip` — **606 kB en
  total**, `.obj`+`.mtl` sin mapas de textura (materiales de color plano,
  a juego con lo "simple" del nombre). El más ligero de todos los assets
  que se han mirado hasta ahora, listo para probar tal cual.

## Resplandor en el marco al acercarse

Al caminar cerca de un cuadro —antes de hacer clic—, un resplandor sutil en
el marco. Refuerza que es interactivo sin depender del hover del ratón, que
en 3D casi no se usa (uno anda con WASD, no persigue el cursor).

## Lupa con el detalle real del pipeline

Al acercarse mucho a un cuadro, tirar de las fotos de detalle generadas por
`generatePaintingDetails` (`lib/admin/actions.ts` + `lib/images/details.ts`)
en vez de seguir mostrando la textura de siempre — como una lupa que ya
tiene los datos hechos, no una textura más grande sin más.

## Paseo guiado

Un botón que mueve la cámara sola por la sala, para quien no quiera manejar
WASD (útil en móvil). **Dejar para el final** de esta lista.

## Esculturas generadas desde los cuadros (avanzado, más adelante)

Generar un modelo 3D a partir de la imagen de cada obra y mostrarlo como
escultura en la sala. Marcado explícitamente como algo para fases
avanzadas — no es para las próximas sesiones.

## Rendimiento — hecho en parte

La entrada ya no se lleva la espera por delante. La sala no se monta al
abrir la página sino al pulsar «Entrar en la sala», y hasta ese clic no se
descarga nada —ni three.js siquiera: `RoomGate` pide el módulo con
`next/dynamic`, y lo adelanta al pasar el ratón por el botón—. El montaje
va por fases que devuelven el hilo al navegador entre una y otra, con la
espera contada por `RoomLoader` (el mismo shader de óleo de las
transiciones, con el progreso real de la carga en vez del tiempo), y los
shaders se compilan con `compileAsync` antes de destapar la sala, para que
ese tirón no caiga justo después de quitar la pantalla de carga.

Ojo con el gestor de carga de three al tocar esto: su `onLoad` no significa
«ya está todo», sino «ahora mismo no queda nada en la cola», y lo dispara
cada vez que eso pasa —entre fase y fase, de sobra—. Por eso lo que se
espera es `colaVacia` cuando ya no queda nada por pedir, no el aviso suelto.

### El cielo no se toca — probado y descartado

Los `.exr` siguen enteros: 1,1 MB el de día, 1,7 MB el de noche, con sus
160–190 ms de descompresión PIZ. Es lo más caro que carga la sala y aun así
se queda.

Se llegó a partir en dos —un webp para el fondo y un mapa reducido en media
precisión para la luz—, con `scene.background` sustituido por una esfera
propia. Pesaba la cuarta parte y quitaba la descompresión entera. Pero el
resultado se vio peor: **de día se pierden el sol y el relieve de las nubes,
y de noche el color de las estrellas y la aurora**. Con el fondo ya no salido
del cubo de reflejos del PMREM, el cielo se queda plano por mucho que se
ajuste la exposición —y ajustarla no es gratis: revelarlo con el 0,5 del
renderer lo deja en azul marino a mediodía, y subirlo de noche convierte el
negro en gris lechoso—.

**Si se retoma**, que no sea a costa del rango ni de la resolución del cielo,
y comparando de día **y** de noche antes de dar nada por bueno. El camino que
queda sin explorar es un contenedor más ligero a la misma resolución y con el
mismo rango (recomprimir el `.exr` con DWAA, que el `EXRLoader` sí sabe leer),
para lo que hace falta una herramienta que escriba EXR y no hay ninguna en el
proyecto.

**Aparte de eso**: sobran unos 7 MB en `public/Sala` que no referencia nadie
—`church-museum-1k.exr` (5,6 MB) y `meadow-1k.exr` (1,5 MB, el cielo
anterior)—. No los descarga el navegador, pero viajan en la imagen de Docker.

## Sonido ambiente (propuesta sin decidir)

Sonido de fondo muy sutil —pájaros, brisa, hierba—, activable y con volumen
bajo por defecto. Se propuso en la lluvia de ideas pero no se llegó a
comentar; queda aquí por si acaso, no descartada ni confirmada.
