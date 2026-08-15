import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./winListBox.module.css";

export type WinListBoxOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  className?: string;
  value: string;
  options: WinListBoxOption[];
  onChange: (value: string) => void;
  visibleRows?: number;
  "aria-label": string;
};

export function WinListBox({
  id,
  className,
  value,
  options,
  onChange,
  visibleRows = 7,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const needsScroll = options.length > visibleRows;

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [value, options]);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = options.findIndex((opt) => opt.value === value);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, currentIndex + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;

    event.preventDefault();
    const next = options[nextIndex];
    if (next) onChange(next.value);
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.shell}>
        <ul
          ref={listRef}
          id={id ?? listId}
          className={[styles.list, needsScroll ? styles.listScroll : styles.listNoScroll].join(" ")}
          style={{ "--win-listbox-rows": visibleRows } as CSSProperties}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={[styles.item, selected ? styles.itemSelected : ""].filter(Boolean).join(" ")}
                  onClick={() => onChange(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
