import type { ListColWidth } from "./buildThermalPrintPreview";

/** Tabla UI ~11px → ancho en caracteres Courier 9pt. */
export const UI_PX_PER_PRINT_CHAR = 6.5;

export type ListPrintColumn<T extends string = string> = {
  key: T;
  label: string;
  widthPx: number;
  /** Etiqueta en encabezado impreso (p. ej. sin tildes, como ERP legacy). */
  printLabel?: string;
};

export type ResolvedListColDef<T extends string = string> = {
  key: T;
  label: string;
  printLabel: string;
  w: number;
  widthPx: number;
  align?: "left" | "right";
};

function baselineCharWidth(def: ListPrintColumn): number {
  return Math.max(def.label.length, Math.ceil(def.widthPx / UI_PX_PER_PRINT_CHAR));
}

export function resolveListPrintColumns<T extends string>(
  columns: ListPrintColumn<T>[] | undefined,
  defaults: ListPrintColumn<T>[],
  rightAlignKeys: readonly T[] = [],
  /** Anchos fijos en caracteres Courier (ERP legacy); escalan si el usuario redimensiona columnas. */
  printCharWidths?: Partial<Record<T, number>>,
): ResolvedListColDef<T>[] {
  const source = columns?.length ? columns : defaults;
  const defaultByKey = new Map(defaults.map((col) => [col.key, col]));

  return source.map((col) => {
    const def = defaultByKey.get(col.key) ?? col;
    const headerLabel = col.printLabel ?? def.printLabel ?? col.label;
    const legacyW = printCharWidths?.[col.key];
    const baseChars = legacyW ?? baselineCharWidth(def);
    const scale = def.widthPx > 0 ? col.widthPx / def.widthPx : 1;
    const w =
      legacyW != null
        ? Math.max(headerLabel.length, legacyW)
        : Math.max(headerLabel.length, Math.round(baseChars * scale));
    return {
      key: col.key,
      label: col.label,
      printLabel: headerLabel,
      w,
      widthPx: col.widthPx,
      align: rightAlignKeys.includes(col.key) ? "right" : "left",
    };
  });
}

export function toListColWidths<T extends string>(cols: ResolvedListColDef<T>[]): ListColWidth[] {
  return cols.map((col) => ({
    w: col.w,
    widthPx: col.widthPx,
    align: col.align ?? "left",
  }));
}

export function rowValuesFromColumns<T extends string, R extends Record<T, string | number | boolean>>(
  row: R,
  cols: ResolvedListColDef<T>[],
): string[] {
  return cols.map((col) => String(row[col.key] ?? ""));
}
