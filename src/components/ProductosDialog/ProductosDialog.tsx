import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type UIEvent,
} from "react";
import { ENTITY_CATEGORY_SEEDS } from "../../data/entityCategories";
import { productCatalog, type Product } from "../../data/productCatalog";
import { PRODUCT_GROUPS } from "../../data/productGroups";
import { useResizableTableLayout, type ResizableColumnDef } from "../../hooks/useResizableTableColumns";
import { useDeferredSearchQuery } from "../../hooks/useDeferredSearchQuery";
import { useRepeatingPress } from "../../hooks/useTableRowFollow";
import { WinSelect } from "../WinSelect/WinSelect";
import styles from "./ProductosDialog.module.css";

type StatusFilter = "activo" | "inactivo" | "todos";

type ItemRow = {
  id: string;
  codigo: string;
  marca: string;
  procedencia: string;
  descripcion: string;
  ubicacion: string;
  stockFisico: number;
  reservado: number;
  disponible: number;
  um: string;
  origen: string;
  grupo: string;
  linea: string;
  codi: string;
  activo: boolean;
  price: number;
};

type ItemColumnDef = ResizableColumnDef & {
  key:
    | "codigo"
    | "marca"
    | "procedencia"
    | "descripcion"
    | "ubicacion"
    | "stockFisico"
    | "reservado"
    | "disponible"
    | "um"
    | "origen"
    | "imagen"
    | "codi";
  align?: "center" | "left" | "right";
};

const ITEM_COLUMNS: ItemColumnDef[] = [
  { key: "codigo", label: "Código", defaultWidth: 64, minWidth: 48, align: "center" },
  { key: "marca", label: "Marca", defaultWidth: 56, minWidth: 44, align: "center" },
  { key: "procedencia", label: "Procedencia", defaultWidth: 80, minWidth: 60, align: "center" },
  { key: "descripcion", label: "Descripción", defaultWidth: 260, minWidth: 140, stretchWeight: 4, align: "left" },
  { key: "ubicacion", label: "Ubicación", defaultWidth: 72, minWidth: 48, align: "left" },
  { key: "stockFisico", label: "Stoc Físico", defaultWidth: 80, minWidth: 64, align: "right" },
  { key: "reservado", label: "Reservado", defaultWidth: 72, minWidth: 56, align: "right" },
  { key: "disponible", label: "Disponible", defaultWidth: 80, minWidth: 64, align: "right" },
  { key: "um", label: "U.M.", defaultWidth: 44, minWidth: 36, align: "center" },
  { key: "origen", label: "Origen", defaultWidth: 56, minWidth: 40, align: "left" },
  { key: "imagen", label: "Imagen", defaultWidth: 56, minWidth: 44, align: "center" },
  { key: "codi", label: "CODI", defaultWidth: 100, minWidth: 72, align: "left" },
];

const LINEA_OPTIONS = [
  { value: "todos", label: "Todos" },
  ...ENTITY_CATEGORY_SEEDS.productos.map((row) => ({ value: row.nombre, label: row.nombre })),
];

const GROUP_OPTIONS = [
  { value: "todos", label: "Todos" },
  ...PRODUCT_GROUPS.map((group) => ({ value: group, label: group })),
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "todos", label: "Todos" },
];

const DEFAULT_LINEA = "PROD.TERMINADO";

