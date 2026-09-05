import type {
  ArticleSaleRow,
  CompletedSale,
  DocSummary,
  GroupSaleRow,
  PaymentConfirmPayload,
  PaymentMethod,
  SaleDocType,
} from "../types/sales";
import { USD_RATE } from "../config/currency";
import { DEFAULT_REGISTER_ID } from "../data/posRegisters";
import { DEMO_VENDOR_USUARIO } from "../data/demoSalesSeed";
import type { SaleLine } from "../components/POSTerminal/POSTerminal";

const BOLETA_START = 18143;
const FACTURA_START = 113;
const NOTA_START = 0;
const STORAGE_KEY_V1 = "bocasoft-sales-days";
const STORAGE_KEY = "bocasoft-sales-registers-v1";

let sessionsCache: Record<string, StoredDaySession> | null = null;

type StoredSale = Omit<CompletedSale, "at"> & { at: string; registerId?: string };

type StoredDaySession = {
  openedAt: string;
  closedAt: string | null;
  sales: StoredSale[];
};

let activeRegisterId = DEFAULT_REGISTER_ID;
let sessionOpenedAt = new Date();
let sessionClosedAt: Date | null = null;
let sales: CompletedSale[] = [];
let boletaSeq = BOLETA_START;
let facturaSeq = FACTURA_START;
let notaSeq = NOTA_START;

function lineTotal(line: SaleLine): number {
  return line.qty * line.unitPrice * (1 - line.dscto / 100);
}

function nextDocNumber(type: SaleDocType): number {
  if (type === "factura") return facturaSeq++;
  if (type === "nota") return notaSeq++;
  return boletaSeq++;
}

function sessionStorageKey(registerId: string, date: Date): string {
  return `${registerId}|${toDateKey(date)}`;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((part) => Number(part));
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function formatSaleDateLabel(date: Date): string {
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function parseSaleDateLabel(label: string): Date {
  const [day, month, year] = label.split("/").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function serializeSale(sale: CompletedSale): StoredSale {
  return { ...sale, at: sale.at.toISOString() };
}

function deserializeSale(stored: StoredSale): CompletedSale {
  return {
    ...stored,
    at: new Date(stored.at),
    registerId: stored.registerId ?? DEFAULT_REGISTER_ID,
  };
}

function loadAllSessions(): Record<string, StoredDaySession> {
  if (sessionsCache) return sessionsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      sessionsCache = {};
      return sessionsCache;
    }
    sessionsCache = JSON.parse(raw) as Record<string, StoredDaySession>;
    return sessionsCache;
  } catch {
    sessionsCache = {};
    return sessionsCache;
  }
}

function saveAllSessions(data: Record<string, StoredDaySession>): void {
  sessionsCache = data;
  schedulePersist();
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function flushSessionsPersist(): void {
  if (!sessionsCache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsCache));
  } catch {
    /* quota / private mode */
  }
}

function schedulePersist(): void {
  if (persistTimer != null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushSessionsPersist();
  }, 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSessionsPersist);
  window.addEventListener("beforeunload", flushSessionsPersist);
}

function migrateLegacyStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V1);
    if (!raw) return;
    const legacy = JSON.parse(raw) as Record<string, StoredDaySession>;
    const next = loadAllSessions();
    for (const [dateKey, session] of Object.entries(legacy)) {
      const key = sessionStorageKey(DEFAULT_REGISTER_ID, parseDateKey(dateKey));
      if (!next[key]) next[key] = session;
    }
    saveAllSessions(next);
    localStorage.removeItem(STORAGE_KEY_V1);
  } catch {
    /* ignorar migración fallida */
  }
}

function restoreSequencesFromSales(list: CompletedSale[]): void {
  boletaSeq = BOLETA_START;
  facturaSeq = FACTURA_START;
  notaSeq = NOTA_START;

  for (const sale of list) {
    const fromRef = sale.docRef
      ? Number(String(sale.docRef).replace(/\D/g, "").slice(-7)) || 0
      : 0;
    const num = fromRef || sale.docNumber;
    if (sale.docType === "factura") {
      facturaSeq = Math.max(facturaSeq, num + 1);
    } else if (sale.docType === "nota") {
      notaSeq = Math.max(notaSeq, num + 1);
    } else {
      boletaSeq = Math.max(boletaSeq, num + 1);
    }
  }
}

