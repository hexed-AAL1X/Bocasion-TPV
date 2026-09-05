import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RibbonTabId } from "../data/ribbon";
import type { SaleLine } from "./POSTerminal/POSTerminal";
import type { DocTab } from "./DocumentTabs";
import {
  fetchIdentity,
  formatDocumentLabel,
  formatClienteLabel,
  normalizeDocument,
} from "../services/identity";
import { openAppDialog, getOpenAppDialogs } from "../services/appDialogs";
import {
  clearWorkspaceTabFocus,
  closeWorkspaceTab,
  useWorkspaceTabs,
} from "../services/workspaceTabs";
import { Ribbon } from "./Ribbon/Ribbon";
import { ArchivoPanel } from "./Ribbon/ArchivoPanel";
import { DocumentTabs } from "./DocumentTabs";
import { SideTabs } from "./SideTabs";
import { POSTerminal } from "./POSTerminal/POSTerminal";
import { AdminPanel } from "./AdminPanel/AdminPanel";
import { TaskPanel } from "./TaskPanel/TaskPanel";
import { PaymentDialog } from "./PaymentDialog/PaymentDialog";
import { QuantityDialog } from "./QuantityDialog/QuantityDialog";
import { DiscountDialog } from "./DiscountDialog/DiscountDialog";
import { OtherFunctionsMenu } from "./OtherFunctionsMenu/OtherFunctionsMenu";
import { AppDialogHost } from "./AppDialogHost";
import { StatusBar } from "./StatusBar";
import { persistSaleToNava } from "../services/navaDocs";
import { closeSalesSession, registerSale, warmSalesDaySnapshot } from "../services/salesSession";
import { getEfficientMode } from "../services/performanceSettings";
import type { PaymentConfirmPayload, PaymentMethod, SaleDocType } from "../types/sales";
import type { Vendor } from "../data/vendors";
import { DEFAULT_SALE_TYPE, isSpecialSaleType } from "../data/saleTypes";
import type { Product } from "../data/productCatalog";
import type { Client } from "../data/clients";
import { collectOpenWindowLabels } from "../utils/openWindows";

import styles from "./AppShell.module.css";

const ProductosPadronPanel = lazy(() =>
  import("./ProductosDialog/ProductosDialog").then((m) => ({ default: m.ProductosPadronPanel })),
);

type Props = {
  vendor: Vendor;
  onChangeVendor: (vendor: Vendor) => void;
  onExit: () => void;
};

