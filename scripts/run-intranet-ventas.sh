#!/usr/bin/env bash
# Lanzador fiable de Intranet Ventas en Linux.
# Evita cuelgues del runtime FUSE del AppImage en algunos kernels.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
UNPACKED="$DIR/linux-unpacked/bocasoft"
STABLE_APPIMAGE="$DIR/Intranet-Ventas.AppImage"

# Limpia locks huérfanos de una sesión anterior colgada
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/bocasoft"
if [[ -L "$CFG/SingletonLock" ]]; then
  lock_target="$(readlink "$CFG/SingletonLock" || true)"
  lock_pid="${lock_target##*-}"
  if [[ -n "${lock_pid:-}" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
    rm -f "$CFG/SingletonLock" "$CFG/SingletonSocket" "$CFG/SingletonCookie"
  fi
fi

# Preferir AppImage (es lo que actualiza el updater). Nombre estable o el más reciente.
pick_appimage() {
  if [[ -x "$STABLE_APPIMAGE" ]]; then
    printf '%s\n' "$STABLE_APPIMAGE"
    return 0
  fi
  local newest=""
  local f
  shopt -s nullglob
  for f in "$DIR"/Intranet*.AppImage "$DIR"/*.AppImage; do
    [[ -x "$f" ]] || continue
    if [[ -z "$newest" || "$f" -nt "$newest" ]]; then
      newest="$f"
    fi
  done
  shopt -u nullglob
  if [[ -n "$newest" ]]; then
    printf '%s\n' "$newest"
    return 0
  fi
  return 1
}

if APPIMAGE_PATH="$(pick_appimage)"; then
  exec env APPIMAGE_EXTRACT_AND_RUN=1 "$APPIMAGE_PATH" "$@"
fi

if [[ -x "$UNPACKED" ]]; then
  exec "$UNPACKED" "$@"
fi

echo "No se encontró el binario de Intranet Ventas en: $DIR" >&2
exit 1
