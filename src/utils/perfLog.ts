/**
 * Métricas de rendimiento en consola (DevTools + terminal Electron).
 */

const T0 = performance.now();

function ms(): string {
  return `${(performance.now() - T0).toFixed(1)}ms`;
}

type MemInfo = {
  usedMB: number;
  totalMB: number;
  limitMB: number;
};

function readMem(): MemInfo | null {
  const mem = (performance as { memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } }).memory;
  if (!mem) return null;
  return {
    usedMB: mem.usedJSHeapSize / 1024 / 1024,
    totalMB: mem.totalJSHeapSize / 1024 / 1024,
    limitMB: mem.jsHeapSizeLimit / 1024 / 1024,
  };
}

function heapSuffix(): string {
  const mem = readMem();
  if (!mem) return "";
  return ` | heap: ${mem.usedMB.toFixed(1)} MB`;
}

const GREEN = "color:#22c55e;font-weight:700";
const BLUE = "color:#3b82f6;font-weight:700";
const PURPLE = "color:#a855f7;font-weight:700";
const RESET = "color:inherit;font-weight:normal";

function modeTag(efficientMode: boolean): string {
  return efficientMode ? "%c[Modo eficiente ON]%c" : "%c[Modo normal]%c";
}

export function logPerfEvent(label: string, efficientMode: boolean): void {
  const color = efficientMode ? GREEN : BLUE;
  console.log(`${modeTag(efficientMode)} ${label} | t=${ms()}${heapSuffix()}`, color, RESET);
}

export function logMemSnapshot(label: string): void {
  const mem = readMem();
  if (!mem) {
    console.log(
      `%c[BocaSoft Perf]%c ${label} | t=${ms()} | (memory API no disponible)`,
      PURPLE,
      RESET,
    );
    return;
  }
  console.log(
    `%c[BocaSoft Perf]%c ${label} | t=${ms()} | heap: ${mem.usedMB.toFixed(1)}/${mem.totalMB.toFixed(1)} MB`,
    PURPLE,
    RESET,
  );
}

/** Resumen al arrancar: qué esperar en cada modo. */
export function logPerfStartupSummary(efficientMode: boolean): void {
  const mem = readMem();
  const heapLine = mem ? `${mem.usedMB.toFixed(1)} MB` : "N/D";
  console.group(`${efficientMode ? "⚡ Modo eficiente" : "🚀 Modo normal"} — BocaSoft Perf`);
  console.log(`Heap inicial: ${heapLine}`);
  if (efficientMode) {
    console.log("• AppShell NO se precarga en el login (menos RAM/CPU).");
    console.log("• Se descarga al confirmar clave (pantalla «Iniciando sesión…»).");
    console.log("• Compare heap en login vs tras entrar al módulo de ventas.");
  } else {
    console.log("• AppShell se precarga en segundo plano al abrir la app.");
    console.log("• El login debería mostrar heap bajo (~5–6 MB) y subir tras prefetch (~+4 MB).");
  }
  console.log("Filtre consola por: BocaSoft Perf | Modo eficiente | Modo normal");
  console.groupEnd();
}

export function logPerfLoginVsApp(loginHeapMB: number | null, efficientMode: boolean): void {
  const mem = readMem();
  if (!mem || loginHeapMB == null) return;
  const delta = mem.usedMB - loginHeapMB;
  console.log(
    `%c[BocaSoft Perf]%c Login → AppShell | heap login: ${loginHeapMB.toFixed(1)} MB → ahora: ${mem.usedMB.toFixed(1)} MB (+${delta.toFixed(1)} MB) | t=${ms()}`,
    PURPLE,
    RESET,
  );
  if (efficientMode && delta < 2) {
    console.warn(
      "[BocaSoft Perf] Modo eficiente: delta heap bajo — AppShell pudo cargarse antes del login.",
    );
  }
}

export function currentHeapMB(): number | null {
  return readMem()?.usedMB ?? null;
}
