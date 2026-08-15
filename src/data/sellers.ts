import { sellerCategoryNames, SELLER_CATEGORIES } from "./sellerCategories";

export type SellerGroup =
  | "Ventas"
  | "Cobranza"
  | "Logística - compras"
  | "Repartidor y cobrador";

export type SellerAffiliationGroup =
  | "Ventas"
  | "Cobranza"
  | "Mensajería ( Envío de documentos )"
  | "Mensajería ( Recojo de documentos )"
  | "Logística - compras"
  | "Repartidor"
  | "Repartidor y cobrador"
  | "Licitaciones"
  | "Almacenero"
  | "Supervisor de locales"
  | "Ventas y cobranza";

export type SellerRecord = {
  id: string;
  codigo: string;
  nombre: string;
  grupo: SellerGroup;
  activo: boolean;
  affiliation: SellerAffiliationGroup;
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
  ubicacion: string;
  crmRepresentante: boolean;
};

export const SELLER_GROUPS: SellerGroup[] = [
  "Ventas",
  "Cobranza",
  "Logística - compras",
  "Repartidor y cobrador",
];

export const SELLER_AFFILIATION_GROUPS: SellerAffiliationGroup[] = [
  "Ventas",
  "Cobranza",
  "Mensajería ( Envío de documentos )",
  "Mensajería ( Recojo de documentos )",
  "Logística - compras",
  "Repartidor",
  "Repartidor y cobrador",
  "Licitaciones",
  "Almacenero",
  "Supervisor de locales",
  "Ventas y cobranza",
];

export const SELLER_TIENDAS = [
  "ALICORP",
  "ALICORP CALLAO",
  "ALICORP COPSA",
  "ALICORP MOLINO",
  "ALTO CARAL",
  "BEGONIAS",
  "CALLAO",
  "CROMO",
  "DELIVERY",
  "ENTEL",
  "ERNST & YOUNG",
  "OLGUIN",
  "PICHINCHA",
  "PLAZA EL SOL",
  "PRINCIPAL",
  "UPC MONTERRICO",
  "UPC SAN ISIDRO",
  "UPC SAN MIGUEL",
  "UPC VILLA",
  "UPN CAJAMARCA",
  "UPN COMAS",
  "UPN OLIVOS",
  "UPN SJL",
  "WEBERBAUER",
] as const;

/** Nombres de categoría para el combo del formulario (derivados de la tabla de categorías). */
export const SELLER_CATEGORIAS = sellerCategoryNames(SELLER_CATEGORIES);

export const SELLER_UBICACIONES = ["OFICINA", "CALLE", "LICITACION"] as const;

export function affiliationToListGroup(affiliation: SellerAffiliationGroup): SellerGroup {
  switch (affiliation) {
    case "Cobranza":
    case "Ventas y cobranza":
      return "Cobranza";
    case "Logística - compras":
      return "Logística - compras";
    case "Repartidor":
    case "Repartidor y cobrador":
      return "Repartidor y cobrador";
    default:
      return "Ventas";
  }
}

function seller(
  partial: Pick<SellerRecord, "id" | "codigo" | "nombre" | "grupo" | "activo"> &
    Partial<Omit<SellerRecord, "id" | "codigo" | "nombre" | "grupo" | "activo">>,
): SellerRecord {
  const affiliation = partial.affiliation ?? partial.grupo;
  return {
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
    ubicacion: "OFICINA",
    crmRepresentante: false,
    affiliation,
    ...partial,
    grupo: partial.grupo ?? affiliationToListGroup(affiliation),
  };
}

