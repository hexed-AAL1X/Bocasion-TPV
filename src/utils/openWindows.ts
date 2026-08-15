export type OpenWindowsSnapshot = {
  tpvOpen: boolean;
  tpvTabCount: number;
  salesDayOpen: boolean;
  cashCountOpen: boolean;
  cashOpeningOpen: boolean;
  paymentEditOpen: boolean;
  paymentOpen: boolean;
  changeSellerOpen: boolean;
  saleTypeOpen: boolean;
  clientSelectorOpen: boolean;
  bolsaKeyboardOpen: boolean;
  quantityOpen: boolean;
  discountOpen: boolean;
  almacenesOpen: boolean;
  transportistasOpen: boolean;
  vendedoresOpen: boolean;
  documentosOpen: boolean;
  condicionesVentaOpen: boolean;
  categoriasClienteOpen: boolean;
  puntosVentaOpen: boolean;
  comandaOpen: boolean;
  navaBoletasOpen: boolean;
  navaFacturasOpen: boolean;
  batchPrintOpen: boolean;
  pageSetupOpen: boolean;
};

export function collectOpenWindowLabels(snapshot: OpenWindowsSnapshot): string[] {
  const labels: string[] = [];

  if (snapshot.tpvOpen) {
    const suffix = snapshot.tpvTabCount > 1 ? ` (${snapshot.tpvTabCount} pestañas)` : "";
    labels.push(`TPV - Terminal Punto de Venta${suffix}`);
  }
  if (snapshot.salesDayOpen) labels.push("Monitor de Ventas");
  if (snapshot.cashCountOpen) labels.push("Arqueo de efectivo");
  if (snapshot.cashOpeningOpen) labels.push("Apertura de Caja");
  if (snapshot.paymentEditOpen) labels.push("Anexo de documentos");
  if (snapshot.paymentOpen) labels.push("Cobro");
  if (snapshot.changeSellerOpen) labels.push("Cambiar vendedor");
  if (snapshot.saleTypeOpen) labels.push("Tipo de venta");
  if (snapshot.clientSelectorOpen) labels.push("Selector de clientes");
  if (snapshot.bolsaKeyboardOpen) labels.push("Búsqueda de clientes");
  if (snapshot.quantityOpen) labels.push("Cantidad");
  if (snapshot.discountOpen) labels.push("Descuento");
  if (snapshot.almacenesOpen) labels.push("Almacenes");
  if (snapshot.transportistasOpen) labels.push("Transportistas");
  if (snapshot.vendedoresOpen) labels.push("Vendedores");
  if (snapshot.documentosOpen) labels.push("Documentos");
  if (snapshot.condicionesVentaOpen) labels.push("Condiciones de venta");
  if (snapshot.categoriasClienteOpen) labels.push("Categorías cliente");
  if (snapshot.puntosVentaOpen) labels.push("Puntos de emisión de documentos");
  if (snapshot.comandaOpen) labels.push("Comanda");
  if (snapshot.navaBoletasOpen) labels.push("Boletas vta.");
  if (snapshot.navaFacturasOpen) labels.push("Facturas");
  if (snapshot.batchPrintOpen) labels.push("Impresión de Doc. x Lotes");
  if (snapshot.pageSetupOpen) labels.push("Configurar página");

  return labels;
}

export function formatOpenWindowsMessage(labels: string[]): string {
  return labels.join(", ");
}
