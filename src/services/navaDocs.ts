import type { CompletedSale, PaymentMethod } from "../types/sales";

export type NavaDocKind = "01" | "03" | "all";

export type NavaDocRow = {
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
  efectivo?: number;
  tarjeta?: number;
  banco?: number;
  flag?: string;
  tcam?: number;
  monrecib?: number;
  monvuelto?: number;
  observ?: string;
  codtar?: string;
  lines?: Array<{
    codi: string;
    descr: string;
    umed: string;
    cant: number;
    preu: number;
    dsct: number;
    totn: number;
    nomgru: string;
  }>;
};

export function navaDocKindLabel(kind: Exclude<NavaDocKind, "all">): string {
  return kind === "01" ? "Facturas" : "Boletas";
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function listNavaDocs(
  kind: NavaDocKind,
  limit = 150,
  fecha?: string,
  codven?: string,
): Promise<NavaDocRow[]> {
  const api = window.bocasoft?.listNavaDocs;
  if (!api) {
    throw new Error("Esta vista requiere la app de escritorio (Electron/Tauri) con SQL configurado.");
  }
  return api({ cdocu: kind, limit, fecha, codven: codven?.trim() || undefined });
}

export async function listNavaDocsForDate(date: Date, limit = 800, codven?: string): Promise<NavaDocRow[]> {
  return listNavaDocs("all", limit, toDateKey(date), codven);
}

function parseDocNumber(ndocu: string): number {
  const digits = ndocu.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits.slice(-7)) || 0;
}

function paymentFromRow(row: NavaDocRow): PaymentMethod {
  const tarjeta = row.tarjeta ?? 0;
  const banco = row.banco ?? 0;
  const efectivo = row.efectivo ?? 0;
  if (tarjeta > 0 && efectivo > 0) return "mixto";
  if (tarjeta > 0) return "tarjeta";
  if (banco > 0) return "banco";
  if ((row.mone ?? "").toUpperCase().includes("US") || row.mone === "2") return "dolar";
  return "soles";
}

function isAnulado(flag: string | undefined): boolean {
  const f = (flag ?? "").trim().toUpperCase();
  return f === "1" || f === "A" || f === "X" || f === "S" || f === "ANULADO";
}

function parseFecha(fecha: string): Date {
  const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const iso = fecha.includes("T") ? fecha : fecha.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function navaRowToSale(row: NavaDocRow): CompletedSale {
  const docType = row.cdocu === "01" ? "factura" : row.cdocu === "03" ? "boleta" : "nota";
  const pm = paymentFromRow(row);
  const total = row.totn;
  const cliente =
    row.ruccli && row.nomcli
      ? `${row.nomcli} (${row.ruccli})`
      : row.nomcli || "Cliente";
  return {
    id: `nava-${row.cdocu}-${row.ndocu}-${row.fecha}`,
    at: parseFecha(row.fecha),
    docType,
    docNumber: parseDocNumber(row.ndocu),
    docRef: row.ndocu,
    clienteLabel: cliente,
    vendedor: row.codven || "",
    paymentMethod: pm,
    lines: (row.lines ?? []).map((line, index) => {
      const qty = line.cant || 1;
      const lineTotal = line.totn || qty * line.preu;
      return {
        id: `${row.cdocu}-${row.ndocu}-${index + 1}`,
        code: line.codi,
        description: line.descr || line.codi || "ITEM",
        group: line.nomgru || "Otros",
        qty,
        um: line.umed || "UND",
        unitPrice: qty ? lineTotal / qty : lineTotal,
        dscto: 0,
      };
    }),
    total,
    receivedS: row.monrecib ?? 0,
    vueltoS: row.monvuelto ?? 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel:
      row.observ?.trim() ||
      (pm === "tarjeta" ? "Tarjeta" : pm === "banco" ? "Banco" : "Efectivo S/."),
    nroOperacion: "",
    nroCta: "",
    anulado: isAnulado(row.flag) ? total : 0,
    tipoVenta: "Mercaderia",
  };
}

const salesCache = new Map<string, CompletedSale[]>();
const salesInflight = new Map<string, Promise<CompletedSale[]>>();
const PERSIST_KEY = "bocasoft-nava-docs-cache";

type PersistShape = {
  dates: string[];
  days: Record<string, NavaDocRow[]>;
};

let navaOnline = false;
let lastSqlError = "";

export function isNavaOnline(): boolean {
  return navaOnline;
}

export function getLastSqlError(): string {
  return lastSqlError;
}

function markSqlOk(): void {
  navaOnline = true;
  lastSqlError = "";
}

function markSqlError(err: unknown): void {
  navaOnline = false;
  const raw = err instanceof Error ? err.message : String(err ?? "Error desconocido");
  lastSqlError = raw.replace(/\s+/g, " ").trim().slice(0, 280);
  if (!/Failed to connect|ETIMEOUT|timeout/i.test(lastSqlError)) {
    console.error(`[SQL] ${lastSqlError}`);
  }
}

function loadPersist(): PersistShape {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return { dates: [], days: {} };
    const parsed = JSON.parse(raw) as PersistShape;
    return {
      dates: Array.isArray(parsed.dates) ? parsed.dates.filter((k) => typeof k === "string") : [],
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
    };
  } catch {
    return { dates: [], days: {} };
  }
}

