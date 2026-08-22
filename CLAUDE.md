# Casa Margarita — notas para Claude Code

Contexto que no se deduce leyendo el código. Lo demás está en `README.md`.

## Regla número uno: nada corre en el host

No hay `node_modules` en la máquina y no debe haberlo. Todo comando pasa por
un contenedor:

```bash
docker compose up --build                                   # desarrollo, :3000
docker compose exec web pnpm <lo-que-sea>                    # dentro del contenedor
docker compose -f docker-compose.test.yml run --rm test      # unitarios
docker compose -f docker-compose.test.yml run --rm e2e       # Playwright
```

Si Docker no está levantado, **no ejecutes nada en el host**: dilo y sigue con
lo que se pueda hacer leyendo código.

## Idioma

Código, identificadores y ramas en inglés. Todo lo que lee una persona —
interfaz, mensajes de error, comentarios, commits, documentación — en
castellano, con sus tildes.

## Decisiones que parecen errores y no lo son

- **`.env` y `.env.app` separados.** Compose interpola los `$` de todo lo que
  carga con `env_file` normal, y eso destroza un hash argon2id. Los secretos
  van en `.env.app`, cargado con `format: raw`. No los juntes.
- **`images: { unoptimized: true }`.** Las variantes avif/webp en 400/800/1600
  se generan al subir la foto con sharp, no en cada petición. El optimizador de
  Next sobra aquí.
- **Nada de react-three-fiber.** Su `<Canvas>` no llega a crear el renderer en
  este proyecto. `components/webgl/` usa WebGL y three.js directos.
- **`export const dynamic = "force-dynamic"` en las páginas públicas.** Es una
  red, no lo que hace dinámico el sitio: el `<html lang>` del layout raíz sale
  de una cabecera y eso ya impide prerenderizar cualquier página. Comprobado
  con un build sin Postgres alcanzable: pasa, y todas las rutas salen `ƒ`.
  Mientras el idioma se lea de la cabecera, ninguna página pública puede ser
  estática, y quitar la directiva no cambiaría nada.
- **Las lecturas públicas van por `lib/public/queries.ts`, no por `prisma`
  suelto.** Están envueltas en el caché de datos con etiquetas (`lib/cache.ts`):
  el HTML se rehace en cada visita, pero Postgres solo se toca cuando algo
  caduca. Toda escritura del panel llama a `invalidar(...)` con sus etiquetas;
  si te saltas eso, el cambio no se ve. **Lo que entra en Postgres por otro
  camino —un script, restaurar una copia, la siembra de la suite— no invalida
  nada**, porque `revalidateTag` solo existe dentro del servidor de Next; para
  eso está `POST /api/revalidate` (apagado sin `REVALIDATE_SECRET`). Un test
  que escriba con Prisma y luego mire una página pública tiene que llamarlo, o
  pasará la primera vez y fallará la siguiente: la base de datos de la suite es
  efímera, pero `.next/cache` sobrevive. **De ahí no puede salir una `Date`**:
  Next guarda con `JSON.stringify` y volvería como texto con el tipo mintiendo,
  así que las fechas se devuelven ya en ISO.
- **Los servicios de `docker-compose.prod.yml` llevan prefijo
  (`casamargarita-postgres`, `casamargarita-web`…).** El servidor de Dokploy
  aloja otros cinco stacks y los engancha a todos a la misma red: un servicio
  llamado `postgres` a secas resuelve al contenedor del primer proyecto que
  registrase ese alias. En el proyecto de al lado eso ya provocó que una web
  hablara con el backend de otra aplicación. El compose de desarrollo puede
  usar nombres sueltos porque su red no se comparte con nadie.
- **El limitador de intentos es en memoria.** Vale para una instancia, que es lo
  que despliega Dokploy. Si algún día hay réplicas, va a Redis.
- **Los ajustes del sitio viven en la fila `singleton` de `Artist`.** Son dos
  interruptores; una tabla propia no compensa. Se leen por `lib/settings.ts`.
- **El ancho de imagen 3200 no está en ningún `srcset`.** Es el del zoom de
  detalle y solo se pide al abrir el visor. Si añades una vista nueva, usa
  `responsiveWidths()`, no `widths` a pelo.
- **El formato (pequeño/medio/grande) se deduce, no se guarda.** Está en las
  medidas; un campo aparte solo podría contradecirlas.
