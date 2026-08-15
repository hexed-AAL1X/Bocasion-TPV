import { createPortal } from "react-dom";
import { useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useAnchoredPopup, useDismissOnOutsideClick } from "./pickerPortal";
import shell from "./salesPickerShell.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
  role?: string;
  ariaLabel?: string;
  estimatedHeight?: number;
  /** Ancho fijo del popup (px). Si no se indica, se adapta al contenido. */
  popupWidth?: number;
  placement?: "auto" | "up" | "down";
  children: ReactNode;
};

const VIEWPORT_MARGIN = 8;

export function PickerPopup({
  open,
  onClose,
  anchorRef,
  className,
  role,
  ariaLabel,
  estimatedHeight = 280,
  popupWidth,
  placement = "auto",
  children,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredPopup(open, anchorRef, popupRef, estimatedHeight, placement);
  useDismissOnOutsideClick(open, onClose, anchorRef, popupRef);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const anchor = anchorRef.current;
  const coords =
    position ??
    (anchor ? computeFallbackPosition(anchor, estimatedHeight, placement) : null);

  if (!coords) {
    return null;
  }

  const widthPx = popupWidth ?? coords.width;
  const maxHeightPx = coords.maxHeight;

  return createPortal(
    <div
      ref={popupRef}
      className={[shell.popup, shell.popupFloating, className].filter(Boolean).join(" ")}
      style={
        {
          position: "fixed",
          top: coords.top,
          left: coords.left,
          width: popupWidth ? `${widthPx}px` : "max-content",
          minWidth: `${coords.minWidth}px`,
          maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
          maxHeight: maxHeightPx ? `${maxHeightPx}px` : undefined,
          boxSizing: "border-box",
          zIndex: 9600,
        } as CSSProperties
      }
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>,
    document.body,
  );
}

function computeFallbackPosition(
  anchor: HTMLElement,
  estimatedHeight: number,
  placement: "auto" | "up" | "down" = "auto",
): { top: number; left: number; minWidth: number; width: number; maxHeight?: number } {
  const rect = anchor.getBoundingClientRect();
  const viewportMargin = 8;
  const gap = 3;
  const spaceBelow = window.innerHeight - rect.bottom - viewportMargin;
  const spaceAbove = rect.top - viewportMargin;

  let openUp: boolean;
  if (placement === "down") {
    openUp = false;
  } else if (placement === "up") {
    openUp = spaceAbove >= gap + 24 || spaceAbove >= spaceBelow;
  } else {
    openUp = spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow;
  }

  let top: number;
  let maxHeight: number;
  if (openUp) {
    maxHeight = Math.max(24, Math.min(estimatedHeight, spaceAbove - gap));
    top = Math.max(viewportMargin, rect.top - maxHeight - gap);
  } else {
    maxHeight = Math.max(24, Math.min(estimatedHeight, spaceBelow - gap));
    top = Math.max(
      viewportMargin,
      Math.min(rect.bottom + gap, window.innerHeight - viewportMargin - maxHeight),
    );
  }

  return {
    top,
    left: rect.left,
    minWidth: rect.width,
    width: rect.width,
    maxHeight,
  };
}
