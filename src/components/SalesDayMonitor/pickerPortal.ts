import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

export type AnchoredPopupPosition = {
  top: number;
  left: number;
  minWidth: number;
  width: number;
  maxHeight?: number;
};

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 3;

function computeVerticalPosition(
  rect: DOMRect,
  popupHeight: number,
  placement: "auto" | "up" | "down" = "auto",
): { top: number; maxHeight?: number } {
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;

  let openUp: boolean;
  if (placement === "down") {
    openUp = false;
  } else if (placement === "up") {
    openUp = spaceAbove >= ANCHOR_GAP + 24 || spaceAbove >= spaceBelow;
  } else {
    openUp = spaceBelow < popupHeight + ANCHOR_GAP && spaceAbove > spaceBelow;
  }

  if (openUp) {
    const maxHeight = Math.max(24, Math.min(popupHeight, spaceAbove - ANCHOR_GAP));
    return {
      top: Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - ANCHOR_GAP),
      maxHeight,
    };
  }

  const maxHeight = Math.max(24, Math.min(popupHeight, spaceBelow - ANCHOR_GAP));
  const top = Math.min(
    rect.bottom + ANCHOR_GAP,
    window.innerHeight - VIEWPORT_MARGIN - maxHeight,
  );

  return {
    top: Math.max(VIEWPORT_MARGIN, top),
    maxHeight,
  };
}

function clampPopupHorizontal(
  anchorLeft: number,
  anchorWidth: number,
  popupWidth: number,
): { left: number; width: number } {
  const maxAllowedWidth = window.innerWidth - VIEWPORT_MARGIN * 2;
  let width = Math.max(anchorWidth, popupWidth, 24);
  width = Math.min(width, maxAllowedWidth);

  let left = anchorLeft;
  if (left + width > window.innerWidth - VIEWPORT_MARGIN) {
    left = window.innerWidth - VIEWPORT_MARGIN - width;
  }
  if (left < VIEWPORT_MARGIN) {
    left = VIEWPORT_MARGIN;
    width = Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2);
  }

  return { left, width };
}

function computePosition(
  anchor: HTMLElement,
  popup: HTMLElement | null,
  popupHeight: number,
  placement: "auto" | "up" | "down" = "auto",
): AnchoredPopupPosition {
  const rect = anchor.getBoundingClientRect();
  const vertical = computeVerticalPosition(rect, popupHeight, placement);
  const measuredWidth = popup?.offsetWidth ?? rect.width;
  const horizontal = clampPopupHorizontal(rect.left, rect.width, measuredWidth);

  return {
    top: vertical.top,
    left: horizontal.left,
    minWidth: rect.width,
    width: horizontal.width,
    maxHeight: vertical.maxHeight,
  };
}

export function useAnchoredPopup(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
  estimatedHeight = 280,
  placement: "auto" | "up" | "down" = "auto",
) {
  const [position, setPosition] = useState<AnchoredPopupPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const popupHeight = popupRef.current?.offsetHeight ?? estimatedHeight;
      setPosition(computePosition(anchor, popupRef.current, popupHeight, placement));
    };

    update();

    const popup = popupRef.current;
    const resizeObserver = popup ? new ResizeObserver(update) : null;
    if (popup && resizeObserver) {
      resizeObserver.observe(popup);
    }

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, popupRef, estimatedHeight, placement]);

  return position;
}

export function useDismissOnOutsideClick(
  open: boolean,
  onClose: () => void,
  anchorRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popupRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef, popupRef]);
}
