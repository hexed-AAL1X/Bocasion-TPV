import type { SellerAffiliationGroup, SellerGroup, SellerRecord } from "../data/sellers";
import { affiliationToListGroup } from "../data/sellers";

export type SellerFormValues = {
  codigo: string;
  activo: boolean;
  nombre: string;
  telefono: string;
  email: string;
  celular: string;
  objetivoVta: boolean;
  cargo: string;
  msn: string;
  directo: string;
  rpc: string;
  tiendaAsignada: string;
  comisionVentas: number;
  comisionCobranza: number;
  categoria: string;
  affiliation: SellerAffiliationGroup;
  ubicacion: string;
  crmRepresentante: boolean;
};

export function nextSellerCodigo(existing: SellerRecord[]): string {
  let max = 0;
  for (const row of existing) {
    const match = row.codigo.match(/^V(\d+)$/i);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `V${String(max + 1).padStart(4, "0")}`;
}

export function emptySellerForm(existing: SellerRecord[]): SellerFormValues {
  return {
    codigo: nextSellerCodigo(existing),
    activo: true,
    nombre: "",
    telefono: "",
    email: "",
    celular: "",
    objetivoVta: false,
    cargo: "",
    msn: "",
    directo: "",
    rpc: "",
    tiendaAsignada: "PRINCIPAL",
    comisionVentas: 10,
    comisionCobranza: 2,
    categoria: "Fuerza de venta Provincia",
    affiliation: "Ventas",
    ubicacion: "OFICINA",
    crmRepresentante: false,
  };
}

export function sellerRecordToForm(record: SellerRecord): SellerFormValues {
  return {
    codigo: record.codigo,
    activo: record.activo,
    nombre: record.nombre,
    telefono: record.telefono,
    email: record.email,
    celular: record.celular,
    objetivoVta: record.objetivoVta,
    cargo: record.cargo,
    msn: record.msn,
    directo: record.directo,
    rpc: record.rpc,
    tiendaAsignada: record.tiendaAsignada,
    comisionVentas: record.comisionVentas,
    comisionCobranza: record.comisionCobranza,
    categoria: record.categoria,
    affiliation: record.affiliation,
    ubicacion: record.ubicacion,
    crmRepresentante: record.crmRepresentante,
  };
}

export function sellerFormToRecord(values: SellerFormValues, existing?: SellerRecord): SellerRecord {
  const grupo: SellerGroup = affiliationToListGroup(values.affiliation);
  return {
    id: existing?.id ?? `v-${Date.now()}`,
    codigo: values.codigo.trim(),
    nombre: values.nombre.trim(),
    grupo,
    activo: values.activo,
    affiliation: values.affiliation,
    telefono: values.telefono.trim(),
    email: values.email.trim(),
    celular: values.celular.trim(),
    objetivoVta: values.objetivoVta,
    cargo: values.cargo.trim(),
    msn: values.msn.trim(),
    directo: values.directo.trim(),
    rpc: values.rpc.trim(),
    tiendaAsignada: values.tiendaAsignada,
    comisionVentas: values.comisionVentas,
    comisionCobranza: values.comisionCobranza,
    categoria: values.categoria,
    ubicacion: values.ubicacion,
    crmRepresentante: values.crmRepresentante,
  };
}
