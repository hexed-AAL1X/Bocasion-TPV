export type SunatDocumentCode = {
  codigo: string;
  descripcion: string;
};

/** Catálogo SUNAT — Código de documento contable (Cod.enlace). */
export const SUNAT_DOCUMENT_CODES: SunatDocumentCode[] = [
  { codigo: "00", descripcion: "Otros" },
  { codigo: "01", descripcion: "Factura" },
  { codigo: "02", descripcion: "Recibo por Honorarios" },
  { codigo: "03", descripcion: "Boleta de Venta" },
  { codigo: "04", descripcion: "Liquidación de compra" },
  { codigo: "05", descripcion: "Boletos de Transporte Aéreo que emiten las Compañías de Aviación Comercial" },
  { codigo: "06", descripcion: "Carta de porte aéreo por el servicio de transporte de carga" },
  { codigo: "07", descripcion: "Nota de crédito" },
  { codigo: "08", descripcion: "Nota de débito" },
  { codigo: "09", descripcion: "Guía de remisión - Remitente" },
  { codigo: "10", descripcion: "Recibo por Arrendamiento" },
  { codigo: "11", descripcion: "Póliza emitida por las Bolsas de Valores, Bolsas de Productos o Agentes de Intermediación" },
  { codigo: "12", descripcion: "Ticket o cinta emitido por máquina registradora" },
  { codigo: "13", descripcion: "Documentos emitidos por las empresas del sistema financiero" },
  { codigo: "14", descripcion: "Recibo por servicios públicos de suministro de energía eléctrica, agua, teléfono" },
  { codigo: "15", descripcion: "Boletos emitidos por el servicio de transporte terrestre regular urbano" },
  { codigo: "16", descripcion: "Boletos de viaje emitidos por las empresas de transporte nacional de pasajeros" },
  { codigo: "20", descripcion: "Comprobante de Retención" },
  { codigo: "21", descripcion: "Conocimiento de embarque por el servicio de transporte de carga marítima" },
  { codigo: "22", descripcion: "Comprobante por Operaciones No Habituales" },
  { codigo: "23", descripcion: "Pólizas de Adjudicación emitidas con ocasión del remate o adjudicación de bienes" },
  { codigo: "24", descripcion: "Certificado de pago de regalías emitidas por PERUPETRO S.A." },
  { codigo: "25", descripcion: "Documento de Atribución (Ley del Impuesto General a las Ventas)" },
  { codigo: "26", descripcion: "Recibo por el Pago de la Tarifa por Uso de Agua Superficial" },
  { codigo: "27", descripcion: "Seguro Complementario de Trabajo de Riesgo" },
  { codigo: "28", descripcion: "Documentos emitidos por los servicios aeroportuarios" },
  { codigo: "29", descripcion: "Documentos emitidos por la COFOPRI en calidad de beneficiario de los pagos" },
  { codigo: "30", descripcion: "Documentos emitidos por las empresas que desempeñan el rol de agente de percepción" },
  { codigo: "31", descripcion: "Guía de Remisión - Transportista" },
  { codigo: "32", descripcion: "Documentos emitidos por las empresas recaudadoras de la Garantía de Red Principal" },
  { codigo: "33", descripcion: "Manifiesto de Pasajeros" },
  { codigo: "34", descripcion: "Documento del Operador" },
  { codigo: "35", descripcion: "Documento del Partícipe" },
  { codigo: "36", descripcion: "Recibo de Distribución de Gas Natural" },
  { codigo: "37", descripcion: "Documentos que emitan los concesionarios del servicio de revisiones técnicas" },
  { codigo: "40", descripcion: "Comprobante de Percepción" },
  { codigo: "41", descripcion: "Comprobante de Percepción - Venta interna" },
  { codigo: "42", descripcion: "Documentos emitidos por las empresas que desempeñan el rol de agente de retención" },
  { codigo: "43", descripcion: "Boletos emitidos por las Compañías de Aviación Comercial por el servicio de transporte" },
  { codigo: "44", descripcion: "Billetes de lotería, rifas y apuestas" },
  { codigo: "45", descripcion: "Documentos emitidos por centros educativos y culturales, universidades y fundaciones" },
  { codigo: "46", descripcion: "Formulario de Declaración - pago o Boleta de pago de tributos internos" },
  { codigo: "48", descripcion: "Comprobante de Operaciones - Ley N° 29972" },
  { codigo: "49", descripcion: "Constancia de Depósito - IVAP (Ley 28211)" },
  { codigo: "50", descripcion: "Póliza o DUI Fraccionada" },
  { codigo: "52", descripcion: "Despacho Simplificado - Importación Simplificada" },
  { codigo: "53", descripcion: "Declaración de Mensajería o Courier" },
  { codigo: "54", descripcion: "Liquidación de Cobranza" },
  { codigo: "55", descripcion: "BVME para transporte ferroviario de pasajeros" },
  { codigo: "56", descripcion: "Comprobante de pago SEAE" },
  { codigo: "71", descripcion: "Guía de remisión remitente complementaria" },
  { codigo: "72", descripcion: "Guía de remisión transportista complementaria" },
  { codigo: "87", descripcion: "Nota de Crédito Especial" },
  { codigo: "88", descripcion: "Nota de Débito Especial" },
  { codigo: "89", descripcion: "Nota de Ajuste de Operaciones - Ley N° 29972" },
  { codigo: "91", descripcion: "Comprobante de No Domiciliado" },
  { codigo: "96", descripcion: "Exceso de crédito fiscal por retiro de bienes" },
  { codigo: "97", descripcion: "Nota de Crédito - No Domiciliado" },
  { codigo: "98", descripcion: "Nota de Débito - No Domiciliado" },
];

const SUNAT_BY_CODE = new Map(SUNAT_DOCUMENT_CODES.map((item) => [item.codigo, item.descripcion]));

export function sunatDescription(codigo: string): string {
  return SUNAT_BY_CODE.get(codigo) ?? "Otros";
}

export function sunatSelectOptions(includeNone = true) {
  const options = SUNAT_DOCUMENT_CODES.map((item) => ({
    value: item.codigo,
    label: item.descripcion,
  }));
  if (includeNone) {
    return [...options, { value: "", label: "(Ninguno)" }];
  }
  return options;
}
