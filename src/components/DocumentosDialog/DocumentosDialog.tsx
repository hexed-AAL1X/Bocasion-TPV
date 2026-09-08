import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DOCUMENTS, sortDocuments, type DocumentRecord } from "../../data/documents";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import {
  emptyDocumentForm,
  documentFormToRecord,
  documentRecordToForm,
  type DocumentFormValues,
} from "../../utils/documentFormUtils";
import type { DocumentsPrintData } from "../../utils/buildDocumentsPrintPreview";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { CarrierDeleteConfirmDialog } from "../TransportistasDialog/CarrierDeleteConfirmDialog";
import { DocumentFormDialog } from "./DocumentFormDialog";
import styles from "./DocumentosDialog.module.css";
import { TitleMaximizeIcon, NavIcon, SearchIcon, PrintIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  onClose: () => void;
};

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

type DocumentColumnKey = "codigo" | "nombre" | "registroCompra" | "ventaDirecta" | "codSunat";

type DocumentColumnDef = ResizableColumnDef & {
  key: DocumentColumnKey;
  align?: "center" | "left";
};

const DOCUMENT_COLUMNS: DocumentColumnDef[] = [
  { key: "codigo", label: "Código", defaultWidth: 56, minWidth: 44, align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 280, minWidth: 120, stretchWeight: 4, align: "left" },
  { key: "registroCompra", label: "Reg.Compra", defaultWidth: 80, minWidth: 64, align: "center" },
  { key: "ventaDirecta", label: "Vta. Directa", defaultWidth: 88, minWidth: 72, align: "center" },
  { key: "codSunat", label: "Cod. Sunat", defaultWidth: 72, minWidth: 56, align: "center" },
];

function matchesSearch(row: DocumentRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [row.codigo, row.nombre, row.codSunat].some((value) => value.toLowerCase().includes(q));
}

function formatCellValue(row: DocumentRecord, key: DocumentColumnKey): string {
  if (key === "registroCompra" || key === "ventaDirecta") {
    return row[key] ? "Si" : "";
  }
  return row[key];
}

export function DocumentosDialog({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [rows, setRows] = useState<DocumentRecord[]>(() => sortDocuments(DOCUMENTS));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { deferredQuery: deferredSearchQuery } = useDeferredSearchQuery(searchQuery);
  const resetSelectionOnSearchCloseRef = useRef(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [selectedId, setSelectedId] = useState(() => sortDocuments(DOCUMENTS)[0]?.id ?? "");
  const { tableWrapRef, tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(DOCUMENT_COLUMNS);

  const baseRows = useMemo(() => sortDocuments(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return baseRows;
    return baseRows.filter((row) => matchesSearch(row, deferredSearchQuery));
  }, [baseRows, deferredSearchQuery]);

  const filterLabel = useMemo(() => {
    if (!deferredSearchQuery) return undefined;
    return `Búsqueda: ${deferredSearchQuery}`;
  }, [deferredSearchQuery]);

  const documentsPrintData = useMemo<DocumentsPrintData>(
    () => ({
      rows: filteredRows,
      filterLabel,
      columns: DOCUMENT_COLUMNS.map((col, index) => ({
        key: col.key,
        label: col.label,
        widthPx: layoutWidths[index],
      })),
    }),
    [filteredRows, filterLabel, layoutWidths],
  );

  const formInitialValues = useMemo(() => {
    if (!formState) return emptyDocumentForm(rows);
    if (formState.mode === "add") return emptyDocumentForm(rows);
    const row = rows.find((item) => item.id === formState.recordId);
    return row ? documentRecordToForm(row) : emptyDocumentForm(rows);
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

  const openEdit = useCallback((recordId: string) => {
    setFormState({ mode: "edit", recordId });
  }, []);

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
    setRows((prev) => sortDocuments(prev.filter((row) => row.id !== deletedId)));
    setDeleteTarget(null);
    const next = filteredRows.filter((row) => row.id !== deletedId);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [deleteTarget, filteredRows]);

  const handleSave = useCallback(
    (values: DocumentFormValues) => {
      if (formState?.mode === "edit") {
        const existing = rows.find((row) => row.id === formState.recordId);
        const record = documentFormToRecord(values, existing);
        setRows((prev) => sortDocuments(prev.map((row) => (row.id === formState.recordId ? record : row))));
        setSelectedId(record.id);
      } else {
        const record = documentFormToRecord(values);
        setRows((prev) => sortDocuments([...prev, record]));
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [formState, rows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = sortDocuments(DOCUMENTS);
    setRows(refreshed);
    setSearchQuery("");
    setSearchOpen(false);
    setDeleteTarget(null);
    setFormState(null);
    const first = refreshed[0];
    if (first) setSelectedId(first.id);
  }, []);

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
        aria-labelledby="documentos-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="documentos-title" className={styles.titleText}>
            Documentos
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

        {searchBarMounted ? (
          <div className={styles.searchBarShell} {...searchBarProps}>
            <div className={styles.searchBar}>
              <label className={styles.searchLabel} htmlFor="documentos-search">
                Buscar:
              </label>
              <input
                id="documentos-search"
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
                <col key={DOCUMENT_COLUMNS[index].key} style={getColumnStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {DOCUMENT_COLUMNS.map((col, index) => (
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
                    {index < DOCUMENT_COLUMNS.length - 1 ? (
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
                  <td colSpan={DOCUMENT_COLUMNS.length} className={styles.emptyCell}>
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
                    {DOCUMENT_COLUMNS.map((col, colIndex) => (
                      <td
                        key={col.key}
                        className={col.align === "center" ? styles.colCenter : styles.colLeft}
                        style={getColumnStyle(colIndex)}
                      >
                        {formatCellValue(row, col.key)}
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
        <PrintPropertiesDialog documentsData={documentsPrintData} onClose={() => setShowPrintDialog(false)} />
      ) : null}

      {formState ? (
        <DocumentFormDialog
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