/** Alinea correlativos locales con el último número de SQL (siguiente a emitir). */
export function syncDocSequencesFromDb(boletaNext: number, facturaNext: number): void {
  if (Number.isFinite(boletaNext) && boletaNext > 0) {
    boletaSeq = Math.max(boletaSeq, Math.floor(boletaNext));
  }
  if (Number.isFinite(facturaNext) && facturaNext > 0) {
    facturaSeq = Math.max(facturaSeq, Math.floor(facturaNext));
  }
}

export function getNextDocNumberPreview(type: SaleDocType): number {
  if (type === "factura") return facturaSeq;
  if (type === "nota") return notaSeq;
  return boletaSeq;
}

const salesListeners = new Set<() => void>();

export function subscribeSales(listener: () => void): () => void {
  salesListeners.add(listener);
  return () => {
    salesListeners.delete(listener);
  };
}

function emitSales(): void {
  for (const listener of salesListeners) listener();
}

function persistLiveSession(): void {
  const key = sessionStorageKey(activeRegisterId, new Date());
  const all = loadAllSessions();
  all[key] = {
    openedAt: sessionOpenedAt.toISOString(),
    closedAt: sessionClosedAt?.toISOString() ?? null,
    sales: sales.map(serializeSale),
  };
  saveAllSessions(all);
  emitSales();
}

export function updateSaleDocRef(saleId: string, docRef: string): void {
  const num = Number(docRef.replace(/\D/g, "").slice(-7)) || 0;
  let docType: SaleDocType | null = null;
  sales = sales.map((sale) => {
    if (sale.id !== saleId) return sale;
    docType = sale.docType;
    return { ...sale, docRef, docNumber: num || sale.docNumber };
  });
  if (num > 0) {
    if (docType === "factura") facturaSeq = Math.max(facturaSeq, num + 1);
    else if (docType === "nota") notaSeq = Math.max(notaSeq, num + 1);
    else boletaSeq = Math.max(boletaSeq, num + 1);
  }
  persistLiveSession();
}

function restoreLiveSession(): void {
  const key = sessionStorageKey(activeRegisterId, new Date());
  const session = loadAllSessions()[key];
  if (!session) {
    sessionOpenedAt = new Date();
    sessionClosedAt = null;
    sales = [];
    boletaSeq = BOLETA_START;
    facturaSeq = FACTURA_START;
    notaSeq = NOTA_START;
    return;
  }

  sessionOpenedAt = new Date(session.openedAt);
  sessionClosedAt = session.closedAt ? new Date(session.closedAt) : null;
  sales = session.sales.map(deserializeSale);
  restoreSequencesFromSales(sales);
}

function isDemoSeedSale(id: string): boolean {
  return id.startsWith("demo-static-");
}

/** Quita boletas/facturas de prueba guardadas en localStorage. */
function purgeDemoSales(): void {
  const all = loadAllSessions();
  let changed = false;
  for (const [key, session] of Object.entries(all)) {
    const next = session.sales.filter((sale) => !isDemoSeedSale(sale.id));
    if (next.length !== session.sales.length) {
      all[key] = { ...session, sales: next };
      changed = true;
    }
  }
  if (changed) saveAllSessions(all);
  sales = sales.filter((sale) => !isDemoSeedSale(sale.id));
}

migrateLegacyStorage();
purgeDemoSales();
restoreLiveSession();

function getStoredSession(registerId: string, date: Date): StoredDaySession | null {
  return loadAllSessions()[sessionStorageKey(registerId, date)] ?? null;
}

function isLiveSession(registerId: string, date: Date): boolean {
  return registerId === activeRegisterId && isSameDay(date, new Date());
}

export function getActiveRegisterId(): string {
  return activeRegisterId;
}