export function AppShell({ vendor, onChangeVendor, onExit }: Props) {
  const [activeRibbon, setActiveRibbon] = useState<RibbonTabId>("inicio");
  const [docDigits, setDocDigits] = useState("");
  const [docLabel, setDocLabel] = useState("");
  const [nombre, setNombre] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [rucDniMode, setRucDniMode] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const lastFetchedRef = useRef("");

  const [tpvTabs, setTpvTabs] = useState<string[]>(["tpv-1"]);
  const [activeDocTab, setActiveDocTab] = useState<DocTab>("tpv-1");
  const { tabs: workspaceTabs, focusId: workspaceFocusId } = useWorkspaceTabs();
  const padronMounted = workspaceTabs.some((tab) => tab.id === "padron-items");
  const padronActive = activeDocTab === "padron-items";

  useEffect(() => {
    if (!workspaceFocusId) return;
    setActiveDocTab(workspaceFocusId);
    clearWorkspaceTabFocus();
  }, [workspaceFocusId]);

  const handleCloseWorkspaceTab = useCallback(
    (id: string) => {
      closeWorkspaceTab(id);
      if (activeDocTab !== id) return;
      setActiveDocTab((prev) => {
        if (prev !== id) return prev;
        if (tpvTabs.length > 0) return tpvTabs[tpvTabs.length - 1];
        return "task";
      });
    },
    [activeDocTab, tpvTabs],
  );
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [exitingLineIds, setExitingLineIds] = useState<string[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showDiscountClientError, setShowDiscountClientError] = useState(false);
  const [showDiscountSelectError, setShowDiscountSelectError] = useState(false);
  const [showDiscountEmptyError, setShowDiscountEmptyError] = useState(false);
  const [showOtherFunctions, setShowOtherFunctions] = useState(false);
  const [catalogMode, setCatalogMode] = useState(false);
  const [saleType, setSaleType] = useState(DEFAULT_SALE_TYPE);

  useEffect(() => {
    if (activeDocTab === "task") setShowOtherFunctions(false);
  }, [activeDocTab]);

  useEffect(() => {
    if (activeRibbon === "archivo") {
      setShowOtherFunctions(false);
      setCatalogMode(false);
    }
  }, [activeRibbon]);

  // Prefetch monitor de ventas en idle (click instantáneo). En modo eficiente se omite.
  useEffect(() => {
    if (getEfficientMode()) return;
    const warm = () => warmSalesDaySnapshot();
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warm, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timerId = window.setTimeout(warm, 400);
    return () => window.clearTimeout(timerId);
  }, []);

  const handleAddTpv = useCallback(() => {
    const id = `tpv-${Date.now()}`;
    setTpvTabs((prev) => [...prev, id]);
    setActiveDocTab(id);
  }, []);

  const handleCloseTpv = useCallback((id: string) => {
    setTpvTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      if (next.length === 0) {
        const newId = `tpv-${Date.now()}`;
        setActiveDocTab(newId);
        return [newId];
      }
      if (activeDocTab === id) {
        setActiveDocTab(next[next.length - 1]);
      }
      return next;
    });
  }, [activeDocTab]);

  /* ─── Sale lines ─── */
  const handleAddLine = useCallback((line: SaleLine) => {
    setLines((prev) => [...prev, line]);
    setSelectedLineId(null);
    setShowDiscountEmptyError(false);
  }, []);

  const handleAddProduct = useCallback(
    (product: Product) => {
      handleAddLine({
        id: `${Date.now()}`,
        code: product.code,
        description: product.description,
        group: product.group,
        qty: 1,
        um: "UND",
        unitPrice: product.price,
        dscto: 0,
      });
    },
    [handleAddLine],
  );

  const handleDelete = useCallback(() => {
    if (lines.length === 0) {
      setShowDiscountEmptyError(true);
      return;
    }
    const idToRemove = selectedLineId ?? lines[lines.length - 1]?.id;
    if (!idToRemove) return;
    if (exitingLineIds.includes(idToRemove)) return;

    setSelectedLineId(null);
    setExitingLineIds((prev) => [...prev, idToRemove]);
    window.setTimeout(() => {
      setLines((prev) => prev.filter((l) => l.id !== idToRemove));
      setExitingLineIds((prev) => prev.filter((id) => id !== idToRemove));
    }, 380);
  }, [lines, selectedLineId, exitingLineIds]);

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.dscto / 100), 0);

  /* ─── Quantity ─── */
  const handleOpenQuantity = useCallback(() => {
    if (lines.length === 0) {
      setShowDiscountEmptyError(true);
      return;
    }
    if (!selectedLineId) {
      setSelectedLineId(lines[lines.length - 1].id);
    }
    setShowQuantity(true);
  }, [lines, selectedLineId]);

  const handleConfirmQuantity = useCallback((qty: number) => {
    const targetId = selectedLineId || (lines.length > 0 ? lines[lines.length - 1].id : null);
    if (!targetId) return;
    setLines((prev) => prev.map((l) => (l.id === targetId ? { ...l, qty } : l)));
    setShowQuantity(false);
  }, [selectedLineId, lines]);

  /* ─── Discount ─── */
  const handleOpenDiscount = useCallback(() => {
    if (!rucDniMode || !identityVerified) {
      setShowDiscountClientError(true);
      setShowDiscountSelectError(false);
      setShowDiscountEmptyError(false);
      return;
    }
    setShowDiscountClientError(false);
    if (lines.length === 0) {
      setShowDiscountEmptyError(true);
      setShowDiscountSelectError(false);
      return;
    }
    setShowDiscountEmptyError(false);
    if (lines.length >= 2 && !selectedLineId) {
      setShowDiscountSelectError(true);
      return;
    }
    setShowDiscountSelectError(false);
    if (!selectedLineId) {
      setSelectedLineId(lines[lines.length - 1].id);
    }
    setShowDiscount(true);
  }, [lines, selectedLineId, rucDniMode, identityVerified]);

  const handleSelectLine = useCallback((id: string | null) => {
    setSelectedLineId(id);
    if (id) setShowDiscountSelectError(false);
  }, []);

  const handleConfirmDiscount = useCallback((dscto: number) => {
    const targetId = selectedLineId || (lines.length > 0 ? lines[lines.length - 1].id : null);
    if (!targetId) return;
    setLines((prev) => prev.map((l) => (l.id === targetId ? { ...l, dscto } : l)));
    setShowDiscount(false);
  }, [selectedLineId, lines]);

  /* ─── Payment ─── */
  const handleOpenPayment = useCallback(() => {
    setShowPayment(true);
  }, []);

  const handleClosePayment = useCallback(() => {
    setShowPayment(false);
  }, []);

  const handleConfirmPayment = useCallback(
    (method: PaymentMethod, payment: PaymentConfirmPayload) => {
      if (lines.length > 0 && total > 0) {
        const docType: SaleDocType =
          rucDniMode && identityVerified && docDigits.length === 11 ? "factura" : "boleta";
        const isDni = rucDniMode && identityVerified && docDigits.length === 8;
        const isRuc = rucDniMode && identityVerified && docDigits.length === 11;
        const clienteLabel =
          nombre && (isDni || isRuc)
            ? formatClienteLabel(nombre, isDni ? "dni" : "ruc", docDigits)
            : "Venta Contado";
        void (async () => {
          const { syncDocSequencesFromNava } = await import("../services/navaDocs");
          await syncDocSequencesFromNava();
          const sale = registerSale({
            docType,
            paymentMethod: method,
            clienteLabel,
            vendedor: vendor.usuario,
            lines,
            total,
            tipoVenta: saleType,
            payment,
          });
          await persistSaleToNava(sale, vendor.code);
        })();
      }
      setShowPayment(false);
      setLines([]);
      setSelectedLineId(null);
      setDocDigits("");
      setDocLabel("");
      setNombre("");
      setIdentityVerified(false);
      setRucDniMode(false);
      lastFetchedRef.current = "";
    },
    [lines, total, rucDniMode, identityVerified, docDigits, nombre, vendor, saleType],
  );

  /* ─── RUC / DNI lookup ─── */
  const runLookup = useCallback(async (digits: string) => {
    const parsed = normalizeDocument(digits);
    if (!parsed) return;

    if (lastFetchedRef.current === digits) return;

    setLookupLoading(true);
    setLookupError(null);

    try {
      const result = await fetchIdentity(digits);
      lastFetchedRef.current = digits;
      setDocDigits(result.document);
      setDocLabel(formatDocumentLabel(result.type, result.document));
      setNombre(result.name.toUpperCase());
      setIdentityVerified(true);
    } catch (err) {
      lastFetchedRef.current = "";
      setDocLabel("");
      setNombre("");
      setIdentityVerified(false);
      setLookupError(err instanceof Error ? err.message : "Error al consultar");
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const handleDocDigitsChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setDocDigits(digits);
    setDocLabel("");
    setNombre("");
    setLookupError(null);
    setIdentityVerified(false);
    if (digits !== lastFetchedRef.current) {
      lastFetchedRef.current = "";
    }
  }, []);

  useEffect(() => {
    if (!rucDniMode) return;
    if (docDigits.length !== 8 && docDigits.length !== 11) return;

    const timer = window.setTimeout(() => {
      runLookup(docDigits);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [docDigits, runLookup, rucDniMode]);

  const handleLookupErrorDismiss = useCallback(() => setLookupError(null), []);
  const handleDiscountClientErrorDismiss = useCallback(() => setShowDiscountClientError(false), []);
  const handleDiscountSelectErrorDismiss = useCallback(() => setShowDiscountSelectError(false), []);
  const handleDiscountEmptyErrorDismiss = useCallback(() => setShowDiscountEmptyError(false), []);

  const handleSelectClient = useCallback((client: Client) => {
    setRucDniMode(true);
    setDocDigits(client.document);
    setDocLabel(
      client.type === "dni"
        ? `DNI ${client.document}`
        : `RUC ${client.document}`,
    );
    setNombre(client.name.toUpperCase());
    setIdentityVerified(true);
    lastFetchedRef.current = client.document;
    setLookupError(null);
  }, []);

  useEffect(() => {
    if (rucDniMode && identityVerified) {
      setShowDiscountClientError(false);
    }
  }, [rucDniMode, identityVerified]);

  const handleToggleRucDni = useCallback(() => {
    setRucDniMode((active) => {
      if (active) {
        setDocDigits("");
        setDocLabel("");
        setNombre("");
        setLookupError(null);
        setIdentityVerified(false);
        lastFetchedRef.current = "";
        return false;
      }
      return true;
    });
  }, []);

  const isArchivoView = activeRibbon === "archivo";
  const ribbonAutoHide = !isArchivoView;
  const [ribbonPinned, setRibbonPinned] = useState(false);

  useEffect(() => {
    if (isArchivoView) setRibbonPinned(false);
  }, [isArchivoView]);

  useEffect(() => {
    if (!ribbonAutoHide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        setRibbonPinned((pinned) => !pinned);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ribbonAutoHide]);

  const openWindows = useMemo(() => {
    const d = getOpenAppDialogs();
    return collectOpenWindowLabels({
      tpvOpen: true,
      tpvTabCount: tpvTabs.length,
      salesDayOpen: d.salesDay,
      cashCountOpen: d.cashCount,
      cashOpeningOpen: d.cashOpening,
      almacenesOpen: d.almacenes,
      transportistasOpen: d.transportistas,
      vendedoresOpen: d.vendedores,
      documentosOpen: d.documentos,
      condicionesVentaOpen: d.condicionesVenta,
      categoriasClienteOpen: d.categoriasCliente,
      puntosVentaOpen: d.puntosVenta,
      comandaOpen: d.comanda,
      navaBoletasOpen: d.navaBoletas,
      navaFacturasOpen: d.navaFacturas,
      batchPrintOpen: d.batchPrint,
      pageSetupOpen: d.pageSetup,
      paymentEditOpen: d.paymentEdit || d.docsAnnex,
      paymentOpen: showPayment,
      changeSellerOpen: d.changeSeller,
      saleTypeOpen: d.saleType,
      clientSelectorOpen: d.clientSelector,
      bolsaKeyboardOpen: d.bolsaKeyboard,
      quantityOpen: showQuantity,
      discountOpen: showDiscount,
    });
  }, [tpvTabs.length, showPayment, showQuantity, showDiscount, activeRibbon]);

  const handleAppExit = useCallback(() => {
    window.close();
    onExit();
  }, [onExit]);

  const handleEntidadesAction = useCallback((actionId: string) => {
    // La mayoría abre desde EntidadesRibbon (pointerdown). Esto cubre acciones sin diálogo mapeado.
    if (actionId === "apertura-almacen") openAppDialog("almacenes");
    else if (actionId === "transportistas") openAppDialog("transportistas");
    else if (actionId === "vendedores") openAppDialog("vendedores");
    else if (actionId === "documentos") openAppDialog("documentos");
    else if (actionId === "condiciones-venta") openAppDialog("condicionesVenta");
    else if (actionId === "categorias-cliente") openAppDialog("categoriasCliente");
    else if (actionId === "puntos-venta") openAppDialog("puntosVenta");
  }, []);

  const handleProductCatalog = useCallback(() => {
    setCatalogMode((active) => !active);
  }, []);

  const handleChangeSeller = useCallback(() => {
    openAppDialog("changeSeller");
  }, []);

  const handleSaleType = useCallback(() => {
    openAppDialog("saleType");
  }, []);

  const handleSalesDay = useCallback(() => {
    openAppDialog("salesDay");
  }, []);

  const handleBolsa = useCallback(() => {
    openAppDialog("bolsaKeyboard");
  }, []);

  const handleNota = useCallback(() => {
    openAppDialog("comanda");
  }, []);

  const handleOtrasFunc = useCallback(() => {
    setShowOtherFunctions((open) => !open);
  }, []);

  const handleCierre = useCallback(() => {
    closeSalesSession();
  }, []);

  const handleOpenBatchPrint = useCallback(() => {
    openAppDialog("batchPrint");
  }, []);

  const handleOpenPageSetup = useCallback(() => {
    openAppDialog("pageSetup");
  }, []);

  const handleOtherFuncAction = useCallback((action: string) => {
    if (action === "open-sale-type") openAppDialog("saleType");
    else if (action === "open-sales-day") openAppDialog("salesDay");
    else if (action === "open-cash-count") openAppDialog("cashCount");
    else if (action === "open-cash-opening") openAppDialog("cashOpening");
    else if (action === "open-payment-edit") openAppDialog("paymentEdit");
  }, []);

  const handleWarmSalesDay = useCallback(() => {
    warmSalesDaySnapshot();
    void import("./SalesDayMonitor/SalesDayMonitor");
    void import("./SalesDayMonitor/DocsAnnexDialog");
  }, []);

  return (
    <div className={styles.shell}>
      <Ribbon
        activeTab={activeRibbon}
        onTabChange={setActiveRibbon}
        compact={ribbonAutoHide && !ribbonPinned}
        onEntidadesAction={handleEntidadesAction}
      />

      <div className={[styles.body, !isArchivoView && styles.bodyTpv].filter(Boolean).join(" ")}>
        {!isArchivoView ? (
          <div className={styles.sideColLeft}>
            <SideTabs side="left" labels={["Favoritos", "Módulos de apoyo"]} />
          </div>
        ) : null}

        <main className={styles.main}>
          {isArchivoView ? (
            <ArchivoPanel
              openWindows={openWindows}
              onExit={handleAppExit}
              onOpenBatchPrint={handleOpenBatchPrint}
              onOpenPageSetup={handleOpenPageSetup}
              vendor={vendor}
            />
          ) : (
            <>
              <DocumentTabs
                activeTab={activeDocTab}
                tpvTabs={tpvTabs}
                workspaceTabs={workspaceTabs}
                onTabChange={setActiveDocTab}
                onAddTpv={handleAddTpv}
                onCloseTpv={handleCloseTpv}
                onCloseWorkspaceTab={handleCloseWorkspaceTab}
              />
              <div className={styles.workspace}>
                {activeDocTab === "task" ? <TaskPanel vendor={vendor} /> : null}
                {padronMounted ? (
                  <div
                    className={styles.padronHost}
                    hidden={!padronActive}
                    aria-hidden={!padronActive}
                  >
                    <Suspense
                      fallback={<div className={styles.padronLoading}>Cargando Padrón de Items…</div>}
                    >
                      <ProductosPadronPanel />
                    </Suspense>
                  </div>
                ) : null}
                {activeDocTab !== "task" && !padronActive ? (
                  <>
                    <POSTerminal
                      lines={lines}
                      exitingLineIds={exitingLineIds}
                      selectedLineId={selectedLineId}
                      rucDniMode={rucDniMode}
                      identityVerified={identityVerified}
                      docDigits={docDigits}
                      docLabel={docLabel}
                      nombre={nombre}
                      lookupError={lookupError}
                      lookupLoading={lookupLoading}
                      catalogMode={catalogMode}
                      catalogDisabled={rucDniMode && !identityVerified}
                      discountClientError={showDiscountClientError}
                      discountSelectError={showDiscountSelectError}
                      discountEmptyError={showDiscountEmptyError}
                      onCatalogProduct={handleAddProduct}
                      onAddLine={handleAddLine}
                      onSelectLine={handleSelectLine}
                      onDocDigitsChange={handleDocDigitsChange}
                      onLookupErrorDismiss={handleLookupErrorDismiss}
                      onDiscountClientErrorDismiss={handleDiscountClientErrorDismiss}
                      onDiscountSelectErrorDismiss={handleDiscountSelectErrorDismiss}
                      onDiscountEmptyErrorDismiss={handleDiscountEmptyErrorDismiss}
                    />
                    <AdminPanel
                      onToggleRucDni={handleToggleRucDni}
                      rucDniActive={rucDniMode}
                      onDelete={handleDelete}
                      onFactura={handleOpenPayment}
                      onQuantity={handleOpenQuantity}
                      onDscto={handleOpenDiscount}
                      onProductCatalog={handleProductCatalog}
                      catalogActive={catalogMode}
                      saleTypeActive={isSpecialSaleType(saleType)}
                      saleTypeLabel={saleType}
                      onChangeSeller={handleChangeSeller}
                      onSaleType={handleSaleType}
                      onSalesDay={handleSalesDay}
                      onSalesDayHover={handleWarmSalesDay}
                      onCierre={handleCierre}
                      onBolsa={handleBolsa}
                      onNota={handleNota}
                      onOtrasFunc={handleOtrasFunc}
                      otherFunctionsActive={showOtherFunctions}
                      rucDniLoading={lookupLoading}
                      hasProducts={lines.length > 0}
                    />
                  </>
                ) : null}
              </div>
            </>
          )}
        </main>

        {!isArchivoView && activeDocTab !== "task" && activeDocTab !== "padron-items" ? (
          <div className={styles.otherFuncCol}>
            <OtherFunctionsMenu
              open={showOtherFunctions}
              onClose={() => setShowOtherFunctions(false)}
              onAction={handleOtherFuncAction}
            />
          </div>
        ) : null}
        {!isArchivoView ? (
          <div className={styles.sideColRight}>
            <SideTabs side="right" labels={["Reportes", "Agenda"]} />
          </div>
        ) : null}
      </div>

      {!isArchivoView ? <StatusBar vendor={vendor} /> : null}

      <AppDialogHost
        vendor={vendor}
        saleType={saleType}
        onChangeVendor={onChangeVendor}
        onSelectSaleType={setSaleType}
        onSelectClient={handleSelectClient}
      />

      {showPayment && (
        <PaymentDialog
          total={total}
          onClose={handleClosePayment}
          onConfirm={handleConfirmPayment}
        />
      )}

      {showQuantity && (() => {
        const targetId = selectedLineId || (lines.length > 0 ? lines[lines.length - 1].id : null);
        const targetLine = lines.find((l) => l.id === targetId);
        if (!targetLine) return null;
        return (
          <QuantityDialog
            currentQty={targetLine.qty}
            productName={targetLine.description}
            onClose={() => setShowQuantity(false)}
            onConfirm={handleConfirmQuantity}
          />
        );
      })()}

      {showDiscount && (() => {
        const targetId = selectedLineId || (lines.length > 0 ? lines[lines.length - 1].id : null);
        const targetLine = lines.find((l) => l.id === targetId);
        if (!targetLine) return null;
        return (
          <DiscountDialog
            line={targetLine}
            onClose={() => setShowDiscount(false)}
            onConfirm={handleConfirmDiscount}
          />
        );
      })()}
    </div>
  );
}
