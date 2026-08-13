# Casa Margarita

Web-galería de **Casa Margarita**: catálogo de óleos con precio, medidas y
técnica, ficha de artista, diario de taller, encargos, panel de administración
propio y una capa WebGL (intro de óleo extendiéndose, transiciones de brochazo,
sala 3D opcional). En español e inglés.

El nombre visible sale de `PUBLIC_SITE_NAME`; sin esa variable, «Casa
Margarita». El de la cabecera de la web viene de la ficha de artista.

## Requisito único: Docker

**Nada se ejecuta en el host.** No necesitas Node, ni pnpm, ni Postgres
instalados. Todos los comandos van dentro de contenedores.

```bash
# Desarrollo con hot reload → http://localhost:3000
docker compose up --build

# Instalar una dependencia
docker compose exec web pnpm add <paquete>

# Migraciones
docker compose exec web pnpm prisma migrate dev --name <nombre>
docker compose exec web pnpm db:seed

# Llenar la galería con óleos de dominio público (Art Institute of Chicago)
# para ver la web con contenido real. Son de demostración: fuera antes de
# publicar. Para vaciarla: docker compose down -v
docker compose exec web pnpm seed:demo

# Tests (unit + integration) y E2E
docker compose -f docker-compose.test.yml run --rm test
docker compose -f docker-compose.test.yml run --rm e2e

# Cobertura (umbrales: 80% líneas, 80% funciones, 70% ramas)
docker compose -f docker-compose.test.yml run --rm test \
  sh -c "pnpm prisma generate && pnpm prisma migrate deploy && pnpm test:coverage"

# Ensayo de producción en local → http://localhost:3001
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml \
  -p casamargarita_prod up --build

# Empezar de cero (borra volúmenes: base de datos e imágenes)
docker compose down -v
```

## Estructura

```
app/            rutas (público + /admin + /api)
components/     UI y capa WebGL (components/webgl)
lib/            dominio: auth, imágenes, precios, ajustes, db
prisma/         schema, migraciones, seed
e2e/            Playwright
.github/        CI: lint, tipos, unitarios con cobertura, E2E e imagen final
Dockerfile      base → deps → dev → e2e → builder → migrator → runner
```

## El panel

```
/admin               resumen: cifras, lo más mirado, últimas consultas y avisos
/admin/obras         lista con búsqueda y filtros; ?papelera=si para la papelera
/admin/obras/nueva   alta
/admin/obras/[id]    ficha: datos, serie, fotos (arrastrables) y borrado
/admin/series        series: agrupar obra bajo un texto y una dirección propia
/admin/dossier       catálogo maquetado para imprimir o guardar como PDF
/admin/artista       biografía, retrato y ajustes del sitio
/admin/consultas     bandeja: leída, contestada y nota privada
```

**La papelera.** Borrar una obra ya no borra nada: la marca, desaparece de la
web y de la lista, y se puede recuperar entera —fotos incluidas— durante 30
días. Pasado ese plazo la borra de verdad el servicio `purge` del compose de
producción, o `pnpm purge-trash` a mano (admite `--dias N` y `--simular`).

**Las visitas** se cuentan por obra y día, sin cookies, sin identificadores y
sin terceros: solo un contador. No hay nada que consentir ni nada que filtrar.
Lo interesante del panel no es el ranking sino la obra muy mirada y poco
preguntada, que suele señalar algo de su ficha que frena a quien dudaba.

**El dossier** no usa ninguna librería de PDF: el navegador ya sabe paginar e
incrustar las fotos, y «Guardar como PDF» da el mismo resultado sin una
dependencia más que mantener.

Dos maneras de esconder obra, y no hacen lo mismo:

- **Ocultar una obra concreta** — la casilla «visible en la galería» de su
  ficha, o el botón *Ocultar* de la lista. Desaparece del catálogo, del
  sitemap y su ficha da 404.
- **Esconder todo lo vendido de golpe** — la casilla «mostrar las obras
  vendidas» en la ficha de artista. Marcada (por defecto), lo vendido sigue
  en la galería con su sello y sin formulario de consulta: enseña trayectoria.
  Sin marcar, cada obra sale del catálogo en cuanto se marca como vendida.

Lo marcado como «no está a la venta» no lo toca ese interruptor: es obra de
portfolio y se queda siempre visible.

## La obra en la web pública

- **Zoom de detalle.** Al pulsar una foto en la ficha se abre a pantalla
  completa con la variante de 3200 px, que se puede recorrer arrastrando y
  acercar con la rueda o con `+` y `−`. Esa variante **no entra en el
  `srcset`**: pesa demasiado para que un navegador la elija solo por tener
  pantalla grande, así que se pide únicamente al abrir el visor.
