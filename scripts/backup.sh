#!/bin/sh
# Copia de seguridad: base de datos + fotos originales.
#
# Se ejecuta dentro del servicio `backup` de docker-compose.prod.yml, una vez
# al día. Escribe en /backups, que es un volumen persistente.
#
# Uso manual:
#   docker compose -f docker-compose.prod.yml run --rm backup /app/scripts/backup.sh
set -eu

FECHA="$(date -u +%Y%m%d-%H%M%S)"
DESTINO="${BACKUP_DIR:-/backups}"
CONSERVAR_DIAS="${BACKUP_RETENTION_DAYS:-14}"

registrar() {
  # Mismo formato que el registro de la app: una línea JSON por suceso.
  printf '{"nivel":"%s","mensaje":"%s","momento":"%s","tarea":"backup"}\n' \
    "$1" "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

fallar() {
  registrar error "$1" >&2
  exit 1
}

[ -n "${PGPASSWORD:-}" ] || fallar "falta PGPASSWORD"
mkdir -p "$DESTINO"

VOLCADO="$DESTINO/db-$FECHA.sql.gz"
FOTOS="$DESTINO/uploads-$FECHA.tar.gz"

# --clean --if-exists: el volcado se puede restaurar sobre una base que ya
# tiene tablas, que es justo el caso de un desastre a medias.
registrar info "volcando la base de datos"
pg_dump --clean --if-exists \
  --host "${POSTGRES_HOST:-postgres}" \
  --username "${POSTGRES_USER:-art}" \
  --dbname "${POSTGRES_DB:-art_cris}" \
  | gzip -9 > "$VOLCADO" || fallar "pg_dump falló"

# Un volcado de dos kilobytes es un volcado vacío: mejor enterarse ahora.
TAMANO="$(wc -c < "$VOLCADO")"
[ "$TAMANO" -gt 2048 ] || fallar "el volcado pesa $TAMANO bytes: sospechoso"

registrar info "empaquetando las fotos"
tar czf "$FOTOS" -C "${UPLOADS_DIR:-/uploads}" . || fallar "el empaquetado falló"

# Suma de comprobación: sin esto, un fichero corrupto en disco pasa por bueno
# hasta el día que hace falta.
( cd "$DESTINO" && sha256sum "$(basename "$VOLCADO")" "$(basename "$FOTOS")" \
  > "checksums-$FECHA.txt" )

registrar info "borrando copias de más de $CONSERVAR_DIAS días"
find "$DESTINO" -maxdepth 1 -type f -mtime "+$CONSERVAR_DIAS" \
  \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' -o -name 'checksums-*.txt' \) \
  -delete

registrar info "copia terminada: $(basename "$VOLCADO") ($TAMANO bytes)"
