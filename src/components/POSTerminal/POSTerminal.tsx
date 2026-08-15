import { memo, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { USD_RATE } from "../../config/currency";
import { lookupProduct, searchProducts, SEARCH_MAX_RESULTS, type Product } from "../../data/productCatalog";
import { ProductCatalogPanel } from "../ProductCatalogPanel/ProductCatalogPanel";
import { TransientAlert } from "../TransientAlert/TransientAlert";
import styles from "./POSTerminal.module.css";

export type SaleLine = {
  id: string;
  code: string;
  description: string;
  group?: string;
  qty: number;
  um: string;
  unitPrice: number;
  dscto: number;
};

type Props = {
  lines: SaleLine[];
  exitingLineIds: string[];
  selectedLineId: string | null;
  rucDniMode: boolean;
  identityVerified: boolean;
  docDigits: string;
  docLabel: string;
  nombre: string;
  lookupError: string | null;
  lookupLoading: boolean;
  catalogMode?: boolean;
  catalogDisabled?: boolean;
  discountClientError?: boolean;
  discountSelectError?: boolean;
  discountEmptyError?: boolean;
  onCatalogProduct?: (product: Product) => void;
  onAddLine: (line: SaleLine) => void;
  onSelectLine: (id: string | null) => void;
  onDocDigitsChange: (value: string) => void;
  onLookupErrorDismiss: () => void;
  onDiscountClientErrorDismiss: () => void;
  onDiscountSelectErrorDismiss: () => void;
  onDiscountEmptyErrorDismiss: () => void;
};

export const POSTerminal = memo(function POSTerminal({
  lines,
  exitingLineIds,
  selectedLineId,
  rucDniMode,
  identityVerified,
  docDigits,
  docLabel,
  nombre,
  lookupError,
  lookupLoading,
  catalogMode = false,
  catalogDisabled = false,
  discountClientError = false,
  discountSelectError = false,
  discountEmptyError = false,
  onCatalogProduct,
  onAddLine,
  onSelectLine,
  onDocDigitsChange,
  onLookupErrorDismiss,
  onDiscountClientErrorDismiss,
  onDiscountSelectErrorDismiss,
  onDiscountEmptyErrorDismiss,
}: Props) {
  const codeRef = useRef<HTMLInputElement>(null);
  const dniRef = useRef<HTMLInputElement>(null);
  const searchScrollRef = useRef<HTMLDivElement>(null);
  const searchSelectedIdxRef = useRef(0);
  const searchResultsRef = useRef<Product[]>([]);
  const ignoreMouseSelectRef = useRef(false);
  const wasLoadingRef = useRef(false);
  const [nameRevealTick, setNameRevealTick] = useState(0);
  const [codeUnlockTick, setCodeUnlockTick] = useState(0);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);

  searchResultsRef.current = searchResults;

  const clearSearch = () => {
    setSearchResults([]);
    setSearchTerm("");
    searchSelectedIdxRef.current = 0;
    ignoreMouseSelectRef.current = false;
    setSearchTruncated(false);
  };

  const applyActiveRow = (idx: number) => {
    const scroll = searchScrollRef.current;
    if (!scroll) return null;

    const activeClass = styles.sdRowActive;
    const prevActive = scroll.querySelector<HTMLElement>(`.${activeClass}`);
    const nextRow = scroll.querySelector<HTMLElement>(`[data-search-row-idx="${idx}"]`);
    if (prevActive && prevActive !== nextRow) {
      prevActive.classList.remove(activeClass);
    }
    if (nextRow && !nextRow.classList.contains(activeClass)) {
      nextRow.classList.add(activeClass);
    }
    return nextRow;
  };

  const ensureRowVisible = (row: HTMLElement) => {
    const scroll = searchScrollRef.current;
    if (!scroll) return;
    const headerH = (scroll.querySelector("thead") as HTMLElement | null)?.offsetHeight ?? 0;
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    const viewTop = scroll.scrollTop + headerH;
    const viewBottom = scroll.scrollTop + scroll.clientHeight;
    if (rowTop < viewTop) {
      scroll.scrollTop = Math.max(0, rowTop - headerH);
    } else if (rowBottom > viewBottom) {
      scroll.scrollTop = rowBottom - scroll.clientHeight;
    }
  };

  const selectSearchIndex = (next: number, fromMouse = false) => {
    if (fromMouse && ignoreMouseSelectRef.current) return;
    if (next === searchSelectedIdxRef.current) return;
    searchSelectedIdxRef.current = next;

    if (!fromMouse) {
      ignoreMouseSelectRef.current = true;
      const scroll = searchScrollRef.current;
      if (scroll) scroll.dataset.keyboardNav = "true";
    }

    const row = applyActiveRow(next);
    if (row && !fromMouse) ensureRowVisible(row);
  };

  const allowMouseSelect = (e: { movementX: number; movementY: number }) => {
    if (!ignoreMouseSelectRef.current) return;
    if (e.movementX === 0 && e.movementY === 0) return;
    ignoreMouseSelectRef.current = false;
    const scroll = searchScrollRef.current;
    if (scroll) delete scroll.dataset.keyboardNav;
  };

  useLayoutEffect(() => {
    if (searchResults.length === 0) return;
    const row = applyActiveRow(searchSelectedIdxRef.current);
    if (row) ensureRowVisible(row);
  }, [searchResults]);

  const highlightRegex = useMemo(() => {
    if (!searchTerm) return null;
    return new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  }, [searchTerm]);

  const highlight = (text: string, term: string): ReactNode => {
    if (!term || !highlightRegex) return text;
    const parts = text.split(highlightRegex);
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? <mark key={i} className={styles.sdHighlight}>{part}</mark>
        : part,
    );
  };

  const codeLocked = rucDniMode && !identityVerified;

  useEffect(() => {
    if (rucDniMode) {
      dniRef.current?.focus();
      return;
    }
    codeRef.current?.focus();
  }, [rucDniMode]);

  useEffect(() => {
    if (rucDniMode && identityVerified) {
      const timer = window.setTimeout(() => codeRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [identityVerified, rucDniMode, codeUnlockTick]);

  useEffect(() => {
    if (wasLoadingRef.current && !lookupLoading && identityVerified && nombre) {
      setNameRevealTick((tick) => tick + 1);
    }
    wasLoadingRef.current = lookupLoading;
  }, [lookupLoading, identityVerified, nombre]);

  useEffect(() => {
    if (identityVerified) {
      setCodeUnlockTick((tick) => tick + 1);
    }
  }, [identityVerified]);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      clearSearch();
      return;
    }

    startTransition(() => {
      const results = searchProducts(trimmed, SEARCH_MAX_RESULTS + 1);
      if (results.length > 0) {
        setSearchTerm(trimmed);
        setSearchTruncated(results.length > SEARCH_MAX_RESULTS);
        setSearchResults(results.slice(0, SEARCH_MAX_RESULTS));
        searchSelectedIdxRef.current = 0;
        setCodeError(null);
      } else {
        clearSearch();
      }
    });
  }, [code]);

  const addProduct = (product: Product) => {
    setCodeError(null);
    onAddLine({
      id: `${Date.now()}`,
      code: product.code,
      description: product.description,
      group: product.group,
      qty: 1,
      um: "UND",
      unitPrice: product.price,
      dscto: 0,
    });
    setCode("");
    clearSearch();
    codeRef.current?.focus();
  };

  const handleScan = (e: FormEvent) => {
    e.preventDefault();
    if (codeLocked) return;

    if (searchResultsRef.current.length > 0) {
      const p = searchResultsRef.current[searchSelectedIdxRef.current];
      if (p) addProduct(p);
      else clearSearch();
      return;
    }

    const trimmed = code.trim();
    if (!trimmed) return;

    const product = lookupProduct(trimmed);
    if (product) {
      addProduct(product);
      return;
    }

    const results = searchProducts(trimmed);
    if (results.length === 0) {
      setCodeError(`No existe el código o producto "${trimmed}" en el catálogo`);
      setCode("");
      codeRef.current?.focus();
      return;
    }

    if (results.length === 1) {
      addProduct(results[0]);
      return;
    }

    setCodeError(null);
    setSearchTerm(trimmed);
    setSearchResults(results);
    searchSelectedIdxRef.current = 0;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const results = searchResultsRef.current;
      if (results.length === 0) return;

      if (e.key === "Escape") {
        e.preventDefault();
        clearSearch();
        codeRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        selectSearchIndex(Math.min(searchSelectedIdxRef.current + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        selectSearchIndex(Math.max(searchSelectedIdxRef.current - 1, 0));
      }
    };
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const totalVenta = lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.dscto / 100), 0);
  const totalDscto = lines.reduce((s, l) => s + l.qty * l.unitPrice * (l.dscto / 100), 0);
  const totalUsd = totalVenta / USD_RATE;
  const documentoDisplay = docLabel || docDigits;

  return (
    <section
      className={styles.terminal}
      aria-label="Terminal punto de venta"
      onClick={(e) => {
        if (searchResults.length > 0 && !(e.target as HTMLElement).closest("[data-search-drop]")) {
          clearSearch();
        }
      }}
    >
      {!catalogMode && (
        <>
          <div className={styles.entryBand}>
            <form className={styles.entryCol} onSubmit={handleScan}>
              <span className={styles.entryHeader}>Lectura de código</span>
              <input
                ref={codeRef}
                key={codeUnlockTick}
                className={[
                  styles.entryInput,
                  "mono",
                  codeLocked ? styles.entryInputLocked : "",
                  !codeLocked && identityVerified ? styles.entryInputUnlock : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="text"
                value={code}
                onChange={(e) => {
                  if (codeLocked) return;
                  setCode(e.target.value);
                }}
                placeholder={codeLocked ? "Ingrese RUC/DNI válido primero" : ""}
                readOnly={codeLocked}
                tabIndex={codeLocked ? -1 : 0}
                autoFocus={!rucDniMode}
                aria-readonly={codeLocked}
              />
            </form>

            <div className={`${styles.entryExtraCols} ${rucDniMode ? styles.entryExtraColsOpen : styles.entryExtraColsHidden}`}>
              <div className={styles.entryCol}>
                <span className={styles.entryHeader}>RUC/DNI</span>
                <input
                  ref={dniRef}
                  className={[
                    styles.entryInput,
                    styles.entryInputDoc,
                    "mono",
                    lookupLoading ? styles.entryInputLookup : "",
                    identityVerified ? styles.entryInputVerified : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="text"
                  inputMode="numeric"
                  value={documentoDisplay}
                  onChange={(e) => onDocDigitsChange(e.target.value)}
                  placeholder=""
                  maxLength={14}
                  aria-busy={lookupLoading}
                  tabIndex={rucDniMode ? undefined : -1}
                />
              </div>

              <div
                className={[
                  styles.entryCol,
                  styles.entryColNombre,
                  lookupLoading ? styles.entryColNombreLoading : "",
                  identityVerified ? styles.entryColNombreVerified : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.entryHeader}>
                  Nombre
                  <span
                    className={[
                      styles.reniecMark,
                      lookupLoading ? styles.reniecMarkActive : "",
                      identityVerified ? styles.reniecMarkDone : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title="DNI vía eldni.com · RUC vía consulta.rucpe.com"
                  >
                    RENIEC
                  </span>
                </span>
                <div className={styles.nombreFieldShell}>
                  <input
                    key={nameRevealTick}
                    className={[
                      styles.entryInput,
                      styles.entryInputNombre,
                      identityVerified && nombre ? styles.entryInputNombreReveal : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="text"
                    value={nombre}
                    readOnly
                    tabIndex={-1}
                    placeholder=""
                    aria-busy={lookupLoading}
                  />
                  {lookupLoading ? (
                    <div className={styles.nombreLoadingOverlay} aria-hidden="true">
                      <span className={styles.lookupSweep} />
                      <span className={styles.lookupLabel}>Consultando</span>
                      <span className={styles.lookupDots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <TransientAlert
            active={!!codeError}
            message={codeError}
            onDismiss={() => setCodeError(null)}
          />
          <TransientAlert
            active={rucDniMode && !!lookupError}
            message={lookupError}
            onDismiss={onLookupErrorDismiss}
          />

          {searchResults.length > 0 && (
            <div className={styles.searchDrop} data-search-drop="true">
              {searchTruncated ? (
                <p className={styles.searchDropHint}>
                  Mostrando los primeros {SEARCH_MAX_RESULTS} resultados. Escriba más para acotar.
                </p>
              ) : null}
              <div
                className={styles.searchDropScroll}
                ref={searchScrollRef}
                onMouseMove={allowMouseSelect}
              >
                <table className={styles.searchDropTable}>
                  <colgroup>
                    <col className={styles.sdColDesc} />
                    <col className={styles.sdColCode} />
                    <col className={styles.sdColUm} />
                    <col className={styles.sdColPrice} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={styles.sdColDesc}>Descripción</th>
                      <th className={styles.sdColCode}>Código</th>
                      <th className={styles.sdColUm}>UM</th>
                      <th className={styles.sdColPrice}>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((p, i) => (
                      <tr
                        key={p.code}
                        data-search-row-idx={i}
                        className={styles.sdRow}
                        onClick={() => addProduct(p)}
                        onMouseEnter={() => selectSearchIndex(i, true)}
                      >
                        <td className={styles.sdColDesc}>{highlight(p.description, searchTerm)}</td>
                        <td className={styles.sdColCode}>{highlight(p.code, searchTerm)}</td>
                        <td className={styles.sdColUm}>UND</td>
                        <td className={styles.sdColPrice}>S/ {p.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <TransientAlert
        active={discountClientError}
        message={discountClientError ? "Cliente desconocido. RUC y/o DNI no es válido" : null}
        onDismiss={onDiscountClientErrorDismiss}
      />
      <TransientAlert
        active={discountSelectError}
        message={discountSelectError ? "Seleccione un producto" : null}
        onDismiss={onDiscountSelectErrorDismiss}
      />
      <TransientAlert
        active={discountEmptyError}
        message={discountEmptyError ? "No hay productos en la venta" : null}
        onDismiss={onDiscountEmptyErrorDismiss}
      />

      <div className={`${styles.gridWrap} ${catalogMode ? styles.gridWrapCatalog : ""}`}>
        {catalogMode && onCatalogProduct ? (
          <ProductCatalogPanel
            disabled={catalogDisabled}
            onSelectProduct={onCatalogProduct}
          />
        ) : lines.length === 0 ? (
          <p className={styles.emptyMsg}>Escanee un producto para comenzar la venta.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colCode}>Código</th>
                <th className={styles.colDesc}>Descripción</th>
                <th className={styles.colNum}>Cantidad</th>
                <th className={styles.colUm}>U.M</th>
                <th className={styles.colNum}>Precio</th>
                <th className={styles.colNum}>Dscto %</th>
                <th className={styles.colTotal}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineTotal = line.qty * line.unitPrice * (1 - line.dscto / 100);
                return (
                  <tr
                    key={line.id}
                    className={[
                      line.id === selectedLineId ? styles.rowSelected : "",
                      exitingLineIds.includes(line.id) ? styles.rowExit : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      onSelectLine(line.id === selectedLineId ? null : line.id)
                    }
                  >
                    <td className="mono">{line.code}</td>
                    <td>{line.description}</td>
                    <td className={styles.cellRight}>{line.qty.toFixed(2)}</td>
                    <td className={styles.cellCenter}>{line.um}</td>
                    <td className={styles.cellRight}>{line.unitPrice.toFixed(2)}</td>
                    <td className={styles.cellRight}>{line.dscto.toFixed(2)}%</td>
                    <td className={`${styles.cellRight} ${styles.cellBold}`}>
                      {lineTotal.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <footer className={`${styles.footer} ${lines.length > 0 ? styles.footerEnter : styles.footerHidden}`}>
        {lines.length > 0 && (
          <>
            <div className={styles.footerMeta}>
              <span>Otros totales : </span>
              <span className={styles.footerLabel}>US$ :</span>
              <span className={styles.footerValBlue}>{totalUsd.toFixed(2)}</span>
              <span className={styles.footerLabel}>Dscto :</span>
              <span className={styles.footerLabel}>S/</span>
              <span className={styles.footerValBlue}>{totalDscto.toFixed(2)}</span>
            </div>
            <div className={styles.footerTotal}>
              <span className={styles.footerTotalLabel}>TOTAL VENTA</span>
              <span className={styles.footerTotalCurrency}>S/</span>
              <span className={styles.footerTotalValue}>{totalVenta.toFixed(2)}</span>
            </div>
          </>
        )}
      </footer>
    </section>
  );
});
