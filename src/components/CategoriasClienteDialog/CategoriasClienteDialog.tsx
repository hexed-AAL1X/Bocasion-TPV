import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cloneEntityCategorySeeds,
  entityCategoryWindowTitle,
  nextEntityCategoryCodigo,
  sortEntityCategories,
  type EntityCategoryKind,
  type EntityCategoryRecord,
} from "../../data/entityCategories";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import type { SellerCategoriesPrintData } from "../../utils/buildSellerCategoriesPrintPreview";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { CarrierDeleteConfirmDialog } from "../TransportistasDialog/CarrierDeleteConfirmDialog";
import { CategoriaEntidadFormDialog } from "./CategoriaEntidadFormDialog";
import { imageUrl } from "../../utils/assetUrl";
import styles from "./CategoriasClienteDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  onClose: () => void;
};

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type ColumnKey = "codigo" | "nombre";

type ColumnDef = ResizableColumnDef & {
  key: ColumnKey;
  align?: "center" | "left";
};

const COLUMNS: ColumnDef[] = [
  { key: "codigo", label: "Código", defaultWidth: 64, minWidth: 48, align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 320, minWidth: 140, stretchWeight: 4, align: "left" },
];

const KIND_OPTIONS: Array<{ kind: EntityCategoryKind; label: string; icon: string }> = [
  { kind: "clientes", label: "Clientes", icon: imageUrl("iconos/activo-clientes.png") },
  { kind: "proveedores", label: "Proveedores", icon: imageUrl("iconos/activo-orden-compra.png") },
  { kind: "productos", label: "Productos", icon: imageUrl("iconos/activo-productos.png") },
];

function matchesSearch(row: EntityCategoryRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.codigo, row.nombre].some((value) => value.toLowerCase().includes(q));
}

export function CategoriasClienteDialog({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [kind, setKind] = useState<EntityCategoryKind>("clientes");
  const [byKind, setByKind] = useState(() => cloneEntityCategorySeeds());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntityCategoryRecord | null>(null);
  const [selectedId, setSelectedId] = useState(() => cloneEntityCategorySeeds().clientes[0]?.id ?? "");
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(COLUMNS);

  const rows = byKind[kind];
  const baseRows = useMemo(() => sortEntityCategories(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return baseRows;
    return baseRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [baseRows, deferredSearchQuery]);

  const windowTitle = entityCategoryWindowTitle(kind);

  const filterLabel = useMemo(() => {
    if (!deferredSearchQuery) return undefined;
    return `Búsqueda: ${deferredSearchQuery}`;
  }, [deferredSearchQuery]);

  const printData = useMemo<SellerCategoriesPrintData>(
    () => ({
      reportTitle: windowTitle,
      filterLabel,
      rows: filteredRows.map((row) => ({
        id: row.id,
        codigo: Number.parseInt(row.codigo, 10) || 0,
        nombre: row.nombre,
      })),
      columns: COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, filterLabel, layoutWidths, windowTitle],
  );

  const formCodigo = useMemo(() => {
    if (!formState) return nextEntityCategoryCodigo(rows);
    if (formState.mode === "add") return nextEntityCategoryCodigo(rows);
    return rows.find((row) => row.id === formState.recordId)?.codigo ?? nextEntityCategoryCodigo(rows);
  }, [formState, rows]);

  const formNombre = useMemo(() => {
    if (!formState || formState.mode === "add") return "";
    return rows.find((row) => row.id === formState.recordId)?.nombre ?? "";
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

  const updateKindRows = useCallback(
    (nextRows: EntityCategoryRecord[]) => {
      setByKind((prev) => ({
        ...prev,
        [kind]: sortEntityCategories(nextRows),
      }));
    },
    [kind],
  );

  const openEdit = useCallback((recordId: string) => {
    setFormState({ mode: "edit", recordId });
  }, []);

  const handleKindChange = useCallback(
    (nextKind: EntityCategoryKind) => {
      if (nextKind === kind) return;
      setKind(nextKind);
      setSearchQuery("");
      setSearchOpen(false);
      setFormState(null);
      setDeleteTarget(null);
      const first = byKind[nextKind][0];
      setSelectedId(first?.id ?? "");
    },
    [byKind, kind],
  );

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
    const next = filteredRows.filter((row) => row.id !== deletedId);
    updateKindRows(rows.filter((row) => row.id !== deletedId));
    setDeleteTarget(null);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [deleteTarget, filteredRows, rows, updateKindRows]);

  const handleSave = useCallback(
    (nombre: string) => {
      if (formState?.mode === "edit") {
        updateKindRows(
          rows.map((row) => (row.id === formState.recordId ? { ...row, nombre } : row)),
        );
        setSelectedId(formState.recordId);
      } else {
        const codigo = nextEntityCategoryCodigo(rows);
        const record: EntityCategoryRecord = {
          id: `ec-${kind}-${codigo}-${Date.now()}`,
          codigo,
          nombre,
        };
        updateKindRows([...rows, record]);
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [formState, kind, rows, updateKindRows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = cloneEntityCategorySeeds();
    setByKind(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);
    const first = refreshed[kind][0];
    if (first) setSelectedId(first.id);
  }, [kind]);

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
        aria-labelledby="categorias-cliente-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="categorias-cliente-title" className={styles.titleText}>
            {windowTitle}
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
              if (row) openEdit(row.id);
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
        </div>

        <div className={styles.kindBar} role="radiogroup" aria-label="Tipo de categoría">
          {KIND_OPTIONS.map((option) => (
            <label key={option.kind} className={styles.kindOption}>
              <input
                type="radio"
                name="categoria-entidad-kind"
                checked={kind === option.kind}
                onChange={() => handleKindChange(option.kind)}
              />
              <img src={option.icon} alt="" className={styles.kindIcon} width={28} height={28} draggable={false} />
              {option.label}
            </label>
          ))}
        </div>

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
              <label className={styles.searchLabel} htmlFor="categorias-cliente-search">
                Buscar:
              </label>
              <input
                id="categorias-cliente-search"
                ref={searchInputRef}
                className={styles.searchInput}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearchNext();
                  if (event.key === "Escape") closeSearch();
                }}
              />
              <button
                type="button"
                className={styles.searchActionBtn}
                onClick={handleSearchNext}
                disabled={filteredRows.length === 0}
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
                <col key={COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {COLUMNS.map((col, index) => (
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
                    {index < COLUMNS.length - 1 ? (
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
                  <td colSpan={COLUMNS.length} className={styles.emptyCell}>
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
                    onDoubleClick={() => openEdit(row.id)}
                  >
                    {COLUMNS.map((col, colIndex) => (
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
        <PrintPropertiesDialog
          sellerCategoriesData={printData}
          onClose={() => setShowPrintDialog(false)}
        />
      ) : null}

      {formState ? (
        <CategoriaEntidadFormDialog
          key={`${kind}-${formState.mode === "edit" ? formState.recordId : "add"}`}
          mode={formState.mode}
          codigo={formCodigo}
          initialNombre={formNombre}
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
