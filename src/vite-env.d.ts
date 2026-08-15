/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Clave API de https://consulta.rucpe.com/api (DNI 8 / RUC 11). */
  readonly VITE_RUCPE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface PrinterInfoLite {
  name: string;
  displayName: string;
  description: string;
  portName: string;
  comment: string;
  status: string;
  isDefault: boolean;
}

interface PrintReportOptions {
  html: string;
  copies: number;
  printerName?: string;
  /** Ticket térmico continuo (80 mm, una sola pieza). */
  continuousThermal?: boolean;
  /** Ticket de ventas centrado en A4 (impresoras de oficina). */
  officePrint?: boolean;
  /** Texto monoespaciado para impresión raw en térmica (Linux). */
  plainText?: string;
}

interface SaveExportFileOptions {
  directory: string;
  filename: string;
  content: string;
}

interface SaveExportBinaryFileOptions {
  directory: string;
  filename: string;
  contentBase64: string;
}

interface ExportReportImageOptions {
  directory: string;
  filename: string;
  html: string;
  format: "jpeg" | "png";
}

interface ExportPdfFileOptions {
  directory: string;
  filename: string;
  html: string;
}

interface ExportWordFileOptions {
  directory: string;
  filename: string;
  html: string;
}

interface ComposeEmailWithAttachmentOptions {
  subject: string;
  body: string;
  attachmentPath: string;
}

interface IdentityLookupResult {
  document: string;
  type: "dni" | "ruc";
  name: string;
}

interface BocasoftAPI {
  platform: NodeJS.Platform;
  openExternal?: (url: string) => Promise<void>;
  fetchJsonUrl?: (
    urlOrOpts: string | { url: string; headers?: Record<string, string> },
  ) => Promise<unknown>;
  lookupIdentity?: (payload: {
    type: "dni" | "ruc";
    value: string;
  }) => Promise<
    | { ok: true; provider?: string; result: IdentityLookupResult }
    | { ok: false; message: string }
  >;
  /** Precalienta DNS/TLS a APIs externas (DNI, RUC, BCRP, clima). */
  warmupHttp?: () => Promise<void | boolean>;
  listNavaDocs?: (payload: {
    cdocu?: "01" | "03" | "all";
    limit?: number;
    fecha?: string;
  }) => Promise<
    Array<{
      fecha: string;
      cdocu: string;
      ndocu: string;
      nomcli: string;
      ruccli: string;
      totn: number;
      tota: number;
      toti: number;
      mone: string;
      efactinfo: string;
      nrocomanda: string;
      codven: string;
    }>
  >;
  listNavaDates?: () => Promise<string[]>;
  insertNavaSale?: (payload: {
    cdocu: "01" | "03";
    nomcli: string;
    ruccli?: string;
    codcli?: string;
    codven?: string;
    totn: number;
    tota?: number;
    toti?: number;
    tcam?: number;
    efectivo?: number;
    tarjeta?: number;
    banco?: number;
    cajrecib?: number;
    cajvuelto?: number;
    observ?: string;
    lines?: Array<{
      code?: string;
      description?: string;
      qty?: number;
      um?: string;
      unitPrice?: number;
      dscto?: number;
    }>;
  }) => Promise<{ ndocu: string; cdocu: string; fecha: string }>;
  getPrinters?: () => Promise<PrinterInfoLite[]>;
  printReport?: (options: PrintReportOptions) => Promise<void>;
  getDefaultExportDirectory?: (kind: string) => Promise<string>;
  resolveExportDirectory?: (directory: string, kind?: string) => Promise<string>;
  pickExportDirectory?: (defaultPath?: string) => Promise<string | null>;
  saveExportFile?: (options: SaveExportFileOptions) => Promise<string>;
  saveExportBinaryFile?: (options: SaveExportBinaryFileOptions) => Promise<string>;
  exportReportImage?: (options: ExportReportImageOptions) => Promise<string>;
  exportPdfFile?: (options: ExportPdfFileOptions) => Promise<string>;
  exportWordFile?: (options: ExportWordFileOptions) => Promise<string>;
  openExportFile?: (filePath: string) => Promise<void>;
  showExportInFolder?: (filePath: string) => Promise<boolean>;
  composeEmailWithAttachment?: (
    options: ComposeEmailWithAttachmentOptions,
  ) => Promise<{ method: string; emlPath?: string }>;
  openWebEmailWithAttachment?: (options: {
    url: string;
    attachmentPath: string;
  }) => Promise<{ copied: boolean }>;
  openGmailComposeWithAttachment?: (options: {
    subject: string;
    body: string;
    attachmentPath: string;
  }) => Promise<{ attached: boolean; needsLogin?: boolean }>;
  restoreAppFocus?: () => Promise<void>;
  showAppMessage?: (options: { title: string; message: string }) => Promise<void>;
  checkForUpdates?: () => Promise<{
    status: "latest" | "available" | "error";
    current: string;
    latest?: string;
    packaged?: boolean;
    canInstall?: boolean;
    htmlUrl?: string;
    downloadUrl?: string;
    fileName?: string;
    size?: number;
    notes?: string;
    message: string;
  }>;
  installUpdate?: (payload: {
    downloadUrl?: string;
    fileName?: string;
    latest?: string;
  }) => Promise<{ downloaded?: boolean; applied?: boolean; opened?: boolean; path?: string }>;
  onUpdateDownloadProgress?: (
    callback: (payload: { percent: number }) => void,
  ) => () => void;
  signalRendererReady?: () => void;
}

declare global {
  interface Window {
    bocasoft?: BocasoftAPI;
  }

  interface Document {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  }
}

export {};
