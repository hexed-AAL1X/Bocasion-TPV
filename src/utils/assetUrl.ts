/**
 * Ruta a un archivo de `public/` que funciona en Vite dev y en Electron empaquetado
 * (file:// con base relativa `./`).
 */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "./";
  return base.endsWith("/") ? `${base}${clean}` : `${base}/${clean}`;
}

export function imageUrl(pathUnderImages: string): string {
  const clean = pathUnderImages.replace(/^\/+/, "").replace(/^images\//, "");
  return assetUrl(`images/${clean}`);
}
