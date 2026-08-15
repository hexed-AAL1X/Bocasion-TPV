import {useMemo, useState, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import styles from "./PrintPreviewDialog.module.css";

export type PaperSize = "carta" | "oficio" | "a4";
export type PageOrientation = "portrait" | "landscape";

export type PageMargins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type PageSetupSettings = {
  paperSize: PaperSize;
  orientation: PageOrientation;
  margins: PageMargins;
  pageWidthPx: number;
};

type Props = {
  settings: PageSetupSettings;
  onApply: (settings: PageSetupSettings) => void;
  onClose: () => void;
};

const PAPER_SOURCE_OPTIONS = [{ value: "auto", label: "Automática" }];

const PAPER_OPTIONS: { value: PaperSize; label: string }[] = [
  { value: "carta", label: "Carta" },
  { value: "oficio", label: "Oficio" },
  { value: "a4", label: "A4" },
];

function paperToWidth(paper: PaperSize, orientation: PageOrientation): number {
  const base: Record<PaperSize, number> = { carta: 400, oficio: 420, a4: 380 };
  const w = base[paper];
  return orientation === "landscape" ? Math.min(560, w + 100) : w;
}

function clampMargin(value: number): number {
  return Math.max(0, Math.min(80, Math.round(value) || 0));
}

export function PageSetupDialog({ settings, onApply, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [paperSize, setPaperSize] = useState(settings.paperSize);
  const [orientation, setOrientation] = useState(settings.orientation);
  const [margins, setMargins] = useState(settings.margins);

  const pageWidthPx = useMemo(
    () => paperToWidth(paperSize, orientation),
    [paperSize, orientation],
  );

  const marginPreview = useMemo(() => {
    const max = Math.max(margins.left, margins.right, margins.top, margins.bottom, 1);
    const scale = 28 / max;
    return {
      left: margins.left * scale,
      right: margins.right * scale,
      top: margins.top * scale,
      bottom: margins.bottom * scale,
    };
  }, [margins]);

  const setMargin = (key: keyof PageMargins, raw: string) => {
    setMargins((m) => ({ ...m, [key]: clampMargin(Number(raw)) }));
  };

  const handleOk = () => {
    onApply({ paperSize, orientation, margins, pageWidthPx });
    requestClose();
  };

  return (
    <div className={styles.pageSetupOverlay} {...overlayProps} onClick={onBackdropClick}>
      <div
          ref={panelRef}
        className={styles.pageSetupDialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="page-setup-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="page-setup-title" className={styles.titleText}>
            Configurar página
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.pageSetupBody}>
          <div className={styles.pageSetupPreviewWrap}>
            <div
              className={[
                styles.pageSetupPreviewPage,
                orientation === "landscape" ? styles.pageSetupPreviewLandscape : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={styles.pageSetupPreviewContent}
                style={{
                  left: marginPreview.left,
                  right: marginPreview.right,
                  top: marginPreview.top,
                  bottom: marginPreview.bottom,
                }}
              >
                <span>Texto de ejemplo para la vista preliminar del reporte.</span>
              </div>
            </div>
          </div>

          <div className={styles.pageSetupOptionsGrid}>
            <fieldset className={styles.pageSetupGroup}>
              <legend className={styles.pageSetupLegend}>Papel</legend>
              <div className={styles.pageSetupFieldRow}>
                <label htmlFor="page-paper-size">Tamaño:</label>
                <WinSelect
                  id="page-paper-size"
                  className={styles.pageSetupSelect}
                  value={paperSize}
                  options={PAPER_OPTIONS}
                  onChange={(next) => setPaperSize(next as PaperSize)}
                  aria-label="Tamaño de papel"
                />
              </div>
              <div className={styles.pageSetupFieldRow}>
                <label htmlFor="page-paper-source">Origen:</label>
                <WinSelect
                  id="page-paper-source"
                  className={styles.pageSetupSelect}
                  value="auto"
                  options={PAPER_SOURCE_OPTIONS}
                  onChange={() => {}}
                  disabled
                  aria-label="Origen del papel"
                />
              </div>
            </fieldset>

            <fieldset className={styles.pageSetupGroup}>
              <legend className={styles.pageSetupLegend}>Orientación</legend>
              <label className={styles.pageSetupRadio}>
                <input
                  type="radio"
                  name="page-orientation"
                  checked={orientation === "portrait"}
                  onChange={() => setOrientation("portrait")}
                />
                <span>Vertical</span>
              </label>
              <label className={styles.pageSetupRadio}>
                <input
                  type="radio"
                  name="page-orientation"
                  checked={orientation === "landscape"}
                  onChange={() => setOrientation("landscape")}
                />
                <span>Horizontal</span>
              </label>
            </fieldset>
          </div>

          <fieldset className={styles.pageSetupGroup}>
            <legend className={styles.pageSetupLegend}>Márgenes (milímetros)</legend>
            <div className={styles.pageSetupMarginsGrid}>
              <div className={styles.pageSetupMarginField}>
                <label htmlFor="margin-left">Izquierdo:</label>
                <input
                  id="margin-left"
                  className={styles.pageSetupSpin}
                  type="number"
                  min={0}
                  max={80}
                  value={margins.left}
                  onChange={(e) => setMargin("left", e.target.value)}
                />
              </div>
              <div className={styles.pageSetupMarginField}>
                <label htmlFor="margin-right">Derecho:</label>
                <input
                  id="margin-right"
                  className={styles.pageSetupSpin}
                  type="number"
                  min={0}
                  max={80}
                  value={margins.right}
                  onChange={(e) => setMargin("right", e.target.value)}
                />
              </div>
              <div className={styles.pageSetupMarginField}>
                <label htmlFor="margin-top">Superior:</label>
                <input
                  id="margin-top"
                  className={styles.pageSetupSpin}
                  type="number"
                  min={0}
                  max={80}
                  value={margins.top}
                  onChange={(e) => setMargin("top", e.target.value)}
                />
              </div>
              <div className={styles.pageSetupMarginField}>
                <label htmlFor="margin-bottom">Inferior:</label>
                <input
                  id="margin-bottom"
                  className={styles.pageSetupSpin}
                  type="number"
                  min={0}
                  max={80}
                  value={margins.bottom}
                  onChange={(e) => setMargin("bottom", e.target.value)}
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className={styles.pageSetupActions}>
          <button type="button" className={styles.pageSetupBtnPrimary} onClick={handleOk}>
            Aceptar
          </button>
          <button type="button" className={styles.pageSetupBtn} onClick={requestClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
