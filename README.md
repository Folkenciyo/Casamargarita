# Galería de óleos

Web-galería para una artista de óleos: catálogo con precio, medidas y técnica,
ficha de artista, panel de administración propio y una capa WebGL (intro de
óleo extendiéndose, transiciones de brochazo, sala 3D opcional).

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

# Ensayo de producción en local → http://localhost:3001
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml \
  -p art_cris_prod up --build

# Empezar de cero (borra volúmenes: base de datos e imágenes)
docker compose down -v
```

## Estructura

```
app/            rutas (público + /admin + /api)
components/     UI y capa WebGL (components/webgl)
lib/            dominio: auth, imágenes, precios, db
prisma/         schema, migraciones, seed
e2e/            Playwright
Dockerfile      base → deps → dev → e2e → builder → migrator → runner
```

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

Variables en la UI de Dokploy: `POSTGRES_PASSWORD` (sin `$`), `SESSION_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` y `PUBLIC_URL`. Dokploy las vuelca en un
`.env` que el compose de producción carga con `format: raw`, así que el hash
sobrevive.

Opcional, aviso por email de consultas nuevas (ver `.env.app.example`):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`. Sin
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` el envío se salta solo, sin error — no
hace falta rellenarlas para desplegar.

Backup:

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U art art_cris > backup.sql
docker run --rm -v art_cris_uploads:/data -v "$PWD":/out alpine tar czf /out/uploads.tar.gz -C /data .
```
