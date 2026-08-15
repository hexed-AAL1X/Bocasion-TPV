const { nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, "../public/images/logo_gray_thermal.png"),
    path.join(__dirname, "../dist/images/logo_gray_thermal.png"),
    path.join(__dirname, "../public/images/logo_gray.png"),
    path.join(__dirname, "../dist/images/logo_gray.png"),
    path.join(__dirname, "../public/images/logo.png"),
    path.join(__dirname, "../dist/images/logo.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function imageToEscPosRaster(image) {
  const targetWidth = 176;
  const size = image.getSize();
  if (size.width <= 0 || size.height <= 0) {
    return Buffer.alloc(0);
  }

  const scale = Math.min(1, targetWidth / size.width);
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  const resized = image.resize({ width, height });
  const { width: w, height: h } = resized.getSize();
  const bmp = resized.toBitmap();
  const bytesPerRow = Math.ceil(w / 8);
  const raster = Buffer.alloc(bytesPerRow * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * bmp[i] + 0.587 * bmp[i + 1] + 0.114 * bmp[i + 2];
      if (lum < 165) {
        raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const header = Buffer.from([
    0x1d,
    0x76,
    0x30,
    0x00,
    bytesPerRow & 0xff,
    (bytesPerRow >> 8) & 0xff,
    h & 0xff,
    (h >> 8) & 0xff,
  ]);
  const center = Buffer.from([0x1b, 0x61, 0x01]);
  const left = Buffer.from([0x1b, 0x61, 0x00, 0x0a]);
  return Buffer.concat([center, header, raster, left]);
}

function loadLogoEscPos() {
  const logoPath = resolveLogoPath();
  if (!logoPath) {
    return Buffer.alloc(0);
  }
  const image = nativeImage.createFromPath(logoPath);
  if (image.isEmpty()) {
    return Buffer.alloc(0);
  }
  return imageToEscPosRaster(image);
}

module.exports = {
  loadLogoEscPos,
  resolveLogoPath,
};
