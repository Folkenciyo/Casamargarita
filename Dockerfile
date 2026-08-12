# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# base — imagen común. bookworm-slim (no alpine): sharp y @node-rs/argon2
# publican binarios precompilados para glibc, no para musl.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@10
WORKDIR /app

# ---------------------------------------------------------------------------
# deps — instala dependencias. Capa cacheada mientras no cambie el manifiesto.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prefer-frozen-lockfile

# ---------------------------------------------------------------------------
# dev — target de docker-compose.yml. El código llega por bind mount.
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# ---------------------------------------------------------------------------
# e2e — target del servicio `e2e` de docker-compose.test.yml. Es dev más las
# librerías de sistema que pide Chromium. Los navegadores NO se empaquetan
# aquí: viven en el volumen /ms-playwright y los instala el comando del
# servicio la primera vez, así la imagen no engorda 400 MB.
# ---------------------------------------------------------------------------
FROM dev AS e2e
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm exec playwright install-deps chromium \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# builder — compila Next en modo standalone.
# ---------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

# ---------------------------------------------------------------------------
# migrator — imagen con el CLI de Prisma. Servicio efímero que aplica las
# migraciones antes de arrancar web (ver docker-compose.prod.yml).
# ---------------------------------------------------------------------------
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
CMD ["pnpm", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# runner — imagen final. Sin CLI, sin toolchain, usuario no root.
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_DIR=/app/uploads
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
