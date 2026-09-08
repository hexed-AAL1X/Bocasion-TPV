import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { driversForCarrier, type DriverRecord } from "../../data/drivers";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import type { DriversPrintData } from "../../utils/buildDriversPrintPreview";
import {
  driverFormToRecord,
  driverRecordToForm,
  emptyDriverForm,
  type DriverFormValues,
} from "../../utils/driverFormUtils";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { CarrierDeleteConfirmDialog } from "./CarrierDeleteConfirmDialog";
import { DriverFormDialog } from "./DriverFormDialog";
import styles from "./ChoferesDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  carrierCodigo: string;
  carrierName: string;
  onClose: () => void;
};

type FilterMode = "activos" | "inactivos" | "todos";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "activos", label: "Solo activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type DriverColumnDef = ResizableColumnDef & {
  key: "codigo" | "nombre" | "dni" | "licencia" | "telefono" | "direccion";
  align?: "center" | "left";
};

const DRIVER_COLUMNS: DriverColumnDef[] = [
  { key: "codigo", label: "Cd", defaultWidth: 52, minWidth: 40, align: "center" },
  { key: "nombre", label: "Chofer", defaultWidth: 160, minWidth: 80, stretchWeight: 3, align: "left" },
  { key: "dni", label: "DNI", defaultWidth: 80, minWidth: 64, align: "left" },
  { key: "licencia", label: "N° Licencia", defaultWidth: 88, minWidth: 64, align: "left" },
  { key: "telefono", label: "Teléfono", defaultWidth: 88, minWidth: 64, align: "left" },
  { key: "direccion", label: "Dirección", defaultWidth: 140, minWidth: 80, stretchWeight: 2, align: "left" },
];

function sortDrivers(rows: DriverRecord[]): DriverRecord[] {
  return [...rows].sort((a, b) => a.codigo.localeCompare(b.codigo));
}

function matchesSearch(row: DriverRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.codigo, row.nombre, row.dni, row.licencia, row.telefono, row.direccion].some((v) =>
    v.toLowerCase().includes(q),
  );
}

