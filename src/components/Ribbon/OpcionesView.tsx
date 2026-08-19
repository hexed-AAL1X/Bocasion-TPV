import { useEffect, useState } from "react";
import { COLOR_PALETTE_OPTIONS } from "../../theme/definitions";
import { useTheme } from "../../theme/ThemeProvider";
import { getEfficientMode, setEfficientMode } from "../../services/performanceSettings";
import { ThemePreview } from "./ThemePreview";
import styles from "./OpcionesView.module.css";

type SqlProfile = {
  id: string;
  label: string;
  host: string;
  database: string;
  auth: string;
};

type SqlStatus = {
  ok: boolean;
  profileId: string;
  host: string;
  server: string;
  database: string;
  login: string;
  message: string;
};

export function OpcionesView() {
  const { colorPalette, setColorPalette, theme, toggleTheme } = useTheme();
  const [efficientMode] = useState(getEfficientMode);
  const [sqlProfiles, setSqlProfiles] = useState<SqlProfile[]>([]);
  const [sqlActive, setSqlActive] = useState("");
  const [sqlStatus, setSqlStatus] = useState<SqlStatus | null>(null);
  const [sqlBusy, setSqlBusy] = useState(false);

  useEffect(() => {
    const api = window.bocasoft;
    if (!api?.listSqlProfiles) return;
    void api.listSqlProfiles().then((data) => {
      setSqlProfiles(data.profiles);
      setSqlActive(data.active);
    });
    void api.getSqlStatus?.().then(setSqlStatus);
  }, []);

  const handleEfficientToggle = () => {
    setEfficientMode(!efficientMode);
    window.location.reload();
  };

  const handleSqlProfile = async (id: string) => {
    const api = window.bocasoft;
    if (!api?.setSqlProfile || sqlBusy) return;
    setSqlBusy(true);
    try {
      const status = await api.setSqlProfile(id);
      setSqlActive(id);
      setSqlStatus(status);
    } catch (err) {
      setSqlStatus({
        ok: false,
        profileId: id,
        host: "",
        server: "",
        database: "",
        login: "",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSqlBusy(false);
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Preferencias</h2>
        <p className={styles.subtitle}>
          Elija un tema de color entre {COLOR_PALETTE_OPTIONS.length} estilos. Cada uno incluye
          variantes claras y oscuras distintas. El modo activo se cambia desde la barra inferior o
          aquí abajo.
        </p>
      </header>

      {sqlProfiles.length ? (
        <section className={styles.section} aria-labelledby="sql-heading">
          <h3 id="sql-heading" className={styles.sectionTitle}>
            Servidor SQL
          </h3>
          <p className={styles.subtitle}>
            Desarrollo: WIN-C6EKJGJR3FH. Producción: EC2AMAZ-O5TI2KP. El cambio aplica de inmediato.
          </p>
          <div className={styles.sqlGrid} role="radiogroup" aria-label="Servidor SQL">
            {sqlProfiles.map((profile) => {
              const selected = sqlActive === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={sqlBusy}
                  className={[styles.sqlCard, selected ? styles.sqlCardActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => void handleSqlProfile(profile.id)}
                >
                  <div className={styles.paletteHead}>
                    <span className={styles.paletteLabel}>{profile.label}</span>
                    <span
                      className={[styles.check, selected ? styles.checkOn : ""].filter(Boolean).join(" ")}
                      aria-hidden={!selected}
                    >
                      ✓
                    </span>
                  </div>
                  <p className={styles.paletteDesc}>
                    {profile.host} · {profile.database} · {profile.auth.toUpperCase()}
                  </p>
                </button>
              );
            })}
          </div>
          {sqlStatus ? (
            <p className={sqlStatus.ok ? styles.sqlOk : styles.sqlErr}>
              {sqlBusy ? "Conectando…" : sqlStatus.message}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="color-palette-heading">
        <h3 id="color-palette-heading" className={styles.sectionTitle}>
          Tema de color
        </h3>
        <div className={styles.paletteGrid} role="radiogroup" aria-label="Tema de color">
          {COLOR_PALETTE_OPTIONS.map((option) => {
            const selected = colorPalette === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={[styles.paletteCard, selected ? styles.paletteCardActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setColorPalette(option.id)}
              >
                <div className={styles.paletteHead}>
                  <span className={styles.paletteLabel}>{option.label}</span>
                  <span
                    className={[styles.check, selected ? styles.checkOn : ""].filter(Boolean).join(" ")}
                    aria-hidden={!selected}
                  >
                    ✓
                  </span>
                </div>
                <p className={styles.paletteDesc}>{option.description}</p>
                <div className={styles.previewRow}>
                  <ThemePreview tokens={option.light} modeLabel="Claro" />
                  <ThemePreview tokens={option.dark} modeLabel="Oscuro" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="brightness-heading">
        <h3 id="brightness-heading" className={styles.sectionTitle}>
          Modo de pantalla
        </h3>
        <div className={styles.modeRow}>
          <div className={styles.modeCopy}>
            <span className={styles.modeLabel}>
              {theme === "dark" ? "Modo oscuro activo" : "Modo claro activo"}
            </span>
            <span className={styles.modeHint}>
              El modo oscuro usa los colores del tema «
              {COLOR_PALETTE_OPTIONS.find((o) => o.id === colorPalette)?.label}» seleccionado.
            </span>
          </div>
          <button type="button" className={styles.modeBtn} onClick={() => toggleTheme()}>
            Cambiar a {theme === "dark" ? "modo claro" : "modo oscuro"}
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="perf-heading">
        <h3 id="perf-heading" className={styles.sectionTitle}>
          Rendimiento
        </h3>
        <div className={styles.modeRow}>
          <div className={styles.modeCopy}>
            <span className={styles.modeLabel}>Modo eficiente (bajo consumo)</span>
            <span className={styles.modeHint}>
              Sin precargar el TPV en el login, menos animaciones y sin calentar datos en
              segundo plano. Requiere reiniciar la app. En Windows el WebView2 sigue usando
              ~70–100&nbsp;MB de base (no comparable a FoxPro nativo).
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={efficientMode}
            className={[styles.toggle, efficientMode ? styles.toggleOn : ""].filter(Boolean).join(" ")}
            onClick={handleEfficientToggle}
            title={efficientMode ? "Desactivar modo eficiente" : "Activar modo eficiente"}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </section>
    </div>
  );
}
