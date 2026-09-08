import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CARRIERS, type CarrierRecord } from "../../data/carriers";
import type { CarriersPrintData } from "../../utils/buildCarriersPrintPreview";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import {
  carrierFormToRecord,
  carrierRecordToForm,
  emptyCarrierForm,
  nextCarrierCodigo,
} from "../../utils/carrierFormUtils";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { TransportistaFormDialog } from "./TransportistaFormDialog";
import { CarrierDeleteConfirmDialog } from "./CarrierDeleteConfirmDialog";
import { VehiculosDialog } from "./VehiculosDialog";
import { ChoferesDialog } from "./ChoferesDialog";
import styles from "./TransportistasDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  onClose: () => void;
};

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type FilterMode = "activos" | "inactivos" | "todos";

type CarrierColumnDef = ResizableColumnDef & {
  key: "codigo" | "razonSocial" | "ruc" | "dni" | "vehiculos" | "choferes" | "direccion";
  align?: "center";
};

const CARRIER_COLUMNS: CarrierColumnDef[] = [
  { key: "codigo", label: "Código", defaultWidth: 56, minWidth: 44, align: "center" },
  { key: "razonSocial", label: "Razón social", defaultWidth: 180, minWidth: 80, stretchWeight: 3 },
  { key: "ruc", label: "RUC", defaultWidth: 88, minWidth: 64 },
  { key: "dni", label: "DNI", defaultWidth: 72, minWidth: 56 },
  { key: "vehiculos", label: "Vehículos", defaultWidth: 72, minWidth: 56, align: "center" },
  { key: "choferes", label: "Choferes", defaultWidth: 72, minWidth: 56, align: "center" },
  { key: "direccion", label: "Dirección", defaultWidth: 220, minWidth: 100, stretchWeight: 4 },
];

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "activos", label: "Solo activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

function VehiculosIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <rect x="1" y="5" width="10" height="6" fill="#f0a030" stroke="#8a6020" strokeWidth="0.6" />
      <rect x="1" y="6" width="4" height="5" fill="#2a2a2a" />
      <rect x="2" y="7" width="2" height="2" fill="#d8e8f8" />
      <line x1="6" y1="7" x2="10" y2="7" stroke="#c08020" strokeWidth="0.7" />
      <line x1="6" y1="9" x2="10" y2="9" stroke="#c08020" strokeWidth="0.7" />
      <rect x="0" y="11" width="12" height="2" fill="#2060a0" />
      <circle cx="3" cy="12.5" r="1.1" fill="#1a1a1a" />
      <circle cx="9" cy="12.5" r="1.1" fill="#1a1a1a" />
    </svg>
  );
}

function matchesSearch(row: CarrierRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.codigo, row.razonSocial, row.ruc, row.dni, row.direccion].some((v) =>
    v.toLowerCase().includes(q),
  );
}

