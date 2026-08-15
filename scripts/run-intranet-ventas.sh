#!/usr/bin/env bash
# Lanzador fiable de Intranet Ventas en Linux.
# Evita cuelgues del runtime FUSE del AppImage en algunos kernels.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
APPIMAGE="$DIR/Intranet Ventas-0.1.0.AppImage"
UNPACKED="$DIR/linux-unpacked/bocasoft"

# Limpia locks huérfanos de una sesión anterior colgada
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/bocasoft"
if [[ -L "$CFG/SingletonLock" ]]; then
  lock_target="$(readlink "$CFG/SingletonLock" || true)"
  lock_pid="${lock_target##*-}"
  if [[ -n "${lock_pid:-}" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
    rm -f "$CFG/SingletonLock" "$CFG/SingletonSocket" "$CFG/SingletonCookie"
  fi
fi

if [[ -x "$UNPACKED" ]]; then
  exec "$UNPACKED" "$@"
fi

if [[ -x "$APPIMAGE" ]]; then
  # Extrae a /tmp y ejecuta (más estable que FUSE en varios Linux)
  exec env APPIMAGE_EXTRACT_AND_RUN=1 "$APPIMAGE" "$@"
fi

echo "No se encontró el binario de Intranet Ventas en: $DIR" >&2
exit 1
