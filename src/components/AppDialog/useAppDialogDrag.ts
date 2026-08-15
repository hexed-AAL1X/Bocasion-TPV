import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type Options = {
  disabled?: boolean;
};

export function useAppDialogDrag(panelRef: RefObject<HTMLElement | null>, options: Options = {}) {
  const disabled = options.disabled ?? false;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const draggingRef = useRef<DragState | null>(null);

  useLayoutEffect(() => {
    if (disabled) {
      setOffset({ x: 0, y: 0 });
    }
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;

    const attach = () => {
      const panel = panelRef.current;
      if (!panel) return undefined;

      const titleBar = panel.querySelector("header") as HTMLElement | null;
      if (!titleBar) return undefined;

      const onPointerDown = (event: PointerEvent) => {
        if ((event.target as HTMLElement).closest("button")) return;
        if (event.button !== 0) return;

        draggingRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: offsetRef.current.x,
          originY: offsetRef.current.y,
        };
        titleBar.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!draggingRef.current) return;
        const dx = event.clientX - draggingRef.current.startX;
        const dy = event.clientY - draggingRef.current.startY;
        setOffset({
          x: draggingRef.current.originX + dx,
          y: draggingRef.current.originY + dy,
        });
      };

      const endDrag = (event: PointerEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = null;
        if (titleBar.hasPointerCapture(event.pointerId)) {
          titleBar.releasePointerCapture(event.pointerId);
        }
      };

      titleBar.addEventListener("pointerdown", onPointerDown);
      titleBar.addEventListener("pointermove", onPointerMove);
      titleBar.addEventListener("pointerup", endDrag);
      titleBar.addEventListener("pointercancel", endDrag);

      return () => {
        titleBar.removeEventListener("pointerdown", onPointerDown);
        titleBar.removeEventListener("pointermove", onPointerMove);
        titleBar.removeEventListener("pointerup", endDrag);
        titleBar.removeEventListener("pointercancel", endDrag);
      };
    };

    let cleanup = attach();
    if (cleanup) return cleanup;

    const panel = panelRef.current;
    if (!panel) return;

    const observer = new MutationObserver(() => {
      cleanup?.();
      cleanup = attach();
    });
    observer.observe(panel, { childList: true, subtree: true });

    return () => {
      cleanup?.();
      observer.disconnect();
    };
  }, [disabled, panelRef]);

  const panelStyle = useMemo((): CSSProperties | undefined => {
    if (disabled || (offset.x === 0 && offset.y === 0)) return undefined;
    return { transform: `translate(${offset.x}px, ${offset.y}px)` };
  }, [disabled, offset.x, offset.y]);

  const resetPosition = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return { panelStyle, resetPosition };
}
