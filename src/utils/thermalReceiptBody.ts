import type { PreviewRow, RowVariant } from "./buildThermalPrintPreview";

/** Verde ERP para filas de total (vista e impresión). */
export const THERMAL_TOTAL_COLOR = "#1a7a1a";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Marca espacios con fondo sin cambiar el ancho (solo vista previa). */
function visHtml(text: string, showWhitespace: boolean): string {
  const escaped = esc(text);
  if (!showWhitespace) return escaped;
  return escaped.replace(/ /g, '<span class="tr-wsp"> </span>');
}

function variantClass(variant?: RowVariant): string {
  if (variant === "total") return " tr-total";
  if (variant === "section") return " tr-section";
  return "";
}

function totalInlineStyle(variant?: RowVariant): string {
  if (variant !== "total") return "";
  return ` style="color:${THERMAL_TOTAL_COLOR};font-weight:700"`;
}

function cols3Layout(c2: string, c3: string): "one" | "two" | "three" {
  const hasMid = Boolean(c2.trim());
  const hasRight = Boolean(c3.trim());
  if (hasMid && hasRight) return "three";
  if (hasMid || hasRight) return "two";
  return "one";
}

function renderCols3(row: Extract<PreviewRow, { kind: "cols3" }>, showWhitespace: boolean): string {
  const c1 = visHtml(row.c1, showWhitespace);
  const c2 = visHtml(row.c2, showWhitespace);
  const c3 = visHtml(row.c3, showWhitespace);
  const layout = cols3Layout(row.c2, row.c3);
  const vc = variantClass(row.variant);
  const ts = totalInlineStyle(row.variant);

  if (layout === "one") {
    return `<div class="tr-row tr-row1${vc}"${ts}><span class="tr-left">${c1}</span></div>`;
  }
  if (layout === "two") {
    const right = c3.trim() ? c3 : c2;
    return `<div class="tr-row tr-row2${vc}"${ts}><span class="tr-left">${c1}</span><span class="tr-right">${right}</span></div>`;
  }
  return `<div class="tr-row tr-row3${vc}"${ts}><span class="tr-left">${c1}</span><span class="tr-mid">${c2}</span><span class="tr-right">${c3}</span></div>`;
}

export function buildThermalReceiptBodyHtml(
  rows: PreviewRow[],
  options?: { showWhitespace?: boolean },
): string {
  const showWhitespace = options?.showWhitespace ?? false;
  const parts: string[] = [];

  for (const row of rows) {
    if (row.kind === "blank") {
      parts.push('<div class="tr-blank"></div>');
    } else if (row.kind === "separator") {
      parts.push('<hr class="tr-rule" />');
    } else if (row.kind === "header") {
      const text = visHtml(row.text.trim(), showWhitespace);
      if (row.address) {
        parts.push(`<div class="tr-center tr-address">${text}</div>`);
      } else if (row.title) {
        parts.push(`<div class="tr-center tr-title">${text}</div>`);
      } else {
        parts.push(`<div class="tr-center">${text}</div>`);
      }
    } else if (row.kind === "meta" || row.kind === "fixed" || row.kind === "listMeta") {
      const vc = variantClass(row.variant);
      parts.push(
        `<div class="tr-meta${vc}"${totalInlineStyle(row.variant)}>${visHtml(row.text, showWhitespace)}</div>`,
      );
    } else if (row.kind === "decor") {
      const cls =
        row.style === "double"
          ? "tr-decor tr-decor-double"
          : row.style === "dotted"
            ? "tr-decor tr-decor-dotted"
            : "tr-decor tr-decor-single";
      parts.push(`<div class="${cls}">${visHtml(row.text, showWhitespace)}</div>`);
    } else if (row.kind === "metaField") {
      const valueInner = row.timeRange
        ? `<span class="tr-value-text">${visHtml(row.value, showWhitespace)}</span><span class="tr-time-sep"> · </span><span class="tr-time">${visHtml(row.timeRange, showWhitespace)}</span>`
        : visHtml(row.value, showWhitespace);
      parts.push(
        `<div class="tr-meta-field"><span class="tr-meta-label">${visHtml(row.label, showWhitespace)}:</span><span class="tr-value">${valueInner}</span></div>`,
      );
    } else if (row.kind === "cols3") {
      parts.push(renderCols3(row, showWhitespace));
    }
  }

  return parts.join("");
}

