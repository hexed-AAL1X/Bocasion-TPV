import { APP_LOGO_SRC } from "../config/brand";
import { useEffect, useState } from "react";
import styles from "./AppBootSplash.module.css";

type Props = {
  exiting?: boolean;
};

/** Pantalla de carga al entrar al módulo de ventas. */
export function AppBootSplash({ exiting = false }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={[
        styles.splash,
        shown && !exiting ? styles.splashShown : "",
        exiting ? styles.splashExit : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
    >
      <div className={styles.content}>
        <div className={styles.logoWrap}>
          <img
            src={APP_LOGO_SRC}
            alt=""
            className={styles.logo}
            width={72}
            height={72}
            decoding="async"
          />
        </div>
        <p className={styles.loadingText}>Iniciando sesión...</p>
        <p className={styles.loadingBrand}>Bocasión S.A.C.</p>
        <div className={styles.progressTrack} aria-hidden>
          <div className={styles.progressBar} />
        </div>
      </div>
    </div>
  );
}
