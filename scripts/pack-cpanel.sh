#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/deploy/cpanel-bocasoft-api"
OUT="$ROOT/release"
ZIP="$OUT/bocasoft-api-cpanel.zip"

mkdir -p "$OUT"
rm -f "$ZIP"
(cd "$SRC" && zip -rq "$ZIP" . -x "*.DS_Store")

echo "✓ $ZIP"
echo "  Sube y extrae en public_html/bocasoft-api/ (cPanel)"
