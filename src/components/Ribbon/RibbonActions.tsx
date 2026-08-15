import type { ReactNode } from "react";
import type { AlmacenLargeAction, AlmacenMenuAction } from "../../data/almacenRibbon";
import styles from "./Ribbon.module.css";

export function ChevronDown() {
  return (
    <svg
      className={styles.almMenuChevron}
      viewBox="0 0 12 12"
      width={10}
      height={10}
      aria-hidden
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function LargeAction({
  action,
  chevron,
  onClick,
}: {
  action: AlmacenLargeAction;
  chevron?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={[styles.action, action.wide ? styles.actionWide : ""].filter(Boolean).join(" ")}
      title={action.label.replace(/\n/g, " ")}
      onClick={onClick}
    >
      <span className={styles.actionIcon} aria-hidden>
        {action.badge ? (
          <span className={styles.almBadgeWrap}>
            <img
              src={action.image}
              alt=""
              className={styles.actionImg}
              width={36}
              height={36}
              draggable={false}
            />
            <span className={styles.almBadge}>{action.badge}</span>
          </span>
        ) : (
          <img
            src={action.image}
            alt=""
            className={styles.actionImg}
            width={36}
            height={36}
            draggable={false}
          />
        )}
      </span>
      <span className={styles.actionLabel}>
        <span className={styles.actionLabelText}>{action.label}</span>
        {chevron ? (
          <span className={styles.actionChevron}>
            <ChevronDown />
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function MenuAction({ action }: { action: AlmacenMenuAction }) {
  return (
    <button type="button" className={styles.almMenuAction} title={action.label}>
      <img
        src={action.image}
        alt=""
        className={styles.almMenuIcon}
        width={16}
        height={16}
        draggable={false}
      />
      <span className={styles.almMenuLabel}>{action.label}</span>
      <ChevronDown />
    </button>
  );
}

export function ActionGroup({
  label,
  children,
  mixed,
}: {
  label: string;
  children: ReactNode;
  mixed?: boolean;
}) {
  return (
    <div className={styles.group}>
      <div className={[styles.groupActions, mixed ? styles.almMixedActions : ""].filter(Boolean).join(" ")}>
        {children}
      </div>
      <span className={styles.groupLabel}>{label}</span>
    </div>
  );
}
