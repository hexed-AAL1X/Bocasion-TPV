import { useLayoutEffect, type RefObject } from "react";

type AlignmentRefs = {
  open: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  pickerShellRef: RefObject<HTMLElement | null>;
  codeFieldRef: RefObject<HTMLElement | null>;
  descFieldRef: RefObject<HTMLElement | null>;
  deps?: unknown[];
};

export function useCodeLabelListAlignment({
  open,
  listRef,
  pickerShellRef,
  codeFieldRef,
  descFieldRef,
  deps = [],
}: AlignmentRefs) {
  useLayoutEffect(() => {
    if (!open || !listRef.current) return;

    const list = listRef.current;

    const syncScrollbarWidth = () => {
      const scrollbarWidth = list.offsetWidth - list.clientWidth;
      list.style.setProperty("--win-scrollbar-width", `${scrollbarWidth}px`);
    };

    const syncColumnAlignment = () => {
      const picker = pickerShellRef.current;
      const code = codeFieldRef.current;
      const desc = descFieldRef.current;
      if (!picker || !code || !desc) return;

      const listRect = list.getBoundingClientRect();
      const pickerRect = picker.getBoundingClientRect();
      const codeRect = code.getBoundingClientRect();
      const descRect = desc.getBoundingClientRect();

      const pickerShellWidth = Math.round(pickerRect.right - listRect.left);
      const descStart = Math.round(descRect.left - listRect.left);
      const codeWidth = Math.round(codeRect.width);
      const gap = Math.max(0, descStart - pickerShellWidth);
      const dropBtnWidth = Math.max(0, pickerShellWidth - codeWidth);

      list.style.setProperty("--picker-shell-width", `${pickerShellWidth}px`);
      list.style.setProperty("--picker-gap", `${gap}px`);
      list.style.setProperty("--desc-start", `${descStart}px`);
      list.style.setProperty("--code-col-width", `${codeWidth}px`);
      list.style.setProperty("--drop-btn-width", `${dropBtnWidth}px`);
    };

    let alignRaf = 0;
    alignRaf = requestAnimationFrame(() => {
      syncColumnAlignment();
      syncScrollbarWidth();
    });

    const scrollObserver = new ResizeObserver(() => {
      syncScrollbarWidth();
    });
    scrollObserver.observe(list);

    return () => {
      cancelAnimationFrame(alignRaf);
      scrollObserver.disconnect();
    };
  }, [open, listRef, pickerShellRef, codeFieldRef, descFieldRef, ...deps]);
}
