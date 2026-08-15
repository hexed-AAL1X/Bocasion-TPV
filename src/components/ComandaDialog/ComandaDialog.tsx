import { useCallback, useMemo, useRef, useState } from "react";
import { activeCarriers, type CarrierRecord } from "../../data/carriers";
import { PAYMENT_CONDITIONS, paymentConditionByCode } from "../../data/paymentConditions";
import { WAREHOUSES } from "../../data/warehouses";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import styles from "./ComandaDialog.module.css";

type Props = {
  carriers?: CarrierRecord[];
  onClose: () => void;
};

type DocRef = "F" | "B" | "P" | "N";

type ComandaLine = {
  id: string;
  codigo: string;
  marca: string;
  descripcion: string;
  cantidad: number;
  um: string;
  pUnitario: number;
  dsctoPct: number;
  vVenta: number;
  tVenta: number;
};

const GLOSA_OPTIONS = [{ code: "01", label: "VENTA DE PRODUCTOS" }];

const MONEDA_OPTIONS = [
  { value: "Soles", label: "Soles" },
  { value: "Dólares", label: "Dólares" },
];

const VENDEDORES = ["V0034", "V0035", "V0036"];
const VENDEDOR_OPTIONS = VENDEDORES.map((v) => ({ value: v, label: v }));

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function emptyLine(): ComandaLine {
  return {
    id: crypto.randomUUID(),
    codigo: "",
    marca: "",
    descripcion: "ESCRIBA DETALLE",
    cantidad: 0,
    um: "",
    pUnitario: 0,
    dsctoPct: 0,
    vVenta: 0,
    tVenta: 0,
  };
}

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

