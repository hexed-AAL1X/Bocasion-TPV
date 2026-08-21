export type RegisterStatus = "Abierto" | "Cerrado";

export type PosRegister = {
  id: string;
  label: string;
  point: string;
  branch: string;
  openedAtTime: string;
};

export type NavaVendorRow = {
  codven: string;
  nomven: string;
  estado?: string;
  usuario?: string;
  nombres?: string;
};

/** Código Nava de caja (tbl01ven.codven), no el ID visual antiguo. */
export const DEFAULT_REGISTER_ID = "V0046";

export const POS_REGISTERS: PosRegister[] = [
  { id: "V0046", label: "ALICOPSA_CJA1", point: "ALICOPSA_CJA1", branch: "ALICOPSA", openedAtTime: "—" },
  { id: "V0042", label: "UPC SI_CJA3", point: "UPC SI_CJA3", branch: "UPC SI", openedAtTime: "—" },
  { id: "V0017", label: "BEGO_CJA1", point: "BEGO_CJA1", branch: "BEGO", openedAtTime: "—" },
];

export function vendorRowToRegister(row: NavaVendorRow): PosRegister {
  const label = (row.nomven || row.codven).trim();
  const branch = label.replace(/[_\s]*(CJA|VTA)\d*$/i, "").trim() || label;
  return {
    id: row.codven.trim(),
    label,
    point: label,
    branch,
    openedAtTime: "—",
  };
}

export function replacePosRegisters(rows: PosRegister[]): void {
  if (!rows.length) return;
  POS_REGISTERS.splice(0, POS_REGISTERS.length, ...rows);
}

export async function loadPosRegistersFromNava(): Promise<PosRegister[]> {
  const api = window.bocasoft?.listNavaVendors;
  if (!api) return POS_REGISTERS;
  try {
    const rows = await api();
    const mapped = (rows ?? [])
      .filter((row) => row.codven?.trim())
      .map(vendorRowToRegister);
    replacePosRegisters(mapped);
  } catch {
    /* se mantienen las cajas locales */
  }
  return POS_REGISTERS;
}

export function getRegisterById(id: string): PosRegister | undefined {
  return POS_REGISTERS.find((register) => register.id === id);
}

export function getDefaultRegister(): PosRegister {
  return getRegisterById(DEFAULT_REGISTER_ID) ?? POS_REGISTERS[0];
}
