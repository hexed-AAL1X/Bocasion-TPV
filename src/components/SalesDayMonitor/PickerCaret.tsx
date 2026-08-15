import shell from "./salesPickerShell.module.css";

/** Flecha ▼ en triggers de picker (posición absoluta dentro del campo). */
export function PickerCaret() {
  return <span className={shell.triggerCaret} aria-hidden />;
}

/** Flecha ▼ inline (botones split, etc.). */
export function PickerCaretIcon() {
  return (
    <svg viewBox="0 0 6 4" width="6" height="4" aria-hidden style={{ display: "block" }}>
      <path fill="currentColor" d="M0 0h6L3 4z" />
    </svg>
  );
}