export function ComandaDialog({ carriers: carriersProp, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });

  const carriers = carriersProp ?? activeCarriers();

  const [numGuia] = useState("034-00016906");
  const [almacen, setAlmacen] = useState("01");
  const [fecha] = useState(() => formatDate(new Date(2026, 5, 18)));
  const [docRef, setDocRef] = useState<DocRef>("F");
  const [moneda, setMoneda] = useState("Soles");
  const [tipoCambio, setTipoCambio] = useState("3.384");
  const [cliente, setCliente] = useState("GOMEZ SANCHEZ RAMIREZ RUBEN");
  const [ruc, setRuc] = useState("");
  const [dni, setDni] = useState("10662001");
  const [vendedor, setVendedor] = useState("V0034");
  const [glosaCod, setGlosaCod] = useState("01");
  const [glosa, setGlosa] = useState("VENTA DE PRODUCTOS");
  const [condicionCod, setCondicionCod] = useState("02");
  const [condicion, setCondicion] = useState("CONTRAENTREGA");
  const [venceDias, setVenceDias] = useState("0");
  const [transporteCod, setTransporteCod] = useState("T0001");
  const [transporte, setTransporte] = useState("BOCASION SAC");
  const [subCCosto, setSubCCosto] = useState("");
  const [lines, setLines] = useState<ComandaLine[]>(() => [emptyLine()]);

  const almacenOptions = useMemo(
    () => WAREHOUSES.filter((w) => w.activo).map((w) => ({ value: w.codigo, label: w.codigo })),
    [],
  );

  const glosaSelectOptions = useMemo(
    () => GLOSA_OPTIONS.map((g) => ({ value: g.code, label: g.code })),
    [],
  );

  const condicionSelectOptions = useMemo(
    () => PAYMENT_CONDITIONS.map((c) => ({ value: c.code, label: c.code })),
    [],
  );

  const transporteSelectOptions = useMemo(
    () => carriers.map((c) => ({ value: c.codigo, label: c.codigo })),
    [carriers],
  );

  const totals = useMemo(() => {
    const afecto = lines.reduce((s, l) => s + l.vVenta, 0);
    const igv = afecto * 0.18;
    const icbper = 0;
    const total = afecto + igv + icbper;
    return { afecto, igv, icbper, total };
  }, [lines]);

  const handleCondicionChange = (code: string) => {
    setCondicionCod(code);
    const found = paymentConditionByCode(code);
    setCondicion(found?.label ?? "");
  };

  const handleTransporteChange = (code: string) => {
    setTransporteCod(code);
    const found = carriers.find((c) => c.codigo === code);
    setTransporte(found?.razonSocial ?? "");
  };

  const handleGlosaChange = (code: string) => {
    setGlosaCod(code);
    const found = GLOSA_OPTIONS.find((g) => g.code === code);
    setGlosa(found?.label ?? "");
  };

  const toggleMaximized = useCallback(() => {
    toggleWithWindowAnimation(windowRef.current, () => setMaximized((m) => !m));
  }, []);

  const handleAddLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const handleRemoveLine = () => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)));
  };

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
        aria-labelledby="comanda-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="comanda-title" className={styles.titleText}>
            Comanda
          </h1>
          <div className={styles.titleBtns}>
            <button type="button" className={styles.titleSysBtn} onClick={toggleMaximized} aria-label={maximized ? "Restaurar" : "Maximizar"}>
              <TitleMaximizeIcon restore={maximized} />
            </button>
            <button type="button" className={`${styles.titleSysBtn} ${styles.titleClose}`} onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </header>

        <div className={styles.header}>
          <div className={styles.col}>
            <div className={styles.row}>
              <span className={styles.label}>Nº Guía</span>
              <input className={styles.input} value={numGuia} readOnly aria-label="Número de guía" />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Almacén</span>
              <WinSelect
                className={styles.select}
                value={almacen}
                options={almacenOptions}
                onChange={setAlmacen}
                aria-label="Almacén"
              />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Fecha</span>
              <input className={styles.input} value={fecha} readOnly aria-label="Fecha" />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Doc.Refere.</span>
              <div className={styles.docRefGroup} role="group" aria-label="Documento de referencia">
                {(["F", "B", "P", "N"] as DocRef[]).map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    className={`${styles.docRefBtn} ${docRef === ref ? styles.docRefBtnActive : ""}`}
                    onClick={() => setDocRef(ref)}
                    aria-pressed={docRef === ref}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Moneda</span>
              <WinSelect
                className={styles.select}
                value={moneda}
                options={MONEDA_OPTIONS}
                onChange={setMoneda}
                aria-label="Moneda"
              />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>T/Cambio</span>
              <input className={styles.input} value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} aria-label="Tipo de cambio" />
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.rowWide}>
              <span className={styles.label}>Cliente</span>
              <input className={styles.input} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente" />
              <button type="button" className={styles.variosBtn}>Varios</button>
            </div>
            <div className={styles.rowSplit}>
              <span className={styles.label}>Ruc</span>
              <input className={styles.inputShort} value={ruc} onChange={(e) => setRuc(e.target.value)} aria-label="RUC" />
              <span className={styles.inlineLabel}>DNI</span>
              <input className={styles.inputShort} value={dni} onChange={(e) => setDni(e.target.value)} aria-label="DNI" />
              <span />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Vendedor</span>
              <WinSelect
                className={styles.select}
                value={vendedor}
                options={VENDEDOR_OPTIONS}
                onChange={setVendedor}
                aria-label="Vendedor"
              />
            </div>
            <div className={styles.rowSplit}>
              <span className={styles.label}>Glosa</span>
              <WinSelect
                className={styles.inputShort}
                value={glosaCod}
                options={glosaSelectOptions}
                onChange={handleGlosaChange}
                aria-label="Código glosa"
              />
              <input className={styles.input} value={glosa} onChange={(e) => setGlosa(e.target.value)} aria-label="Glosa" />
            </div>
            <div className={styles.rowCond}>
              <span className={styles.label}>Condición</span>
              <div className={styles.codeLabelGroup}>
                <WinSelect
                  className={styles.inputShort}
                  value={condicionCod}
                  options={condicionSelectOptions}
                  onChange={handleCondicionChange}
                  aria-label="Código condición"
                />
                <input className={styles.input} value={condicion} readOnly aria-label="Condición" />
              </div>
              <span className={styles.inlineLabel}>Vence</span>
              <input className={styles.inputTiny} value={venceDias} onChange={(e) => setVenceDias(e.target.value)} aria-label="Días vencimiento" />
              <span className={styles.inlineLabel}>dias</span>
            </div>
            <div className={styles.rowSplit}>
              <span className={styles.label}>Transporte</span>
              <WinSelect
                className={styles.inputShort}
                value={transporteCod}
                options={transporteSelectOptions}
                onChange={handleTransporteChange}
                aria-label="Código transporte"
              />
              <input className={styles.input} value={transporte} readOnly aria-label="Transportista" />
              <span className={styles.inlineLabel}>Sub.C.Costo</span>
              <input className={styles.inputShort} value={subCCosto} onChange={(e) => setSubCCosto(e.target.value)} aria-label="Sub centro de costo" />
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} onClick={handleAddLine}>
            Registrar detalle
          </button>
          <button type="button" className={styles.toolBtn}>BOLSA</button>
          <span className={styles.toolSpacer} />
          <button type="button" className={styles.toolBtnDanger} onClick={handleRemoveLine}>
            Eliminar
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeadCell} style={{ width: 28 }}>#</th>
                <th className={styles.tableHeadCell} style={{ width: 72 }}>Código</th>
                <th className={styles.tableHeadCell} style={{ width: 56 }}>Marca</th>
                <th className={styles.tableHeadCell}>Descripción</th>
                <th className={styles.tableHeadCell} style={{ width: 64 }}>Cantidad</th>
                <th className={styles.tableHeadCell} style={{ width: 40 }}>U.M</th>
                <th className={styles.tableHeadCell} style={{ width: 72 }}>P.Unitario</th>
                <th className={styles.tableHeadCell} style={{ width: 56 }}>Dscto %</th>
                <th className={styles.tableHeadCell} style={{ width: 72 }}>V.Venta</th>
                <th className={styles.tableHeadCell} style={{ width: 72 }}>T.Venta</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td className={styles.rowNum}>{index + 1}</td>
                  <td>{line.codigo}</td>
                  <td>{line.marca}</td>
                  <td className={line.descripcion === "ESCRIBA DETALLE" ? styles.cellDesc : undefined}>
                    {line.descripcion}
                  </td>
                  <td className={styles.cellRed}>{line.cantidad.toFixed(2)}</td>
                  <td className={styles.cellCenter}>{line.um}</td>
                  <td className={styles.cellRed}>{line.pUnitario.toFixed(2)}</td>
                  <td className={styles.cellRed}>{line.dsctoPct.toFixed(2)}%</td>
                  <td className={styles.cellRed}>{line.vVenta.toFixed(4)}</td>
                  <td className={styles.cellRed}>{line.tVenta.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <div className={styles.totalsBlock}>
            <span className={styles.totalsLabel}>Totales</span>
            <div className={styles.totalsGrid}>
              <span>Afecto</span>
              <input className={styles.input} value={totals.afecto.toFixed(2)} readOnly aria-label="Afecto" />
              <span>IGV</span>
              <input className={styles.input} value={totals.igv.toFixed(2)} readOnly aria-label="IGV" />
              <span>ICBPER</span>
              <input className={styles.input} value={totals.icbper ? totals.icbper.toFixed(2) : ""} readOnly aria-label="ICBPER" />
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>TOTAL:</span>
              <input className={styles.totalValue} value={totals.total.toFixed(2)} readOnly aria-label="Total" />
            </div>
          </div>
          <div className={styles.footerActions}>
            <button type="button" className={styles.footerBtn} onClick={requestClose}>
              Cancelar
            </button>
            <button type="button" className={`${styles.footerBtn} ${styles.footerBtnPrimary}`}>
              Guardar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
