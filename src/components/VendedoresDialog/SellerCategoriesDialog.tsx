import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SELLER_CATEGORIES,
  nextSellerCategoryCodigo,
  sortSellerCategories,
  type SellerCategoryRecord,
} from "../../data/sellerCategories";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import type { SellerCategoriesPrintData } from "../../utils/buildSellerCategoriesPrintPreview";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { CarrierDeleteConfirmDialog } from "../TransportistasDialog/CarrierDeleteConfirmDialog";
import { SellerCategoryFormDialog } from "./SellerCategoryFormDialog";
import styles from "./SellerCategoriesDialog.module.css";

type Props = {
  categories: SellerCategoryRecord[];
  onCategoriesChange: (categories: SellerCategoryRecord[]) => void;
  onClose: () => void;
};

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

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

function matchesSearch(row: SellerCategoryRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [String(row.codigo), row.nombre].some((value) => value.toLowerCase().includes(q));
}

export function SellerCategoriesDialog({ categories, onCategoriesChange, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
  });
  const [rows, setRows] = useState<SellerCategoryRecord[]>(() => sortSellerCategories(categories));
  const [selectedId, setSelectedId] = useState(() => sortSellerCategories(categories)[0]?.id ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SellerCategoryRecord | null>(null);

  const sortedRows = useMemo(() => sortSellerCategories(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return sortedRows;
    return sortedRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [deferredSearchQuery, sortedRows]);

  const filterLabel = useMemo(() => {
    if (!deferredSearchQuery) return undefined;
    return `Búsqueda: ${deferredSearchQuery}`;
  }, [deferredSearchQuery]);

  const categoriesPrintData = useMemo<SellerCategoriesPrintData>(
    () => ({
      rows: filteredRows,
      filterLabel,
    }),
    [filteredRows, filterLabel],
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

  const commitRows = useCallback(
    (nextRows: SellerCategoryRecord[]) => {
      const sorted = sortSellerCategories(nextRows);
      setRows(sorted);
      onCategoriesChange(sorted);
    },
    [onCategoriesChange],
  );

  const handleSearchBarClosed = useCallback(() => {
    setSearchQuery("");
    if (resetSelectionOnSearchCloseRef.current) {
      resetSelectionOnSearchCloseRef.current = false;
      const first = sortedRows[0];
      if (first) setSelectedId(first.id);
    }
  }, [sortedRows]);

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

  const handleRefreshData = useCallback(() => {
    const refreshed = sortSellerCategories(SELLER_CATEGORIES);
    commitRows(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);
    if (refreshed[0]) setSelectedId(refreshed[0].id);
  }, [commitRows]);

  const handleSave = useCallback(
    (nombre: string) => {
      if (formState?.mode === "edit") {
        const updated = rows.map((row) => (row.id === formState.recordId ? { ...row, nombre } : row));
        commitRows(updated);
      } else {
        const record: SellerCategoryRecord = {
          id: `sc-${Date.now()}`,
          codigo: nextSellerCategoryCodigo(rows),
          nombre,
        };
        commitRows([...rows, record]);
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [commitRows, formState, rows],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const idx = filteredRows.findIndex((row) => row.id === deletedId);
    const next = sortedRows.filter((row) => row.id !== deletedId);
    commitRows(next);
    setDeleteTarget(null);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [commitRows, deleteTarget, filteredRows, sortedRows]);

  const formInitial = useMemo(() => {
    if (!formState) return { codigo: 1, nombre: "" };
    if (formState.mode === "add") {
      return { codigo: nextSellerCategoryCodigo(rows), nombre: "" };
    }
    const row = rows.find((item) => item.id === formState.recordId);
    return { codigo: row?.codigo ?? 1, nombre: row?.nombre ?? "" };
  }, [formState, rows]);

  const openEdit = useCallback(() => {
    const row = filteredRows[currentIndex];
    if (row) setFormState({ mode: "edit", recordId: row.id });
  }, [currentIndex, filteredRows]);

  useEffect(() => {
    if (filteredRows.length === 0) return;
    if (!filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={windowRef}
        className={styles.window}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="seller-categories-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="seller-categories-title" className={styles.titleText}>
            Tabla de Categoría de Vendedores
          </h1>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
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
            onClick={() => {
              const row = filteredRows[currentIndex];
              if (row) setDeleteTarget(row);
            }}
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
            onClick={openEdit}
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
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
              <label className={styles.searchLabel} htmlFor="seller-categories-search">
                Buscar:
              </label>
              <input
                id="seller-categories-search"
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

        <div className={styles.tableWrap} ref={tableWrapRef}>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: 64 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.tableHeadCell}>Código</th>
                <th className={`${styles.tableHeadCell} ${styles.headLeft}`}>Categoría</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className={styles.emptyCell}>
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
                    onDoubleClick={openEdit}
                  >
                    <td className={styles.colCenter}>{row.codigo}</td>
                    <td className={styles.colLeft}>{row.nombre.toUpperCase()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.statusBar}>{filteredRows.length} registros...</div>
      </div>

      {showPrintDialog ? (
        <PrintPropertiesDialog sellerCategoriesData={categoriesPrintData} onClose={() => setShowPrintDialog(false)} />
      ) : null}

      {formState ? (
        <SellerCategoryFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          codigo={formInitial.codigo}
          initialNombre={formInitial.nombre}
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
