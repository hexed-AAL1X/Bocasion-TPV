import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";

export type ResizableColumnDef = {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  resizable?: boolean;
  stretchWeight?: number;
};

type ColumnSizing = Pick<ResizableColumnDef, "minWidth" | "stretchWeight">;

export function getFlexColumnIndices(columns: ColumnSizing[]): number[] {
  const stretch = columns
    .map((col, index) => ({ index, weight: col.stretchWeight ?? 0 }))
    .filter((entry) => entry.weight > 0)
    .map((entry) => entry.index);

  return stretch.length > 0 ? stretch : [columns.length - 1];
}

function distributeProportional(
  total: number,
  indices: number[],
  columns: ColumnSizing[],
): number[] {
  if (indices.length === 0) return [];

  const mins = indices.map((index) => columns[index]?.minWidth ?? 0);
  const minSum = mins.reduce((sum, min) => sum + min, 0);
  const extra = Math.max(0, total - minSum);
  const weights = indices.map((index) => columns[index]?.stretchWeight ?? 1);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  let assignedExtra = 0;
  return indices.map((colIndex, position) => {
    const minWidth = columns[colIndex]?.minWidth ?? 0;
    const bonus =
      position === indices.length - 1
        ? extra - assignedExtra
        : Math.round((extra * weights[position]) / weightSum);
    assignedExtra += bonus;
    return minWidth + bonus;
  });
}

/**
 * Ajusta anchos para que la tabla ocupe todo el contenedor.
 * Las columnas con stretchWeight absorben el espacio libre; si ninguna lo tiene, la última columna.
 */
export function finalizeColumnWidths(
  widths: number[],
  columns: ColumnSizing[],
  wrapWidth: number,
): number[] {
  if (widths.length === 0 || wrapWidth <= 0) return widths;

  const flexIndices = getFlexColumnIndices(columns);
  const flexSet = new Set(flexIndices);
  const result = widths.map((width, index) => Math.max(columns[index]?.minWidth ?? 0, width));

  const fixedSum = result.reduce((sum, width, index) => (flexSet.has(index) ? sum : sum + width), 0);
  const stretchTotal = wrapWidth - fixedSum;
  const flexMinSum = flexIndices.reduce((sum, index) => sum + (columns[index]?.minWidth ?? 0), 0);

  if (stretchTotal < flexMinSum) {
    const gap = wrapWidth - columnSum(result);
    if (gap > 0) {
      const last = result.length - 1;
      result[last] = Math.max(columns[last]?.minWidth ?? 0, result[last] + gap);
    }
    return result;
  }

  const allocated = distributeProportional(stretchTotal, flexIndices, columns);
  flexIndices.forEach((colIndex, position) => {
    result[colIndex] = allocated[position];
  });

  const gap = wrapWidth - columnSum(result);
  if (gap !== 0) {
    const last = result.length - 1;
    result[last] = Math.max(columns[last]?.minWidth ?? 0, result[last] + gap);
  }

  return result;
}

/** @deprecated Usar finalizeColumnWidths */
export function finalizeWithLastColumnFill(
  widths: number[],
  columns: Pick<ResizableColumnDef, "minWidth">[],
  wrapWidth: number,
  fillIndex = widths.length - 1,
): number[] {
  if (widths.length === 0 || fillIndex < 0 || wrapWidth <= 0) return widths;

  const result = [...widths];
  const othersSum = result.reduce((sum, width, index) => (index === fillIndex ? sum : sum + width), 0);
  const fillMin = columns[fillIndex]?.minWidth ?? 0;

  if (othersSum + fillMin >= wrapWidth) {
    result[fillIndex] = Math.max(fillMin, result[fillIndex]);
    return result;
  }

  result[fillIndex] = wrapWidth - othersSum;
  return result;
}

function resizeAdjacentColumns(
  startWidths: number[],
  columns: ColumnSizing[],
  index: number,
  delta: number,
): number[] {
  if (columns.length === 0 || index < 0 || index >= columns.length - 1) return startWidths;

  const next = [...startWidths];
  const right = index + 1;
  const leftMin = columns[index]?.minWidth ?? 0;
  const rightMin = columns[right]?.minWidth ?? 0;

  const maxTakeFromRight = next[right] - rightMin;
  const maxGiveFromLeft = next[index] - leftMin;
  const clampedDelta = Math.max(-maxGiveFromLeft, Math.min(maxTakeFromRight, delta));

  next[index] += clampedDelta;
  next[right] -= clampedDelta;
  return next;
}

function columnSum(widths: number[]): number {
  return widths.reduce((sum, width) => sum + width, 0);
}

