import {useMemo, useState, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { fontPropertiesLabel, type FontSettings } from "./fontSettings";
import styles from "./PrintPreviewDialog.module.css";

type IndentMode = "spaces" | "tabs";

const ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];

type Props = {
  lineCount: number;
  plainTextLength: number;
  saleDate: string;
  openedAtLabel: string;
  fontSettings: FontSettings;
  showWhitespace: boolean;
  onApply: (showWhitespace: boolean) => void;
  onOpenFont: () => void;
  onClose: () => void;
};

function lastSavedFromLabel(openedAtLabel: string): string {
  const match = openedAtLabel.match(/\(([^)]+)\)\s*$/);
  return match?.[1] ?? openedAtLabel;
}

function PropsCheck({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={[styles.propsCheck, disabled ? styles.propsCheckDisabled : ""].filter(Boolean).join(" ")}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function EditPropertiesDialog({
  lineCount,
  plainTextLength,
  saleDate,
  openedAtLabel,
  fontSettings,
  showWhitespace,
  onApply,
  onOpenFont,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [draftWhitespace, setDraftWhitespace] = useState(showWhitespace);
  const [syntaxColoring] = useState(true);
  const [showLineColumn, setShowLineColumn] = useState(false);
  const [embeddedHyperlinks] = useState(true);
  const [compileBeforeSaving, setCompileBeforeSaving] = useState(false);
  const [tabSize, setTabSize] = useState(4);
  const [indentSize, setIndentSize] = useState(4);
  const [indentMode, setIndentMode] = useState<IndentMode>("tabs");

  const fileName = useMemo(
    () => `c:\\bocasoft\\admin\\rpt${saleDate.replace(/\//g, "")}.txt`,
    [saleDate],
  );
  const fileSize = `${plainTextLength} bytes (${lineCount} líneas)`;
  const lastSaved = lastSavedFromLabel(openedAtLabel);
  const fontLabel = fontPropertiesLabel(fontSettings);

  const handleOk = () => {
    onApply(draftWhitespace);
    requestClose();
  };

  return (
    <div className={styles.propsOverlay} {...overlayProps} onClick={onBackdropClick}>
      <div
          ref={panelRef}
        className={styles.propsDialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-properties-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="edit-properties-title" className={styles.titleText}>
            Propiedades de edición
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.propsBody}>
          <div className={styles.propsTopGrid}>
            <fieldset className={styles.propsGroup}>
              <legend className={styles.propsLegend}>Comportamiento</legend>
              <PropsCheck id="prop-drag" label="Edición arrastrar y soltar" checked disabled />
              <PropsCheck id="prop-wrap" label="Ajuste de línea" checked={false} disabled />
              <PropsCheck id="prop-indent" label="Sangría automática" checked disabled />
              <PropsCheck id="prop-links" label="Hipervínculos incrustados" checked={embeddedHyperlinks} disabled />
            </fieldset>

            <fieldset className={styles.propsGroup}>
              <legend className={styles.propsLegend}>Apariencia</legend>
              <div className={styles.propsFieldRow}>
                <label htmlFor="prop-align">Alineación:</label>
                <WinSelect
                  id="prop-align"
                  className={styles.propsSelect}
                  value="left"
                  options={ALIGN_OPTIONS}
                  onChange={() => {}}
                  disabled
                  aria-label="Alineación"
                />
              </div>
              <div className={styles.propsFieldRow}>
                <label htmlFor="prop-font">Fuente:</label>
                <div className={styles.propsFontRow}>
                  <input
                    id="prop-font"
                    className={styles.propsFontInput}
                    type="text"
                    value={fontLabel}
                    readOnly
                  />
                  <button type="button" className={styles.propsEllipsisBtn} onClick={onOpenFont} title="Fuente…">
                    …
                  </button>
                </div>
              </div>
              <PropsCheck
                id="prop-linecol"
                label="Mostrar posición línea/columna"
                checked={showLineColumn}
                onChange={setShowLineColumn}
              />
              <PropsCheck id="prop-syntax" label="Coloración sintáctica" checked={syntaxColoring} disabled />
              <PropsCheck
                id="prop-whitespace"
                label="Mostrar espacios en blanco"
                checked={draftWhitespace}
                onChange={setDraftWhitespace}
              />
              <PropsCheck id="prop-prefs" label="Guardar preferencias" checked disabled />
              <PropsCheck id="prop-txt" label="Aplicar a archivos .TXT" checked={false} disabled />
            </fieldset>
          </div>

          <div className={styles.propsMidGrid}>
            <fieldset className={styles.propsGroup}>
              <legend className={styles.propsLegend}>Opciones de guardado</legend>
              <PropsCheck id="prop-backup" label="Crear copia de seguridad" checked disabled />
              <PropsCheck id="prop-lf" label="Guardar con saltos de línea" checked disabled />
              <PropsCheck id="prop-eof" label="Guardar con marcador fin de archivo" checked={false} disabled />
              <PropsCheck
                id="prop-compile"
                label="Compilar antes de guardar"
                checked={compileBeforeSaving}
                onChange={setCompileBeforeSaving}
              />
            </fieldset>

            <fieldset className={styles.propsGroup}>
              <legend className={styles.propsLegend}>Sangría</legend>
              <div className={styles.propsIndentBody}>
                <div className={styles.propsIndentFields}>
                  <div className={styles.propsIndentField}>
                    <label htmlFor="prop-tab">Tamaño de tabulación:</label>
                    <input
                      id="prop-tab"
                      className={styles.propsSpin}
                      type="number"
                      min={1}
                      max={8}
                      value={tabSize}
                      onChange={(e) => setTabSize(Math.max(1, Math.min(8, Number(e.target.value) || 4)))}
                    />
                  </div>
                  <div className={styles.propsIndentField}>
                    <label htmlFor="prop-indent-size">Tamaño de sangría:</label>
                    <input
                      id="prop-indent-size"
                      className={styles.propsSpin}
                      type="number"
                      min={1}
                      max={8}
                      value={indentSize}
                      onChange={(e) =>
                        setIndentSize(Math.max(1, Math.min(8, Number(e.target.value) || 4)))
                      }
                    />
                  </div>
                </div>
                <div className={styles.propsRadioCol}>
                  <label className={styles.propsRadio}>
                    <input
                      type="radio"
                      name="indent-mode"
                      checked={indentMode === "spaces"}
                      onChange={() => setIndentMode("spaces")}
                    />
                    <span>Insertar espacios</span>
                  </label>
                  <label className={styles.propsRadio}>
                    <input
                      type="radio"
                      name="indent-mode"
                      checked={indentMode === "tabs"}
                      onChange={() => setIndentMode("tabs")}
                    />
                    <span>Mantener tabulaciones</span>
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          <fieldset className={styles.propsGroup}>
            <legend className={styles.propsLegend}>Información del archivo</legend>
            <div className={styles.propsFileRow}>
              <span className={styles.propsFileLabel}>Nombre de archivo:</span>
              <input
                className={styles.propsFilePath}
                type="text"
                value={fileName}
                readOnly
                aria-label="Nombre de archivo"
              />
            </div>
            <div className={styles.propsFileRow}>
              <span className={styles.propsFileLabel}>Tamaño:</span>
              <span className={styles.propsFileValue}>{fileSize}</span>
            </div>
            <div className={styles.propsFileRow}>
              <span className={styles.propsFileLabel}>Último guardado:</span>
              <span className={styles.propsFileValue}>{lastSaved}</span>
            </div>
          </fieldset>
        </div>

        <div className={styles.propsActions}>
          <button type="button" className={styles.propsBtnPrimary} onClick={handleOk}>
            Aceptar
          </button>
          <button type="button" className={styles.propsBtn} onClick={requestClose}>
            Cancelar
          </button>
          <button type="button" className={styles.propsBtn} onClick={requestClose}>
            Ayuda
          </button>
        </div>
      </div>
    </div>
  );
}