/**
 * Grid 3 columnas: centro ligeramente a la derecha, importes con ancho mínimo.
 */
export const THERMAL_ROW3_GRID_COLUMNS = "minmax(0,1.38fr) auto minmax(6.5em,0.86fr)";

/**
 * 3 columnas: izq | centro (Cantidad/%) | der (importes).
 */
export const THERMAL_RECEIPT_ROW_CSS = `
.tr-body{width:100%;box-sizing:border-box;font-variant-numeric:tabular-nums;color:#000;}
.tr-blank{height:0.25em;}
.tr-rule{border:none;border-top:1px solid #000;margin:3px 0;height:0;width:100%;}
.tr-center{text-align:center;width:100%;line-height:1.2;}
.tr-title{font-weight:700;font-size:inherit;letter-spacing:normal;margin:0.15em 0 0.25em;}
.tr-address{font-size:1em;line-height:1.25;white-space:normal;overflow-wrap:break-word;word-break:normal;}
.tr-decor{width:100%;line-height:1;white-space:nowrap;overflow:hidden;margin:1px 0;font-size:0.95em;letter-spacing:0;}
.tr-decor-double{font-weight:700;}
.tr-decor-single{opacity:0.92;}
.tr-decor-dotted{letter-spacing:0.12em;opacity:0.85;}
.tr-meta-field{display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:0.35em;align-items:baseline;width:100%;margin:0.12em 0;}
.tr-meta-field .tr-meta-label{font-weight:600;white-space:nowrap;min-width:10ch;display:inline-block;}
.tr-meta-field .tr-value{display:flex;align-items:baseline;min-width:0;overflow:hidden;}
.tr-meta-field .tr-value-text{overflow:hidden;text-overflow:clip;white-space:nowrap;min-width:0;flex:0 1 auto;}
.tr-meta-field .tr-time-sep{flex:0 0 auto;}
.tr-meta-field .tr-time{flex:0 0 auto;white-space:nowrap;font-weight:700;}
.tr-meta{text-align:left;width:100%;}
.tr-meta.tr-total{color:${THERMAL_TOTAL_COLOR};font-weight:700;}
.tr-row{display:grid;width:100%;column-gap:4px;align-items:baseline;}
.tr-row1{grid-template-columns:minmax(0,1fr);}
.tr-row2{grid-template-columns:minmax(0,1fr) max-content;}
.tr-row3{grid-template-columns:${THERMAL_ROW3_GRID_COLUMNS};}
.tr-row3 > *{min-width:0;}
.tr-row .tr-left{display:block;width:100%;max-width:100%;justify-self:stretch;text-align:left;overflow:hidden;text-overflow:clip;white-space:nowrap;}
.tr-section .tr-left{letter-spacing:-0.01em;}
.tr-row2 .tr-right{justify-self:end;text-align:right;white-space:nowrap;}
.tr-row3 .tr-mid{grid-column:2;justify-self:center;text-align:center;white-space:nowrap;padding-left:0.5em;padding-right:0.2em;}
.tr-row3 .tr-right{grid-column:3;justify-self:end;text-align:right;white-space:nowrap;min-width:0;overflow:visible;}
.tr-section .tr-left,.tr-section .tr-mid,.tr-section .tr-right{font-weight:700;}
.tr-total,.tr-total .tr-left,.tr-total .tr-mid,.tr-total .tr-right{color:${THERMAL_TOTAL_COLOR};font-weight:700;}
.tr-wsp{background:rgba(0,0,0,0.14);}
`;
