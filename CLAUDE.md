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
- **`export const dynamic = "force-dynamic"` en las páginas públicas.** Postgres
  vive en otro contenedor y no está disponible durante el build.
- **El limitador de intentos es en memoria.** Vale para una instancia, que es lo
  que despliega Dokploy. Si algún día hay réplicas, va a Redis.
- **Los ajustes del sitio viven en la fila `singleton` de `Artist`.** Son dos
  interruptores; una tabla propia no compensa. Se leen por `lib/settings.ts`.
- **El ancho de imagen 3200 no está en ningún `srcset`.** Es el del zoom de
  detalle y solo se pide al abrir el visor. Si añades una vista nueva, usa
  `responsiveWidths()`, no `widths` a pelo.
- **El formato (pequeño/medio/grande) se deduce, no se guarda.** Está en las
  medidas; un campo aparte solo podría contradecirlas.
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
| Cualquier escritura del panel | `lib/admin/actions.ts` y `series-actions.ts` — toda Server Action empieza por `requireAdmin()` |
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

## Git

Ramas desde `develop`. Nunca commit ni push sin que se pida. Nunca directo a
`main` ni a `develop`.
