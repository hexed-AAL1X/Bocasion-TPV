import type { CSSProperties } from "react";
import type { PaletteTokens } from "../../theme/definitions";
import { tokensToPreviewStyle } from "../../theme/applyTokens";
import styles from "./ThemePreview.module.css";

type Props = {
  tokens: PaletteTokens;
  modeLabel: string;
};

export function ThemePreview({ tokens, modeLabel }: Props) {
  const vars = tokensToPreviewStyle(tokens) as CSSProperties;

  return (
    <div className={styles.frame} style={vars} aria-hidden>
      <span className={styles.modeTag}>{modeLabel}</span>
      <div className={styles.mock}>
        <div
          className={styles.ribbonTabs}
          style={{
            background: `linear-gradient(180deg, ${tokens.ribbonTabTop}, ${tokens.ribbonTabBottom})`,
          }}
        >
          <span className={styles.ribbonTabActive} style={{ background: tokens.colorCard }}>
            Inicio
          </span>
          <span className={styles.ribbonTab}>Entidades</span>
        </div>
        <div
          className={styles.ribbonToolbar}
          style={{
            background: `linear-gradient(180deg, ${tokens.ribbonToolbarTop}, ${tokens.ribbonToolbarBottom})`,
          }}
        />
        <div className={styles.bodyRow}>
          <div className={styles.sideTab} style={{ background: tokens.colorSidebar }} />
          <div className={styles.main}>
            <div className={styles.docTabs} style={{ background: tokens.colorBg }}>
              <span className={styles.docTabActive} style={{ background: tokens.colorCard }}>
                Tpv
              </span>
            </div>
            <div className={styles.content} style={{ background: tokens.colorCard }}>
              <span className={styles.contentLine} style={{ background: tokens.colorEntryHeader }} />
              <span className={styles.contentLineShort} style={{ background: tokens.colorBg }} />
            </div>
          </div>
        </div>
        <div className={styles.statusBar} style={{ background: tokens.colorStatusBg }} />
      </div>
    </div>
  );
}
