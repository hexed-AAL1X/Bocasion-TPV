#!/usr/bin/env bash
# Dependencias de sistema para compilar Tauri en Ubuntu/Debian.
set -euo pipefail
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  build-essential \
  file
echo "OK: deps Tauri instaladas."
