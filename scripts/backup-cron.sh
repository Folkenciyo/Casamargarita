#!/bin/sh
# Punto de entrada del servicio `backup`. Copia diaria y verificación semanal,
# sin cron: un bucle que duerme. Menos piezas que un demonio de cron dentro de
# un contenedor, y los registros salen por la salida estándar como los del
# resto de servicios.
set -eu

INTERVALO="${BACKUP_INTERVAL_SECONDS:-86400}"   # cada 24 h
CADA_CUANTAS_VERIFICAR="${BACKUP_VERIFY_EVERY:-7}"

registrar() {
  printf '{"nivel":"%s","mensaje":"%s","momento":"%s","tarea":"backup-cron"}\n' \
    "$1" "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

registrar info "servicio de copias en marcha (cada $INTERVALO s)"

VUELTA=0
while true; do
  VUELTA=$((VUELTA + 1))

  # Un fallo no puede tumbar el servicio: mañana toca otra copia.
  if /app/scripts/backup.sh; then
    if [ $((VUELTA % CADA_CUANTAS_VERIFICAR)) -eq 1 ]; then
      /app/scripts/verify-backup.sh || registrar error "la verificación falló"
    fi
  else
    registrar error "la copia falló"
  fi

  sleep "$INTERVALO"
done