function savePersist(patch: { dates?: string[]; dayKey?: string; rows?: NavaDocRow[] }): void {
  const cur = loadPersist();
  const days = { ...cur.days };
  if (patch.dayKey && patch.rows) {
    days[patch.dayKey] = patch.rows.length > 1200 ? [] : patch.rows;
  }
  let dates = patch.dates ?? cur.dates;
  const dateOnly = patch.dayKey?.slice(0, 10) ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && patch.rows?.length && !dates.includes(dateOnly)) {
    dates = [dateOnly, ...dates];
  }
  const keys = Object.keys(days).sort().reverse();
  if (keys.length > 90) {
    for (const extra of keys.slice(90)) delete days[extra];
  }
  localStorage.setItem(PERSIST_KEY, JSON.stringify({ dates: dates.slice(0, 180), days }));
}

function salesFromRows(rows: NavaDocRow[]): CompletedSale[] {
  return rows.map(navaRowToSale);
}

function cachedOrPersisted(key: string): CompletedSale[] {
  const mem = salesCache.get(key);
  if (mem) return mem;
  const rows = loadPersist().days[key];
  if (!rows?.length) return [];
  const mapped = salesFromRows(rows);
  salesCache.set(key, mapped);
  return mapped;
}

export function getCachedNavaSales(date: Date): CompletedSale[] {
  return cachedOrPersisted(toDateKey(date));
}

export function mergeDaySales(local: CompletedSale[], remote: CompletedSale[]): CompletedSale[] {
  const keys = new Set(
    local.map((sale) => (sale.docRef || `${sale.docType}-${sale.docNumber}`).trim()),
  );
  const extra = remote.filter((sale) => {
    const key = (sale.docRef || "").trim();
    if (key && keys.has(key)) return false;
    return !local.some((item) => item.id === sale.id);
  });
  return [...local, ...extra].sort((a, b) => b.at.getTime() - a.at.getTime());
}

export async function listNavaSalesForDate(date: Date, codven = ""): Promise<CompletedSale[]> {
  const ven = codven.trim();
  const key = `${toDateKey(date)}|${ven}`;
  const pending = salesInflight.get(key);
  if (pending) return pending;
  const request = listNavaDocsForDate(date, 800, ven)
    .then((rows) => {
      markSqlOk();
      const mapped = salesFromRows(rows);
      salesCache.set(key, mapped);
      savePersist({ dayKey: key, rows });
      return mapped;
    })
    .catch((err) => {
      markSqlError(err);
      const fallback = cachedOrPersisted(key);
      if (fallback.length) return fallback;
      throw err;
    })
    .finally(() => {
      salesInflight.delete(key);
    });
  salesInflight.set(key, request);
  return request;
}

export function prefetchNavaSalesForDate(date = new Date(), codven = ""): void {
  void listNavaDayReport(date, codven).catch(() => {
    /* silencio */
  });
}

export type NavaDayReport = {
  docs: {
    boletas: number;
    boletaFrom: number;
    boletaTo: number;
    notas: number;
    notaFrom: number;
    notaTo: number;
    facturas: number;
    facturaFrom: number;
    facturaTo: number;
    anulados: number;
    total: number;
  };
  monetary: {
    contado: number;
    credito: number;
    tarjeta: number;
    banco: number;
    cards: Array<{ label: string; total: number }>;
    total: number;
  };
  groups: Array<{ group: string; total: number; percent: number }>;
  articles: Array<{ description: string; qty: number; total: number }>;
  grandTotal: number;
};

const reportCache = new Map<string, NavaDayReport>();
const reportInflight = new Map<string, Promise<NavaDayReport>>();

export function getCachedNavaDayReport(date: Date, codven = ""): NavaDayReport | null {
  return reportCache.get(`${toDateKey(date)}|${codven.trim()}`) ?? null;
}

export async function listNavaDayReport(date: Date, codven = ""): Promise<NavaDayReport> {
  const ven = codven.trim();
  const key = `${toDateKey(date)}|${ven}`;
  const pending = reportInflight.get(key);
  if (pending) return pending;
  const api = window.bocasoft?.listNavaDayReport;
  if (!api) {
    throw new Error("Esta vista requiere la app de escritorio (Electron) con SQL configurado.");
  }
  const request = api({ fecha: toDateKey(date), codven: ven })
    .then((data) => {
      markSqlOk();
      reportCache.set(key, data);
      return data;
    })
    .catch((err) => {
      markSqlError(err);
      const cached = reportCache.get(key);
      if (cached) return cached;
      throw err;
    })
    .finally(() => {
      reportInflight.delete(key);
    });
  reportInflight.set(key, request);
  return request;
}

