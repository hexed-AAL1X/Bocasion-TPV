import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { isElectronExportReady } from "../../utils/electronExport";
import { defaultExportBaseName, ensureTrailingSep, type ExportContext } from "../../utils/exportFileHelpers";
import { getPathSeparator, resolveDefaultExportFolder } from "../../utils/exportPaths";
import {
  getExportFieldCatalog,
  hasEnabledExportColumns,
  initialExportFieldState,
  resolveExportListKind,
  type ExportFieldCatalog,
  type SelectedExportField,
} from "../../utils/exportFieldCatalogs";
import { EXPORT_FILE_CONFIG } from "./exportFileConfig";
import { ExportFieldTransfer } from "./ExportFieldTransfer";
import type { ExportFileOptions } from "./ExportFileDialog";
import styles from "./ExportFileDialog.module.css";

type Props = {
  saleDate: string;
  exportContext?: ExportContext;
  listData?: {
    documentsData?: unknown;
    saleConditionsData?: unknown;
    warehousesData?: unknown;
    carriersData?: unknown;
    vehiclesData?: unknown;
    driversData?: unknown;
    sellersData?: unknown;
    sellerCategoriesData?: unknown;
    emissionPointsData?: unknown;
  };
  onExport: (options: ExportFileOptions) => Promise<string | null>;
  onExportEmail?: (savedPath: string | null) => void;
  onClose: () => void;
};

