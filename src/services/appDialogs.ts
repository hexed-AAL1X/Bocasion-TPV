import { useCallback, useSyncExternalStore } from "react";

/** Diálogos pesados: abrirlos no debe re-renderizar el TPV. */
export type AppDialogId =
  | "salesDay"
  | "almacenes"
  | "transportistas"
  | "vendedores"
  | "documentos"
  | "condicionesVenta"
  | "categoriasCliente"
  | "puntosVenta"
  | "comanda"
  | "navaBoletas"
  | "navaFacturas"
  | "cashCount"
  | "cashOpening"
  | "batchPrint"
  | "pageSetup"
  | "paymentEdit"
  | "docsAnnex"
  | "changeSeller"
  | "saleType"
  | "bolsaKeyboard"
  | "clientSelector";

export type DocsAnnexDialogParams = {
  registerId: string;
  registerLabel: string;
  registerPoint: string;
  saleDate: string;
  mode?: "default" | "payment-edit";
};

type DialogState = Record<AppDialogId, boolean>;

export type AppDialogsSnapshot = {
  open: DialogState;
  /** Anexo precargado (offscreen) mientras el Monitor está abierto. */
  docsAnnexPrimed: boolean;
};

const INITIAL: DialogState = {
  salesDay: false,
  almacenes: false,
  transportistas: false,
  vendedores: false,
  documentos: false,
  condicionesVenta: false,
  categoriasCliente: false,
  puntosVenta: false,
  comanda: false,
  navaBoletas: false,
  navaFacturas: false,
  cashCount: false,
  cashOpening: false,
  batchPrint: false,
  pageSetup: false,
  paymentEdit: false,
  docsAnnex: false,
  changeSeller: false,
  saleType: false,
  bolsaKeyboard: false,
  clientSelector: false,
};

let openState: DialogState = { ...INITIAL };
let docsAnnexParams: DocsAnnexDialogParams | null = null;
let docsAnnexPrimed = false;
let snapshot: AppDialogsSnapshot = {
  open: openState,
  docsAnnexPrimed: false,
};
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { open: openState, docsAnnexPrimed };
  for (const listener of listeners) listener();
}

function getSnapshot(): AppDialogsSnapshot {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openAppDialog(id: AppDialogId): void {
  if (openState[id]) return;
  openState = { ...openState, [id]: true };
  emit();
}

/** Contexto del anexo mientras el Monitor está abierto (para precarga). */
export function setDocsAnnexContext(params: DocsAnnexDialogParams): void {
  const prev = docsAnnexParams;
  docsAnnexParams = params;
  const same =
    prev &&
    prev.registerId === params.registerId &&
    prev.saleDate === params.saleDate &&
    prev.registerLabel === params.registerLabel &&
    prev.registerPoint === params.registerPoint &&
    (prev.mode ?? "default") === (params.mode ?? "default");
  if (!same && docsAnnexPrimed) emit();
}

/** Precarga offscreen: el click solo revela (sin montar). */
export function primeDocsAnnexDialog(): void {
  if (!docsAnnexParams || docsAnnexPrimed || openState.docsAnnex) return;
  docsAnnexPrimed = true;
  emit();
}

/** Abre liquidación/anexo. Si ya estaba primed, es solo un flip de visibilidad. */
export function openDocsAnnexDialog(params?: DocsAnnexDialogParams): void {
  if (params) docsAnnexParams = params;
  if (!docsAnnexParams) return;
  if (openState.docsAnnex) {
    emit();
    return;
  }
  openState = { ...openState, docsAnnex: true };
  docsAnnexPrimed = true;
  emit();
}

export function getDocsAnnexDialogParams(): DocsAnnexDialogParams | null {
  return docsAnnexParams;
}

export function closeAppDialog(id: AppDialogId): void {
  if (!openState[id]) return;
  openState = { ...openState, [id]: false };

  if (id === "docsAnnex") {
    // Sigue primed si el Monitor sigue abierto → segundo open instantáneo.
    if (!openState.salesDay) {
      docsAnnexPrimed = false;
      docsAnnexParams = null;
    }
  }

  if (id === "salesDay") {
    openState = { ...openState, docsAnnex: false };
    docsAnnexPrimed = false;
    docsAnnexParams = null;
  }

  emit();
}

export function isAppDialogOpen(id: AppDialogId): boolean {
  return openState[id];
}

export function getOpenAppDialogs(): DialogState {
  return openState;
}

/** Solo re-renderiza la capa de diálogos. */
export function useAppDialogs(): AppDialogsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useOpenAppDialog(): (id: AppDialogId) => void {
  return useCallback((id: AppDialogId) => openAppDialog(id), []);
}

export function useCloseAppDialog(): (id: AppDialogId) => void {
  return useCallback((id: AppDialogId) => closeAppDialog(id), []);
}

export const ENTIDADES_ACTION_TO_DIALOG: Record<string, AppDialogId> = {
  "apertura-almacen": "almacenes",
  transportistas: "transportistas",
  vendedores: "vendedores",
  documentos: "documentos",
  "condiciones-venta": "condicionesVenta",
  "categorias-cliente": "categoriasCliente",
  "puntos-venta": "puntosVenta",
};
