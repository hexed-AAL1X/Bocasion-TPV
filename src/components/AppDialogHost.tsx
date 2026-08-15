import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Client } from "../data/clients";
import type { Vendor } from "../data/vendors";
import {
  closeAppDialog,
  getDocsAnnexDialogParams,
  openAppDialog,
  useAppDialogs,
  type AppDialogId,
} from "../services/appDialogs";
import {
  loadPageSetupSettings,
  savePageSetupSettings,
} from "../services/pageSetupSettings";
import type { PageSetupSettings } from "./PrintPreviewDialog/PageSetupDialog";

type Props = {
  vendor: Vendor;
  saleType: string;
  onChangeVendor: (vendor: Vendor) => void;
  onSelectSaleType: (saleType: string) => void;
  onSelectClient: (client: Client) => void;
};

function close(id: AppDialogId): void {
  closeAppDialog(id);
}

const closeSalesDay = () => close("salesDay");
const closeAlmacenes = () => close("almacenes");
const closeTransportistas = () => close("transportistas");
const closeVendedores = () => close("vendedores");
const closeDocumentos = () => close("documentos");
const closeCondicionesVenta = () => close("condicionesVenta");
const closeCategoriasCliente = () => close("categoriasCliente");
const closePuntosVenta = () => close("puntosVenta");
const closeComanda = () => close("comanda");
const closeNavaBoletas = () => close("navaBoletas");
const closeNavaFacturas = () => close("navaFacturas");
const closeCashCount = () => close("cashCount");
const closeCashOpening = () => close("cashOpening");
const closeBatchPrint = () => close("batchPrint");
const closePageSetup = () => close("pageSetup");
const closePaymentEdit = () => close("paymentEdit");
const closeDocsAnnex = () => close("docsAnnex");
const closeChangeSeller = () => close("changeSeller");
const closeSaleType = () => close("saleType");
const closeBolsaKeyboard = () => close("bolsaKeyboard");

const SalesDayMonitor = lazy(() =>
  import("./SalesDayMonitor/SalesDayMonitor").then((m) => ({ default: m.SalesDayMonitor })),
);
const AlmacenesDialog = lazy(() =>
  import("./AlmacenesDialog/AlmacenesDialog").then((m) => ({ default: m.AlmacenesDialog })),
);
const TransportistasDialog = lazy(() =>
  import("./TransportistasDialog/TransportistasDialog").then((m) => ({
    default: m.TransportistasDialog,
  })),
);
const VendedoresDialog = lazy(() =>
  import("./VendedoresDialog/VendedoresDialog").then((m) => ({ default: m.VendedoresDialog })),
);
const DocumentosDialog = lazy(() =>
  import("./DocumentosDialog/DocumentosDialog").then((m) => ({ default: m.DocumentosDialog })),
);
const CondicionesVentaDialog = lazy(() =>
  import("./CondicionesVentaDialog/CondicionesVentaDialog").then((m) => ({
    default: m.CondicionesVentaDialog,
  })),
);
const CategoriasClienteDialog = lazy(() =>
  import("./CategoriasClienteDialog/CategoriasClienteDialog").then((m) => ({
    default: m.CategoriasClienteDialog,
  })),
);
const PuntosVentaDialog = lazy(() =>
  import("./PuntosVentaDialog/PuntosVentaDialog").then((m) => ({ default: m.PuntosVentaDialog })),
);
const ComandaDialog = lazy(() =>
  import("./ComandaDialog/ComandaDialog").then((m) => ({ default: m.ComandaDialog })),
);
const NavaDocsDialog = lazy(() =>
  import("./NavaDocsDialog/NavaDocsDialog").then((m) => ({ default: m.NavaDocsDialog })),
);
const CashCountDialog = lazy(() =>
  import("./CashCountDialog/CashCountDialog").then((m) => ({ default: m.CashCountDialog })),
);
const CashOpeningDialog = lazy(() =>
  import("./CashOpeningDialog/CashOpeningDialog").then((m) => ({ default: m.CashOpeningDialog })),
);
const BatchPrintDialog = lazy(() =>
  import("./BatchPrintDialog/BatchPrintDialog").then((m) => ({ default: m.BatchPrintDialog })),
);
const PageSetupDialog = lazy(() =>
  import("./PrintPreviewDialog/PageSetupDialog").then((m) => ({ default: m.PageSetupDialog })),
);
const DocsAnnexPaymentEditDialog = lazy(() =>
  import("./SalesDayMonitor/DocsAnnexPaymentEditDialog").then((m) => ({
    default: m.DocsAnnexPaymentEditDialog,
  })),
);
const DocsAnnexDialog = lazy(() =>
  import("./SalesDayMonitor/DocsAnnexDialog").then((m) => ({ default: m.DocsAnnexDialog })),
);
const ChangeSellerDialog = lazy(() =>
  import("./ChangeSellerDialog/ChangeSellerDialog").then((m) => ({
    default: m.ChangeSellerDialog,
  })),
);
const SaleTypeDialog = lazy(() =>
  import("./SaleTypeDialog/SaleTypeDialog").then((m) => ({ default: m.SaleTypeDialog })),
);
const ClientSearchKeyboardDialog = lazy(() =>
  import("./ClientSelectorDialog/ClientSearchKeyboardDialog").then((m) => ({
    default: m.ClientSearchKeyboardDialog,
  })),
);
const ClientSelectorDialog = lazy(() =>
  import("./ClientSelectorDialog/ClientSelectorDialog").then((m) => ({
    default: m.ClientSelectorDialog,
  })),
);

