# Sala 3D — ideas para más adelante

Notas tal cual las fue soltando el usuario, para retomar en otra sesión. Nada
de esto está implementado todavía — es una libreta, no un plan.

## Checklist de trabajo

Orden acordado para ir paso a paso. Cada punto remite a su sección más abajo
para el detalle; esto es solo el orden de ataque. Marcar al cerrar cada uno.

- [x] Revisar y mergear el PR #22 (carga bajo demanda + montaje por fases)
- [x] Arreglar `e2e/admin/dashboard.spec.ts` — selector `main ul > li` cogía
      la lista de orden de portada (`FeaturedOrder.tsx`) en vez de la de
      obras; la de obras lleva ahora `aria-label="Obras"` y el test apunta ahí.
- [x] Tramo de camino este-oeste entre columnas (§ Camino de piedra)
- [ ] Farolas japonesas — asset más ligero y listo tal cual (§ Mobiliario y
      decoración del jardín → Luces sueltas)
- [x] Resplandor en el marco al acercarse, y que el cuadro se vea siempre
      bien iluminado (§ Resplandor en el marco)
- [ ] Linternas de suelo — adelgazar el modelo antes de integrar (§ Luces
      sueltas)
- [x] Pájaros en bandada, estilizados (§ Pájaros en bandada)
- [ ] Mobiliario de jardín — banco, plantas, roca, tronco (§ Mobiliario y
      decoración del jardín)
- [x] Lupa con el detalle real del pipeline (§ Lupa con el detalle real)
- [ ] Paseo guiado — dejar para el final, según el usuario (§ Paseo guiado)
- [ ] Esculturas generadas desde los cuadros — fase avanzada (§ Esculturas)

Bloqueado, esperando al usuario: reconfiguración del edificio (necesita
planos nuevos, no inventar el plano sin ellos). Sin decidir: sonido ambiente.

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

## Pájaros en bandada, muy lejanos — hecho

Primer intento con seis `THREE.Sprite` y una silueta en "M" dibujada en
canvas: el usuario lo vio "cutre", como si volaran 6 W pegadas y demasiado
grandes y bajas. Sustituido por el modelo real que pasó
(`lowpoly_bird.3DS`, 20 kB, en `public/Sala/pajaro/bird.3ds`, cargado con
`TDSLoader`) — comprobado antes de integrarlo con una ruta de depuración
aparte, no a ciegas: el `.3ds` trae **dos** aves completas una junto a otra
(no un ala y un cuerpo sueltos), y `BIRD_MODEL_MESH_INDEX` se queda solo con
la primera. Sin textura propia (material gris liso), así que se tiñe con
`BIRD_COLORS` —tonos tierra, marrón y beige, varios al azar por ejemplar—.

`buildBirdFlock` (`build-room.ts`) monta una bandada de 7, 9 u 11 aves al
azar (`BIRD_FLOCK_SIZES`) en formación de V, más un ejemplar suelto con su
propio rumbo aleatorio y su propio periodo —para que no cruce a la vez que
la bandada ni por el mismo sitio siempre—. Envergadura real 0,22 m
(`BIRD_WINGSPAN_M`) volando a 22 m de altura (`BIRD_HEIGHT`), bastante más
alto y más pequeño que el primer intento. Al ser geometría de verdad y no
un sprite, cada ave recibe la luz de la escena como cualquier otro objeto:
no hace falta un color por tema, de noche se apaga sola con el resto de la
sala —se quitó `setTheme`, que ya no hace falta—.

**Aproximado y sin verificar a simple vista**: `BIRD_MODEL_YAW_OFFSET` (a 0)
es una suposición sobre hacia dónde apunta el morro del modelo tras
corregir su eje — el `.3ds` no trae ningún dato de "hacia dónde mira", y si
en el paseo real se ve volando de culo, es ese número el que hay que girar.
Confirmado sin errores de carga y sin romper nada del resto de la sala; no
confirmado con los ojos por lo mismo de siempre —ciclo largo, pestaña de
prueba en segundo plano (ver [[casamargarita-verificar-webgl-navegador]])—.

## Camino de piedra — hecho

