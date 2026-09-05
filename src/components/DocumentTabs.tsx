import { useEffect, useRef } from "react";
import { APP_LOGO_GRAY_SRC } from "../config/brand";
import type { WorkspaceTab } from "../services/workspaceTabs";
import styles from "./DocumentTabs.module.css";

export type DocTab = string;

type Props = {
  activeTab: DocTab;
  tpvTabs: string[];
  workspaceTabs?: WorkspaceTab[];
  onTabChange: (tab: DocTab) => void;
  onAddTpv: () => void;
  onCloseTpv: (id: string) => void;
  onCloseWorkspaceTab?: (id: string) => void;
};

const TaskIcon = () => (
  <svg className={styles.tabSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const CloseIcon = () => (
  <svg className={styles.closeSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg className={styles.tabSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export function DocumentTabs({
  activeTab,
  tpvTabs,
  workspaceTabs = [],
  onTabChange,
  onAddTpv,
  onCloseTpv,
  onCloseWorkspaceTab,
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTab, tpvTabs.length, workspaceTabs.length]);

  return (
    <div className={styles.bar} role="tablist" aria-label="Documentos abiertos">
      <div className={styles.tabStrip} ref={stripRef}>
        <button
          type="button"
          className={`${activeTab === "task" ? styles.tabActive : styles.tab} ${styles.tabSmall}`}
          role="tab"
          aria-selected={activeTab === "task"}
          aria-label="Task"
          onClick={() => onTabChange("task")}
        >
          <TaskIcon />
        </button>

        {tpvTabs.map((id, i) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? styles.tabActive : styles.tab}
            role="tab"
            aria-selected={activeTab === id}
            title={`Tpv - Terminal Punto de${tpvTabs.length > 1 ? ` ${i + 1}` : ""} Venta`}
            onClick={() => onTabChange(id)}
          >
            <img
              src={APP_LOGO_GRAY_SRC}
              alt=""
              className={styles.tabLogo}
              width={18}
              height={18}
              draggable={false}
              decoding="async"
            />
            <span className={styles.tabLabel}>
              Tpv - Terminal Punto de{tpvTabs.length > 1 ? ` ${i + 1}` : ""} Venta
            </span>
            <span
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTpv(id);
              }}
              title="Cerrar pestaña"
            >
              <CloseIcon />
            </span>
          </button>
        ))}

        {workspaceTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            role="tab"
            aria-selected={activeTab === tab.id}
            title={tab.label}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            {onCloseWorkspaceTab ? (
              <span
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseWorkspaceTab(tab.id);
                }}
                title="Cerrar pestaña"
              >
                <CloseIcon />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.addBtn}
        onClick={onAddTpv}
        title="Nueva Terminal Punto de Venta"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
