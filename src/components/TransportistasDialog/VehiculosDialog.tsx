import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { driversForCarrier } from "../../data/drivers";
import type { CarrierRecord } from "../../data/carriers";
import { vehiclesForCarrier, type VehicleRecord } from "../../data/vehicles";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import {
  emptyVehicleForm,
  vehicleFormToRecord,
  vehicleRecordToForm,
  type VehicleFormValues,
} from "../../utils/vehicleFormUtils";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import type { VehiclesPrintData } from "../../utils/buildVehiclesPrintPreview";
import { CarrierDeleteConfirmDialog } from "./CarrierDeleteConfirmDialog";
import { VehicleFormDialog } from "./VehicleFormDialog";
import styles from "./VehiculosDialog.module.css";

type Props = {
  carrier: CarrierRecord;
  onClose: () => void;
};

type FilterMode = "activos" | "inactivos" | "todos";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "activos", label: "Solo activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type VehicleColumnDef = ResizableColumnDef & {
  key: "placa" | "marca" | "chofer";
  align?: "left";
};

const VEHICLE_COLUMNS: VehicleColumnDef[] = [
  { key: "placa", label: "Placa", defaultWidth: 96, minWidth: 72, align: "left" },
  { key: "marca", label: "Marca", defaultWidth: 112, minWidth: 72, align: "left" },
  { key: "chofer", label: "Chofer", defaultWidth: 180, minWidth: 100, stretchWeight: 2, align: "left" },
];

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

function DocIcon({ variant }: { variant: "new" | "delete" | "edit" }) {
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
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="5" y="3" width="14" height="18" fill="#fff" stroke="#888" strokeWidth="1" />
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

function matchesSearch(row: VehicleRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.placa, row.marca, row.chofer].some((v) => v.toLowerCase().includes(q));
}

export function VehiculosDialog({ carrier, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<VehicleRecord[]>(() => vehiclesForCarrier(carrier.codigo));
  const [filter, setFilter] = useState<FilterMode>("activos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRecord | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    const initial = vehiclesForCarrier(carrier.codigo);
    const first = initial.filter((v) => v.activo)[0] ?? initial[0];
    return first?.id ?? "";
  });
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } = useResizableTableLayout(VEHICLE_COLUMNS);

  const drivers = useMemo(() => driversForCarrier(carrier.codigo), [carrier.codigo]);

  const baseRows = useMemo(() => {
    if (filter === "activos") return rows.filter((r) => r.activo);
    if (filter === "inactivos") return rows.filter((r) => !r.activo);
    return rows;
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

  const vehiclesPrintData = useMemo<VehiclesPrintData>(
    () => ({
      rows: filteredRows,
      carrierName: carrier.razonSocial,
      filterLabel,
      columns: VEHICLE_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, carrier.razonSocial, filterLabel, layoutWidths],
  );

  const formInitialValues = useMemo(() => {
    if (!formState) return emptyVehicleForm();
    if (formState.mode === "add") return emptyVehicleForm();
    const row = rows.find((r) => r.id === formState.recordId);
    return row ? vehicleRecordToForm(row) : emptyVehicleForm();
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
      let first: VehicleRecord | undefined;
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
    (values: VehicleFormValues) => {
      if (formState?.mode === "edit") {
        const existing = rows.find((r) => r.id === formState.recordId);
        const record = vehicleFormToRecord(values, carrier.codigo, drivers, existing);
        setRows((prev) => prev.map((r) => (r.id === formState.recordId ? record : r)));
        setSelectedId(record.id);
      } else {
        const record = vehicleFormToRecord(values, carrier.codigo, drivers);
        setRows((prev) => [...prev, record]);
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [carrier.codigo, drivers, formState, rows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = vehiclesForCarrier(carrier.codigo);
    setRows(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);

    let first: VehicleRecord | undefined;
    if (filter === "activos") first = refreshed.find((r) => r.activo);
    else if (filter === "inactivos") first = refreshed.find((r) => !r.activo);
    else first = refreshed[0];
    if (first) setSelectedId(first.id);
  }, [carrier.codigo, filter]);

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
        aria-labelledby="vehiculos-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="vehiculos-title" className={styles.titleText}>
            Vehículos - {carrier.razonSocial}
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
          <button type="button" className={styles.toolbarBtn} title="Nuevo" aria-label="Nuevo" onClick={() => setFormState({ mode: "add" })}>
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

          <label className={styles.filterLabel} htmlFor="vehiculos-filter">
            Filtro:
          </label>
          <WinSelect
            id="vehiculos-filter"
            compact
            className={styles.filterSelect}
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(next) => handleFilterChange(next as FilterMode)}
            aria-label="Filtro de vehículos"
          />
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
            <label className={styles.searchLabel} htmlFor="vehiculos-search">
              Buscar:
            </label>
            <input
              id="vehiculos-search"
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
                <col key={VEHICLE_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {VEHICLE_COLUMNS.map((col, index) => (
                  <th
                    key={col.key}
                    className={[styles.tableHeadCell, styles.scrollTh, styles.headLeft].join(" ")}
                    style={getColumnStyle(index)}
                  >
                    <span className={styles.thLabel}>{col.label}</span>
                    {index < VEHICLE_COLUMNS.length - 1 ? (
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
                  <td colSpan={VEHICLE_COLUMNS.length} className={styles.emptyCell}>
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
                    {VEHICLE_COLUMNS.map((col, colIndex) => (
                      <td
                        key={col.key}
                        className={styles.colLeft}
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
        <VehicleFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          carrierCodigo={carrier.codigo}
          carrierName={carrier.razonSocial}
          initialValues={formInitialValues}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {deleteTarget ? (
        <CarrierDeleteConfirmDialog
          carrierName={deleteTarget.placa}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {showPrintDialog ? (
        <PrintPropertiesDialog
          vehiclesData={vehiclesPrintData}
          onClose={() => setShowPrintDialog(false)}
        />
      ) : null}
    </div>
  );
}
