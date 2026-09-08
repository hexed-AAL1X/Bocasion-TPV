import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WAREHOUSES, type WarehouseRecord } from "../../data/warehouses";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import type { WarehousesPrintData } from "../../utils/buildWarehousesPrintPreview";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import {
  emptyWarehouseForm,
  formatRecepManualSiNo,
  sanitizeWarehouseRecord,
  warehouseFormToRecord,
  warehouseRecordToForm,
} from "../../utils/warehouseFormUtils";
import { WarehouseFormDialog, type WarehouseFormValues } from "./WarehouseFormDialog";
import { WarehouseDeleteConfirmDialog } from "./WarehouseDeleteConfirmDialog";
import { WarehouseTransferDialog } from "./WarehouseTransferDialog";
import styles from "./AlmacenesDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  onClose: () => void;
};

type FilterMode = "activos" | "inactivos" | "todos";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "activos", label: "Solo activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

type WarehouseFormState =
  | { mode: "add" }
  | { mode: "edit"; recordId: string };

type WarehouseColumnDef = ResizableColumnDef & {
  key: "codigo" | "almacen" | "direccion" | "telefono" | "tipo" | "sucursal" | "tienda" | "recepManual";
  align?: "center";
};

function maxWarehouseFieldLen(key: keyof WarehouseRecord): number {
  return WAREHOUSES.reduce((max, row) => Math.max(max, String(row[key] ?? "").length), 0);
}

/** ~7px por carácter a 11px + padding horizontal de celda. */
function contentColumnWidth(charCount: number, minPx: number): number {
  return Math.max(minPx, Math.ceil(charCount * 7) + 16);
}

function columnWidthFor(label: string, contentChars: number, minPx: number): number {
  return Math.max(
    contentColumnWidth(contentChars, minPx),
    contentColumnWidth(label.length, minPx),
  );
}

function maxRecepManualLabelLen(): number {
  return WAREHOUSES.reduce(
    (max, row) => Math.max(max, formatRecepManualSiNo(row.recepManual).length),
    "Recep. manual".length,
  );
}

const WAREHOUSE_COLUMNS: WarehouseColumnDef[] = [
  {
    key: "codigo",
    label: "Código",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("codigo"), 52),
    minWidth: 40,
    align: "center",
  },
  {
    key: "almacen",
    label: "Almacén",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("almacen"), 100),
    minWidth: 80,
    stretchWeight: 3,
  },
  {
    key: "direccion",
    label: "Dirección",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("direccion"), 160),
    minWidth: 120,
    stretchWeight: 4,
  },
  {
    key: "telefono",
    label: "Telefono",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("telefono"), 72),
    minWidth: 56,
  },
  {
    key: "tipo",
    label: "Tipo",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("tipo"), 140),
    minWidth: 100,
    stretchWeight: 2,
  },
  {
    key: "sucursal",
    label: "Sucursal",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("sucursal"), 72),
    minWidth: 64,
  },
  {
    key: "tienda",
    label: "Tienda",
    defaultWidth: contentColumnWidth(maxWarehouseFieldLen("tienda"), 100),
    minWidth: 80,
    stretchWeight: 2,
  },
  {
    key: "recepManual",
    label: "Recep. manual",
    defaultWidth: columnWidthFor("Recep. manual", maxRecepManualLabelLen(), 72),
    minWidth: contentColumnWidth("Recep. manual".length, 72),
    align: "center",
  },
];

function cellValue(row: WarehouseRecord, key: WarehouseColumnDef["key"]): string | number {
  if (key === "recepManual") return formatRecepManualSiNo(row.recepManual);
  return row[key];
}

function matchesSearch(row: WarehouseRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [
    row.codigo,
    row.almacen,
    row.direccion,
    row.telefono,
    row.tipo,
    row.sucursal,
    row.tienda,
    formatRecepManualSiNo(row.recepManual),
  ].some((value) => value.toLowerCase().includes(q));
}