function applyStickyLeftOffsets(
  table: HTMLTableElement,
  widths: number[],
  frozenColumnCount: number,
): void {
  if (frozenColumnCount <= 0) return;

  let left = 0;
  for (let index = 0; index < frozenColumnCount; index++) {
    const leftPx = `${left}px`;
    const header = table.querySelectorAll("thead th")[index] as HTMLElement | undefined;
    if (header) header.style.left = leftPx;

    table.querySelectorAll("tbody tr").forEach((row) => {
      const cell = row.children[index] as HTMLElement | undefined;
      if (cell) cell.style.left = leftPx;
    });

    table.querySelectorAll("tfoot tr").forEach((row) => {
      const cell = row.children[index] as HTMLElement | undefined;
      if (cell) cell.style.left = leftPx;
    });

    left += widths[index] ?? 0;
  }
}

function applyColumnWidthsToDom(
  wrap: HTMLDivElement,
  widths: number[],
  frozenColumnCount = 0,
): void {
  const table = wrap.querySelector("table");
  if (!table) return;

  const total = columnSum(widths);
  const totalPx = `${total}px`;
  table.style.width = totalPx;
  table.style.minWidth = totalPx;
  table.style.maxWidth = totalPx;

  const cols = table.querySelectorAll("colgroup col");
  const headers = table.querySelectorAll("thead th");

  widths.forEach((width, index) => {
    const px = `${width}px`;
    const col = cols[index] as HTMLTableColElement | undefined;
    if (col) {
      col.style.width = px;
      col.style.minWidth = px;
      col.style.maxWidth = px;
    }
    const th = headers[index] as HTMLTableCellElement | undefined;
    if (th) {
      th.style.width = px;
      th.style.minWidth = px;
      th.style.maxWidth = px;
    }
  });

  applyStickyLeftOffsets(table, widths, frozenColumnCount);
}

type TableLayoutOptions = {
  resetDeps?: unknown[];
  /** Columnas pegajosas a la izquierda (p. ej. DocsAnnex); sincroniza `left` durante el resize. */
  frozenColumnCount?: number;
  /** Si false, no mide ni observa (útil hasta el primer paint del diálogo). */
  enabled?: boolean;
};