function formatQty(n: number): string {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildCodi(code: string, group: string): string {
  const groups = PRODUCT_GROUPS as readonly string[];
  const gi = Math.max(0, groups.indexOf(group)) + 1;
  const digits = code.replace(/\D/g, "").slice(-4).padStart(4, "0") || "0000";
  return `01${String(gi).padStart(2, "0")}-01${digits}`;
}

function productToRow(product: Product): ItemRow {
  return {
    id: `item-${product.code}`,
    codigo: product.code,
    marca: "ND",
    procedencia: "PERU",
    descripcion: product.description.toUpperCase(),
    ubicacion: "",
    stockFisico: 0,
    reservado: 0,
    disponible: 0,
    um: "UND",
    origen: "",
    grupo: product.group,
    linea: DEFAULT_LINEA,
    codi: buildCodi(product.code, product.group),
    activo: true,
    price: product.price,
  };
}

function loadCatalogRows(): ItemRow[] {
  return Object.values(productCatalog)
    .map(productToRow)
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
}

/** Una sola construcción del catálogo (aperturas siguientes son instantáneas). */
let catalogRowsCache: ItemRow[] | null = null;
function getCatalogRows(): ItemRow[] {
  if (!catalogRowsCache) catalogRowsCache = loadCatalogRows();
  return catalogRowsCache;
}

const ROW_HEIGHT = 22;
const OVERSCAN = 14;

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

const SIDE_SECTIONS: { title: string; links: string[] }[] = [
  {
    title: "Operaciones",
    links: ["Equivalentes del ítem", "Cambiar estado del ítem", "Asignar código SUNAT/UNSPSC"],
  },
  {
    title: "Etiquetas y código barras",
    links: ["Impresión de código barras", "Impresión de etiquetas", "Enrolar códigos barras"],
  },
  {
    title: "Kardex y stock",
    links: [
      "Ver movimientos en el kardex",
      "Ver stock en otros almacenes",
      "Ver existencias en pantalla",
      "Actualiza stock mínimo",
    ],
  },
  {
    title: "Estadística",
    links: ["Estadística de ventas"],
  },
  {
    title: "Vea también",
    links: [
      "Codificación de líneas",
      "Tabla de marcas registradas",
      "Tabla de unidades de medida",
      "Tabla de código osce",
    ],
  },
];

/** Vista embebida del Padrón de Items (pestaña del workspace, no ventana modal). */
export function ProductosPadronPanel() {
  const rows = getCatalogRows();
  const [linea, setLinea] = useState(DEFAULT_LINEA);
  const [subLinea] = useState("todos");
  const [grupo, setGrupo] = useState("todos");
  const [estado, setEstado] = useState<StatusFilter>("activo");
  const [descFilter, setDescFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [soloStock, setSoloStock] = useState(false);
  const [selectedId, setSelectedId] = useState(() => rows[0]?.id ?? "");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(480);
  const { deferredQuery: deferredDesc } = useDeferredSearchQuery(descFilter);
  const { deferredQuery: deferredCode } = useDeferredSearchQuery(codeFilter);

  const filteredRows = useMemo(() => {
    const descQ = deferredDesc.trim().toLowerCase();
    const codeQ = deferredCode.trim().toLowerCase();
    return rows.filter((row) => {
      if (linea !== "todos" && row.linea !== linea) return false;
      if (grupo !== "todos" && row.grupo !== grupo) return false;
      if (estado === "activo" && !row.activo) return false;
      if (estado === "inactivo" && row.activo) return false;
      if (soloStock && row.disponible <= 0) return false;
      if (descQ && !row.descripcion.toLowerCase().includes(descQ)) return false;
      if (
        codeQ &&
        !row.codigo.toLowerCase().includes(codeQ) &&
        !row.marca.toLowerCase().includes(codeQ) &&
        !row.codi.toLowerCase().includes(codeQ)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, linea, grupo, estado, soloStock, deferredDesc, deferredCode]);

  const { tableWrapRefCallback, tableWrapRef, layoutWidths, tableStyle, getColumnStyle, startResize } =
    useResizableTableLayout(ITEM_COLUMNS);

  const currentIndex = Math.max(
    0,
    filteredRows.findIndex((row) => row.id === selectedId),
  );
  const atStart = filteredRows.length === 0 || currentIndex <= 0;
  const atEnd = filteredRows.length === 0 || currentIndex >= filteredRows.length - 1;
  const selected = filteredRows[currentIndex] ?? null;

  const goTo = useCallback(
    (index: number) => {
      if (filteredRows.length === 0) return;
      const clamped = Math.max(0, Math.min(index, filteredRows.length - 1));
      const row = filteredRows[clamped];
      if (!row) return;
      setSelectedId(row.id);
      const wrap = tableWrapRef.current;
      if (wrap) {
        const top = clamped * ROW_HEIGHT;
        const bottom = top + ROW_HEIGHT;
        if (top < wrap.scrollTop) wrap.scrollTop = top;
        else if (bottom > wrap.scrollTop + wrap.clientHeight) {
          wrap.scrollTop = bottom - wrap.clientHeight;
        }
      }
    },
    [filteredRows, tableWrapRef],
  );

  const goFirst = useCallback(() => goTo(0), [goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goLast = useCallback(() => goTo(filteredRows.length - 1), [goTo, filteredRows.length]);

  const firstPress = useRepeatingPress(goFirst, atStart);
  const prevPress = useRepeatingPress(goPrev, atStart);
  const nextPress = useRepeatingPress(goNext, atEnd);
  const lastPress = useRepeatingPress(goLast, atEnd);

  useEffect(() => {
    if (filteredRows.length === 0) return;
    if (!filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  useEffect(() => {
    const node = tableWrapRef.current;
    if (!node) return;
    const sync = () => setViewportH(node.clientHeight || 480);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    return () => ro.disconnect();
  }, [tableWrapRef]);

  const visible = useMemo(() => {
    const total = filteredRows.length;
    if (total === 0) {
      return { start: 0, end: 0, topPad: 0, bottomPad: 0, slice: [] as ItemRow[] };
    }
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(total, start + visibleCount);
    return {
      start,
      end,
      topPad: start * ROW_HEIGHT,
      bottomPad: Math.max(0, (total - end) * ROW_HEIGHT),
      slice: filteredRows.slice(start, end),
    };
  }, [filteredRows, scrollTop, viewportH]);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const next = event.currentTarget.scrollTop;
    startTransition(() => setScrollTop(next));
  }, []);

  const setLineaSafe = useCallback((value: string) => {
    startTransition(() => setLinea(value));
  }, []);
  const setGrupoSafe = useCallback((value: string) => {
    startTransition(() => setGrupo(value));
  }, []);
  const setEstadoSafe = useCallback((value: StatusFilter) => {
    startTransition(() => setEstado(value));
  }, []);

  const cellAlign = (align?: ItemColumnDef["align"]) => {
    if (align === "center") return styles.colCenter;
    if (align === "right") return styles.colNum;
    return styles.colLeft;
  };

  const renderCell = (row: ItemRow, key: ItemColumnDef["key"]) => {
    switch (key) {
      case "codigo":
        return row.codigo;
      case "marca":
        return row.marca;
      case "procedencia":
        return row.procedencia;
      case "descripcion":
        return row.descripcion;
      case "ubicacion":
        return row.ubicacion;
      case "stockFisico":
        return formatQty(row.stockFisico);
      case "reservado":
        return formatQty(row.reservado);
      case "disponible":
        return formatQty(row.disponible);
      case "um":
        return row.um;
      case "origen":
        return row.origen;
      case "imagen":
        return "";
      case "codi":
        return row.codi;
      default:
        return "";
    }
  };

  const colSpan = ITEM_COLUMNS.length;

  return (
    <section className={styles.panel} aria-label="Padrón de Items">
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
        <span className={styles.toolbarSpacer} />
        {selected ? (
          <span className={styles.filterLabel}>
            {selected.descripcion} · {selected.grupo} · S/ {selected.price.toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className={styles.filterStrip}>
        <div className={styles.filterField}>
          <label htmlFor="items-linea">Línea:</label>
          <WinSelect
            id="items-linea"
            compact
            className={styles.filterSelect}
            value={linea}
            options={LINEA_OPTIONS}
            onChange={setLineaSafe}
            aria-label="Línea"
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="items-sublinea">SubLínea:</label>
          <WinSelect
            id="items-sublinea"
            compact
            className={styles.filterSelect}
            value={subLinea}
            options={[{ value: "todos", label: "Todos" }]}
            onChange={() => undefined}
            aria-label="SubLínea"
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="items-grupo">Grupo/Tipo:</label>
          <WinSelect
            id="items-grupo"
            compact
            className={styles.filterSelect}
            value={grupo}
            options={GROUP_OPTIONS}
            onChange={setGrupoSafe}
            aria-label="Grupo o tipo"
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="items-estado">Estado:</label>
          <WinSelect
            id="items-estado"
            compact
            className={styles.filterSelect}
            value={estado}
            options={STATUS_OPTIONS}
            onChange={(next) => setEstadoSafe(next as StatusFilter)}
            aria-label="Estado"
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="items-desc">Descripción:</label>
          <input
            id="items-desc"
            type="text"
            value={descFilter}
            onChange={(e) => setDescFilter(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="items-code">Código/Marca:</label>
          <input
            id="items-code"
            type="text"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
          />
        </div>
        <label className={styles.filterCheck}>
          <input type="checkbox" checked={soloStock} onChange={(e) => setSoloStock(e.target.checked)} />
          Solo con stock
        </label>
      </div>

      <div className={styles.actionStrip}>
        <button type="button" className={styles.actionBtn} disabled title="Próximamente">
          Nuevo
        </button>
        <button type="button" className={styles.actionBtn} disabled={!selected} title="Próximamente">
          Modificar
        </button>
        <button type="button" className={styles.actionBtn} disabled={!selected} title="Próximamente">
          Consulta
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => {
            startTransition(() => {
              setDescFilter("");
              setCodeFilter("");
              setGrupo("todos");
              setEstado("activo");
              setLinea(DEFAULT_LINEA);
              setSoloStock(false);
            });
          }}
        >
          Listar
        </button>
        <button type="button" className={styles.actionBtn} disabled title="Próximamente">
          Cd.barra
        </button>
        <button type="button" className={styles.actionBtn} disabled title="Próximamente">
          Etiquetas
        </button>
      </div>

      <div className={styles.bodyRow}>
        <aside className={styles.sidePanel} aria-label="Módulos de apoyo">
          <p className={styles.sideTitle}>Módulos de apoyo</p>
          {SIDE_SECTIONS.map((section) => (
            <div key={section.title} className={styles.sideSection}>
              <h3>{section.title}</h3>
              {section.links.map((label) => (
                <button key={label} type="button" className={styles.sideLink} disabled title="Próximamente">
                  {label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className={styles.mainTable}>
          <div
            className={styles.tableWrap}
            ref={tableWrapRefCallback}
            onScroll={onScroll}
          >
            <table className={styles.table} style={tableStyle}>
              <colgroup>
                {layoutWidths.map((_, index) => (
                  <col key={ITEM_COLUMNS[index].key} style={getColumnStyle(index)} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {ITEM_COLUMNS.map((col, index) => (
                    <th
                      key={col.key}
                      className={[
                        styles.tableHeadCell,
                        styles.scrollTh,
                        col.align === "left" ? styles.headLeft : styles.colCenter,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={getColumnStyle(index)}
                    >
                      <span className={styles.thLabel}>{col.label}</span>
                      {index < ITEM_COLUMNS.length - 1 ? (
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
                    <td colSpan={colSpan} className={styles.emptyCell}>
                      No hay ítems con esos filtros
                    </td>
                  </tr>
                ) : (
                  <>
                    {visible.topPad > 0 ? (
                      <tr aria-hidden className={styles.virtSpacer}>
                        <td colSpan={colSpan} style={{ height: visible.topPad, padding: 0, border: "none" }} />
                      </tr>
                    ) : null}
                    {visible.slice.map((row, offset) => {
                      const index = visible.start + offset;
                      const selectedRow = row.id === selectedId;
                      return (
                        <tr
                          key={row.id}
                          data-row-id={row.id}
                          className={[
                            index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                            selectedRow ? styles.rowSelected : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setSelectedId(row.id)}
                        >
                          {ITEM_COLUMNS.map((col) => (
                            <td key={col.key} className={cellAlign(col.align)}>
                              {renderCell(row, col.key)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {visible.bottomPad > 0 ? (
                      <tr aria-hidden className={styles.virtSpacer}>
                        <td colSpan={colSpan} style={{ height: visible.bottomPad, padding: 0, border: "none" }} />
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className={styles.statusBar}>
        {filteredRows.length} registro{filteredRows.length === 1 ? "" : "s"}...
      </footer>
    </section>
  );
}
