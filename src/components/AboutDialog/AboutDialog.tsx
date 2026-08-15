import { useEffect, useRef, useState } from "react";
import {
  APP_LOGO_SRC,
  COMPANY_LOGO_SRC,
  APP_VERSION,
  APP_DEFAULT_DIR,
  APP_PRODUCT_ID,
  COMPANY_NAME,
  COPYRIGHT_YEAR_START,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "../../config/brand";
import {
  checkForProductUpdates,
  installProductUpdate,
  type UpdateCheckResult,
} from "../../services/appUpdates";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./AboutDialog.module.css";

interface Props {
  onClose: () => void;
}

const currentYear = new Date().getFullYear();

export function AboutDialog({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<UpdateCheckResult | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  useEffect(() => {
    return window.bocasoft?.onUpdateDownloadProgress?.(({ percent }) => {
      setProgress(percent);
    });
  }, []);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setProgress(null);
    try {
      const next = await checkForProductUpdates();
      setResult(next);
    } catch (err) {
      setResult({
        status: "error",
        current: APP_VERSION,
        message: err instanceof Error ? err.message : "No se pudo buscar actualizaciones.",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!result) return;
    setInstalling(true);
    try {
      await installProductUpdate(result);
    } catch (err) {
      setResult({
        ...result,
        status: "error",
        message: err instanceof Error ? err.message : "No se pudo instalar la actualización.",
      });
    } finally {
      setInstalling(false);
    }
  };

  const statusClass =
    result?.status === "available"
      ? styles.updateAvailable
      : result?.status === "error"
        ? styles.updateError
        : result
          ? styles.updateLatest
          : "";

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="about-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <img src={APP_LOGO_SRC} alt="" className={styles.titleIcon} width={20} height={20} decoding="async" />
          <h1 id="about-title" className={styles.titleText}>
            Acerca de {PRODUCT_NAME}
          </h1>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.brandCol}>
            <p className={styles.sideLabel}>{PRODUCT_TAGLINE}</p>
            <div className={styles.logoFrame}>
              <img src={COMPANY_LOGO_SRC} alt="Bocasión" className={styles.logo} decoding="async" />
            </div>
          </aside>

          <div className={styles.infoCol}>
            <p className={styles.company}>{COMPANY_NAME}</p>
            <p className={styles.copyright}>
              Copyright ©{COPYRIGHT_YEAR_START} - {currentYear}
            </p>
            <p className={styles.rights}>Reservado todos los derechos</p>
            <button
              type="button"
              className={styles.updateLink}
              onClick={() => void handleCheckUpdates()}
              disabled={checking || installing}
            >
              {checking ? "Buscando actualizaciones…" : "Buscar actualizaciones del producto"}
            </button>
            {result ? (
              <p className={`${styles.updateStatus} ${statusClass}`}>{result.message}</p>
            ) : null}
            {progress != null && installing ? (
              <p className={styles.updateStatus}>Descargando… {progress}%</p>
            ) : null}
            {result?.status === "available" ? (
              <button
                type="button"
                className={styles.updateAction}
                onClick={() => void handleInstall()}
                disabled={installing}
              >
                {installing
                  ? "Descargando…"
                  : result.canInstall
                    ? `Descargar e instalar ${result.latest}`
                    : `Ver versión ${result.latest} en GitHub`}
              </button>
            ) : null}
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <dt>Versión:</dt>
                <dd>
                  <strong>{APP_VERSION}</strong>
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Directorio predeterminado:</dt>
                <dd>{APP_DEFAULT_DIR}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Id de producto:</dt>
                <dd>{APP_PRODUCT_ID}</dd>
              </div>
            </dl>
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.warning}>
            Advertencia. Este programa informático está protegido por las leyes de derechos de autor.
            La reproducción y/o distribución no autorizadas de este programa, puede dar lugar a
            responsabilidades civiles y/o criminales, y serán perseguidas.
          </p>
          <button type="button" className={styles.acceptBtn} onClick={requestClose}>
            Aceptar
          </button>
        </footer>
      </div>
    </div>
  );
}
