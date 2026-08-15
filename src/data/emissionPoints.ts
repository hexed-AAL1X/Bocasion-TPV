import { WAREHOUSE_TIENDAS_TREE } from "./warehouseCatalog";
import { WAREHOUSES } from "./warehouses";

export type CashLimitMode = "advertir" | "no-permitir" | "sin-advertir";

export type EmissionPointRecord = {
  id: string;
  codigo: string;
  nombre: string;
  sucursal: string;
  tienda: string;
  habilitado: boolean;
  modeloMaquina: string;
  nroSerie: string;
  hojaExcel: string;
  limiteEfectivoModo: CashLimitMode;
  limiteEfectivoMonto: number;
  maqRegSerie: string;
};

export const CASH_LIMIT_MODE_OPTIONS: { value: CashLimitMode; label: string }[] = [
  { value: "advertir", label: "Permitir advirtiendo" },
  { value: "no-permitir", label: "No permitir" },
  { value: "sin-advertir", label: "Permitir sin advertir" },
];

function formatMaqRegSerie(modelo: string, serie: string): string {
  if (modelo && serie) return `${modelo} / ${serie}`;
  return modelo || serie || "";
}

function buildSeedRecords(): EmissionPointRecord[] {
  const records: EmissionPointRecord[] = [];
  const seenTiendas = new Set<string>();
  let codeNum = 1;

  for (const wh of WAREHOUSES) {
    const key = `${wh.sucursal}|${wh.tienda}`;
    if (seenTiendas.has(key)) continue;
    seenTiendas.add(key);

    const codigo = String(codeNum).padStart(2, "0");
    const hasTicket = codeNum % 3 !== 2;
    const modelo = hasTicket ? (codeNum % 2 === 0 ? "TM-T88V" : "TM-U220") : "";
    const serie = hasTicket ? `S${codigo.padStart(4, "0")}` : "";

    records.push({
      id: codigo,
      codigo,
      nombre: wh.tienda,
      sucursal: wh.sucursal,
      tienda: wh.tienda,
      habilitado: wh.activo,
      modeloMaquina: modelo,
      nroSerie: serie,
      hojaExcel: hasTicket && codeNum % 4 === 0 ? "TICKET_PLANTILLA.xlsx" : "",
      limiteEfectivoModo: codeNum % 5 === 0 ? "no-permitir" : codeNum % 3 === 0 ? "sin-advertir" : "advertir",
      limiteEfectivoMonto: 200 + (codeNum % 8) * 100,
      maqRegSerie: formatMaqRegSerie(modelo, serie),
    });
    codeNum += 1;
  }

  for (const node of WAREHOUSE_TIENDAS_TREE) {
    if (records.some((row) => row.tienda === node.label)) continue;

    const codigo = String(codeNum).padStart(2, "0");
    const modelo = codeNum % 2 === 0 ? "TM-T20" : "";
    const serie = modelo ? `S${codigo.padStart(4, "0")}` : "";

    records.push({
      id: codigo,
      codigo,
      nombre: node.label,
      sucursal: node.label.includes("CAJAMARCA") ? "CAJAMARCA" : node.label.includes("CALLAO") ? "CALLAO" : "LIMA",
      tienda: node.label,
      habilitado: codeNum % 7 !== 0,
      modeloMaquina: modelo,
      nroSerie: serie,
      hojaExcel: "",
      limiteEfectivoModo: "advertir",
      limiteEfectivoMonto: 500,
      maqRegSerie: formatMaqRegSerie(modelo, serie),
    });
    codeNum += 1;
  }

  const extras: Array<{ tienda: string; sucursal: string; nombre: string; habilitado: boolean }> = [
    { tienda: "PRINCIPAL", sucursal: "LIMA", nombre: "CAJA 2 - PLANTA", habilitado: true },
    { tienda: "PRINCIPAL", sucursal: "LIMA", nombre: "DELIVERY WEB", habilitado: true },
    { tienda: "UPC SAN ISIDRO", sucursal: "LIMA", nombre: "MOSTRADOR 2", habilitado: false },
    { tienda: "UPC SAN MIGUEL", sucursal: "LIMA", nombre: "CAJA RÁPIDA", habilitado: true },
    { tienda: "OLGUIN", sucursal: "LIMA", nombre: "PUNTO OLGUIN", habilitado: true },
    { tienda: "UPN COMAS", sucursal: "LIMA", nombre: "CAJA UPN COMAS", habilitado: true },
    { tienda: "UPN SJL", sucursal: "LIMA", nombre: "CAJA UPN SJL", habilitado: true },
    { tienda: "ALICORP", sucursal: "LIMA", nombre: "MOSTRADOR ALICORP", habilitado: true },
    { tienda: "DELIVERY", sucursal: "LIMA", nombre: "DELIVERY EXPRESS", habilitado: true },
    { tienda: "UPC MONTERRICO", sucursal: "LIMA", nombre: "CAJA MONTERRICO", habilitado: false },
  ];

  for (const extra of extras) {
    const codigo = String(codeNum).padStart(2, "0");
    const modelo = codeNum % 2 === 0 ? "TM-T88V" : "TM-U220";
    const serie = `S${codigo.padStart(4, "0")}`;

    records.push({
      id: codigo,
      codigo,
      nombre: extra.nombre,
      sucursal: extra.sucursal,
      tienda: extra.tienda,
      habilitado: extra.habilitado,
      modeloMaquina: modelo,
      nroSerie: serie,
      hojaExcel: "",
      limiteEfectivoModo: "advertir",
      limiteEfectivoMonto: 400,
      maqRegSerie: formatMaqRegSerie(modelo, serie),
    });
    codeNum += 1;
  }

  return records;
}

/** Datos de referencia ERP — ventana Puntos de emisión de documentos. */
export const EMISSION_POINTS: EmissionPointRecord[] = buildSeedRecords();

export function sortEmissionPoints(rows: EmissionPointRecord[]): EmissionPointRecord[] {
  return [...rows].sort((a, b) => {
    const bySucursal = a.sucursal.localeCompare(b.sucursal, "es");
    if (bySucursal !== 0) return bySucursal;
    const byTienda = a.tienda.localeCompare(b.tienda, "es");
    if (byTienda !== 0) return byTienda;
    return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
  });
}
