import type { PrinterInfoLite } from "../types/printer";

const FALLBACK_PRINTERS: PrinterInfoLite[] = [
  {
    name: "Microsoft Print to PDF",
    displayName: "Microsoft Print to PDF",
    description: "Microsoft Print To PDF",
    portName: "PORTPROMPT:",
    comment: "",
    status: "Listo",
    isDefault: true,
  },
  {
    name: "Microsoft XPS Document Writer",
    displayName: "Microsoft XPS Document Writer",
    description: "Microsoft XPS Document Writer v4",
    portName: "PORTPROMPT:",
    comment: "",
    status: "Listo",
    isDefault: false,
  },
];

export async function loadSystemPrinters(): Promise<PrinterInfoLite[]> {
  const api = window.bocasoft;
  if (!api?.getPrinters) return FALLBACK_PRINTERS;
  try {
    const list = await api.getPrinters();
    return list.length > 0 ? list : FALLBACK_PRINTERS;
  } catch {
    return FALLBACK_PRINTERS;
  }
}

export function defaultPrinterName(printers: PrinterInfoLite[]): string {
  const def = printers.find((p) => p.isDefault);
  return def?.name ?? printers[0]?.name ?? "";
}

export function findPrinter(printers: PrinterInfoLite[], name: string): PrinterInfoLite | undefined {
  return printers.find((p) => p.name === name);
}