export function ChoferesDialog({ carrierCodigo, carrierName, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialRows = useMemo(() => sortDrivers(driversForCarrier(carrierCodigo)), [carrierCodigo]);
  const [rows, setRows] = useState<DriverRecord[]>(() => initialRows);
  const [filter, setFilter] = useState<FilterMode>("activos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriverRecord | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    const sorted = sortDrivers(driversForCarrier(carrierCodigo));
    const first = sorted.find((r) => r.activo) ?? sorted[0];
    return first?.id ?? "";
  });
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } = useResizableTableLayout(DRIVER_COLUMNS);

  const baseRows = useMemo(() => {
    const sorted = sortDrivers(rows);
    if (filter === "activos") return sorted.filter((r) => r.activo);
    if (filter === "inactivos") return sorted.filter((r) => !r.activo);
    return sorted;
  }, [filter, rows]);

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return baseRows;
    return baseRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [baseRows, deferredSearchQuery]);

  const filterLabel = useMemo(() => {
    const mode = FILTER_OPTIONS.find((item) => item.value === filter)?.label ?? filter;
    if (!deferredSearchQuery) return mode;
    return `${mode} — Búsqueda: ${deferredSearchQuery}`;
  }, [filter, deferredSearchQuery]);

  const driversPrintData = useMemo<DriversPrintData>(
    () => ({
      rows: filteredRows,
      carrierName,
      filterLabel,
      columns: DRIVER_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, carrierName, filterLabel, layoutWidths],
  );

  const formInitialValues = useMemo(() => {
    if (!formState) return emptyDriverForm(rows);
    if (formState.mode === "add") return emptyDriverForm(rows);
    const row = rows.find((r) => r.id === formState.recordId);
    return row ? driverRecordToForm(row) : emptyDriverForm(rows);
  }, [formState, rows]);

  const rowIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);
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

  const handleSearchBarClosed = useCallback(() => {
    setSearchQuery("");
    if (resetSelectionOnSearchCloseRef.current) {
      resetSelectionOnSearchCloseRef.current = false;
      if (baseRows.length > 0) setSelectedId(baseRows[0].id);
    }
  }, [baseRows]);

  const { barMounted: searchBarMounted, barProps: searchBarProps } = useCollapsibleBarAnimation(
    searchOpen,
    handleSearchBarClosed,
  );

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    resetSelectionOnSearchCloseRef.current = true;
    setSearchOpen(false);
  }, []);

  const handleFilterChange = useCallback(
    (mode: FilterMode) => {
      const wasSearchOpen = searchOpen;
      setFilter(mode);
      setSearchOpen(false);
      if (!wasSearchOpen) setSearchQuery("");
      let first: DriverRecord | undefined;
      if (mode === "activos") first = rows.find((r) => r.activo);
      else if (mode === "inactivos") first = rows.find((r) => !r.activo);
      else first = rows[0];
      if (first) setSelectedId(first.id);
    },
    [rows, searchOpen],
  );

  const handleSearchNext = useCallback(() => {
    if (filteredRows.length === 0) return;
    const query = deferredSearchQuery;
    const start = currentIndex + 1;
    for (let i = 0; i < filteredRows.length; i++) {
      const idx = (start + i) % filteredRows.length;
      if (!query || matchesSearch(filteredRows[idx], query)) {
        goTo(idx);
        return;
      }
    }
  }, [currentIndex, deferredSearchQuery, filteredRows, goTo]);

  const handleRequestDelete = useCallback(() => {
    const row = filteredRows[currentIndex];
    if (!row) return;
    setDeleteTarget(row);
  }, [currentIndex, filteredRows]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const idx = filteredRows.findIndex((r) => r.id === deletedId);
    setRows((prev) => prev.filter((r) => r.id !== deletedId));
    setDeleteTarget(null);
    const next = filteredRows.filter((r) => r.id !== deletedId);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [deleteTarget, filteredRows]);

  const handleSave = useCallback(
    (values: DriverFormValues) => {
      if (formState?.mode === "edit") {
        const existing = rows.find((r) => r.id === formState.recordId);
        const record = driverFormToRecord(values, carrierCodigo, existing);
        setRows((prev) => sortDrivers(prev.map((r) => (r.id === formState.recordId ? record : r))));
        setSelectedId(record.id);
      } else {
        const record = driverFormToRecord(values, carrierCodigo);
        setRows((prev) => sortDrivers([...prev, record]));
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [carrierCodigo, formState, rows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = sortDrivers(driversForCarrier(carrierCodigo));
    setRows(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);

    let first: DriverRecord | undefined;
    if (filter === "activos") first = refreshed.find((r) => r.activo);
    else if (filter === "inactivos") first = refreshed.find((r) => !r.activo);
    else first = refreshed[0];
    if (first) setSelectedId(first.id);
  }, [carrierCodigo, filter]);

  useEffect(() => {
    tableWrapRef.current?.scrollTo({ top: 0 });
  }, [tableWrapRef]);

  useEffect(() => {
    if (filteredRows.length === 0) return;
    if (!filteredRows.some((r) => r.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  const toggleMaximized = useCallback(() => {
    toggleWithWindowAnimation(windowRef.current, () => setMaximized((m) => !m));
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
        aria-labelledby="choferes-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="choferes-title" className={styles.titleText}>
            Chofer - {carrierName}
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
            <button type="button" className={`${styles.titleSysBtn} ${styles.titleClose}`} onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.navGroup}>
            <button type="button" className={styles.toolbarBtn} title="Primero" disabled={atStart} {...firstPress}>
              <NavIcon kind="first" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Anterior" disabled={atStart} {...prevPress}>
              <NavIcon kind="prev" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Siguiente" disabled={atEnd} {...nextPress}>
              <NavIcon kind="next" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Último" disabled={atEnd} {...lastPress}>
              <NavIcon kind="last" />
            </button>
          </div>

          <span className={styles.toolbarSep} aria-hidden="true" />

          <button
            type="button"
            className={`${styles.toolbarBtn} ${searchOpen ? styles.toolbarBtnActive : ""}`}
            title="Buscar"
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
            disabled={filteredRows.length === 0}
            onClick={() => setShowPrintDialog(true)}
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
            disabled={filteredRows.length === 0}
          >
            <DocIcon variant="delete" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Editar"
            aria-label="Editar"
            disabled={filteredRows.length === 0}
            onClick={() => {
              const row = filteredRows[currentIndex];
              if (row) setFormState({ mode: "edit", recordId: row.id });
            }}
          >
            <DocIcon variant="edit" />
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

          <label className={styles.filterLabel} htmlFor="choferes-filter">
            Filtro:
          </label>
          <WinSelect
            id="choferes-filter"
            compact
            className={styles.filterSelect}
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(next) => handleFilterChange(next as FilterMode)}
            aria-label="Filtro de choferes"
          />
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
            <label className={styles.searchLabel} htmlFor="choferes-search">
              Buscar:
            </label>
            <input
              id="choferes-search"
              ref={searchInputRef}
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchNext();
                if (e.key === "Escape") closeSearch();
              }}
            />
            <button type="button" className={styles.searchActionBtn} onClick={handleSearchNext} disabled={filteredRows.length === 0}>
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
                <col key={DRIVER_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {DRIVER_COLUMNS.map((col, index) => (
                  <th
                    key={col.key}
                    className={[
                      styles.tableHeadCell,
                      styles.scrollTh,
                      col.align === "center" ? styles.colCenter : styles.headLeft,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={getColumnStyle(index)}
                  >
                    <span className={styles.thLabel}>{col.label}</span>
                    {index < DRIVER_COLUMNS.length - 1 ? (
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
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={DRIVER_COLUMNS.length} className={styles.emptyCell}>
                    No hay datos
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr
                    key={row.id}
                    data-row-id={row.id}
                    className={[
                      index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                      row.id === selectedId ? styles.rowSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedId(row.id)}
                  >
                    {DRIVER_COLUMNS.map((col, colIndex) => (
                      <td
                        key={col.key}
                        className={col.align === "center" ? styles.colCenter : styles.colLeft}
                        style={getColumnStyle(colIndex)}
                      >
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.statusBar}>{filteredRows.length} registros...</div>
      </div>

      {formState ? (
        <DriverFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          carrierName={carrierName}
          initialValues={formInitialValues}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {deleteTarget ? (
        <CarrierDeleteConfirmDialog
          carrierName={deleteTarget.nombre}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {showPrintDialog ? (
        <PrintPropertiesDialog driversData={driversPrintData} onClose={() => setShowPrintDialog(false)} />
      ) : null}
    </div>
  );
}