export function useResizableTableLayout<T extends ResizableColumnDef>(
  columns: T[],
  options: TableLayoutOptions = {},
): {
  tableWrapRef: RefObject<HTMLDivElement | null>;
  tableWrapRefCallback: (node: HTMLDivElement | null) => void;
  layoutWidths: number[];
  layoutTableWidth: number;
  tableStyle: CSSProperties;
  getColumnStyle: (index: number) => CSSProperties | undefined;
  startResize: (index: number, e: React.MouseEvent) => void;
} {
  const { resetDeps = [], frozenColumnCount = 0, enabled = true } = options;
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const dragPaintRafRef = useRef<number | null>(null);
  const userResizedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const wrapWidthRef = useRef(0);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [widths, setWidths] = useState(() => columns.map((col) => col.defaultWidth));
  const dragRef = useRef<{ index: number; startX: number; startWidths: number[] } | null>(null);
  const dragWidthsRef = useRef<number[] | null>(null);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const lastColumnIndex = columns.length - 1;

  useLayoutEffect(() => {
    if (!enabled) return;
    userResizedRef.current = false;
    tableWrapRef.current?.removeAttribute("data-col-widths-locked");
    setWidths(columns.map((col) => col.defaultWidth));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps controla el reinicio explícito
  }, [columns, enabled, ...resetDeps]);

  useLayoutEffect(() => {
    if (!enabled || wrapWidth <= 0 || isDraggingRef.current) return;

    setWidths((prev) => {
      const base = prev.length === columns.length ? prev : columns.map((col) => col.defaultWidth);

      if (userResizedRef.current) {
        return base;
      }

      return finalizeColumnWidths(base, columns, wrapWidth);
    });
  }, [columns, wrapWidth, enabled]);

  const syncTableLayout = useCallback(
    (node: HTMLDivElement) => {
      if (!enabled || isDraggingRef.current) return;
      const nextWidth = node.clientWidth;
      if (nextWidth <= 0) return;
      wrapWidthRef.current = nextWidth;

      if (userResizedRef.current) {
        setWrapWidth((prev) => (prev === nextWidth ? prev : nextWidth));
        setLayoutReady(true);
        return;
      }

      const base =
        widthsRef.current.length === columns.length
          ? widthsRef.current
          : columns.map((col) => col.defaultWidth);
      const nextWidths = finalizeColumnWidths(base, columns, nextWidth);

      // Sin flushSync: no bloquear el paint de apertura del diálogo.
      setWrapWidth(nextWidth);
      setWidths(nextWidths);
      setLayoutReady(true);
    },
    [columns, enabled],
  );

  const measureWrapWidth = useCallback(
    (node: HTMLDivElement) => {
      syncTableLayout(node);
    },
    [syncTableLayout],
  );

  const tableWrapRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      tableWrapRef.current = node;
      if (node && enabled) measureWrapWidth(node);
    },
    [measureWrapWidth, enabled],
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    const node = tableWrapRef.current;
    if (!node) return;

    const scheduleUpdate = () => {
      if (isDraggingRef.current) return;
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;
        measureWrapWidth(node);
      });
    };

    scheduleUpdate();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, [measureWrapWidth, enabled]);

  const layoutTableWidth = useMemo(() => columnSum(widths), [widths]);
  /** Columnas sticky / scroll horizontal: anchos en px (no % ni 100%). */
  const usePixelLayout = frozenColumnCount > 0 || (wrapWidth > 0 && layoutTableWidth > wrapWidth + 1);

  const tableStyle = useMemo<CSSProperties>(() => {
    // Mostrar siempre: anchos por defecto hasta medir (evita pantalla en blanco).
    if (usePixelLayout && layoutReady) {
      return {
        width: layoutTableWidth,
        minWidth: layoutTableWidth,
        maxWidth: layoutTableWidth,
        tableLayout: "fixed",
      };
    }
    return {
      width: "100%",
      minWidth: "100%",
      tableLayout: "fixed",
    };
  }, [layoutReady, layoutTableWidth, usePixelLayout]);

  const getColumnStyle = useCallback(
    (index: number): CSSProperties | undefined => {
      const width = widths[index];
      if (!width || layoutTableWidth <= 0) return undefined;
      if (usePixelLayout) {
        return {
          width,
          minWidth: width,
          maxWidth: width,
        };
      }
      const pct = (width / layoutTableWidth) * 100;
      return {
        width: `${pct}%`,
        minWidth: columns[index]?.minWidth,
      };
    },
    [columns, layoutTableWidth, usePixelLayout, widths],
  );

  const paintDragWidths = useCallback(
    (nextWidths: number[]) => {
      const wrap = tableWrapRef.current;
      if (!wrap) return;
      applyColumnWidthsToDom(wrap, nextWidths, frozenColumnCount);
    },
    [frozenColumnCount],
  );

  const scheduleDragPaint = useCallback(
    (nextWidths: number[]) => {
      dragWidthsRef.current = nextWidths;
      if (dragPaintRafRef.current !== null) return;
      dragPaintRafRef.current = requestAnimationFrame(() => {
        dragPaintRafRef.current = null;
        const pending = dragWidthsRef.current;
        if (!pending || !isDraggingRef.current) return;
        paintDragWidths(pending);
      });
    },
    [paintDragWidths],
  );

  const startResize = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (index >= lastColumnIndex) return;
      if (columns[index]?.resizable === false) return;

      e.preventDefault();
      e.stopPropagation();

      const snapshot = [...widthsRef.current];
      dragRef.current = { index, startX: e.clientX, startWidths: snapshot };
      dragWidthsRef.current = snapshot;
      isDraggingRef.current = true;
      userResizedRef.current = true;
      tableWrapRef.current?.setAttribute("data-col-widths-locked", "true");
      tableWrapRef.current?.setAttribute("data-col-resizing", "true");

      const onMove = (ev: globalThis.MouseEvent) => {
        if (!dragRef.current) return;
        const { index: colIndex, startX, startWidths: start } = dragRef.current;
        const delta = ev.clientX - startX;
        const next = resizeAdjacentColumns(start, columns, colIndex, delta);
        scheduleDragPaint(next);
      };

      const onUp = () => {
        isDraggingRef.current = false;
        tableWrapRef.current?.removeAttribute("data-col-resizing");

        if (dragPaintRafRef.current !== null) {
          cancelAnimationFrame(dragPaintRafRef.current);
          dragPaintRafRef.current = null;
        }

        if (dragWidthsRef.current && tableWrapRef.current) {
          applyColumnWidthsToDom(tableWrapRef.current, dragWidthsRef.current, frozenColumnCount);
          flushSync(() => {
            setWidths(dragWidthsRef.current!);
          });
        }

        dragRef.current = null;
        dragWidthsRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [columns, frozenColumnCount, lastColumnIndex, scheduleDragPaint],
  );

  return {
    tableWrapRef,
    tableWrapRefCallback,
    layoutWidths: widths,
    layoutTableWidth,
    tableStyle,
    getColumnStyle,
    startResize,
  };
}
