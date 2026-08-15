export type CodeLabelOption = {
  code: string;
  label: string;
};

export type CatalogTreeNode = {
  code: string;
  label: string;
  children?: CatalogTreeNode[];
};

/** Tipos de almacén — combo dos columnas (ERP). */
export const WAREHOUSE_TIPOS: CodeLabelOption[] = [
  { code: "1", label: "Principal (ventas predeterminado)" },
  { code: "2", label: "Producción" },
  { code: "3", label: "Mermas" },
  { code: "4", label: "Averiados" },
  { code: "5", label: "Depósito, reserva" },
  { code: "6", label: "Licitaciones" },
  { code: "7", label: "Almacén central (para distribución)" },
  { code: "8", label: "Otros" },
];

/** Sucursales — combo dos columnas (ERP). */
export const WAREHOUSE_SUCURSALES: CodeLabelOption[] = [
  { code: "01", label: "LIMA" },
  { code: "02", label: "CAJAMARCA" },
  { code: "03", label: "CALLAO" },
];

/** Sub centros de costo — árbol (ERP). */
export const WAREHOUSE_SUB_CCOSTO_TREE: CatalogTreeNode[] = [
  {
    code: "01",
    label: "PLANTA SURCO",
    children: [
      { code: "0101", label: "INGRESOS - VENTAS" },
      { code: "0104", label: "COSTOS PRODUCCION (PLANTA)" },
      { code: "0105", label: "OPERACIONES (PLANTA)" },
      { code: "0106", label: "ADMINISTRACION" },
      { code: "0107", label: "VENTAS" },
    ],
  },
  { code: "02", label: "UPC SAN MIGUEL" },
  { code: "04", label: "UPN COMAS" },
  { code: "05", label: "UPN SJL" },
  { code: "06", label: "UPN CAJAMARCA" },
  { code: "07", label: "ENTEL SAN ISIDRO" },
  { code: "08", label: "ALTO CARAL" },
  { code: "09", label: "EDIFICIO OLGUIN" },
  { code: "10", label: "COLEGIO WEBERBAUER" },
  { code: "11", label: "ERNST & YOUNG" },
  { code: "12", label: "BEGONIAS" },
  { code: "13", label: "CROMO" },
  { code: "14", label: "ENTEL SAN BORJA" },
  { code: "15", label: "UPN LOS OLIVOS" },
];

/** Tiendas — árbol plano (ERP). */
export const WAREHOUSE_TIENDAS_TREE: CatalogTreeNode[] = [
  { code: "01", label: "PRINCIPAL" },
  { code: "06", label: "UPN CAJAMARCA" },
  { code: "07", label: "ENTEL SAN ISIDRO" },
  { code: "08", label: "ALTO CARAL" },
  { code: "09", label: "EDIFICIO OLGUIN" },
  { code: "10", label: "COLEGIO WEBERBAUER" },
  { code: "11", label: "ERNST & YOUNG" },
  { code: "12", label: "BEGONIAS" },
  { code: "13", label: "CROMO" },
  { code: "14", label: "ENTEL SAN BORJA" },
  { code: "15", label: "UPN LOS OLIVOS" },
  { code: "16", label: "PLAZA DEL SOL" },
  { code: "17", label: "UPC MONTERRICO" },
  { code: "18", label: "UPC VILLA" },
  { code: "19", label: "DELIVERY - SURCO" },
  { code: "20", label: "ALICORP" },
  { code: "21", label: "UPC SAN ISIDRO" },
  { code: "22", label: "ALICORP CALLAO" },
  { code: "23", label: "ALICORP CAL COPSA" },
  { code: "24", label: "ALICORP CAL MOLINO" },
];

export function warehouseTipoLabels(): string[] {
  return WAREHOUSE_TIPOS.map((item) => item.label);
}

export function findCodeLabelByLabel(
  options: CodeLabelOption[],
  label: string,
): CodeLabelOption | undefined {
  return options.find((item) => item.label === label);
}

export function findTreeNodeByValue(
  nodes: CatalogTreeNode[],
  value: string,
  valueKey: "code" | "label",
): CatalogTreeNode | undefined {
  for (const node of nodes) {
    if (node[valueKey] === value) return node;
    if (node.children?.length) {
      const found = findTreeNodeByValue(node.children, value, valueKey);
      if (found) return found;
    }
  }
  return undefined;
}

export function treeNodeDisplay(node: CatalogTreeNode): string {
  return `${node.code} - ${node.label}`;
}

export type CatalogSelectOption = {
  value: string;
  label: string;
};

export type CodeLabelSelectOption = {
  value: string;
  code: string;
  label: string;
  indent?: number;
};

export function formatCodeLabel(code: string, label: string): string {
  return code ? `${code} - ${label}` : label;
}

export function codeLabelOptionsFromCatalog(
  items: CodeLabelOption[],
  valueKey: "code" | "label" = "label",
): CodeLabelSelectOption[] {
  return items.map((item) => ({
    value: item[valueKey],
    code: item.code,
    label: item.label,
  }));
}

export function codeLabelOptionsFromTree(
  nodes: CatalogTreeNode[],
  valueKey: "code" | "label",
  depth = 0,
): CodeLabelSelectOption[] {
  const out: CodeLabelSelectOption[] = [];
  for (const node of nodes) {
    out.push({
      value: node[valueKey],
      code: node.code,
      label: node.label,
      indent: depth,
    });
    if (node.children?.length) {
      out.push(...codeLabelOptionsFromTree(node.children, valueKey, depth + 1));
    }
  }
  return out;
}

export function flattenTreeToSelectOptions(
  nodes: CatalogTreeNode[],
  valueKey: "code" | "label",
  depth = 0,
): CatalogSelectOption[] {
  const out: CatalogSelectOption[] = [];
  const pad = depth > 0 ? "\u00A0".repeat(depth * 3) : "";
  for (const node of nodes) {
    out.push({
      value: node[valueKey],
      label: `${pad}${formatCodeLabel(node.code, node.label)}`,
    });
    if (node.children?.length) {
      out.push(...flattenTreeToSelectOptions(node.children, valueKey, depth + 1));
    }
  }
  return out;
}

export const WAREHOUSE_TIPO_SELECT_OPTIONS = codeLabelOptionsFromCatalog(WAREHOUSE_TIPOS, "label");

export const WAREHOUSE_SUCURSAL_SELECT_OPTIONS = codeLabelOptionsFromCatalog(WAREHOUSE_SUCURSALES, "label");

export const WAREHOUSE_SUB_CCOSTO_SELECT_OPTIONS = codeLabelOptionsFromTree(WAREHOUSE_SUB_CCOSTO_TREE, "code");

export const WAREHOUSE_TIENDA_SELECT_OPTIONS = codeLabelOptionsFromTree(WAREHOUSE_TIENDAS_TREE, "label");