- **A tamaño real.** Debajo de los datos, la obra se dibuja a escala junto a
  una persona, un sofá o una puerta, colgada con el centro a 150 cm. Todo es
  CSS y proporciones (`lib/scale.ts`): ni lienzo ni imágenes de apoyo.
- **Modo exposición.** Desde la galería: pantalla completa, fondo oscuro, una
  obra cada vez y las flechas del teclado. A diferencia de la sala en 3D no
  necesita GPU, así que también aparece en móvil.
- **Series.** Agrupan obra bajo un texto y una dirección propia
  (`/serie/<slug>`). Una obra puede estar en una o en ninguna, y **borrar una
  serie nunca borra su obra**: solo deshace la agrupación.
- **Filtros.** Por tamaño, por serie y por disponibilidad, cada combinación
  con su propia URL y sin JavaScript. El tamaño **se deduce de las medidas**
  (`lib/formats.ts`) en vez de guardarse: es información que ya está en el
  ancho y el alto, y un campo aparte solo daría ocasión de contradecirse.

## Los tests de extremo a extremo

Viven en `e2e/` y corren en su propio contenedor, contra su propio Postgres
efímero. El servidor lo arranca Playwright dentro del contenedor (`next dev` en
el puerto 3100), así que nunca tocan la base de datos de desarrollo.

```
e2e/seed.setup.ts   estado de partida: artista, cuatro obras y sus fotos
e2e/auth.setup.ts   entra una vez y guarda la cookie de sesión
e2e/public/         portada, galería, ficha, consultas, sala, robots/sitemap
e2e/admin/          login, límite de intentos, ciclo de una obra, ficha, consultas
```

Tres cosas que conviene saber antes de añadir tests:

- **Las fotos son reales.** El sembrado genera imágenes con sharp y las pasa por
  `storePaintingImage`, el mismo pipeline que el panel. Los tests comprueban
  variantes escritas en disco, no fixtures.
- **Cada fichero usa su propia IP simulada** (`x-forwarded-for`, en
  `TEST_IPS`). El limitador de intentos cuenta por IP y en memoria: sin esto un
  fichero gastaría los cinco intentos de otro.
- **Nadie deja el estado peor de lo que lo encontró.** Los tests del panel crean
  lo suyo y lo borran; el que edita la ficha de artista la restaura al salir.
  Por eso los tests públicos pueden dar los datos sembrados por ciertos sin
  depender del orden.

La contraseña de administración de los tests es `test-password`; su hash argon2
está en `e2e/fixtures/test-data.ts` y `docker-compose.test.yml` puede
sobrescribirlo con `TEST_ADMIN_PASSWORD_HASH`. Chromium se descarga una sola vez
y queda en el volumen `playwright_browsers`.

## La capa de óleo

- `components/webgl/oil-renderer.ts` — WebGL a pelo: un triángulo a pantalla
  completa con un fragment shader. La intro de óleo extendiéndose y el
  brochazo entre vistas son el mismo shader con distinto modo.
- `components/webgl/Room3D.tsx` — sala virtual con **three.js directo**.

No se usa react-three-fiber: en este proyecto su `<Canvas>` no llega nunca a
crear el renderer (se queda esperando una medición del contenedor que no
llega), y para una escena estática y un quad no aporta nada que compense.

Ambas capas se saltan solas si el sistema pide movimiento reducido, si no hay
WebGL o si la pantalla es pequeña. Y como el navegador congela
`requestAnimationFrame` en pestañas de fondo, las transiciones llevan un
temporizador de seguridad: nadie se queda con la pantalla cubierta de pintura
por cambiar de pestaña a mitad de navegación.

## Configuración: dos ficheros de entorno

```bash
cp .env.example .env          # POSTGRES_PASSWORD — Compose lo interpola
cp .env.app.example .env.app  # secretos de la app — Compose NO los interpola
```

La separación no es cosmética. Compose sustituye `${...}` **y** los `$`
sueltos en todo lo que interpola, y un hash argon2id
(`$argon2id$v=19$m=19456...`) queda destrozado en el camino. Por eso los
secretos van en `.env.app`, cargado con `format: raw`, y `.env` guarda solo
valores sin `$`.

Para entrar en `/admin` necesitas `ADMIN_EMAIL` y `ADMIN_PASSWORD_HASH`:

```bash
docker compose exec web pnpm hash-password
```

## Despliegue en Dokploy

Aplicación de tipo **Compose** apuntando a `docker-compose.prod.yml`.
Dominio y certificado Let's Encrypt se configuran en la UI de Dokploy —
sin labels de Traefik escritas a mano. El volumen `uploads` debe declararse
persistente.

El acceso al panel va en `.env.dokploy` (fuera de git; ver
`.env.dokploy.example`). Es un servidor compartido: ahí viven otros cinco
stacks, y por eso **todos los servicios del compose llevan el prefijo
`casamargarita-`**. Dokploy los engancha a todos a la misma red, así que un
servicio llamado `postgres` a secas resolvería al del primer proyecto que
registrase ese alias. No quites el prefijo.

