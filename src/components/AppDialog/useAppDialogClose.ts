import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useModalBackdrop } from "../ModalStack/ModalStackContext";
import { useAppDialogDrag } from "./useAppDialogDrag";
import { getEfficientMode } from "../../services/performanceSettings";

export const APP_DIALOG_CLOSE_MS = getEfficientMode() ? 0 : 220;

export type AppDialogCloseOptions = {
  panelRef?: RefObject<HTMLElement | null>;
  dragDisabled?: boolean;
};

export function useAppDialogClose(onClose: () => void, options?: AppDialogCloseOptions) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const internalPanelRef = useRef<HTMLElement>(null);
  const panelRef = options?.panelRef ?? internalPanelRef;
  const { panelStyle, resetPosition } = useAppDialogDrag(panelRef, {
    disabled: options?.dragDisabled ?? false,
  });

  const requestClose = useCallback(() => {
    const gate = panelRef.current?.closest?.("[data-app-dialog-gate]");
    if (gate && gate.getAttribute("data-app-dialog-gate") !== "open") return;

    if (APP_DIALOG_CLOSE_MS <= 0) {
      onCloseRef.current();
      return;
    }
    setClosing((value) => (value ? value : true));
  }, [panelRef]);

  useEffect(() => {
    if (!closing) return;
    timerRef.current = window.setTimeout(() => {
      onCloseRef.current();
      // Reset para reabrir (p. ej. anexo primed) con animación de entrada limpia.
      setClosing(false);
    }, APP_DIALOG_CLOSE_MS);
    return () => window.clearTimeout(timerRef.current);
  }, [closing]);

  const onBackdropClick = useModalBackdrop(requestClose);

  const closingAttr = closing ? "true" : undefined;

  return {
    closing,
    requestClose,
    onBackdropClick,
    resetDialogPosition: resetPosition,
    panelRef: options?.panelRef ? undefined : internalPanelRef,
    overlayProps: {
      "data-app-dialog-overlay": true as const,
      "data-app-dialog-closing": closingAttr,
    },
    panelProps: {
      "data-win-classic": true as const,
      "data-app-dialog-closing": closingAttr,
      style: panelStyle,
    },
  };
}
