export type DocumentRecord = {
  id: string;
  codigo: string;
  nombre: string;
  registroCompra: boolean;
  ventaDirecta: boolean;
  codSunat: string;
};

type DocSeed = readonly [codigo: string, nombre: string, registroCompra?: boolean, ventaDirecta?: boolean, codSunat?: string];

function doc([codigo, nombre, registroCompra = false, ventaDirecta = false, codSunat]: DocSeed): DocumentRecord {
  return {
    id: `doc-${codigo}`,
    codigo,
    nombre,
    registroCompra,
    ventaDirecta,
    codSunat: codSunat ?? codigo,
  };
}

/** Tipos de documento 00–99 (100 registros) — TODO: cargar desde API / SQL Server */
const DOCUMENT_SEEDS: DocSeed[] = [
  ["00", "OTROS"],
  ["01", "FACTURA", true, true],
  ["02", "RECIBO HON.PROFESIONALES"],
  ["03", "BOLETA VTA", false, true],
  ["04", "LIQUIDACION: COMPRA"],
  ["05", "BOLETO LINEAS AEREAS"],
  ["06", "CARTA PORTE. AEREO"],
  ["07", "NOTA: CREDITO", true],
  ["08", "NOTA: DEBITO", true],
  ["09", "GUIA REMISION"],
  ["10", "RECIBO ARRENDAMIENTO"],
  ["11", "POLIZA B.VALORE"],
  ["12", "TICKET MAQ. REGISTRADORA", true, true],
  ["13", "DOC.EMIT. X INST. FINANC."],
  ["14", "RECIBO:AGUA,LUZ,TELEFONO", true],
  ["15", "BOLETO T.P.URB."],
  ["16", "BOLETO T.P.INT."],
  ["17", "DOCUM.IGLESIA CATOLICA"],
  ["18", "DOCUM. A.F.P."],
  ["19", "BOLETO ESPECT.P"],
  ["20", "COMPROB.RETENCION"],
  ["21", "SER.CARGA MARIT"],
  ["22", "OP. NO HABITUALES"],
  ["23", "POLIZA REMATE"],
  ["24", "CERT.REGAL.PETP"],
  ["25", "SOLICITUD DE CREDITO"],
  ["26", "RECIBO AGUA SUP"],
  ["27", "ND"],
  ["28", "ORDEN COMPRA"],
  ["29", "NOTA: INGRESO", false, false, ""],
  ["30", "NOTA: SALIDA", false, false, "00"],
  ["31", "COTIZACIONES", false, false, "00"],
  ["32", "PEDIDOS", false, true],
  ["33", "MANIFIESTO DE PASAJEROS"],
  ["34", "ORDEN PAGO"],
  ["35", "CHEQUE"],
  ["36", "CHEQUE PROTESTADO"],
  ["37", "RECIBO: C.CHICA"],
  ["38", "RECIBO: INGRESO", false, false, "00"],
  ["39", "RECIBO: EGRESO", false, false, "00"],
  ["40", "COMPROBANTE PERCEPCION"],
  ["41", "CONTRATO VTA"],
  ["42", "DOC EMIT EMPR ADQ TARJ CR", true],
  ["43", "BOLETO COMPAÑIA AVIACION", true],
  ["44", "ORDEN: ENTREGA", false, false, "00"],
  ["45", "DOC. CENTRO EDUCATIVO Y C"],
  ["46", "ND", false, false, ""],
  ["47", "ORDEN: PRODUCCION"],
  ["48", "COMP OPERACION LEY29972"],
  ["49", "PERCEPCION POR EMITIR"],
  ["50", "DUA", true],
  ["51", "POLIZA O DUI FRACCIONADA"],
  ["52", "DECLARACION SIMPLIFICADO", true],
  ["53", "DECL.MENSAJERIA O COUNTER"],
  ["54", "LIQ. COBRANZA"],
  ["55", "BVME TRANSPORTE FERROVIA"],
  ["56", "COMP.DE PAGO SEAE"],
  ["57", "FACTURA ( DIARIO)", false, false, "01"],
  ["58", "RECIBO PUBLICO (DIARIO)", false, false, "14"],
  ["59", "ND"],
  ["60", "DOCUMENTOS AUTORIZADOS TA", true, false, "30"],
  ["61", "ND", false, true, ""],
  ["62", "COMANDA"],
  ["63", "HOJA COSTO"],
  ["64", "PARTE DIARIO PROD"],
  ["65", "NOTA: VENTA", false, true],
  ["66", "ROL: COBRANZA"],
  ["67", "COMPROB. PERCEPCION"],
  ["68", "ND"],
  ["69", "PROFORMA AL PROVEEDOR"],
  ["70", "PEDIDO DE ALMACEN"],
  ["71", "GUIA REMISION REMITENTE"],
  ["72", "GUIA REMISION TRANSPORTIS"],
  ["73", "COMANDA2"],
  ["74", "NOTA: DESPACHO"],
  ["75", "LIQ.A.DIARIO", false, false, ""],
  ["76", "PLANILLA: EGRESO"],
  ["77", "PLANILLA: COBRANZA"],
  ["78", "PAGARE", false, false, "00"],
  ["79", "NOTA: DESPACHO"],
  ["80", "ND"],
  ["81", "ND"],
  ["82", "ND"],
  ["83", "ND"],
  ["84", "ND"],
  ["85", "ND"],
  ["86", "ND", false, false, ""],
  ["87", "NOTA DE CREDITO ESPECIAL"],
  ["88", "NOTA DE DEBITO ESPECIAL"],
  ["89", "NOTA AJUSTE OP LEY 29972"],
  ["90", "PERCEPCION VTA"],
  ["91", "COMPROBANTE NO DOMICILIAD", true],
  ["92", "ND"],
  ["93", "LEASING", true, false, ""],
  ["94", "ND"],
  ["95", "ND"],
  ["96", "EXCESO DE CREDITO FISCAL"],
  ["97", "NOTA DE CREDITO-NDOMI"],
  ["98", "NOTA DE DEBITO-NDOMI"],
  ["99", "ND"],
];

export const DOCUMENTS: DocumentRecord[] = DOCUMENT_SEEDS.map(doc);

export function sortDocuments(rows: DocumentRecord[]): DocumentRecord[] {
  return [...rows].sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export function formatDocumentCodigo(codigo: string, mode: "add" | "edit"): string {
  return mode === "add" ? codigo.padStart(2, "0") : codigo;
}

export function nextDocumentCodigo(existing: DocumentRecord[]): string {
  let max = -1;
  for (const row of existing) {
    const n = Number.parseInt(row.codigo, 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(2, "0");
}