Para arrancar por primera vez, en este orden:

1. **DNS antes que nada.** `casamargarita.art` y `www` con un registro `A` a la
   IP del servidor. Let's Encrypt valida por HTTP, así que sin DNS propagado el
   certificado falla y el dominio queda a medias en Traefik.
2. Crear el proyecto y la aplicación Compose apuntando a la rama que se
   despliega.
3. Cargar las variables de la lista de abajo. `POSTGRES_PASSWORD` y
   `SESSION_SECRET` se generan nuevos: no reutilizar los de desarrollo.
4. Declarar `uploads` y `backups` como volúmenes persistentes. Si se olvida,
   el primer redespliegue se lleva por delante todas las fotos.
5. Desplegar y mirar el registro del servicio `casamargarita-migrator`: aplica
   las migraciones y debe terminar en éxito antes de que arranque la web.

Variables en la UI de Dokploy: `POSTGRES_PASSWORD` (sin `$`), `SESSION_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `PUBLIC_URL` y `PUBLIC_SITE_NAME`
(el nombre que sale en la pestaña del navegador y al compartir un enlace; el
de la cabecera de la web viene de la ficha de artista). Dokploy las vuelca en un
`.env` que el compose de producción carga con `format: raw`, así que el hash
sobrevive.

Opcional, aviso por email de consultas nuevas (ver `.env.app.example`):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`. Sin
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` el envío se salta solo, sin error — no
hace falta rellenarlas para desplegar.

## Encargos, envío y avisos

- **Encargos** (`/encargos`): formulario propio con horquilla de precio
  orientativa que se actualiza según se escriben las medidas. Filtra sin
  ofender. Las peticiones llegan a `/admin/encargos`.
- **Presupuesto de envío**: se calcula en el navegador desde las medidas de la
  obra (`lib/shipping.ts`). Es orientativo y lo dice en pantalla: dar una
  cifra cerrada que luego no se cumple es peor que no darla.
- **Certificado de autenticidad**: desde la ficha de cada obra en el panel.
  Como el dossier, lo pagina el navegador. **Fírmalo a mano**: una firma
  escaneada en un PDF no certifica nada.
- **Aviso de obra nueva** (`/avisos`): con doble confirmación y baja de un
  clic. **Nace apagado.** Encenderlo con `NEWSLETTER_ENABLED=true` obliga a
  tener publicada una política de privacidad y a declarar el responsable del
  tratamiento; hasta entonces las rutas devuelven 404.

## Copias de seguridad

El servicio `backup` de `docker-compose.prod.yml` las hace solo: volcado de la
base de datos y empaquetado de las fotos cada 24 horas en el volumen
`backups`, con suma de comprobación y borrado de lo que pase de catorce días.

Una vez por semana **restaura la última copia en una base desechable** y
comprueba que las tablas están y que hay obra dentro. Una copia que nunca se
ha restaurado no es una copia, es un fichero.

```bash
# Forzar una copia ahora
docker compose -f docker-compose.prod.yml run --rm casamargarita-backup /app/scripts/backup.sh

# Comprobar que la última copia sirve
docker compose -f docker-compose.prod.yml run --rm casamargarita-backup /app/scripts/verify-backup.sh

# Restaurar de verdad (destruye lo que haya)
gunzip -c backups/db-AAAAMMDD-HHMMSS.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T casamargarita-postgres psql -U art casamargarita
```

Ajustables por entorno: `BACKUP_INTERVAL_SECONDS` (86400),
`BACKUP_RETENTION_DAYS` (14) y `BACKUP_VERIFY_EVERY` (7, en número de copias).

En Dokploy, el volumen `backups` debe declararse persistente igual que
`uploads`. Sacarlo del servidor a un tercero es el paso que falta: hoy vive en
el mismo disco.

## Seguridad y registros

Las cabeceras las pone el middleware en **todas** las rutas, no solo en el
panel: `Content-Security-Policy` con nonce por petición, `HSTS`,
`Referrer-Policy`, `Permissions-Policy` y compañía. La política es estricta en
producción y afloja `eval` y `ws:` solo en desarrollo, que es lo que necesita
el recargado en caliente de Next.

Los `<script>` que escribe la app a mano — los bloques de datos estructurados
— leen el nonce con `scriptNonce()`. Si añades otro, hazlo igual o el
navegador lo bloqueará.

Los registros salen por la salida estándar en JSON, una línea por suceso, con
los campos que huelen a secreto tapados (`lib/log.ts`). `instrumentation.ts`
recoge cualquier error de servidor que no atrape nadie y lo registra con el
mismo `digest` que ve el visitante en la página de error.
