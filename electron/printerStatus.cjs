const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const WINDOWS_STATUS = [
  [0x00000080, "Sin conexión"],
  [0x00000002, "Error"],
  [0x00000008, "Atasco de papel"],
  [0x00000010, "Sin papel"],
  [0x00000040, "Problema de papel"],
  [0x00040000, "Sin tóner"],
  [0x00020000, "Tóner bajo"],
  [0x00400000, "Puerta abierta"],
  [0x00001000, "No disponible"],
  [0x00000001, "Pausada"],
  [0x00000400, "Imprimiendo"],
  [0x00000200, "Ocupada"],
  [0x00004000, "Procesando"],
  [0x00002000, "Esperando"],
  [0x00000100, "Activa"],
  [0x00008000, "Inicializando"],
  [0x00010000, "Calentando"],
];

const CUPS_REASON_LABELS = [
  ["offline", "Sin conexión"],
  ["shutdown", "Apagada"],
  ["stopped", "Detenida"],
  ["paused", "Pausada"],
  ["media-jam", "Atasco de papel"],
  ["media-empty", "Sin papel"],
  ["media-needed", "Sin papel"],
  ["toner-empty", "Sin tóner"],
  ["toner-low", "Tóner bajo"],
  ["cover-open", "Puerta abierta"],
  ["door-open", "Puerta abierta"],
  ["connecting-to-device", "Conectando"],
  ["cups-insecure-filter-warning", "Advertencia de filtro"],
  ["cups-missing-filter-warning", "Filtro faltante"],
];

function formatWindowsPrinterStatus(status) {
  const code = Number(status) || 0;
  if (code === 0) return "Listo";

  const labels = [];
  for (const [flag, label] of WINDOWS_STATUS) {
    if (code & flag) labels.push(label);
  }
  return labels.length > 0 ? labels.join(", ") : "Listo";
}

function formatCupsReasons(reasonsRaw) {
  if (!reasonsRaw || reasonsRaw === "none") return null;

  const labels = [];
  const reasons = String(reasonsRaw)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  for (const reason of reasons) {
    const base = reason.replace(/-(error|report|warn)$/, "");
    const match = CUPS_REASON_LABELS.find(([key]) => base.includes(key) || reason.includes(key));
    if (match && !labels.includes(match[1])) labels.push(match[1]);
  }

  return labels.length > 0 ? labels.join(", ") : null;
}

function formatCupsPrinterStatus(options, fallbackStatus) {
  const state = options["printer-state"];
  const reasons = options["printer-state-reasons"];
  const accepting = options["printer-is-accepting-jobs"];

  const reasonLabel = formatCupsReasons(reasons);
  if (reasonLabel) return reasonLabel;

  if (accepting === "false") return "No acepta trabajos";

  switch (String(state)) {
    case "3":
      return "Listo";
    case "4":
      return "Imprimiendo";
    case "5":
      return "Detenida";
    default:
      break;
  }

  const numeric = Number(fallbackStatus);
  if (numeric === 3) return "Listo";
  if (numeric === 4) return "Imprimiendo";
  if (numeric === 5) return "Detenida";
  if (numeric === 0) return "Listo";

  return "Desconocido";
}

async function getLinuxLpstatStatus(printerName) {
  if (process.platform !== "linux" || !printerName) return null;
  try {
    const { stdout } = await execFileAsync("lpstat", ["-p", printerName], { timeout: 3000 });
    const text = stdout.toLowerCase();
    if (text.includes("is printing")) return "Imprimiendo";
    if (text.includes("is processing")) return "Procesando";
    if (text.includes("is idle")) return "Listo";
    if (text.includes("disabled")) return "Deshabilitada";
    if (text.includes("is stopped")) return "Detenida";
    if (text.includes("unable")) return "No disponible";
  } catch {
    /* lpstat no disponible o impresora no encontrada */
  }
  return null;
}

async function resolvePrinterStatus(printer, platform) {
  const options =
    printer.options && typeof printer.options === "object" ? printer.options : {};

  if (platform === "win32") {
    return formatWindowsPrinterStatus(printer.status);
  }

  const cupsStatus = formatCupsPrinterStatus(options, printer.status);
  if (cupsStatus !== "Desconocido") return cupsStatus;

  const lpstatStatus = await getLinuxLpstatStatus(printer.name || printer.displayName);
  if (lpstatStatus) return lpstatStatus;

  return cupsStatus;
}

module.exports = {
  resolvePrinterStatus,
};
