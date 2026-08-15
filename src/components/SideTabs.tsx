import type { ReactNode } from "react";
import styles from "./SideTabs.module.css";

const tabIcons: Record<string, ReactNode> = {
  Favoritos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  "Módulos de apoyo": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Reportes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Agenda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

type Props = {
  side: "left" | "right";
  labels: string[];
};

export function SideTabs({ side, labels }: Props) {
  return (
    <aside
      className={[styles.aside, side === "right" ? styles.right : ""].filter(Boolean).join(" ")}
      aria-label={side === "left" ? "Accesos laterales izquierdos" : "Accesos laterales derechos"}
    >
      {labels.map((label) => (
        <button key={label} type="button" className={styles.tab} title={label}>
          <span className={styles.tabIcon}>{tabIcons[label]}</span>
          <span className={styles.tabText}>{label}</span>
        </button>
      ))}
    </aside>
  );
}