export function ExportExcelDialog({
  saleDate,
  exportContext = "sales-report",
  listData,
  onExport,
  onExportEmail,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const { Icon } = EXPORT_FILE_CONFIG.excel;
  const defaultName = defaultExportBaseName(saleDate, "excel", exportContext);
  const listKind = resolveExportListKind(listData ?? {});
  const fieldCatalog = useMemo<ExportFieldCatalog | null>(
    () => getExportFieldCatalog(listKind),
    [listKind],
  );
  const initialFields = useMemo(
    () => (fieldCatalog ? initialExportFieldState(fieldCatalog) : null),
    [fieldCatalog],
  );

  const [fileName, setFileName] = useState(defaultName);
  const [saveDirectory, setSaveDirectory] = useState("");
  const [pathReady, setPathReady] = useState(false);
  const [viewAfter, setViewAfter] = useState(true);
  const [hideGridlines, setHideGridlines] = useState(false);
  const [availableFields, setAvailableFields] = useState(initialFields?.available ?? []);
  const [exportFields, setExportFields] = useState<SelectedExportField[]>(initialFields?.exportFields ?? []);
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
      return api.resolveExportDirectory(directory, "excel");
    }
    if (api?.getDefaultExportDirectory) {
      return api.getDefaultExportDirectory("excel");
    }
    return directory;
  };

  useEffect(() => {
    setElectronReady(isElectronExportReady());
  }, []);

  useEffect(() => {
    setFileName(defaultExportBaseName(saleDate, "excel", exportContext));
  }, [exportContext, saleDate]);

  useEffect(() => {
    if (!initialFields) return;
    setAvailableFields(initialFields.available);
    setExportFields(initialFields.exportFields);
  }, [initialFields]);

  useEffect(() => {
    const fallback = resolveDefaultExportFolder("excel");
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
  }, []);

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
      hideGridlines,
      exportFields: fieldCatalog ? exportFields : undefined,
    };
  };

  const openSavedFile = (savedPath: string) => {
    window.setTimeout(() => {
      void window.bocasoft?.openExportFile?.(savedPath)?.catch(() => undefined);
    }, 200);
  };

  const runExportFlow = async (viewAfterExport: boolean, forEmail: boolean) => {
    if (!electronReady) {
      window.alert(
        "La exportación a carpeta solo funciona en la ventana de escritorio Electron.\n\n" +
          "No use el navegador (localhost:5173). Use la ventana «Intranet Ventas» que se abre con npm run dev.",
      );
      return;
    }

    if (fieldCatalog && !hasEnabledExportColumns(exportFields)) {
      window.alert("Seleccione al menos un campo para exportar.");
      return;
    }

    setBusy(true);
    try {
      const options = await buildExportOptions(false);
      setSaveDirectory(options.saveDirectory);
      const savedPath = await onExport(options);
      setBusy(false);
      if (forEmail) {
        onExportEmail?.(savedPath);
      }
      requestClose();
      if (savedPath) {
        void window.bocasoft?.showExportInFolder?.(savedPath);
        if (viewAfterExport) {
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

  const exportDisabled =
    busy ||
    !pathReady ||
    !saveDirectory.trim() ||
    !electronReady ||
    (fieldCatalog ? !hasEnabledExportColumns(exportFields) : false);

  const dialogClass = [styles.dialog, fieldCatalog ? styles.dialogExcel : ""].filter(Boolean).join(" ");
  const configGridClass = [styles.excelConfigGrid, !fieldCatalog ? styles.excelConfigGridSingle : ""]
    .filter(Boolean)
    .join(" ");

  const formatoOpciones = (
    <div className={styles.excelLeftCol}>
      <div>
        <p className={styles.excelSectionTitle}>FORMATO:</p>
        <fieldset className={styles.excelFormatoBox}>
          <legend className={styles.excelFormatoLegend}>Formato de exportación</legend>
          <div className={styles.excelRadioGroup}>
            <label className={styles.excelRadioLine}>
              <input type="radio" name="excel-format" defaultChecked disabled={busy} />
              Solo datos (predeterminado)
            </label>
            <label className={`${styles.excelRadioLine} ${styles.excelRadioLineDisabled}`}>
              <input type="radio" name="excel-format" disabled />
              Datos con diseño del reporte
            </label>
          </div>
        </fieldset>
      </div>

      <div>
        <p className={styles.excelSectionTitle}>Opciones:</p>
        <div className={styles.excelOptionsGroup}>
          <label className={styles.excelCheckRow}>
            <input
              type="checkbox"
              checked={hideGridlines}
              onChange={(e) => setHideGridlines(e.target.checked)}
              disabled={busy}
            />
            Ocultar gridlines
          </label>
          <label className={styles.excelCheckRow}>
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
    </div>
  );

  return (
    <div
      className={`${styles.overlay} ${pickerHidden ? styles.overlayHidden : ""}`}
      {...overlayProps}
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={dialogClass}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="export-excel-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="export-excel-title" className={styles.titleText}>
            Exportar a EXCEL
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
            <legend className={styles.groupTitle}>General</legend>

            <div className={styles.panelBody}>
              <div className={styles.iconBox} aria-hidden>
                <Icon size={48} />
              </div>

              <div className={styles.fields}>
                <div className={styles.fieldRow}>
                  <label htmlFor="export-excel-name">Nombre del archivo</label>
                  <input
                    id="export-excel-name"
                    type="text"
                    className={styles.input}
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    disabled={busy || !pathReady}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <label htmlFor="export-excel-path">Guardar en:</label>
                  <div className={styles.pathRow}>
                    <div id="export-excel-path" className={styles.pathBox} title={saveDirectoryDisplay}>
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
              </div>
            </div>

            <hr className={styles.excelDivider} />

            <div className={configGridClass}>
              {formatoOpciones}
              {fieldCatalog && (
                <div className={styles.excelFieldsCol}>
                  <ExportFieldTransfer
                    available={availableFields}
                    exportFields={exportFields}
                    disabled={busy}
                    onChange={({ available, exportFields: nextExportFields }) => {
                      setAvailableFields(available);
                      setExportFields(nextExportFields);
                    }}
                  />
                </div>
              )}
            </div>
          </fieldset>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            {onExportEmail && (
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => void runExportFlow(false, true)}
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
              onClick={() => void runExportFlow(viewAfter, false)}
              disabled={exportDisabled}
            >
              {busy ? "Exportando…" : "Exportar ahora"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