function parseCliente(sale: CompletedSale): { nomcli: string; ruccli: string } {
  const label = sale.clienteLabel.trim();
  const withDoc = label.match(/^(.+?)\s*\((?:dni|ruc)?\s*(\d{8,11})\)\s*$/i);
  if (withDoc) return { nomcli: withDoc[1].trim(), ruccli: withDoc[2] };
  return { nomcli: label || "VENTA CONTADO", ruccli: "" };
}

function keysToDates(keys: string[]): Date[] {
  return keys
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    })
    .filter((date) => !Number.isNaN(date.getTime()));
}

export type NavaCalendarMarks = {
  sales: Date[];
  opened: Date[];
};

function parseDateListPayload(
  raw: string[] | { sales?: string[]; opened?: string[] } | null | undefined,
): { sales: string[]; opened: string[] } {
  if (Array.isArray(raw)) return { sales: raw, opened: [] };
  return {
    sales: Array.isArray(raw?.sales) ? raw.sales : [],
    opened: Array.isArray(raw?.opened) ? raw.opened : [],
  };
}

export async function listNavaSaleDates(
  codven = "",
  range?: { from: string; to: string },
): Promise<NavaCalendarMarks> {
  const api = window.bocasoft?.listNavaDates;
  if (!api) {
    markSqlError(new Error("IPC SQL no disponible (requiere app de escritorio)."));
    return { sales: keysToDates(loadPersist().dates), opened: [] };
  }
  try {
    const raw = await api({
      codven: codven.trim(),
      from: range?.from,
      to: range?.to,
    });
    markSqlOk();
    const parsed = parseDateListPayload(raw);
    savePersist({ dates: parsed.sales });
    return { sales: keysToDates(parsed.sales), opened: keysToDates(parsed.opened) };
  } catch (err) {
    markSqlError(err);
    const persisted = loadPersist();
    const fromDays = Object.keys(persisted.days).filter((k) => persisted.days[k]?.length);
    return {
      sales: keysToDates([...new Set([...persisted.dates, ...fromDays])]),
      opened: [],
    };
  }
}

const INSERT_QUEUE_KEY = "bocasoft-nava-insert-queue";

function readInsertQueue(): unknown[] {
  try {
    const raw = localStorage.getItem(INSERT_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}

function writeInsertQueue(items: unknown[]): void {
  localStorage.setItem(INSERT_QUEUE_KEY, JSON.stringify(items.slice(-50)));
}

function saleToInsertPayload(sale: CompletedSale, vendorCode: string) {
  const { nomcli, ruccli } = parseCliente(sale);
  const totn = sale.total;
  const tota = Math.round((totn / 1.18) * 100) / 100;
  const toti = Math.round((totn - tota) * 100) / 100;
  const pm = sale.paymentMethod;
  return {
    cdocu: (sale.docType === "factura" ? "01" : "03") as "01" | "03",
    nomcli,
    ruccli,
    codcli: "C00000",
    codven: vendorCode,
    totn,
    tota,
    toti,
    efectivo: pm === "soles" || pm === "mixto" ? totn : 0,
    tarjeta: pm === "tarjeta" ? totn : 0,
    banco: pm === "banco" ? totn : 0,
    cajrecib: sale.receivedS || totn,
    cajvuelto: sale.vueltoS,
    observ: sale.paymentMethod === "tarjeta" ? sale.forpagoLabel : "",
    lines: sale.lines.map((line) => ({
      code: line.code,
      description: line.description,
      qty: line.qty,
      um: line.um,
      unitPrice: line.unitPrice,
      dscto: line.dscto,
    })),
    _saleId: sale.id,
  };
}

export async function persistSaleToNava(sale: CompletedSale, vendorCode = ""): Promise<void> {
  const api = window.bocasoft?.insertNavaSale;
  if (!api) return;
  const payload = saleToInsertPayload(sale, vendorCode);
  try {
    const result = await api(payload);
    const { updateSaleDocRef } = await import("./salesSession");
    updateSaleDocRef(sale.id, result.ndocu);
    const key = toDateKey(sale.at);
    const cached = salesCache.get(key) ?? [];
    salesCache.set(key, [
      { ...sale, docRef: result.ndocu },
      ...cached.filter((item) => item.id !== sale.id),
    ]);
    void flushNavaInsertQueue();
  } catch {
    const queue = readInsertQueue();
    queue.push(payload);
    writeInsertQueue(queue);
  }
}

export async function flushNavaInsertQueue(): Promise<void> {
  const api = window.bocasoft?.insertNavaSale;
  if (!api) return;
  const queue = readInsertQueue();
  if (!queue.length) return;
  const leftover: unknown[] = [];
  for (const item of queue) {
    try {
      await api(item as Parameters<NonNullable<typeof api>>[0]);
    } catch {
      leftover.push(item);
    }
  }
  writeInsertQueue(leftover);
}
