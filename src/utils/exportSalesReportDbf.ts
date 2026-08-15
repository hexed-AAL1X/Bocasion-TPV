import type { SalesReportExportData } from "./exportSalesReportXls";
import type { DocsAnnexPrintData } from "./buildDocsAnnexPrintPreview";

type DbfField = { name: string; type: "C" | "N"; length: number; decimals?: number };

/** Visual FoxPro / dBase III+ sin memo — mejor compatibilidad con LibreOffice y Excel. */
const DBF_VERSION = 0x30;

function writeFieldName(view: DataView, offset: number, name: string): void {
  const text = name.toUpperCase().slice(0, 10);
  for (let i = 0; i < 10; i += 1) {
    view.setUint8(offset + i, i < text.length ? text.charCodeAt(i) : 0);
  }
  view.setUint8(offset + 10, 0);
}

function encodeFieldText(value: string, maxLen: number): Uint8Array {
  const bytes = new Uint8Array(maxLen);
  const text = value.slice(0, maxLen);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    bytes[i] = code < 256 ? code : 63;
  }
  for (let i = text.length; i < maxLen; i += 1) {
    bytes[i] = 0x20;
  }
  return bytes;
}

function writeAscii(view: DataView, offset: number, text: string, len: number): void {
  for (let i = 0; i < len; i += 1) {
    const code = i < text.length ? text.charCodeAt(i) : 0x20;
    view.setUint8(offset + i, code < 256 ? code : 63);
  }
}

function formatNumeric(value: number, length: number, decimals: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const text = safe.toFixed(decimals);
  if (text.length <= length) return text.padStart(length, " ");
  return text.slice(-length);
}

export function buildDbfBuffer(
  fields: DbfField[],
  rows: Array<Array<string | number>>,
): Uint8Array {
  const headerSize = 32 + fields.length * 32 + 1;
  const recordSize = 1 + fields.reduce((sum, field) => sum + field.length, 0);
  const buffer = new Uint8Array(headerSize + rows.length * recordSize + 1);
  const view = new DataView(buffer.buffer);

  view.setUint8(0, DBF_VERSION);
  const now = new Date();
  view.setUint8(1, now.getFullYear() - 1900);
  view.setUint8(2, now.getMonth() + 1);
  view.setUint8(3, now.getDate());
  view.setUint32(4, rows.length, true);
  view.setUint16(8, headerSize, true);
  view.setUint16(10, recordSize, true);

  let fieldOffset = 32;
  let dataOffset = 1;
  for (const field of fields) {
    writeFieldName(view, fieldOffset, field.name);
    view.setUint8(fieldOffset + 11, field.type.charCodeAt(0));
    view.setUint32(fieldOffset + 12, dataOffset, true);
    view.setUint8(fieldOffset + 16, field.length);
    view.setUint8(fieldOffset + 17, field.decimals ?? 0);
    fieldOffset += 32;
    dataOffset += field.length;
  }
  view.setUint8(fieldOffset, 0x0d);

  let rowOffset = headerSize;
  for (const row of rows) {
    view.setUint8(rowOffset, 0x20);
    let colOffset = rowOffset + 1;
    fields.forEach((field, index) => {
      const raw = row[index];
      if (field.type === "N") {
        const num = typeof raw === "number" ? raw : Number(raw) || 0;
        const text = formatNumeric(num, field.length, field.decimals ?? 0);
        writeAscii(view, colOffset, text, field.length);
      } else {
        const bytes = encodeFieldText(String(raw ?? ""), field.length);
        buffer.set(bytes, colOffset);
      }
      colOffset += field.length;
    });
    rowOffset += recordSize;
  }
  view.setUint8(rowOffset, 0x1a);
  return buffer;
}

export function getSalesReportDbfContent(data: SalesReportExportData): Uint8Array {
  const fields: DbfField[] = [
    { name: "SECCION", type: "C", length: 20 },
    { name: "CAMPO", type: "C", length: 40 },
    { name: "VALOR", type: "C", length: 24 },
    { name: "NUMERO", type: "N", length: 12, decimals: 2 },
  ];

  const rows: Array<Array<string | number>> = [
    ["DOCS", "boleta", String(data.docs.boletas), data.docs.boletas],
    ["DOCS", "nota vta", String(data.docs.notas), data.docs.notas],
    ["DOCS", "factura", String(data.docs.facturas), data.docs.facturas],
    ["DOCS", "anulados", String(data.docs.anulados), data.docs.anulados],
    ["VENTA", "contado", "", data.monetary.contado],
    ["VENTA", "credito", "", data.monetary.credito],
    ["VENTA", "total", "", data.monetary.total],
    ["TOTAL", "lineas", "", data.grandTotal],
  ];

  for (const group of data.groups) {
    rows.push(["GRUPO", group.group, `${group.percent.toFixed(2)}%`, group.total]);
  }
  for (const article of data.articles) {
    rows.push(["ARTICULO", article.description, `${article.qty.toFixed(2)} UND`, article.total]);
  }

  return buildDbfBuffer(fields, rows);
}

export function getDocsAnnexDbfContent(data: DocsAnnexPrintData): Uint8Array {
  const fields: DbfField[] = [
    { name: "FECREG", type: "C", length: 20 },
    { name: "DOCUMENTO", type: "C", length: 18 },
    { name: "CLIENTE", type: "C", length: 40 },
    { name: "TOTAL", type: "N", length: 12, decimals: 2 },
    { name: "CONTADO", type: "N", length: 12, decimals: 2 },
    { name: "CREDITO", type: "N", length: 12, decimals: 2 },
    { name: "FORPAGO", type: "C", length: 16 },
    { name: "VENDEDOR", type: "C", length: 16 },
  ];

  const rows: Array<Array<string | number>> = data.rows.map((r) => [
    r.fecreg,
    r.documento,
    r.cliente,
    r.total,
    r.contado,
    r.credito,
    r.forpago,
    r.vendedor,
  ]);

  return buildDbfBuffer(fields, rows);
}
