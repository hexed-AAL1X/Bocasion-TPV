import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SELLERS,
  SELLER_GROUPS,
  sortSellers,
  type SellerGroup,
  type SellerRecord,
} from "../../data/sellers";
import {
  SELLER_CATEGORIES,
  sortSellerCategories,
  type SellerCategoryRecord,
} from "../../data/sellerCategories";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import type { SellersPrintData } from "../../utils/buildSellersPrintPreview";
import {
  emptySellerForm,
  sellerFormToRecord,
  sellerRecordToForm,
  type SellerFormValues,
} from "../../utils/sellerFormUtils";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { CarrierDeleteConfirmDialog } from "../TransportistasDialog/CarrierDeleteConfirmDialog";
import { WinSelect } from "../WinSelect/WinSelect";
import { SellerFormDialog } from "./SellerFormDialog";
import styles from "./VendedoresDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  onClose: () => void;
};

type StatusFilter = "activo" | "inactivo" | "todos";
type GroupFilter = "todos" | SellerGroup;
type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type SellerColumnDef = ResizableColumnDef & {
  key: "codigo" | "nombre" | "grupo";
  align?: "center" | "left";
};

const SELLER_COLUMNS: SellerColumnDef[] = [
  { key: "codigo", label: "Código", defaultWidth: 64, minWidth: 48, align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 280, minWidth: 120, stretchWeight: 4, align: "left" },
  { key: "grupo", label: "Grupo", defaultWidth: 140, minWidth: 96, stretchWeight: 2, align: "left" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "todos", label: "Todos" },
];

const GROUP_OPTIONS: { value: GroupFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  ...SELLER_GROUPS.map((grupo) => ({ value: grupo as GroupFilter, label: grupo })),
];

function matchesSearch(row: SellerRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.codigo, row.nombre, row.grupo].some((value) => value.toLowerCase().includes(q));
}

function pickFirstRow(rows: SellerRecord[], status: StatusFilter, group: GroupFilter): SellerRecord | undefined {
  const filtered = rows.filter((row) => {
    if (status === "activo" && !row.activo) return false;
    if (status === "inactivo" && row.activo) return false;
    if (group !== "todos" && row.grupo !== group) return false;
    return true;
  });
  return filtered[0];
}

export function VendedoresDialog({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [rows, setRows] = useState<SellerRecord[]>(() => sortSellers(SELLERS));
  const [categories, setCategories] = useState<SellerCategoryRecord[]>(() => sortSellerCategories(SELLER_CATEGORIES));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("activo");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("todos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SellerRecord | null>(null);
  const [selectedId, setSelectedId] = useState(() => pickFirstRow(sortSellers(SELLERS), "activo", "todos")?.id ?? "");
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(SELLER_COLUMNS);

  const baseRows = useMemo(() => {
    const sorted = sortSellers(rows);
    return sorted.filter((row) => {
      if (statusFilter === "activo" && !row.activo) return false;
      if (statusFilter === "inactivo" && row.activo) return false;
      if (groupFilter !== "todos" && row.grupo !== groupFilter) return false;
      return true;
    });
  }, [groupFilter, rows, statusFilter]);

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return baseRows;
    return baseRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [baseRows, deferredSearchQuery]);

  const filterLabel = useMemo(() => {
    const status = STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label ?? statusFilter;
    const group = GROUP_OPTIONS.find((item) => item.value === groupFilter)?.label ?? groupFilter;
    const parts = [`Grupo: ${group}`, `Estado: ${status}`];
    if (deferredSearchQuery) parts.push(`Búsqueda: ${deferredSearchQuery}`);
    return parts.join(" — ");
  }, [deferredSearchQuery, groupFilter, statusFilter]);

  const sellersPrintData = useMemo<SellersPrintData>(
    () => ({
      rows: filteredRows,
      filterLabel,
      columns: SELLER_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, filterLabel, layoutWidths],
  );

  const formInitialValues = useMemo(() => {
    if (!formState) return emptySellerForm(rows);
    if (formState.mode === "add") return emptySellerForm(rows);
    const row = rows.find((item) => item.id === formState.recordId);
    return row ? sellerRecordToForm(row) : emptySellerForm(rows);
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

  const applyFilters = useCallback(
    (nextStatus: StatusFilter, nextGroup: GroupFilter) => {
      const wasSearchOpen = searchOpen;
      setStatusFilter(nextStatus);
      setGroupFilter(nextGroup);
      setSearchOpen(false);
      if (!wasSearchOpen) setSearchQuery("");
      const first = pickFirstRow(rows, nextStatus, nextGroup);
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
    setRows((prev) => sortSellers(prev.filter((row) => row.id !== deletedId)));
    setDeleteTarget(null);
    const next = filteredRows.filter((row) => row.id !== deletedId);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [deleteTarget, filteredRows]);

  const handleSave = useCallback(
    (values: SellerFormValues) => {
      if (formState?.mode === "edit") {
        const existing = rows.find((row) => row.id === formState.recordId);
        const record = sellerFormToRecord(values, existing);
        setRows((prev) => sortSellers(prev.map((row) => (row.id === formState.recordId ? record : row))));
        setSelectedId(record.id);
      } else {
        const record = sellerFormToRecord(values);
        setRows((prev) => sortSellers([...prev, record]));
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [formState, rows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = sortSellers(SELLERS);
    setRows(refreshed);
    setCategories(sortSellerCategories(SELLER_CATEGORIES));
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);
    const first = pickFirstRow(refreshed, statusFilter, groupFilter);
    if (first) setSelectedId(first.id);
  }, [groupFilter, statusFilter]);

  useEffect(() => {
    tableWrapRef.current?.scrollTo({ top: 0 });
  }, [groupFilter, statusFilter, tableWrapRef]);

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
        aria-labelledby="vendedores-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="vendedores-title" className={styles.titleText}>
            Vendedores
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

          <label className={styles.filterLabel} htmlFor="vendedores-grupo">
            Grupo:
          </label>
          <WinSelect
            id="vendedores-grupo"
            compact
            className={styles.filterSelect}
            value={groupFilter}
            options={GROUP_OPTIONS}
            onChange={(next) => applyFilters(statusFilter, next as GroupFilter)}
            aria-label="Filtro de grupo"
          />

          <label className={styles.filterLabel} htmlFor="vendedores-estado">
            Estado:
          </label>
          <WinSelect
            id="vendedores-estado"
            compact
            className={styles.filterSelect}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(next) => applyFilters(next as StatusFilter, groupFilter)}
            aria-label="Filtro de estado"
          />
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
              <label className={styles.searchLabel} htmlFor="vendedores-search">
                Buscar:
              </label>
              <input
                id="vendedores-search"
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
                <col key={SELLER_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {SELLER_COLUMNS.map((col, index) => (
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
                    {index < SELLER_COLUMNS.length - 1 ? (
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
                  <td colSpan={SELLER_COLUMNS.length} className={styles.emptyCell}>
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
                    {SELLER_COLUMNS.map((col, colIndex) => (
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
        <PrintPropertiesDialog sellersData={sellersPrintData} onClose={() => setShowPrintDialog(false)} />
      ) : null}

      {formState ? (
        <SellerFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          initialValues={formInitialValues}
          categories={categories}
          onCategoriesChange={setCategories}
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
