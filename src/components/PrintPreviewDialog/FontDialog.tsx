import { useEffect, useMemo, useState, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinListBox } from "../WinListBox/WinListBox";
import { WinSelect } from "../WinSelect/WinSelect";
import {
  clampFontSize,
  DEFAULT_FONT_SETTINGS,
  FONT_FAMILIES,
  FONT_SCRIPTS,
  FONT_SIZES,
  getStylesForFamily,
  normalizeFontSettings,
  resolvePreviewFont,
  type FontSettings,
} from "./fontSettings";
import styles from "./PrintPreviewDialog.module.css";

type Props = {
  settings: FontSettings;
  onApply: (settings: FontSettings) => void;
  onClose: () => void;
};

const SAMPLE_TEXT = "AaBbº±²";
const SCRIPT_OPTIONS = FONT_SCRIPTS.map((script) => ({ value: script, label: script }));
const FONT_FAMILY_OPTIONS = FONT_FAMILIES.map((family) => ({ value: family, label: family }));
const FONT_SIZE_OPTIONS = FONT_SIZES.map((size) => ({ value: String(size), label: String(size) }));

export function FontDialog({ settings, onApply, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [draft, setDraft] = useState<FontSettings>(() => normalizeFontSettings(settings));

  useEffect(() => {
    setDraft(normalizeFontSettings(settings));
  }, [settings]);

  const availableStyles = useMemo(() => getStylesForFamily(draft.family), [draft.family]);
  const styleOptions = useMemo(
    () => availableStyles.map((style) => ({ value: style.id, label: style.label })),
    [availableStyles],
  );

  const sampleStyle = useMemo(() => {
    const resolved = resolvePreviewFont(draft);
    return {
      fontFamily: resolved.fontFamily,
      fontSize: `${draft.size}pt`,
      fontWeight: resolved.fontWeight,
      fontStyle: resolved.fontStyle,
      fontStretch: resolved.fontStretch,
      letterSpacing: resolved.letterSpacing,
    };
  }, [draft]);

  const handleFamilyChange = (family: string) => {
    setDraft((current) => normalizeFontSettings({ ...current, family }));
  };

  const handleOk = () => {
    onApply(normalizeFontSettings(draft));
    requestClose();
  };

  const resetDraft = () => setDraft(normalizeFontSettings(settings));

  return (
    <div className={styles.fontOverlay} {...overlayProps} onClick={onBackdropClick}>
      <div
        ref={panelRef}
        className={styles.fontDialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="font-dialog-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="font-dialog-title" className={styles.titleText}>
            Fuente
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.fontBody}>
          <div className={styles.fontMainRow}>
            <div className={styles.fontLists}>
              <div className={styles.fontListCol}>
                <span className={styles.fontListLabel}>Fuente:</span>
                <WinListBox
                  value={draft.family}
                  options={FONT_FAMILY_OPTIONS}
                  onChange={handleFamilyChange}
                  aria-label="Fuente"
                />
              </div>

              <div className={styles.fontListCol}>
                <span className={styles.fontListLabel}>Estilo de fuente:</span>
                <WinListBox
                  value={draft.style}
                  options={styleOptions}
                  onChange={(style) =>
                    setDraft((current) => ({
                      ...current,
                      style: style as FontSettings["style"],
                    }))
                  }
                  aria-label="Estilo de fuente"
                />
              </div>

              <div className={styles.fontListCol}>
                <span className={styles.fontListLabel}>Tamaño:</span>
                <WinListBox
                  value={String(draft.size)}
                  options={FONT_SIZE_OPTIONS}
                  onChange={(size) =>
                    setDraft((current) => ({
                      ...current,
                      size: clampFontSize(Number(size) || DEFAULT_FONT_SETTINGS.size),
                    }))
                  }
                  aria-label="Tamaño"
                />
              </div>
            </div>

            <div className={styles.fontSideActions}>
              <button type="button" className={styles.fontBtnPrimary} onClick={handleOk}>
                Aceptar
              </button>
              <button
                type="button"
                className={styles.fontBtn}
                onClick={() => {
                  resetDraft();
                  requestClose();
                }}
              >
                Cancelar
              </button>
              <button type="button" className={styles.fontBtn} onClick={requestClose}>
                Ayuda
              </button>
            </div>
          </div>

          <div className={styles.fontSampleRow}>
            <span className={styles.fontSampleLabel}>Ejemplo:</span>
            <div className={styles.fontSampleBox} style={sampleStyle}>
              {SAMPLE_TEXT}
            </div>
          </div>

          <div className={styles.fontScriptRow}>
            <label htmlFor="font-script">Alfabeto:</label>
            <WinSelect
              id="font-script"
              className={styles.fontScriptSelect}
              value={draft.script}
              options={SCRIPT_OPTIONS}
              onChange={(next) => setDraft((d) => ({ ...d, script: next }))}
              aria-label="Alfabeto"
            />
          </div>

          <p className={styles.fontFootnote}>
            Esta es una fuente de pantalla. Se usará la fuente de impresora que más se le parezca para
            imprimir.
          </p>
        </div>
      </div>
    </div>
  );
}