export function AlmacenesDialog({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [warehouseRows, setWarehouseRows] = useState<WarehouseRecord[]>(() =>
    WAREHOUSES.map(sanitizeWarehouseRecord),
  );
  const [filter, setFilter] = useState<FilterMode>("activos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formState, setFormState] = useState<WarehouseFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseRecord | null>(null);
  const [transferTarget, setTransferTarget] = useState<WarehouseRecord | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    const firstActive = WAREHOUSES.find((w) => w.activo) ?? WAREHOUSES[0];
    return firstActive?.id ?? "";
  });
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(WAREHOUSE_COLUMNS);

  const baseRows = useMemo(() => {
    if (filter === "activos") return warehouseRows.filter((w) => w.activo);
    if (filter === "inactivos") return warehouseRows.filter((w) => !w.activo);
    return warehouseRows;
  }, [filter, warehouseRows]);

  const nextCodigo = useMemo(() => {
    const nums = warehouseRows
      .map((row) => Number.parseInt(row.codigo, 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  }, [warehouseRows]);

  const formInitialValues = useMemo(() => {
    if (!formState) return emptyWarehouseForm(nextCodigo);
    if (formState.mode === "add") return emptyWarehouseForm(nextCodigo);
    const row = warehouseRows.find((item) => item.id === formState.recordId);
    return row ? warehouseRecordToForm(row) : emptyWarehouseForm(nextCodigo);
  }, [formState, nextCodigo, warehouseRows]);

  const rows = useMemo(() => {
    if (!deferredSearchQuery) return baseRows;
    return baseRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [baseRows, deferredSearchQuery]);

  const filterLabel = useMemo(() => {
    const mode = FILTER_OPTIONS.find((item) => item.value === filter)?.label ?? filter;
    if (!deferredSearchQuery) return mode;
    return `${mode} — Búsqueda: ${deferredSearchQuery}`;
  }, [filter, deferredSearchQuery]);

  const warehousesPrintData = useMemo<WarehousesPrintData>(
    () => ({
      rows,
      filterLabel,
      columns: WAREHOUSE_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [rows, filterLabel, layoutWidths],
  );

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const { goTo, goFirst, goPrev, goNext, goLast, currentIndex, atStart, atEnd } = useTableRowFollow({
    tableWrapRef,
    rowIds,
    selectedId,
    setSelectedId,
    selectedClassName: styles.rowSelected,
  });
  const firstPress = useRepeatingPress(goFirst, atStart);
  const prevPress = useRepeatingPress(goPrev, atStart);
  const nextPress = useRepeatingPress(goNext, atEnd);
  const lastPress = useRepeatingPress(goLast, atEnd);

  useEffect(() => {
    tableWrapRef.current?.scrollTo({ top: 0 });
  }, [tableWrapRef]);

  useEffect(() => {
    if (rows.length === 0) return;
    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const handleSearchBarClosed = useCallback(() => {
    setSearchQuery("");
    if (resetSelectionOnSearchCloseRef.current) {
      resetSelectionOnSearchCloseRef.current = false;
      if (baseRows.length > 0) {
        setSelectedId(baseRows[0].id);
      }
    }
  }, [baseRows]);

  const { barMounted: searchBarMounted, barProps: searchBarProps } = useCollapsibleBarAnimation(
    searchOpen,
    handleSearchBarClosed,
  );

  const handleFilterChange = (mode: FilterMode) => {
    const wasSearchOpen = searchOpen;
    setFilter(mode);
    setSearchOpen(false);
    if (!wasSearchOpen) setSearchQuery("");
    let first: WarehouseRecord | undefined;
    if (mode === "activos") first = warehouseRows.find((w) => w.activo);
    else if (mode === "inactivos") first = warehouseRows.find((w) => !w.activo);
    else first = warehouseRows[0];
    if (first) setSelectedId(first.id);
  };

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    resetSelectionOnSearchCloseRef.current = true;
    setSearchOpen(false);
  }, []);

  const handleSearchNext = useCallback(() => {
    if (rows.length === 0) return;
    const next = currentIndex >= rows.length - 1 ? 0 : currentIndex + 1;
    goTo(next);
  }, [currentIndex, goTo, rows.length]);

  const handleSaveWarehouse = useCallback(
    (form: WarehouseFormValues) => {
      if (formState?.mode === "edit") {
        const updated = warehouseFormToRecord(form, formState.recordId);
        setWarehouseRows((prev) =>
          prev.map((row) => (row.id === formState.recordId ? updated : row)),
        );
        setSelectedId(updated.id);
      } else {
        const record = warehouseFormToRecord(form);
        setWarehouseRows((prev) => [...prev, record]);
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [formState],
  );

  const handleRequestEdit = useCallback(() => {
    const row = rows[currentIndex];
    if (!row) return;
    setFormState({ mode: "edit", recordId: row.id });
  }, [currentIndex, rows]);

  const handleRequestDelete = useCallback(() => {
    const row = rows[currentIndex];
    if (!row) return;
    setDeleteTarget(row);
  }, [currentIndex, rows]);

  const handleRequestTransfer = useCallback(() => {
    const row = rows[currentIndex];
    if (!row || row.codigo === "01") return;
    setTransferTarget(row);
  }, [currentIndex, rows]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    setWarehouseRows((prev) => prev.filter((row) => row.id !== deletedId));
    setDeleteTarget(null);
  }, [deleteTarget]);

  const handleRefreshData = useCallback(() => {
    const refreshed = WAREHOUSES.map(sanitizeWarehouseRecord);
    setWarehouseRows(refreshed);
    setSearchOpen(false);
    setSearchQuery("");
    setFormState(null);
    setDeleteTarget(null);
    setTransferTarget(null);

    let first: WarehouseRecord | undefined;
    if (filter === "activos") first = refreshed.find((w) => w.activo);
    else if (filter === "inactivos") first = refreshed.find((w) => !w.activo);
    else first = refreshed[0];
    if (first) setSelectedId(first.id);
  }, [filter]);

  const toggleMaximized = useCallback(() => {
    toggleWithWindowAnimation(windowRef.current, () => {
      setMaximized((m) => !m);
    });
  }, []);

  return (
    <div
      className={`${styles.overlay} ${maximized ? styles.overlayMax : ""}`}
      {...overlayProps}
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={windowRef}
        className={`${styles.window} ${maximized ? styles.windowMax : ""}`}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="almacenes-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="almacenes-title" className={styles.titleText}>
            Almacenes
          </h1>
          <div className={styles.titleBtns}>
            <button
              type="button"
              className={styles.titleSysBtn}
              onClick={toggleMaximized}
              aria-label={maximized ? "Restaurar" : "Maximizar"}
            >
              <TitleMaximizeIcon restore={maximized} />
            </button>
            <button
              type="button"
              className={`${styles.titleSysBtn} ${styles.titleClose}`}
              onClick={requestClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.navGroup}>
            <button type="button" className={styles.toolbarBtn} title="Primero" aria-label="Primero" disabled={atStart} {...firstPress}>
              <NavIcon kind="first" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Anterior" aria-label="Anterior" disabled={atStart} {...prevPress}>
              <NavIcon kind="prev" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Siguiente" aria-label="Siguiente" disabled={atEnd} {...nextPress}>
              <NavIcon kind="next" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Último" aria-label="Último" disabled={atEnd} {...lastPress}>
              <NavIcon kind="last" />
            </button>
          </div>

          <span className={styles.toolbarSep} aria-hidden="true" />

          <button
            type="button"
            className={`${styles.toolbarBtn} ${searchOpen ? styles.toolbarBtnActive : ""}`}
            title="Buscar"
            aria-label="Buscar"
            aria-pressed={searchOpen}
            onClick={openSearch}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Imprimir"
            aria-label="Imprimir"
            onClick={() => setShowPrintDialog(true)}
            disabled={rows.length === 0}
          >
            <PrintIcon />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Nuevo"
            aria-label="Nuevo"
            onClick={() => setFormState({ mode: "add" })}
          >
            <DocIcon variant="new" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Eliminar"
            aria-label="Eliminar"
            onClick={handleRequestDelete}
            disabled={rows.length === 0 || !rows[currentIndex]}
          >
            <DocIcon variant="delete" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Editar"
            aria-label="Editar"
            onClick={handleRequestEdit}
            disabled={rows.length === 0 || !rows[currentIndex]}
          >
            <DocIcon variant="edit" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Transferir"
            aria-label="Transferir"
            onClick={handleRequestTransfer}
            disabled={rows.length === 0 || !rows[currentIndex] || rows[currentIndex]?.codigo === "01"}
          >
            <DocIcon variant="transfer" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Actualizar datos"
            aria-label="Actualizar datos"
            onClick={handleRefreshData}
          >
            <RefreshIcon />
          </button>

          <span className={styles.toolbarSpacer} />

          <label className={styles.filterLabel} htmlFor="almacenes-filter">
            Filtro:
          </label>
          <WinSelect
            id="almacenes-filter"
            compact
            className={styles.filterSelect}
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(next) => handleFilterChange(next as FilterMode)}
            aria-label="Filtro de almacenes"
          />
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
            <label className={styles.searchLabel} htmlFor="almacenes-search-input">
              Buscar:
            </label>
            <input
              id="almacenes-search-input"
              ref={searchInputRef}
              className={styles.searchInput}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchNext();
                if (e.key === "Escape") closeSearch();
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className={styles.searchActionBtn}
              onClick={handleSearchNext}
              disabled={rows.length === 0}
            >
              Siguiente
            </button>
            <button type="button" className={styles.searchActionBtn} onClick={closeSearch}>
              Cerrar
            </button>
            </div>
          </div>
        ) : null}

        <div className={styles.tableWrap} ref={tableWrapRefCallback}>
          <table className={styles.table} style={tableStyle}>
            <colgroup>
              {layoutWidths.map((_, index) => (
                <col key={WAREHOUSE_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {WAREHOUSE_COLUMNS.map((col, index) => (
                  <th
                    key={col.key}
                    className={[
                      styles.tableHeadCell,
                      styles.scrollTh,
                      col.align === "center" ? styles.colCenter : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={getColumnStyle(index)}
                  >
                    <span className={styles.thLabel}>{col.label}</span>
                    {col.resizable !== false && index < WAREHOUSE_COLUMNS.length - 1 ? (
                      <span
                        className={styles.colResizeHandle}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Redimensionar columna ${col.label}`}
                        onMouseDown={(e) => startResize(index, e)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={WAREHOUSE_COLUMNS.length} className={styles.emptyCell}>
                    No hay datos
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <WarehouseRow
                    key={row.id}
                    row={row}
                    index={index}
                    selected={row.id === selectedId}
                    getColumnStyle={getColumnStyle}
                    onSelect={() => {
                      setSelectedId(row.id);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.statusBar}>
          {rows.length} registros...
          {searchQuery.trim() ? ` (filtro: "${searchQuery.trim()}")` : ""}
        </div>
      </div>

      {showPrintDialog ? (
        <PrintPropertiesDialog
          warehousesData={warehousesPrintData}
          onClose={() => setShowPrintDialog(false)}
        />
      ) : null}

      {formState ? (
        <WarehouseFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          initialValues={formInitialValues}
          onSave={handleSaveWarehouse}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {deleteTarget ? (
        <WarehouseDeleteConfirmDialog
          warehouseName={deleteTarget.almacen}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {transferTarget ? (
        <WarehouseTransferDialog
          targetWarehouse={transferTarget}
          onAccept={() => setTransferTarget(null)}
          onClose={() => setTransferTarget(null)}
        />
      ) : null}
    </div>
  );
}

function WarehouseRow({
  row,
  index,
  selected,
  getColumnStyle,
  onSelect,
}: {
  row: WarehouseRecord;
  index: number;
  selected: boolean;
  getColumnStyle: (index: number) => React.CSSProperties | undefined;
  onSelect: () => void;
}) {
  return (
    <tr
      data-row-id={row.id}
      className={[
        index % 2 === 0 ? styles.rowEven : styles.rowOdd,
        selected ? styles.rowSelected : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
    >
      {WAREHOUSE_COLUMNS.map((col, colIndex) => (
        <td
          key={col.key}
          className={col.align === "center" ? styles.colCenter : undefined}
          style={getColumnStyle(colIndex)}
          title={String(cellValue(row, col.key))}
        >
          {cellValue(row, col.key)}
        </td>
      ))}
    </tr>
  );
}