export function setActiveRegisterId(registerId: string): void {
  const next = registerId.trim();
  if (!next || next === activeRegisterId) return;
  persistLiveSession();
  activeRegisterId = next;
  restoreLiveSession();
  emitSales();
}

export function getAvailableSaleDates(registerId = activeRegisterId): Date[] {
  const prefix = `${registerId}|`;
  const all = loadAllSessions();
  const keys = Object.keys(all).filter((key) => {
    if (!key.startsWith(prefix)) return false;
    return Boolean(all[key]?.sales.length);
  });

  return keys
    .map((key) => parseDateKey(key.split("|")[1] ?? ""))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
}

/** Días con caja abierta en esta app y sin ventas (punto azul). */
export function getOpenedWithoutSalesDates(registerId = activeRegisterId): Date[] {
  const prefix = `${registerId}|`;
  const all = loadAllSessions();
  return Object.keys(all)
    .filter((key) => key.startsWith(prefix) && (all[key]?.sales.length ?? 0) === 0)
    .map((key) => parseDateKey(key.split("|")[1] ?? ""))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
}

export function getRegistersWithSalesForDate(date: Date): string[] {
  const dateKey = toDateKey(date);
  return Object.entries(loadAllSessions())
    .filter(([key, session]) => key.endsWith(`|${dateKey}`) && session.sales.length > 0)
    .map(([key]) => key.split("|")[0] ?? "")
    .filter(Boolean);
}

export function resetSalesSession(openedAt = new Date()): void {
  sessionOpenedAt = openedAt;
  sessionClosedAt = null;
  sales = [];
  boletaSeq = BOLETA_START;
  facturaSeq = FACTURA_START;
  notaSeq = NOTA_START;
  persistLiveSession();
}

/** Al iniciar sesión: limpia semilla demo; el listado real viene de SQL (mst01fac). */
export function initSalesSessionForLogin(vendorUsuario: string): void {
  purgeDemoSales();
  if (vendorUsuario === DEMO_VENDOR_USUARIO) {
    restoreLiveSession();
    return;
  }
  resetSalesSession();
}

export function getSessionOpenedAt(): Date {
  return sessionOpenedAt;
}

export function getSessionOpenedAtForRegisterAndDate(registerId: string, date: Date): Date | null {
  if (isLiveSession(registerId, date)) return sessionOpenedAt;
  const session = getStoredSession(registerId, date);
  return session ? new Date(session.openedAt) : null;
}

export function isSessionClosed(): boolean {
  return sessionClosedAt !== null;
}

export function isSessionClosedForRegisterAndDate(registerId: string, date: Date): boolean {
  if (isLiveSession(registerId, date)) return sessionClosedAt !== null;
  return Boolean(getStoredSession(registerId, date)?.closedAt);
}

export function getSessionClosedAt(): Date | null {
  return sessionClosedAt;
}

export function getSessionClosedAtForRegisterAndDate(registerId: string, date: Date): Date | null {
  if (isLiveSession(registerId, date)) return sessionClosedAt;
  const session = getStoredSession(registerId, date);
  return session?.closedAt ? new Date(session.closedAt) : null;
}

export function closeSalesSession(closedAt = new Date()): void {
  sessionClosedAt = closedAt;
  persistLiveSession();
}

export function getSales(): readonly CompletedSale[] {
  return sales;
}

export function getSalesForRegisterAndDate(registerId: string, date: Date): CompletedSale[] {
  if (isLiveSession(registerId, date)) return [...sales];
  const session = getStoredSession(registerId, date);
  return session ? session.sales.map(deserializeSale) : [];
}

export function getSalesForDate(date: Date): CompletedSale[] {
  return getSalesForRegisterAndDate(activeRegisterId, date);
}

function resolveForpagoLabel(method: PaymentMethod, cardProvider?: string): string {
  if (method === "soles") return "Efectivo S/.";
  if (method === "dolar") return "Efectivo US$";
  if (method === "credito") return "New Credit";
  if (method === "tarjeta" && cardProvider) return cardProvider;
  if (method === "tarjeta") return "Tarjeta";
  if (method === "banco") return "Banco";
  if (method === "mixto") return "Mixto";
  return "";
}