/** Capa de diálogos: abrir uno no re-renderiza el TPV; módulos se cargan al abrir. */
export function AppDialogHost({
  vendor,
  saleType,
  onChangeVendor,
  onSelectSaleType,
  onSelectClient,
}: Props) {
  const { open: dialogs, docsAnnexPrimed } = useAppDialogs();
  const [pageSetup, setPageSetup] = useState(loadPageSetupSettings);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const annexParams = getDocsAnnexDialogParams();
  const annexMounted = Boolean(annexParams && (dialogs.docsAnnex || docsAnnexPrimed));
  const annexOpen = Boolean(dialogs.docsAnnex && annexParams);
  const annexGateRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!annexOpen) return;
    const root = annexGateRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-app-dialog-overlay], [data-win-classic]");
    for (const el of els) el.style.animation = "none";
    void root.offsetWidth;
    for (const el of els) el.style.removeProperty("animation");
  }, [annexOpen]);

  const handleSelectClient = useCallback(
    (client: Client) => {
      onSelectClient(client);
      close("clientSelector");
      setClientSearchQuery("");
    },
    [onSelectClient],
  );

  const handlePageSetupApply = useCallback((settings: PageSetupSettings) => {
    setPageSetup(settings);
    savePageSetupSettings(settings);
  }, []);

  const handleChangeSellerConfirm = useCallback(
    (next: Vendor) => {
      onChangeVendor(next);
      close("changeSeller");
    },
    [onChangeVendor],
  );

  return (
    <>
      <Suspense fallback={null}>
        {dialogs.salesDay ? <SalesDayMonitor onClose={closeSalesDay} /> : null}
      </Suspense>
      <Suspense fallback={null}>
        {dialogs.almacenes ? <AlmacenesDialog onClose={closeAlmacenes} /> : null}
        {dialogs.transportistas ? (
          <TransportistasDialog onClose={closeTransportistas} />
        ) : null}
        {dialogs.vendedores ? <VendedoresDialog onClose={closeVendedores} /> : null}
        {dialogs.documentos ? <DocumentosDialog onClose={closeDocumentos} /> : null}
        {dialogs.condicionesVenta ? (
          <CondicionesVentaDialog onClose={closeCondicionesVenta} />
        ) : null}
        {dialogs.categoriasCliente ? (
          <CategoriasClienteDialog onClose={closeCategoriasCliente} />
        ) : null}
        {dialogs.puntosVenta ? <PuntosVentaDialog onClose={closePuntosVenta} /> : null}
        {dialogs.comanda ? <ComandaDialog onClose={closeComanda} /> : null}
        {dialogs.navaBoletas ? <NavaDocsDialog kind="03" onClose={closeNavaBoletas} /> : null}
        {dialogs.navaFacturas ? <NavaDocsDialog kind="01" onClose={closeNavaFacturas} /> : null}
        {dialogs.cashCount ? <CashCountDialog onClose={closeCashCount} /> : null}
        {dialogs.cashOpening ? (
          <CashOpeningDialog vendor={vendor} onClose={closeCashOpening} />
        ) : null}
        {dialogs.batchPrint ? <BatchPrintDialog onClose={closeBatchPrint} /> : null}
        {dialogs.pageSetup ? (
          <PageSetupDialog
            settings={pageSetup}
            onApply={handlePageSetupApply}
            onClose={closePageSetup}
          />
        ) : null}
        {dialogs.paymentEdit ? (
          <DocsAnnexPaymentEditDialog onClose={closePaymentEdit} />
        ) : null}
        {dialogs.changeSeller ? (
          <ChangeSellerDialog
            currentVendor={vendor}
            onClose={closeChangeSeller}
            onConfirm={handleChangeSellerConfirm}
          />
        ) : null}
        {dialogs.saleType ? (
          <SaleTypeDialog
            selectedType={saleType}
            onSelect={onSelectSaleType}
            onClose={closeSaleType}
          />
        ) : null}
        {dialogs.bolsaKeyboard ? (
          <ClientSearchKeyboardDialog
            onConfirm={(query) => {
              setClientSearchQuery(query);
              closeBolsaKeyboard();
              requestAnimationFrame(() => openAppDialog("clientSelector"));
            }}
            onClose={closeBolsaKeyboard}
          />
        ) : null}
        {dialogs.clientSelector ? (
          <ClientSelectorDialog
            initialQuery={clientSearchQuery}
            onSelect={handleSelectClient}
            onClose={() => {
              close("clientSelector");
              setClientSearchQuery("");
            }}
          />
        ) : null}
      </Suspense>
      <Suspense fallback={null}>
        {annexMounted && annexParams ? (
          <div
            ref={annexGateRef}
            data-app-dialog-gate={annexOpen ? "open" : "warm"}
            aria-hidden={annexOpen ? undefined : true}
          >
            <DocsAnnexDialog
              registerId={annexParams.registerId}
              registerLabel={annexParams.registerLabel}
              registerPoint={annexParams.registerPoint}
              saleDate={annexParams.saleDate}
              mode={annexParams.mode}
              onClose={closeDocsAnnex}
            />
          </div>
        ) : null}
      </Suspense>
    </>
  );
}