Implementado con `TilesTerracottaBeigeSquareStacked001` (`buildPath` en
`components/webgl/build-room.ts`): un pasillo central por sala, de puerta a
puerta, más un tramo perpendicular frente a los cuadros marcando la zona de
visita (distancia aproximada, no la exacta de `generalViewPosition` — no
merecía la pena enlazarlo con el cálculo de la cámara, que depende del FOV).

La puerta este-oeste entre columnas —la que usan "Marinas de invierno" y
"Cuadernos de campo"— ya tiene su tramo: cada sala construye su propio lado,
desde donde termina su pasillo central (`center.x ± PATH_WIDTH / 2`) hasta la
pared compartida (`center.x ± width / 2`). Verificado con datos reales
(`layoutFloorPlan`): el tramo este de una sala y el tramo oeste de su vecina
terminan en la misma coordenada X exacta, sin hueco ni solape.

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

## Resplandor en el marco al acercarse — hecho

Cada marco tiene ahora su propio material —antes compartían uno solo entre
todos los cuadros de la sala, `materials.frame` clonado por obra en
`buildRoomPaintings`— con un `emissive` en el acento de la casa
(`FRAME_GLOW_COLOR`, `--color-oil`). `Room3D.tsx` recalcula su
`emissiveIntensity` cada fotograma según la distancia de la cámara al centro
del lienzo (`FRAME_GLOW_RADIUS` = 5 m, con caída `t²` para que se note sobre
todo ya cerca), sin depender de si el cuadro está enfocado o bajo el ratón.

De paso se resolvió lo que el usuario señaló al pedir esto: "hay zonas que
no le dan bien la luz y eso hace que se vean muy oscuros". El aplique de
cada obra normaliza su intensidad solo en el centro del lienzo —un cuadro
alto se queda oscuro por abajo, porque el foco está montado arriba— y de
noche, con las luces de relleno casi apagadas, cualquier obra mal servida
por su aplique se iba a negro. Arreglado con `PAINTING_BASE_EMISSIVE`: el
lienzo usa su propia textura como `emissiveMap`, así que brilla con sus
propios colores como suelo de luz, y el aplique y el entorno le siguen dando
contraste por encima sin que se note un suelo aparte. Verificado de noche en
el navegador: los cuadros se leen con claridad incluso con el ambiente casi
en negro.

## Lupa con el detalle real del pipeline — hecho

`obrasSalaPorSecciones` (`lib/public/queries.ts`) baja ahora la portada y
las fotos de detalle de cada obra en la misma consulta —Prisma no deja
seleccionar la misma relación (`images`) dos veces con filtros distintos, así
que va un único `where: OR: [isPrimary, isDetail]`, separadas después por
`page.tsx` en `textureUrl` (portada) y `detailUrls` (detalle, a su mayor
ancho servido: de cerca es donde se nota el grano si no lo tiene)—.

En la sala, `buildRoomPaintings` (`build-room.ts`) registra cada lienzo con
`detailUrls.length > 0` como "lupa"; `update(camera)` —llamado cada
fotograma desde `Room3D.tsx`— cambia el `map`/`emissiveMap` del material a
la foto de detalle en cuanto la cámara pasa de `MAGNIFIER_DISTANCE` (0,9 m,
más cerca que donde para el acercamiento automático al hacer clic) y lo
devuelve a la portada al alejarse. La foto de detalle no se pide hasta la
primera vez que alguien se acerca tanto —confirmado sin peticiones de red
a un detalle real estando lejos—; con varias, se usa siempre la primera del
orden (`position` ascendente): no hay forma barata de saber desde fuera del
pipeline qué zona del lienzo mira cada una para elegir la más cercana.

**Sin caminar hasta comprobarlo en persona**: la obra de prueba en la base
de desarrollo (`the-prairie-on-fire`, 24×17 cm) es minúscula y está entre
otras dos en "Marinas de invierno" — encontrarla a ciegas moviendo la
cámara por script, en una pestaña en segundo plano sin WASD fiable (ver
[[casamargarita-verificar-webgl-navegador]]), no salió a tiempo. Verificado
en su lugar: la consulta corre contra Postgres de verdad (200 OK, no un
mock), tipos limpios de punta a punta y ninguna petición de red a la foto de
detalle mientras la cámara está lejos. Falta el paseo real, acercándose de
verdad a un cuadro con detalles generados.

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