export function resolveForpagoDisplay(
  paymentMethod: PaymentMethod,
  forpagoLabel?: string,
  cardProvider?: string,
): string {
  const stored = forpagoLabel?.trim() ?? "";
  if (stored) return stored;
  return resolveForpagoLabel(paymentMethod, cardProvider);
}

function applyPaymentFields(
  sale: CompletedSale,
  pm: PaymentMethod,
  pay?: PaymentConfirmPayload,
): CompletedSale {
  const received = pay?.received ?? sale.total;
  const vuelto = pay?.vuelto ?? 0;
  const isDolar = pm === "dolar";
  const isCredito = pm === "credito";

  const updated: CompletedSale = {
    ...sale,
    paymentMethod: pm,
    receivedS: !isDolar && !isCredito ? received : 0,
    vueltoS: !isDolar && !isCredito ? vuelto : 0,
    receivedUs: isDolar ? received : 0,
    vueltoUs: isDolar ? vuelto : 0,
    forpagoLabel: resolveForpagoLabel(pm, pay?.cardProvider),
    nroOperacion: pay?.operationNumber ?? "",
    nroCta: isCredito ? String(sale.docNumber).padStart(7, "0") : "",
  };

  if (isDolar && updated.receivedUs === 0 && sale.total > 0) {
    updated.receivedUs = parseFloat((sale.total / USD_RATE).toFixed(2));
  }

  return updated;
}

function updateStoredSale(saleId: string, updater: (sale: CompletedSale) => CompletedSale): boolean {
  const all = loadAllSessions();
  for (const [key, session] of Object.entries(all)) {
    const index = session.sales.findIndex((sale) => sale.id === saleId);
    if (index < 0) continue;
    session.sales[index] = serializeSale(updater(deserializeSale(session.sales[index])));
    saveAllSessions(all);
    const [registerId, dateKey] = key.split("|");
    if (registerId === activeRegisterId && isSameDay(parseDateKey(dateKey), new Date())) {
      sales = session.sales.map(deserializeSale);
    }
    return true;
  }
  return false;
}

export function getSaleById(saleId: string): CompletedSale | undefined {
  const live = sales.find((sale) => sale.id === saleId);
  if (live) return live;

  for (const session of Object.values(loadAllSessions())) {
    const stored = session.sales.find((sale) => sale.id === saleId);
    if (stored) return deserializeSale(stored);
  }
  return undefined;
}

export function updateSalePayment(
  saleId: string,
  paymentMethod: PaymentMethod,
  payment?: PaymentConfirmPayload,
): boolean {
  const index = sales.findIndex((sale) => sale.id === saleId);
  if (index >= 0) {
    sales = sales.map((sale, i) =>
      i === index ? applyPaymentFields(sale, paymentMethod, payment) : sale,
    );
    persistLiveSession();
    return true;
  }

  return updateStoredSale(saleId, (sale) => applyPaymentFields(sale, paymentMethod, payment));
}

export function registerSale(input: {
  docType: SaleDocType;
  paymentMethod: PaymentMethod;
  clienteLabel: string;
  vendedor: string;
  lines: SaleLine[];
  total: number;
  tipoVenta?: string;
  payment?: PaymentConfirmPayload;
}): CompletedSale {
  const docNumber = nextDocNumber(input.docType);
  const base: CompletedSale = {
    id: `sale-${Date.now()}-${docNumber}`,
    at: new Date(),
    docType: input.docType,
    docNumber,
    clienteLabel: input.clienteLabel,
    vendedor: input.vendedor,
    paymentMethod: input.paymentMethod,
    lines: input.lines.map((line) => ({ ...line })),
    total: input.total,
    receivedS: 0,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "",
    nroOperacion: "",
    nroCta: "",
    anulado: 0,
    tipoVenta: input.tipoVenta ?? "Mercadería",
    registerId: activeRegisterId,
  };
  const sale = applyPaymentFields(base, input.paymentMethod, input.payment);
  sales = [...sales, sale];
  persistLiveSession();
  return sale;
}

