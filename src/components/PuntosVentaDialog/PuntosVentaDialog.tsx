import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMISSION_POINTS,
  sortEmissionPoints,
  type EmissionPointRecord,
} from "../../data/emissionPoints";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import type { EmissionPointsPrintData } from "../../utils/buildEmissionPointsPrintPreview";
import {
  emptyEmissionPointForm,
  emissionPointFormToRecord,
  emissionPointRecordToForm,
  type EmissionPointFormValues,
} from "../../utils/emissionPointFormUtils";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { CarrierDeleteConfirmDialog } from "../TransportistasDialog/CarrierDeleteConfirmDialog";
import { WinSelect } from "../WinSelect/WinSelect";
import { EmissionPointFormDialog } from "./EmissionPointFormDialog";
import { PcPointAssignmentDialog } from "./PcPointAssignmentDialog";
import styles from "./PuntosVentaDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  onClose: () => void;
};

type StatusFilter = "activo" | "inactivo" | "todos";
type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type EmissionPointColumnKey = "sucursal" | "tienda" | "codigo" | "nombre" | "maqRegSerie";

type EmissionPointColumnDef = ResizableColumnDef & {
  key: EmissionPointColumnKey;
  align?: "center" | "left";
};

const EMISSION_POINT_COLUMNS: EmissionPointColumnDef[] = [
  { key: "sucursal", label: "Sucursal", defaultWidth: 80, minWidth: 64, align: "left" },
  { key: "tienda", label: "Tienda", defaultWidth: 140, minWidth: 96, align: "left" },
  { key: "codigo", label: "Código", defaultWidth: 56, minWidth: 44, align: "center" },
  { key: "nombre", label: "Punto de venta", defaultWidth: 200, minWidth: 120, stretchWeight: 4, align: "left" },
  { key: "maqRegSerie", label: "Maq. Reg.(Serie)", defaultWidth: 120, minWidth: 88, align: "left" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "activo", label: "Solo activos" },
  { value: "inactivo", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

function matchesSearch(row: EmissionPointRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.sucursal, row.tienda, row.codigo, row.nombre, row.maqRegSerie].some((value) =>
    value.toLowerCase().includes(q),
  );
}

function pickFirstRow(rows: EmissionPointRecord[], status: StatusFilter): EmissionPointRecord | undefined {
  return rows.find((row) => {
    if (status === "activo" && !row.habilitado) return false;
    if (status === "inactivo" && row.habilitado) return false;
    return true;
  });
}

export function PuntosVentaDialog({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [rows, setRows] = useState<EmissionPointRecord[]>(() => sortEmissionPoints(EMISSION_POINTS));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("activo");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showPcAssignment, setShowPcAssignment] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmissionPointRecord | null>(null);
  const [selectedId, setSelectedId] = useState(
    () => pickFirstRow(sortEmissionPoints(EMISSION_POINTS), "activo")?.id ?? "",
  );
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(EMISSION_POINT_COLUMNS);

  const baseRows = useMemo(() => {
    const sorted = sortEmissionPoints(rows);
    return sorted.filter((row) => {
      if (statusFilter === "activo" && !row.habilitado) return false;
      if (statusFilter === "inactivo" && row.habilitado) return false;
      return true;
    });
  }, [rows, statusFilter]);

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return baseRows;
    return baseRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [baseRows, deferredSearchQuery]);

  const filterLabel = useMemo(() => {
    const status = STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label ?? statusFilter;
    const parts = [`Estado: ${status}`];
    if (deferredSearchQuery) parts.push(`Búsqueda: ${deferredSearchQuery}`);
    return parts.join(" — ");
  }, [deferredSearchQuery, statusFilter]);

  const emissionPointsPrintData = useMemo<EmissionPointsPrintData>(
    () => ({
      rows: filteredRows,
      filterLabel,
      columns: EMISSION_POINT_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, filterLabel, layoutWidths],
  );

  const formInitialValues = useMemo(() => {
    if (!formState) return emptyEmissionPointForm(rows);
    if (formState.mode === "add") return emptyEmissionPointForm(rows);
    const row = rows.find((item) => item.id === formState.recordId);
    return row ? emissionPointRecordToForm(row) : emptyEmissionPointForm(rows);
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
      const first = baseRows[0];
      if (first) setSelectedId(first.id);
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

  const applyStatusFilter = useCallback(
    (nextStatus: StatusFilter) => {
      const wasSearchOpen = searchOpen;
      setStatusFilter(nextStatus);
      setSearchOpen(false);
      if (!wasSearchOpen) setSearchQuery("");
      const first = pickFirstRow(rows, nextStatus);
      if (first) setSelectedId(first.id);
    },
    [rows, searchOpen],
  );

  const handleSearchNext = useCallback(() => {
    if (filteredRows.length === 0) return;
    const query = deferredSearchQuery;
    const start = currentIndex + 1;
    for (let i = 0; i < filteredRows.length; i += 1) {
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
    const idx = filteredRows.findIndex((row) => row.id === deletedId);
    setRows((prev) => sortEmissionPoints(prev.filter((row) => row.id !== deletedId)));
    setDeleteTarget(null);
    const next = filteredRows.filter((row) => row.id !== deletedId);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [deleteTarget, filteredRows]);

  const handleSave = useCallback(
    (values: EmissionPointFormValues) => {
      if (formState?.mode === "edit") {
        const existing = rows.find((row) => row.id === formState.recordId);
        const record = emissionPointFormToRecord(values, existing);
        setRows((prev) => sortEmissionPoints(prev.map((row) => (row.id === formState.recordId ? record : row))));
        setSelectedId(record.id);
      } else {
        const record = emissionPointFormToRecord(values);
        setRows((prev) => sortEmissionPoints([...prev, record]));
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [formState, rows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = sortEmissionPoints(EMISSION_POINTS);
    setRows(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);
    const first = pickFirstRow(refreshed, statusFilter);
    if (first) setSelectedId(first.id);
  }, [statusFilter]);

  useEffect(() => {
    tableWrapRef.current?.scrollTo({ top: 0 });
  }, [statusFilter, tableWrapRef]);

  useEffect(() => {
    if (filteredRows.length === 0) return;
    if (!filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  const toggleMaximized = useCallback(() => {
    toggleWithWindowAnimation(windowRef.current, () => setMaximized((value) => !value));
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
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="puntos-venta-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="puntos-venta-title" className={styles.titleText}>
            Puntos de emisión de documentos
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

        <div className={styles.topLinkBar}>
          <button type="button" className={styles.topLink} onClick={() => setShowPcAssignment(true)}>
            Asignar a un equipo un punto y almacén fijo
          </button>
        </div>

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
          <button type="button" className={styles.toolbarBtn} title="Actualizar datos" aria-label="Actualizar datos" onClick={handleRefreshData}>
            <RefreshIcon />
          </button>

          <span className={styles.toolbarSpacer} />

          <label className={styles.filterLabel} htmlFor="puntos-venta-estado">
            Estado:
          </label>
          <WinSelect
            id="puntos-venta-estado"
            compact
            className={styles.filterSelect}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(next) => applyStatusFilter(next as StatusFilter)}
            aria-label="Filtro de estado"
          />
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
              <label className={styles.searchLabel} htmlFor="puntos-venta-search">
                Buscar:
              </label>
              <input
                id="puntos-venta-search"
                ref={searchInputRef}
                className={styles.searchInput}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearchNext();
                  if (event.key === "Escape") closeSearch();
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
                <col key={EMISSION_POINT_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {EMISSION_POINT_COLUMNS.map((col, index) => (
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
                    {index < EMISSION_POINT_COLUMNS.length - 1 ? (
                      <span
                        className={styles.colResizeHandle}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Redimensionar columna ${col.label}`}
                        onMouseDown={(event) => startResize(index, event)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={EMISSION_POINT_COLUMNS.length} className={styles.emptyCell}>
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
                    onDoubleClick={() => setFormState({ mode: "edit", recordId: row.id })}
                  >
                    {EMISSION_POINT_COLUMNS.map((col, colIndex) => (
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

      {showPrintDialog ? (
        <PrintPropertiesDialog emissionPointsData={emissionPointsPrintData} onClose={() => setShowPrintDialog(false)} />
      ) : null}

      {showPcAssignment ? (
        <PcPointAssignmentDialog emissionPoints={rows} onClose={() => setShowPcAssignment(false)} />
      ) : null}

      {formState ? (
        <EmissionPointFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
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
    </div>
  );
}