- **El `bodySizeLimit` de `next.config.ts` no es opcional.** Next corta el
  cuerpo de toda Server Action a 1 MB si nadie dice otra cosa, y por ahí pasan
  todas las subidas de fotos. Sin esa línea, el pipeline anunciaba 25 MB y el
  panel devolvía un 413 antes de llegar a ejecutarlo: no entraba ninguna foto
  de cámara, ni en obra, ni en diario, ni el retrato. El número sale de
  `lib/images/limits.ts` —un módulo sin dependencias, porque `next.config.ts`
  no puede arrastrar sharp— y lleva un mega de margen sobre `MAX_UPLOAD_BYTES`
  para el sobre del multipart.
- **Las fotos de detalle no se generan solas.** El botón «Generar fotos de
  detalle» recorta la principal a petición, y solo si tiene 2000 px por el lado
  corto: por debajo, ampliar un recorte enseña píxeles, no pincelada. Cuando no
  llega se dice en la ficha en vez de esconder el botón. Ojo con la siembra de
  demostración: `seed-demo-art.ts` sí fabrica detalles ampliando desde 1686 px,
  y por eso salen blandos —es material de relleno, no el comportamiento del
  panel.
- **Las imágenes de los tests tienen que pesar.** Un JPEG de color plano de
  1200×900 ocupa diez kilobytes: con esos ficheros la suite pasaba en verde
  mientras el panel rechazaba todo. Lo que se sube de verdad se prueba con
  `heavyPaintingJpeg()` (ruido, varios megas) en `e2e/admin/upload-size.spec.ts`.
- **Las texturas del fondo de margaritas son 512×1024 con la flor centrada y
  hueco transparente.** El lienzo es cuadrado en potencias de dos porque WebGL 1
  solo genera mipmaps así, y sin mipmaps la flor lejana hierve de aliasing y no
  hay desenfoque de profundidad. Se generan con `pnpm build:daisies` a partir de
  los PNG originales; no sustituyas el `.webp` a mano.
- **Si añades un `<script>` inline, pásale `scriptNonce()`.** Con la CSP
  activa, sin nonce el navegador lo bloquea.
- **De un fichero con `"use server"` solo se exportan funciones async.** Una
  constante suelta ahí no da error de tipos: rompe la compilación del panel
  entero en tiempo de ejecución, y la suite tarda media hora en decírtelo. Las
  constantes van a un módulo aparte (`lib/admin/trash.ts` es el ejemplo).

## Dónde tocar qué

| Quiero cambiar | Voy a |
|---|---|
| Qué obra ve el público | `lib/settings.ts` + `lib/catalog.ts` (`visiblePaintingFilter`) |
| Los filtros de la lista del panel | `lib/admin/painting-filters.ts` (puro y con tests) |
| Los filtros de la galería pública | `lib/public/gallery-filters.ts` + `lib/formats.ts` |
| Cualquier lectura del sitio público | `lib/public/queries.ts` — y su etiqueta en `lib/cache.ts` |
| Cualquier escritura del panel | `lib/admin/actions.ts` y `series-actions.ts` — toda Server Action empieza por `requireAdmin()` y termina invalidando sus etiquetas |
| Las fotos de detalle recortadas | `lib/images/details.ts` (zonas y umbral, puro y con tests) + `generatePaintingDetails` en `lib/admin/actions.ts` |
| El fondo de margaritas | `components/webgl/daisy-field.ts` (composición y ciclo, puro y con tests) y `daisy-renderer.ts` (WebGL) |
| El pipeline de imágenes | `lib/images/pipeline.ts` (los anchos están duplicados en `urls.ts` a propósito; un test lo vigila) |
| Identidad del sitio (título, og:image) | `lib/site.ts` + variables `PUBLIC_SITE_*` |
| Cabeceras de seguridad o la CSP | `lib/http/security-headers.ts`, aplicadas en `middleware.ts` |
| Cómo se registra un fallo | `lib/log.ts` y `instrumentation.ts` |

## Tests

- Unitarios: lógica pura de `lib/`. Umbral de cobertura 80/80/70/80 sobre
  `lib/**` y `app/api/**` — si bajas de ahí, el CI se pone rojo.
- Componentes: `// @vitest-environment jsdom` en la cabecera del fichero y
  `vi.mock("next/link")` si el componente navega.
- E2E: cada fichero usa **su propia IP simulada** (`TEST_IPS`), porque el
  limitador cuenta por IP. Si añades un fichero, añade su IP.
- Nadie deja el estado peor de lo que lo encontró: lo que un test crea, lo
  borra; lo que modifica, lo restaura.
- Si un test escribe con Prisma y luego abre una página pública, llama a
  `revalidarCache(request)` (`e2e/fixtures/revalidar.ts`) entre las dos cosas.

## Git

Ramas desde `develop`. Nunca commit ni push sin que se pida. Nunca directo a
`main` ni a `develop`.
