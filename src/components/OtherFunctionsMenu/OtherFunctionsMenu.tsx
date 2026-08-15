import { useEffect, useState } from "react";
import {
  OTHER_FUNCTIONS,
  otherFunctionIconSrc,
  type OtherFunctionActionId,
  type OtherFunctionItem,
} from "../../data/otherFunctions";
import styles from "./OtherFunctionsMenu.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onAction: (action: OtherFunctionActionId) => void;
};

export function OtherFunctionsMenu({ open, onClose, onAction }: Props) {
  const [visible, setVisible] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(false);
      let raf1 = 0;
      let raf2 = 0;
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open && !visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, visible, onClose]);

  const handleSelect = (item: OtherFunctionItem) => {
    setPressedId(item.id);
    if (item.action) {
      onAction(item.action);
    }
    onClose();
  };

  return (
    <div
      className={[styles.shell, visible ? styles.shellOpen : styles.shellClosed].join(" ")}
      aria-hidden={!visible}
    >
      <nav className={styles.panel} aria-label="Otras funciones">
        {OTHER_FUNCTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[styles.item, pressedId === item.id ? styles.itemPressed : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleSelect(item)}
            tabIndex={visible ? 0 : -1}
          >
            <span className={styles.iconWrap}>
              <img
                className={styles.icon}
                src={otherFunctionIconSrc(item.iconFile)}
                alt=""
                width={32}
                height={32}
                draggable={false}
              />
            </span>
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