export function TransportistasDialog({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [rows, setRows] = useState<CarrierRecord[]>(() => [...CARRIERS]);
  const [filter, setFilter] = useState<FilterMode>("activos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarrierRecord | null>(null);
  const [vehiculosCarrier, setVehiculosCarrier] = useState<CarrierRecord | null>(null);
  const [choferesCarrier, setChoferesCarrier] = useState<CarrierRecord | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    const first = CARRIERS.filter((c) => c.activo)[0] ?? CARRIERS[0];
    return first?.id ?? "";
  });
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(CARRIER_COLUMNS);

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

  const carriersPrintData = useMemo<CarriersPrintData>(
    () => ({
      rows: filteredRows,
      filterLabel,
      columns: CARRIER_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, filterLabel, layoutWidths],
  );

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
      let first: CarrierRecord | undefined;
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

  const formInitialValues = useMemo(() => {
    if (!formState) return emptyCarrierForm(nextCarrierCodigo(rows));
    if (formState.mode === "add") return emptyCarrierForm(nextCarrierCodigo(rows));
    const row = rows.find((r) => r.id === formState.recordId);
    return row ? carrierRecordToForm(row) : emptyCarrierForm(nextCarrierCodigo(rows));
  }, [formState, rows]);

  const handleSave = useCallback(
    (values: ReturnType<typeof carrierRecordToForm>) => {
      if (formState?.mode === "edit") {
        const existing = rows.find((r) => r.id === formState.recordId);
        const record = carrierFormToRecord(values, existing);
        setRows((prev) => prev.map((r) => (r.id === formState.recordId ? record : r)));
        setSelectedId(record.id);
      } else {
        const record = carrierFormToRecord(values);
        setRows((prev) => [...prev, record]);
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [formState, rows],
  );

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

  const handleRefreshData = useCallback(() => {
    const refreshed = [...CARRIERS];
    setRows(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setFormState(null);
    setDeleteTarget(null);
    setVehiculosCarrier(null);
    setChoferesCarrier(null);

    let first: CarrierRecord | undefined;
    if (filter === "activos") first = refreshed.find((r) => r.activo);
    else if (filter === "inactivos") first = refreshed.find((r) => !r.activo);
    else first = refreshed[0];
    if (first) setSelectedId(first.id);
  }, [filter]);

  const handleGoToVehiculos = useCallback(
    (carrier?: CarrierRecord) => {
      const row = carrier ?? filteredRows[currentIndex];
      if (!row) return;
      setVehiculosCarrier(row);
    },
    [currentIndex, filteredRows],
  );

  const handleGoToChoferes = useCallback(
    (carrier?: CarrierRecord) => {
      const row = carrier ?? filteredRows[currentIndex];
      if (!row) return;
      setChoferesCarrier(row);
    },
    [currentIndex, filteredRows],
  );

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
        aria-labelledby="transportistas-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="transportistas-title" className={styles.titleText}>
            Transportistas
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
            onClick={() => setShowPrintDialog(true)}
            disabled={filteredRows.length === 0}
          >
            <PrintIcon />
          </button>
          <button type="button" className={styles.toolbarBtn} title="Nuevo" onClick={() => setFormState({ mode: "add" })}>
            <DocIcon variant="new" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Eliminar"
            onClick={handleRequestDelete}
            disabled={filteredRows.length === 0}
          >
            <DocIcon variant="delete" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Editar"
            onClick={() => {
              const row = filteredRows[currentIndex];
              if (row) setFormState({ mode: "edit", recordId: row.id });
            }}
            disabled={filteredRows.length === 0}
          >
            <DocIcon variant="edit" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Ir a vehículos"
            aria-label="Ir a vehículos"
            onClick={() => handleGoToVehiculos()}
            disabled={filteredRows.length === 0}
          >
            <VehiculosIcon />
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

          <label className={styles.filterLabel} htmlFor="transportistas-filter">
            Filtro:
          </label>
          <WinSelect
            id="transportistas-filter"
            compact
            className={styles.filterSelect}
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(next) => handleFilterChange(next as FilterMode)}
            aria-label="Filtro de transportistas"
          />
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
            <label className={styles.searchLabel} htmlFor="transportistas-search">
              Buscar:
            </label>
            <input
              id="transportistas-search"
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
                <col key={CARRIER_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {CARRIER_COLUMNS.map((col, index) => (
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
                    {index < CARRIER_COLUMNS.length - 1 ? (
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
                  <td colSpan={CARRIER_COLUMNS.length} className={styles.emptyCell}>
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
                    onClick={() => {
                      setSelectedId(row.id);
                    }}
                  >
                    {CARRIER_COLUMNS.map((col, colIndex) => (
                      <td
                        key={col.key}
                        className={col.align === "center" ? styles.colCenter : undefined}
                        style={getColumnStyle(colIndex)}
                      >
                        {col.key === "vehiculos" ? (
                          row.vehiculos > 0 ? (
                            <button
                              type="button"
                              className={styles.countLink}
                              title="Vehículos"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToVehiculos(row);
                              }}
                            >
                              ( {row.vehiculos} )
                            </button>
                          ) : (
                            "..."
                          )
                        ) : col.key === "choferes" ? (
                          row.choferes > 0 ? (
                            <button
                              type="button"
                              className={styles.countLink}
                              title="Choferes"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToChoferes(row);
                              }}
                            >
                              ( {row.choferes} )
                            </button>
                          ) : (
                            "..."
                          )
                        ) : (
                          row[col.key]
                        )}
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
        <TransportistaFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          initialValues={formInitialValues}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {vehiculosCarrier ? (
        <VehiculosDialog carrier={vehiculosCarrier} onClose={() => setVehiculosCarrier(null)} />
      ) : null}

      {choferesCarrier ? (
        <ChoferesDialog
          carrierCodigo={choferesCarrier.codigo}
          carrierName={choferesCarrier.razonSocial}
          onClose={() => setChoferesCarrier(null)}
        />
      ) : null}

      {deleteTarget ? (
        <CarrierDeleteConfirmDialog
          carrierName={deleteTarget.razonSocial}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {showPrintDialog ? (
        <PrintPropertiesDialog
          carriersData={carriersPrintData}
          onClose={() => setShowPrintDialog(false)}
        />
      ) : null}
    </div>
  );
}
