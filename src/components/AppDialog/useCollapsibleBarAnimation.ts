import { useEffect, useRef, useState, type TransitionEvent } from "react";

const CLOSE_FALLBACK_MS = 320;

/** Animación de barra colapsable (buscar / encontrar). onAfterClose corre tras cerrar por completo. */
export function useCollapsibleBarAnimation(open: boolean, onAfterClose?: () => void) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const onAfterCloseRef = useRef(onAfterClose);
  const closeGenerationRef = useRef(0);

  onAfterCloseRef.current = onAfterClose;

  const finishClose = (generation: number) => {
    if (generation !== closeGenerationRef.current) return;
    setMounted(false);
    onAfterCloseRef.current?.();
  };

  useEffect(() => {
    if (open) {
      closeGenerationRef.current += 1;
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!mounted) return;

    const generation = ++closeGenerationRef.current;
    const frame = requestAnimationFrame(() => {
      setExpanded(false);
    });

    const fallback = window.setTimeout(() => finishClose(generation), CLOSE_FALLBACK_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [open, mounted]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (open || event.target !== event.currentTarget) return;
    if (event.propertyName !== "max-height") return;
    finishClose(closeGenerationRef.current);
  };

  return {
    barMounted: mounted,
    barProps: {
      "data-open": expanded ? "true" : "false",
      onTransitionEnd: handleTransitionEnd,
    },
  };
};
