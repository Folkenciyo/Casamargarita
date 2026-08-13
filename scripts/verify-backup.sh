#!/bin/sh
# Restaura la última copia en una base de datos desechable y comprueba que
# dentro hay lo que tiene que haber.
#
# Una copia que nunca se ha restaurado no es una copia: es un fichero. Esto
# corre solo, una vez por semana, y grita si el volcado no sirve.
#
# Uso manual:
#   docker compose -f docker-compose.prod.yml run --rm backup /app/scripts/verify-backup.sh
set -eu

DESTINO="${BACKUP_DIR:-/backups}"
BASE_PRUEBA="verificacion_copia_$$"

registrar() {
  printf '{"nivel":"%s","mensaje":"%s","momento":"%s","tarea":"verify-backup"}\n' \
    "$1" "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

fallar() {
  registrar error "$1" >&2
  limpiar
  exit 1
}

limpiar() {
  dropdb --host "${POSTGRES_HOST:-postgres}" --username "${POSTGRES_USER:-art}" \
    --if-exists "$BASE_PRUEBA" 2>/dev/null || true
}

[ -n "${PGPASSWORD:-}" ] || fallar "falta PGPASSWORD"

ULTIMO="$(ls -1t "$DESTINO"/db-*.sql.gz 2>/dev/null | head -n 1 || true)"
[ -n "$ULTIMO" ] || fallar "no hay ninguna copia en $DESTINO"

registrar info "verificando $(basename "$ULTIMO")"

# Primero la suma: si el fichero está corrupto, no hace falta restaurar nada.
MARCA="$(basename "$ULTIMO" | sed 's/^db-//; s/\.sql\.gz$//')"
if [ -f "$DESTINO/checksums-$MARCA.txt" ]; then
  ( cd "$DESTINO" && sha256sum -c "checksums-$MARCA.txt" >/dev/null ) \
    || fallar "la suma de comprobación no cuadra: la copia está corrupta"
fi

trap limpiar EXIT
createdb --host "${POSTGRES_HOST:-postgres}" --username "${POSTGRES_USER:-art}" \
  "$BASE_PRUEBA" || fallar "no se pudo crear la base de pruebas"

gunzip -c "$ULTIMO" \
  | psql --quiet --host "${POSTGRES_HOST:-postgres}" \
      --username "${POSTGRES_USER:-art}" --dbname "$BASE_PRUEBA" \
      --set ON_ERROR_STOP=on >/dev/null \
  || fallar "la restauración falló"

# No basta con que restaure: tiene que traer las tablas y, si había obra, obra.
for TABLA in Painting Image Artist Inquiry; do
  psql --quiet --tuples-only --host "${POSTGRES_HOST:-postgres}" \
    --username "${POSTGRES_USER:-art}" --dbname "$BASE_PRUEBA" \
    --command "SELECT 1 FROM \"$TABLA\" LIMIT 1;" >/dev/null \
    || fallar "la tabla $TABLA no existe en la copia restaurada"
done

OBRAS="$(psql --quiet --tuples-only --no-align --host "${POSTGRES_HOST:-postgres}" \
  --username "${POSTGRES_USER:-art}" --dbname "$BASE_PRUEBA" \
  --command 'SELECT count(*) FROM "Painting";')"

registrar info "copia verificada: restaura y contiene $OBRAS obras"
