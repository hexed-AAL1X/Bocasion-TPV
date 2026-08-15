import {useEffect, useState, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { isElectronExportReady } from "../../utils/electronExport";
import { defaultExportBaseName, ensureTrailingSep, type ExportContext } from "../../utils/exportFileHelpers";
import { getPathSeparator, resolveDefaultExportFolder } from "../../utils/exportPaths";
import { EXPORT_FILE_CONFIG, type ExportFileKind } from "./exportFileConfig";
import type { SelectedExportField } from "../../utils/exportFieldCatalogs";
import styles from "./ExportFileDialog.module.css";

export type ExportFileOptions = {
  fileName: string;
  saveDirectory: string;
  viewAfter: boolean;
  browserDirectoryHandle?: FileSystemDirectoryHandle | null;
  hideGridlines?: boolean;
  exportFields?: SelectedExportField[];
};

type Props = {
  kind: ExportFileKind;
  saleDate: string;
  exportContext?: ExportContext;
  onExport: (options: ExportFileOptions) => Promise<string | null>;
  onExportEmail?: (savedPath: string | null) => void;
  onClose: () => void;
};

export function ExportFileDialog({
  kind,
  saleDate,
  exportContext = "sales-report",
  onExport,
  onExportEmail,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const config = EXPORT_FILE_CONFIG[kind];
  const { Icon } = config;
  const defaultName = defaultExportBaseName(saleDate, kind, exportContext);
  const [fileName, setFileName] = useState(defaultName);
  const [saveDirectory, setSaveDirectory] = useState("");
  const [pathReady, setPathReady] = useState(false);
  const [viewAfter, setViewAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [pickerHidden, setPickerHidden] = useState(false);
  const [electronReady, setElectronReady] = useState(false);
  const saveDirectoryDisplay = pathReady
    ? ensureTrailingSep(saveDirectory)
    : "Preparando carpeta…";

  const loadResolvedDirectory = async (directory: string) => {
    const api = window.bocasoft;
    if (api?.resolveExportDirectory) {
      return api.resolveExportDirectory(directory, kind);
    }
    if (api?.getDefaultExportDirectory) {
      return api.getDefaultExportDirectory(kind);
    }
    return directory;
  };

  useEffect(() => {
    setElectronReady(isElectronExportReady());
  }, []);

  useEffect(() => {
    setFileName(defaultExportBaseName(saleDate, kind, exportContext));
  }, [exportContext, kind, saleDate]);

  useEffect(() => {
    const fallback = resolveDefaultExportFolder(kind);
    setPathReady(false);
    void loadResolvedDirectory(fallback)
      .then((dir) => {
        setSaveDirectory(dir || fallback);
      })
      .catch(() => {
        setSaveDirectory(fallback);
      })
      .finally(() => {
        setPathReady(true);
      });
  }, [kind]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy || browsing) return;
      requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, browsing, requestClose]);

  const pickDirectoryWithTimeout = async (defaultPath: string) => {
    const api = window.bocasoft;
    if (!api?.pickExportDirectory) return null;

    const timeoutMs = 32_000;
    let timer: number | undefined;
    try {
      return await Promise.race([
        api.pickExportDirectory(defaultPath),
        new Promise<null>((_, reject) => {
          timer = window.setTimeout(
            () => reject(new Error("El selector de carpetas no respondió. Intente de nuevo.")),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer !== undefined) window.clearTimeout(timer);
    }
  };

  const handleBrowse = async () => {
    if (browsing || busy || !pathReady) return;
    setBrowsing(true);
    setPickerHidden(true);
    try {
      const api = window.bocasoft;
      if (api?.pickExportDirectory) {
        const picked = await pickDirectoryWithTimeout(saveDirectory);
        if (picked) {
          const resolved = await loadResolvedDirectory(picked);
          setSaveDirectory(resolved);
        }
        return;
      }

      if ("showDirectoryPicker" in window) {
        try {
          const handle = await (
            window as Window & {
              showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
            }
          ).showDirectoryPicker();
          setSaveDirectory(`${handle.name}${getPathSeparator()}`);
        } catch {
          /* cancelado */
        }
        return;
      }

      window.alert("El selector de carpetas no está disponible en este entorno.");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      window.alert(
        detail
          ? `No se pudo abrir el selector de carpetas.\n\n${detail}`
          : "No se pudo abrir el selector de carpetas.",
      );
    } finally {
      setPickerHidden(false);
      setBrowsing(false);
    }
  };

  const buildExportOptions = async (view: boolean): Promise<ExportFileOptions> => {
    const directory = await loadResolvedDirectory(saveDirectory);
    return {
      fileName: fileName.trim() || defaultName,
      saveDirectory: directory,
      viewAfter: view,
      browserDirectoryHandle: null,
    };
  };

  const openSavedFile = (savedPath: string) => {
    if (kind === "dbf") return;
    window.setTimeout(() => {
      void window.bocasoft?.openExportFile?.(savedPath)?.catch(() => undefined);
    }, 200);
  };

  const handleExport = async () => {
    if (!electronReady) {
      window.alert(
        "La exportación a carpeta solo funciona en la ventana de escritorio Electron.\n\n" +
          "No use el navegador (localhost:5173). Use la ventana «Intranet Ventas» que se abre con npm run dev.",
      );
      return;
    }

    const shouldViewAfter = viewAfter;
    setBusy(true);
    try {
      const options = await buildExportOptions(false);
      setSaveDirectory(options.saveDirectory);
      const savedPath = await onExport(options);
      setBusy(false);
      requestClose();
      if (savedPath) {
        void window.bocasoft?.showExportInFolder?.(savedPath);
        if (shouldViewAfter) {
          openSavedFile(savedPath);
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      window.alert(
        detail
          ? `No se pudo exportar el archivo.\n\n${detail}`
          : "No se pudo exportar el archivo. Verifique la carpeta de destino.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleExportEmail = async () => {
    if (!electronReady) {
      window.alert(
        "La exportación a carpeta solo funciona en la ventana de escritorio Electron.\n\n" +
          "No use el navegador (localhost:5173). Use la ventana «Intranet Ventas» que se abre con npm run dev.",
      );
      return;
    }

    setBusy(true);
    try {
      const options = await buildExportOptions(false);
      setSaveDirectory(options.saveDirectory);
      const savedPath = await onExport(options);
      setBusy(false);
      onExportEmail?.(savedPath);
      requestClose();
      if (savedPath) {
        void window.bocasoft?.showExportInFolder?.(savedPath);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      window.alert(
        detail
          ? `No se pudo exportar el archivo para enviar por correo.\n\n${detail}`
          : "No se pudo exportar el archivo para enviar por correo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const exportDisabled = busy || !pathReady || !saveDirectory.trim() || !electronReady;
  const exportNowLabel = busy
    ? kind === "pdf"
      ? "Generando PDF…"
      : kind === "jpg" || kind === "png"
        ? "Generando imagen…"
        : "Exportando…"
    : "Exportar ahora";

  return (
    <div
      className={`${styles.overlay} ${pickerHidden ? styles.overlayHidden : ""}`}
      {...overlayProps}
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="export-file-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="export-file-title" className={styles.titleText}>
            {config.title}
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          {!electronReady && pathReady && (
            <p className={styles.envWarning}>
              Use la ventana de escritorio «Intranet Ventas», no el navegador en localhost:5173.
            </p>
          )}

          <fieldset className={styles.group}>
            <legend className={styles.groupTitle}>Propiedades</legend>
            <div className={styles.panelBody}>
              <div className={styles.iconBox} aria-hidden>
                <Icon size={48} />
              </div>

              <div className={styles.fields}>
                <div className={styles.fieldRow}>
                  <label htmlFor="export-file-name">Nombre del archivo</label>
                  <input
                    id="export-file-name"
                    type="text"
                    className={styles.input}
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    disabled={busy || !pathReady}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <label htmlFor="export-file-path">Guardar en:</label>
                  <div className={styles.pathRow}>
                    <div id="export-file-path" className={styles.pathBox} title={saveDirectoryDisplay}>
                      {saveDirectoryDisplay}
                    </div>
                    <button
                      type="button"
                      className={styles.browseBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleBrowse();
                      }}
                      disabled={busy || browsing || !pathReady}
                    >
                      {browsing ? "Abriendo…" : "Examinar…"}
                    </button>
                  </div>
                </div>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={viewAfter}
                    onChange={(e) => setViewAfter(e.target.checked)}
                    disabled={busy}
                  />
                  Ver archivo después de exportar
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            {onExportEmail && (
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => void handleExportEmail()}
                disabled={exportDisabled}
              >
                Exportar y enviar por correo
              </button>
            )}
          </div>
          <div className={styles.footerRight}>
            <button type="button" className={styles.footerBtn} onClick={requestClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={`${styles.footerBtn} ${styles.footerBtnPrimary}`}
              onClick={() => void handleExport()}
              disabled={exportDisabled}
            >
              {exportNowLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
