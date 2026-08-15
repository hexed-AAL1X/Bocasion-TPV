import { useCallback, useEffect, useState } from "react";
import { listNavaDocs, navaDocKindLabel, type NavaDocKind, type NavaDocRow } from "../../services/navaDocs";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "../DocumentosDialog/DocumentosDialog.module.css";

type Props = {
  kind: Exclude<NavaDocKind, "all">;
  onClose: () => void;
};

function fmtMoney(n: number): string {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function NavaDocsDialog({ kind, onClose }: Props) {
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose);
  const [rows, setRows] = useState<NavaDocRow[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    void listNavaDocs(kind)
      .then((data) => setRows(data))
      .catch(() => {
        setError(
          "Sin conexión al SQL de Nava. Enciende el PC Windows (WIN-C6EKJGJR3FH / Tailscale) y pulsa Actualizar.",
        );
      });
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const title = navaDocKindLabel(kind);

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        className={styles.window}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="nava-docs-title"
        aria-modal="true"
        style={{ width: "min(980px, calc(100vw - 24px))", height: "min(560px, calc(100vh - 24px))" }}
      >
        <header className={styles.titleBar}>
          <h1 id="nava-docs-title" className={styles.titleText}>
            {title} — Bdnava02
          </h1>
          <div className={styles.titleBtns}>
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
          <button type="button" className={styles.searchActionBtn} onClick={load}>
            Actualizar
          </button>
          <span className={styles.filterLabel}>
            {kind === "01" ? "cdocu = 01 FACTURA" : "cdocu = 03 BOLETA VTA"} · últimos 150
            {error ? ` · ${error}` : ""}
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th className={styles.tableHeadCell}>Fecha</th>
                  <th className={styles.tableHeadCell}>Número</th>
                  <th className={`${styles.tableHeadCell} ${styles.headLeft}`}>Cliente</th>
                  <th className={styles.tableHeadCell}>RUC/DNI</th>
                  <th className={styles.tableHeadCell}>Total</th>
                  <th className={styles.tableHeadCell}>Vendedor</th>
                  <th className={`${styles.tableHeadCell} ${styles.headLeft}`}>SUNAT</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      No hay documentos
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.cdocu}-${row.ndocu}-${row.fecha}`}>
                      <td className={styles.colCenter}>{row.fecha.slice(0, 10)}</td>
                      <td className={styles.colCenter}>{row.ndocu}</td>
                      <td className={styles.colLeft}>{row.nomcli}</td>
                      <td className={styles.colCenter}>{row.ruccli}</td>
                      <td className={styles.colCenter}>{fmtMoney(row.totn)}</td>
                      <td className={styles.colCenter}>{row.codven}</td>
                      <td className={styles.colLeft}>{row.efactinfo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>

        <div className={styles.statusBar}>
          {`${rows.length} registros`}
        </div>
      </div>
    </div>
  );
}
