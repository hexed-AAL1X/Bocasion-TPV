export type Vendor = {
  code: string;
  usuario: string;
  nombre: string;
  ptoVta?: string;
  almacen?: string;
  tienda?: string;
};

/** Vendedores demo — TODO: cargar desde API / SQL Server */
export const VENDORS: Vendor[] = [
  { code: "1234", usuario: "DEMO", nombre: "Vendedor Demo" },
  { code: "5678", usuario: "JPEREZ", nombre: "Juan Pérez" },
  { code: "9012", usuario: "MGARCIA", nombre: "María García" },
];

export function findVendorByCode(code: string): Vendor | undefined {
  return VENDORS.find((v) => v.code === code);
}

export const DEFAULT_VENDOR = VENDORS[0];
