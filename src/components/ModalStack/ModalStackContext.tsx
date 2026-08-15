import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Pila de ventanas modales con cierre jerárquico por clic en el fondo:
 * - Clic dentro del ancla raíz (ventana contenedora) → cierra solo la capa actual.
 * - Clic fuera del ancla raíz → cierra toda la pila (onDismissAll).
 *
 * Uso en una ventana raíz:
 *   <ModalStackRoot anchorRef={windowRef} onDismissAll={onClose}>...</ModalStackRoot>
 *
 * Uso en cada capa hija:
 *   const onBackdropClick = useModalBackdrop(onClose);
 *   <div className={overlay} onClick={onBackdropClick} />
 */

type ModalStackContextValue = {
  anchorRef: RefObject<HTMLElement | null>;
  onDismissAll: () => void;
  hasOpenLayers: boolean;
  registerLayer: () => void;
  unregisterLayer: () => void;
};

const ModalStackContext = createContext<ModalStackContextValue | null>(null);

function isInsideRect(clientX: number, clientY: number, rect: DOMRect): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export function ModalStackRoot({
  anchorRef,
  onDismissAll,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onDismissAll: () => void;
  children: ReactNode;
}) {
  const [layerCount, setLayerCount] = useState(0);

  const registerLayer = useCallback(() => {
    setLayerCount((count) => count + 1);
  }, []);

  const unregisterLayer = useCallback(() => {
    setLayerCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({
      anchorRef,
      onDismissAll,
      hasOpenLayers: layerCount > 0,
      registerLayer,
      unregisterLayer,
    }),
    [anchorRef, layerCount, onDismissAll, registerLayer, unregisterLayer],
  );

  return <ModalStackContext.Provider value={value}>{children}</ModalStackContext.Provider>;
}

export function useModalStack() {
  const ctx = useContext(ModalStackContext);
  return {
    hasOpenLayers: ctx?.hasOpenLayers ?? false,
    onDismissAll: ctx?.onDismissAll,
  };
}

export function useModalBackdrop(onClose: () => void) {
  const ctx = useContext(ModalStackContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerLayer();
    return () => ctx.unregisterLayer();
  }, [ctx]);

  return useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!ctx) {
        onClose();
        return;
      }
      const anchor = ctx.anchorRef.current;
      if (!anchor) {
        onClose();
        return;
      }
      if (isInsideRect(e.clientX, e.clientY, anchor.getBoundingClientRect())) {
        onClose();
        return;
      }
      ctx.onDismissAll();
    },
    [ctx, onClose],
  );
}
