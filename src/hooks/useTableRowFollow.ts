import { useCallback, useEffect, useRef, type RefObject } from "react";

/** Scroll del wrap respetando thead sticky (evita saltos de scrollIntoView). */
export function scrollRowIntoStickyTable(wrap: HTMLElement, row: HTMLElement): void {
  const headerH = (wrap.querySelector("thead") as HTMLElement | null)?.offsetHeight ?? 0;
  const wrapRect = wrap.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const topLimit = wrapRect.top + headerH;
  const bottomLimit = wrapRect.bottom;

  if (rowRect.top < topLimit) {
    wrap.scrollTop -= topLimit - rowRect.top;
  } else if (rowRect.bottom > bottomLimit) {
    wrap.scrollTop += rowRect.bottom - bottomLimit;
  }
}

/** Mantener pulsado un botón de navegación (aceleración suave). */
export function useRepeatingPress(onPress: () => void, disabled = false) {
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (holdRef.current) clearTimeout(holdRef.current);
      if (repeatRef.current) clearTimeout(repeatRef.current);
    },
    [],
  );

  const stop = useCallback(() => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    if (repeatRef.current) {
      clearTimeout(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onPressRef.current();
      holdRef.current = setTimeout(() => {
        let speed = 140;
        const fire = () => {
          onPressRef.current();
          speed = Math.max(48, speed - 10);
          repeatRef.current = setTimeout(fire, speed);
        };
        repeatRef.current = setTimeout(fire, speed);
      }, 380);
    },
    [disabled],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    /** Evita doble disparo con el click sintético tras pointerup. */
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
    },
  };
}

type UseTableRowFollowOptions = {
  tableWrapRef: RefObject<HTMLElement | null>;
  /** Filas actuales en el mismo orden que la tabla. */
  rowIds: string[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  selectedClassName: string;
};

/**
 * Navegación primero/prev/next/último fluida:
 * - índice en ref (clicks rápidos no se quedan en el mismo registro)
 * - highlight DOM inmediato
 * - scroll manual con thead sticky
 */
export function useTableRowFollow({
  tableWrapRef,
  rowIds,
  selectedId,
  setSelectedId,
  selectedClassName,
}: UseTableRowFollowOptions) {
  const indexRef = useRef(0);
  const rowIdsRef = useRef(rowIds);
  rowIdsRef.current = rowIds;

  const selectedClassRef = useRef(selectedClassName);
  selectedClassRef.current = selectedClassName;

  // Sincronizar índice cuando cambia la selección (click en fila, filtros, etc.).
  useEffect(() => {
    const idx = rowIds.findIndex((id) => id === selectedId);
    if (idx >= 0) indexRef.current = idx;
  }, [rowIds, selectedId]);

  const paintSelection = useCallback((rowId: string) => {
    const wrap = tableWrapRef.current;
    if (!wrap) return null;
    const selectedClass = selectedClassRef.current;
    let prev: HTMLElement | null = null;
    let next: HTMLElement | null = null;
    for (const node of wrap.querySelectorAll<HTMLElement>("tbody tr[data-row-id]")) {
      if (node.classList.contains(selectedClass)) prev = node;
      if (node.getAttribute("data-row-id") === rowId) next = node;
    }
    if (prev && prev !== next) prev.classList.remove(selectedClass);
    if (next && !next.classList.contains(selectedClass)) next.classList.add(selectedClass);
    return next;
  }, [tableWrapRef]);

  const goTo = useCallback(
    (index: number) => {
      const ids = rowIdsRef.current;
      if (ids.length === 0) return;
      const clamped = Math.max(0, Math.min(index, ids.length - 1));
      const rowId = ids[clamped];
      if (!rowId) return;

      indexRef.current = clamped;
      const row = paintSelection(rowId);
      if (row && tableWrapRef.current) {
        scrollRowIntoStickyTable(tableWrapRef.current, row);
      }
      setSelectedId(rowId);
    },
    [paintSelection, setSelectedId, tableWrapRef],
  );

  const goFirst = useCallback(() => goTo(0), [goTo]);
  const goPrev = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const goLast = useCallback(() => goTo(rowIdsRef.current.length - 1), [goTo]);

  const currentIndex = Math.max(
    0,
    rowIds.findIndex((id) => id === selectedId),
  );
  const atStart = rowIds.length === 0 || currentIndex <= 0;
  const atEnd = rowIds.length === 0 || currentIndex >= rowIds.length - 1;

  return {
    goTo,
    goFirst,
    goPrev,
    goNext,
    goLast,
    currentIndex: currentIndex < 0 ? 0 : currentIndex,
    atStart,
    atEnd,
  };
}
