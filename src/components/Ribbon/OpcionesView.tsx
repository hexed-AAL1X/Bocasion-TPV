import { useState } from "react";
import { COLOR_PALETTE_OPTIONS } from "../../theme/definitions";
import { useTheme } from "../../theme/ThemeProvider";
import { getEfficientMode, setEfficientMode } from "../../services/performanceSettings";
import { ThemePreview } from "./ThemePreview";
import styles from "./OpcionesView.module.css";

export function OpcionesView() {
  const { colorPalette, setColorPalette, theme, toggleTheme } = useTheme();
  const [efficientMode] = useState(getEfficientMode);

  const handleEfficientToggle = () => {
    setEfficientMode(!efficientMode);
    window.location.reload();
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