function docRange(items: CompletedSale[]): { from: number; to: number } {
  if (items.length === 0) return { from: 0, to: 0 };
  const bySeries = new Map<string, number[]>();
  for (const sale of items) {
    const ref = (sale.docRef ?? "").trim();
    const dash = ref.indexOf("-");
    const series = dash > 0 ? ref.slice(0, dash) : sale.docType;
    const nums = bySeries.get(series) ?? [];
    nums.push(sale.docNumber);
    bySeries.set(series, nums);
  }
  let best: number[] = [];
  for (const nums of bySeries.values()) {
    if (nums.length > best.length) best = nums;
  }
  return { from: Math.min(...best), to: Math.max(...best) };
}

function summarizeDocs(list: CompletedSale[]): DocSummary {
  const boletas = list.filter((sale) => sale.docType === "boleta");
  const facturas = list.filter((sale) => sale.docType === "factura");
  const notas = list.filter((sale) => sale.docType === "nota");

  return {
    boletas: boletas.length,
    boletaFrom: docRange(boletas).from,
    boletaTo: docRange(boletas).to,
    notas: notas.length,
    notaFrom: docRange(notas).from,
    notaTo: docRange(notas).to,
    facturas: facturas.length,
    facturaFrom: docRange(facturas).from,
    facturaTo: docRange(facturas).to,
    anulados: list.reduce((sum, sale) => sum + sale.anulado, 0),
    total: list.length,
  };
}

function summarizeMonetary(list: CompletedSale[]): MonetarySummary {
  let contado = 0;
  let credito = 0;
  let tarjeta = 0;
  let banco = 0;
  const cards = new Map<string, number>();
  for (const sale of list) {
    if (sale.paymentMethod === "credito") {
      credito += sale.total;
    } else if (sale.paymentMethod === "tarjeta") {
      tarjeta += sale.total;
      const label = sale.forpagoLabel.trim() || "Tarjeta";
      cards.set(label, (cards.get(label) ?? 0) + sale.total);
    } else if (sale.paymentMethod === "banco") {
      banco += sale.total;
    } else {
      contado += sale.total;
    }
  }
  return {
    contado,
    credito,
    tarjeta,
    banco,
    cards: [...cards.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total),
    total: contado + credito + tarjeta + banco,
  };
}

