#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${1:-/tmp/bocasoft-launch-test.log}"
MODE="${2:-unpacked}"

# Liberar posibles locks de instancia previa
rm -f "$HOME/.config/bocasoft/SingletonLock" \
      "$HOME/.config/bocasoft/SingletonSocket" \
      "$HOME/.config/bocasoft/SingletonCookie" 2>/dev/null || true

pkill -x bocasoft 2>/dev/null || true
sleep 1

: > "$LOG"

if [[ "$MODE" == "unpacked" ]]; then
  BIN="$ROOT/release/linux-unpacked/bocasoft"
  echo "Launching unpacked: $BIN" | tee -a "$LOG"
  "$BIN" >>"$LOG" 2>&1 &
elif [[ "$MODE" == "extract" ]]; then
  BIN="$ROOT/release/Intranet Ventas-0.1.0.AppImage"
  echo "Launching AppImage EXTRACT_AND_RUN: $BIN" | tee -a "$LOG"
  APPIMAGE_EXTRACT_AND_RUN=1 "$BIN" >>"$LOG" 2>&1 &
else
  BIN="$ROOT/release/Intranet Ventas-0.1.0.AppImage"
  echo "Launching AppImage FUSE: $BIN" | tee -a "$LOG"
  "$BIN" >>"$LOG" 2>&1 &
fi

PID=$!
echo "pid=$PID" | tee -a "$LOG"
sleep 10

if ps -p "$PID" >/dev/null 2>&1; then
  echo "STATUS=alive" | tee -a "$LOG"
  ps -o pid,pcpu,stat,cmd -p "$PID" | tee -a "$LOG"
else
  echo "STATUS=dead" | tee -a "$LOG"
fi

grep -E 'LoginScreen|Modo normal|ERROR|Failed|Network service' "$LOG" | head -30 || true

# Cerrar prueba
kill "$PID" 2>/dev/null || true
sleep 1
kill -9 "$PID" 2>/dev/null || true
pkill -x bocasoft 2>/dev/null || true
echo DONE
