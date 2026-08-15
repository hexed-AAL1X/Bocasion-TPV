import geistMonoLatin400 from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2?inline";
import poppinsLatin400 from "@fontsource/poppins/files/poppins-latin-400-normal.woff2?inline";
import poppinsLatin700 from "@fontsource/poppins/files/poppins-latin-700-normal.woff2?inline";

function face(
  family: string,
  weight: number,
  style: "normal" | "italic",
  src: string,
): string {
  return `@font-face{font-family:${family};font-style:${style};font-weight:${weight};font-display:swap;src:url(${src}) format("woff2");}`;
}

const GEIST_MONO_400 = face('"Geist Mono"', 400, "normal", geistMonoLatin400);
const POPPINS_400 = face('"Poppins"', 400, "normal", poppinsLatin400);
const POPPINS_700 = face('"Poppins"', 700, "normal", poppinsLatin700);

/** @font-face embebidos para HTML de impresión (archivo temporal sin acceso a /assets). */
export function buildPrintFontFaceCss(fontFamily: string): string {
  const parts: string[] = [];
  if (/geist mono/i.test(fontFamily)) {
    parts.push(GEIST_MONO_400);
  }
  if (/poppins/i.test(fontFamily)) {
    parts.push(POPPINS_400, POPPINS_700);
  }
  return parts.join("");
}