function summarizeGroups(list: CompletedSale[], grand: number): GroupSaleRow[] {
  const byGroup = new Map<string, number>();
  for (const sale of list) {
    for (const line of sale.lines) {
      const group = line.group ?? "Otros";
      byGroup.set(group, (byGroup.get(group) ?? 0) + lineTotal(line));
    }
  }
  return [...byGroup.entries()]
    .map(([group, total]) => ({
      group,
      total,
      percent: grand > 0 ? (total / grand) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function summarizeArticles(list: CompletedSale[]): ArticleSaleRow[] {
  const byArticle = new Map<string, { qty: number; total: number }>();
  for (const sale of list) {
    for (const line of sale.lines) {
      const prev = byArticle.get(line.description) ?? { qty: 0, total: 0 };
      byArticle.set(line.description, {
        qty: prev.qty + line.qty,
        total: prev.total + lineTotal(line),
      });
    }
  }
  return [...byArticle.entries()]
    .map(([description, { qty, total }]) => ({ description, qty, total }))
    .sort((a, b) => b.total - a.total);
}

function summarizeGrandTotal(list: CompletedSale[]): number {
  return list.reduce((sum, sale) => sum + sale.total, 0);
}

export function getGrandTotal(): number {
  return summarizeGrandTotal(sales);
}

export function getGrandTotalForRegisterAndDate(registerId: string, date: Date): number {
  return summarizeGrandTotal(getSalesForRegisterAndDate(registerId, date));
}

export function getGrandTotalForDate(date: Date): number {
  return getGrandTotalForRegisterAndDate(activeRegisterId, date);
}

export function getDocSummary(): DocSummary {
  return summarizeDocs(sales);
}

export function getDocSummaryForRegisterAndDate(registerId: string, date: Date): DocSummary {
  return summarizeDocs(getSalesForRegisterAndDate(registerId, date));
}

export function getDocSummaryForDate(date: Date): DocSummary {
  return getDocSummaryForRegisterAndDate(activeRegisterId, date);
}

export type MonetarySummary = {
  contado: number;
  credito: number;
  tarjeta: number;
  banco: number;
  cards: { label: string; total: number }[];
  total: number;
};

export function getMonetarySummary(): MonetarySummary {
  return summarizeMonetary(sales);
}

export function getMonetarySummaryForRegisterAndDate(
  registerId: string,
  date: Date,
): MonetarySummary {
  return summarizeMonetary(getSalesForRegisterAndDate(registerId, date));
}

export function getMonetarySummaryForDate(date: Date): MonetarySummary {
  return getMonetarySummaryForRegisterAndDate(activeRegisterId, date);
}

export function getGroupSummary(): GroupSaleRow[] {
  return summarizeGroups(sales, getGrandTotal());
}

export function getGroupSummaryForRegisterAndDate(registerId: string, date: Date): GroupSaleRow[] {
  const list = getSalesForRegisterAndDate(registerId, date);
  return summarizeGroups(list, summarizeGrandTotal(list));
}

export function getGroupSummaryForDate(date: Date): GroupSaleRow[] {
  return getGroupSummaryForRegisterAndDate(activeRegisterId, date);
}

export function getArticleSummary(): ArticleSaleRow[] {
  return summarizeArticles(sales);
}

export function getArticleSummaryForRegisterAndDate(registerId: string, date: Date): ArticleSaleRow[] {
  return summarizeArticles(getSalesForRegisterAndDate(registerId, date));
}

export function getArticleSummaryForDate(date: Date): ArticleSaleRow[] {
  return getArticleSummaryForRegisterAndDate(activeRegisterId, date);
}

export type SalesDaySnapshot = {
  docs: DocSummary;
  monetary: MonetarySummary;
  groups: GroupSaleRow[];
  articles: ArticleSaleRow[];
  grandTotal: number;
  openedAt: Date | null;
  closedAt: Date | null;
  sessionClosed: boolean;
  availableDates: Date[];
};

export function snapshotFromSalesList(
  registerId: string,
  date: Date,
  list: CompletedSale[],
): SalesDaySnapshot {
  const grandTotal = summarizeGrandTotal(list);
  return {
    docs: summarizeDocs(list),
    monetary: summarizeMonetary(list),
    groups: summarizeGroups(list, grandTotal),
    articles: summarizeArticles(list),
    grandTotal,
    openedAt: getSessionOpenedAtForRegisterAndDate(registerId, date),
    closedAt: getSessionClosedAtForRegisterAndDate(registerId, date),
    sessionClosed: isSessionClosedForRegisterAndDate(registerId, date),
    availableDates: getAvailableSaleDates(registerId),
  };
}

/** Una sola pasada sobre las ventas del día (evita N lecturas al abrir el monitor). */
export function getSalesDaySnapshot(registerId: string, date: Date): SalesDaySnapshot {
  return snapshotFromSalesList(registerId, date, getSalesForRegisterAndDate(registerId, date));
}

/** Prefetch del monitor (hover / idle) para que el click no calcule en frío. */
export function warmSalesDaySnapshot(registerId = activeRegisterId, date = new Date()): void {
  try {
    getSalesDaySnapshot(registerId, date);
  } catch {
    /* ignore */
  }
}

/** Compatibilidad con monitor anterior */
export function getSessionOpenedAtForDate(date: Date): Date | null {
  return getSessionOpenedAtForRegisterAndDate(activeRegisterId, date);
}

export function isSessionClosedForDate(date: Date): boolean {
  return isSessionClosedForRegisterAndDate(activeRegisterId, date);
}

export function getSessionClosedAtForDate(date: Date): Date | null {
  return getSessionClosedAtForRegisterAndDate(activeRegisterId, date);
}
