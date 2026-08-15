import { useMemo, type RefObject } from "react";
import { THERMAL_RECEIPT_LOGO_SRC } from "../../config/brand";
import {
  THERMAL_LOGO_GAP_EM,
  THERMAL_LOGO_WIDTH_EM,
  THERMAL_PAPER_WIDTH_PX,
  THERMAL_PREVIEW_CONTENT_WIDTH_PX,
  THERMAL_PREVIEW_INSET_LEFT_PX,
  THERMAL_PREVIEW_INSET_RIGHT_PX,
  type PreviewRow,
} from "../../utils/buildThermalPrintPreview";
import { buildThermalReceiptBodyHtml } from "../../utils/thermalReceiptBody";
import type { PrintLineSpacing } from "../../services/printLayoutSettings";
import { PRINT_LINE_HEIGHT } from "../../utils/thermalPrintLayout";
import { clampFontSize } from "./fontSettings";
import styles from "./ThermalTicketPreview.module.css";

type Props = {
  rows: PreviewRow[];
  fontFamily: string;
  fontSizePt: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fontStretch?: string;
  letterSpacing?: string;
  lineSpacing: PrintLineSpacing;
  showWhitespace: boolean;
  contentRef?: RefObject<HTMLDivElement | null>;
};

/** Vista previa 1:1 del ticket térmico 80 mm (misma maquetación HTML que impresión). */
export function ThermalTicketPreview({
  rows,
  fontFamily,
  fontSizePt,
  fontWeight,
  fontStyle,
  fontStretch,
  letterSpacing,
  lineSpacing,
  showWhitespace,
  contentRef,
}: Props) {
  const bodyHtml = useMemo(
    () => buildThermalReceiptBodyHtml(rows, { showWhitespace }),
    [rows, showWhitespace],
  );
  const printSizePt = clampFontSize(fontSizePt);
  const lineHeight = PRINT_LINE_HEIGHT[lineSpacing];

  return (
    <div
      ref={contentRef}
      className={styles.ticket}
      style={{
        width: THERMAL_PAPER_WIDTH_PX,
        padding: `4px ${THERMAL_PREVIEW_INSET_RIGHT_PX}px 8px ${THERMAL_PREVIEW_INSET_LEFT_PX}px`,
      }}
    >
      <div
        className={styles.logoWrap}
        style={{ fontSize: `${printSizePt}pt`, marginBottom: `${THERMAL_LOGO_GAP_EM}em` }}
      >
        <img
          className={styles.logo}
          src={THERMAL_RECEIPT_LOGO_SRC}
          alt=""
          decoding="async"
          style={{ width: `${THERMAL_LOGO_WIDTH_EM}em` }}
        />
      </div>
      <div
        className={styles.body}
        style={{
          width: THERMAL_PREVIEW_CONTENT_WIDTH_PX,
          maxWidth: "100%",
          fontFamily,
          fontSize: `${printSizePt}pt`,
          fontWeight,
          fontStyle,
          fontStretch,
          letterSpacing,
          lineHeight,
        }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  );
}