/** Vendedores demo — TODO: cargar desde API / SQL Server */
export const SELLERS: SellerRecord[] = [
  seller({ id: "v-0000", codigo: "V0000", nombre: "OFICINA", grupo: "Ventas", activo: true, cargo: "OFICINA" }),
  seller({
    id: "v-0001",
    codigo: "V0001",
    nombre: "VALERIA PALOMINO (FACTURACION)",
    grupo: "Cobranza",
    activo: true,
    affiliation: "Cobranza",
  }),
  seller({
    id: "v-0002",
    codigo: "V0002",
    nombre: "DIANA RODRIGUEZ",
    grupo: "Cobranza",
    activo: true,
    affiliation: "Cobranza",
  }),
  seller({
    id: "v-0007",
    codigo: "V0007",
    nombre: "MAYRA BARRETO",
    grupo: "Cobranza",
    activo: true,
    affiliation: "Cobranza",
  }),
  seller({
    id: "v-0009",
    codigo: "V0009",
    nombre: "ALFREDO GOMEZ",
    grupo: "Logística - compras",
    activo: true,
    affiliation: "Logística - compras",
  }),
  seller({
    id: "v-0010",
    codigo: "V0010",
    nombre: "JETSU CHIARA",
    grupo: "Cobranza",
    activo: true,
    affiliation: "Cobranza",
  }),
  seller({ id: "v-0011", codigo: "V0011", nombre: "UPC MO_CJA1", grupo: "Ventas", activo: true }),
  seller({ id: "v-0015", codigo: "V0015", nombre: "UPC VI_CJA2", grupo: "Ventas", activo: true }),
  seller({
    id: "v-0019",
    codigo: "V0019",
    nombre: "DELIVERY_CJA",
    grupo: "Repartidor y cobrador",
    activo: true,
    affiliation: "Repartidor y cobrador",
    tiendaAsignada: "DELIVERY",
  }),
  seller({ id: "v-0034", codigo: "V0034", nombre: "ALICORP_CJA1", grupo: "Ventas", activo: true, tiendaAsignada: "ALICORP" }),
  seller({ id: "v-0036", codigo: "V0036", nombre: "MARYURI VILLEGAS", grupo: "Ventas", activo: true }),
  seller({ id: "v-0037", codigo: "V0037", nombre: "UPN CJ_CJA3", grupo: "Ventas", activo: true }),
  seller({ id: "v-0038", codigo: "V0038", nombre: "JOSE LUIS QUILO", grupo: "Ventas", activo: true }),
  seller({
    id: "v-0039",
    codigo: "V0039",
    nombre: "DANIEL QUISPE QUIROZ",
    grupo: "Cobranza",
    activo: true,
    affiliation: "Cobranza",
  }),
  seller({ id: "v-0040", codigo: "V0040", nombre: "UPC SI_CJA1", grupo: "Ventas", activo: true, tiendaAsignada: "UPC SAN ISIDRO" }),
  seller({ id: "v-0041", codigo: "V0041", nombre: "UPC SI_CJA2", grupo: "Ventas", activo: true, tiendaAsignada: "UPC SAN ISIDRO" }),
  seller({ id: "v-0042", codigo: "V0042", nombre: "UPC SI_CJA3", grupo: "Ventas", activo: true, tiendaAsignada: "UPC SAN ISIDRO" }),
  seller({
    id: "v-0043",
    codigo: "V0043",
    nombre: "CARLOS POMA LEGUIA",
    grupo: "Cobranza",
    activo: true,
    affiliation: "Cobranza",
  }),
  seller({ id: "v-0044", codigo: "V0044", nombre: "ALICALL_CJA1", grupo: "Ventas", activo: true, tiendaAsignada: "ALICORP CALLAO" }),
  seller({ id: "v-0045", codigo: "V0045", nombre: "ALICALL_CJA2", grupo: "Ventas", activo: true, tiendaAsignada: "ALICORP CALLAO" }),
  seller({ id: "v-0046", codigo: "V0046", nombre: "ALICOPSA_CJA1", grupo: "Ventas", activo: true, tiendaAsignada: "ALICORP COPSA" }),
  seller({ id: "v-0047", codigo: "V0047", nombre: "ALIMOLINO_CJA1", grupo: "Ventas", activo: true, tiendaAsignada: "ALICORP MOLINO" }),
  seller({ id: "v-0048", codigo: "V0048", nombre: "ALICOPSA_CJA2", grupo: "Ventas", activo: true, tiendaAsignada: "ALICORP COPSA" }),
];

export function sortSellers(rows: SellerRecord[]): SellerRecord[] {
  return [...rows].sort((a, b) => a.codigo.localeCompare(b.codigo));
}
