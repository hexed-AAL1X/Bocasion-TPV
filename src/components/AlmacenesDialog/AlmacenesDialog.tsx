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

function TitleMaximizeIcon({ restore }: { restore?: boolean }) {
  if (restore) {
    return (
      <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
        <rect x="0.5" y="2.5" width="6" height="6" fill="#9ab8d0" stroke="#1a1a1a" strokeWidth="0.9" />
        <rect x="3.5" y="0.5" width="6" height="6" fill="#d8e8f8" stroke="#1a1a1a" strokeWidth="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
      <rect x="0.5" y="0.5" width="9" height="9" fill="#d8e8f8" stroke="#1a1a1a" strokeWidth="0.9" />
    </svg>
  );
}

function NavIcon({ kind }: { kind: "first" | "prev" | "next" | "last" }) {
  const color = "#c42b1c";
  const sw = 1.75;
  const cap = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      {kind === "first" && (
        <>
          <line x1="2.5" y1="3" x2="2.5" y2="13" stroke={color} strokeWidth={sw} {...cap} />
          <line x1="5" y1="3" x2="5" y2="13" stroke={color} strokeWidth={sw} {...cap} />
          <polyline points="10,5.5 6.5,8 10,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
        </>
      )}
      {kind === "prev" && (
        <polyline points="10,5.5 6.5,8 10,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
      )}
      {kind === "next" && (
        <polyline points="6,5.5 9.5,8 6,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
      )}
      {kind === "last" && (
        <>
          <polyline points="6,5.5 9.5,8 6,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
          <line x1="11" y1="3" x2="11" y2="13" stroke={color} strokeWidth={sw} {...cap} />
          <line x1="13.5" y1="3" x2="13.5" y2="13" stroke={color} strokeWidth={sw} {...cap} />
        </>
      )}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="10" cy="10" r="6.5" fill="#fff" stroke="#666" strokeWidth="1.2" />
      <line x1="15" y1="15" x2="20" y2="20" stroke="#666" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="6" y="2" width="12" height="5" rx="0.5" fill="#e8e8e8" stroke="#7a7a7a" strokeWidth="1.2" />
      <rect x="4" y="9" width="16" height="9" rx="1" fill="#f4f4f4" stroke="#7a7a7a" strokeWidth="1.2" />
      <rect x="7" y="13" width="10" height="6" fill="#fff" stroke="#9a9a9a" strokeWidth="1" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        d="M5 5v4h4M19 19v-4h-4"
        fill="none"
        stroke="#316ac5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10a7 7 0 0 1 12-2.5M17.5 14A7 7 0 0 1 5.5 16"
        fill="none"
        stroke="#316ac5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocIcon({ variant }: { variant: "new" | "delete" | "edit" | "transfer" }) {
  if (variant === "delete") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="5" y="5" width="14" height="14" fill="#fff" stroke="#888" strokeWidth="1" />
        <line x1="8" y1="8" x2="16" y2="16" stroke="#c42b1c" strokeWidth="2" />
        <line x1="16" y1="8" x2="8" y2="16" stroke="#c42b1c" strokeWidth="2" />
      </svg>
    );
  }
  if (variant === "edit") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="4" y="4" width="13" height="16" fill="#fff" stroke="#888" strokeWidth="1" />
        <path d="M12 14l6-6 2 2-6 6h-2z" fill="#ffd" stroke="#666" strokeWidth="0.8" />
      </svg>
    );
  }
  if (variant === "transfer") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="2" y="6" width="8" height="10" fill="#fff" stroke="#888" strokeWidth="1" />
        <rect x="14" y="6" width="8" height="10" fill="#fff" stroke="#888" strokeWidth="1" />
        <path d="M10 11h4M12 9l2 2-2 2" fill="none" stroke="#316ac5" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="5" y="3" width="14" height="18" fill="#fff" stroke="#888" strokeWidth="1" />
    </svg>
  );
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
