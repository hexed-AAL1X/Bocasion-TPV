import type { RefObject } from "react";
import type { PreviewRow } from "../../utils/buildThermalPrintPreview";
import { LIST_TABLE_COLUMN_GAP_PX, LIST_TABLE_UI_FONT_PX } from "../../utils/buildThermalPrintPreview";
import styles from "./ReceiptPreview.module.css";

type Props = {
  rows: PreviewRow[];
  fontSize: number;
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  fontStretch?: "normal" | "condensed" | "expanded";
  letterSpacing?: string;
  lineHeight: number;
  maxWidthPx: number;
  wideLayout?: boolean;
  showWhitespace: boolean;
  contentRef?: RefObject<HTMLDivElement | null>;
};

function vis(text: string, showWhitespace: boolean): string {
  return showWhitespace ? text.replace(/ /g, "·") : text;
}

function rowClass(variant?: string): string {
  if (variant === "total") return styles.rowTotal;
  if (variant === "section") return styles.rowSection;
  return "";
}

/** Escala px de columna del cuadro origen al tamaño de fuente de la vista previa. */
function scaleListColumnPx(widthPx: number, fontSizePt: number, fontStretch?: string): number {
  const ptToPx = fontSizePt * (96 / 72);
  let scaled = widthPx * (ptToPx / LIST_TABLE_UI_FONT_PX);
  if (fontStretch === "condensed") scaled *= 1.08;
  if (fontStretch === "expanded") scaled *= 0.95;
  return Math.round(scaled);
}

function scaleListGapPx(fontSizePt: number, fontStretch?: string): number {
  return scaleListColumnPx(LIST_TABLE_COLUMN_GAP_PX, fontSizePt, fontStretch);
}

function listTableWidthPxScaled(
  widthPx: number[],
  fontSizePt: number,
  fontStretch?: string,
): number {
  if (widthPx.length === 0) return 0;
  const gap = scaleListGapPx(fontSizePt, fontStretch);
  return (
    widthPx.reduce((sum, px) => sum + scaleListColumnPx(px, fontSizePt, fontStretch), 0) +
    (widthPx.length - 1) * gap
  );
}

function listCellsGridColumns(
  widthPx: number[],
  widthCh: number[],
  fontSizePt: number,
  fontStretch?: string,
): string {
  if (widthPx.length > 0) {
    return widthPx
      .map((px) => `minmax(0, ${scaleListColumnPx(px, fontSizePt, fontStretch)}px)`)
      .join(" ");
  }
  return widthCh.map((w) => `minmax(0, ${w}ch)`).join(" ");
}

export function ReceiptPreview({
  rows,
  fontSize,
  fontFamily,
  fontWeight = 400,
  fontStyle = "normal",
  fontStretch,
  letterSpacing,
  lineHeight,
  maxWidthPx,
  wideLayout = false,
  showWhitespace,
  contentRef,
}: Props) {
  let lineIndex = 0;

  return (
    <div
      ref={contentRef}
      className={[styles.receipt, wideLayout ? styles.receiptWide : ""].filter(Boolean).join(" ")}
      style={{
        fontSize: `${fontSize}pt`,
        fontFamily,
        fontWeight,
        fontStyle,
        fontStretch,
        letterSpacing,
        lineHeight,
        ...(wideLayout
          ? { maxWidth: "none" as const }
          : { maxWidth: `${maxWidthPx}px`, width: "100%" }),
      }}
    >
      {rows.map((row, i) => {
        if (row.kind === "blank") {
          lineIndex += 1;
          return <div key={i} className={styles.blank} data-line={lineIndex} />;
        }

        if (row.kind === "header") {
          lineIndex += 1;
          return (
            <div key={i} className={styles.rowHeader} data-line={lineIndex}>
              {vis(row.text.trim(), showWhitespace)}
            </div>
          );
        }

        if (row.kind === "separator") {
          lineIndex += 1;
          return (
            <div key={i} className={styles.rowSeparator} data-line={lineIndex} aria-hidden />
          );
        }

        if (row.kind === "meta") {
          lineIndex += 1;
          return (
            <div
              key={i}
              className={[styles.rowMeta, row.variant === "total" ? styles.rowTotal : ""]
                .filter(Boolean)
                .join(" ")}
              data-line={lineIndex}
            >
              {vis(row.text, showWhitespace)}
            </div>
          );
        }

        if (row.kind === "fixed") {
          lineIndex += 1;
          return (
            <div
              key={i}
              className={[styles.rowFixed, row.variant === "total" ? styles.rowTotal : ""]
                .filter(Boolean)
                .join(" ")}
              data-line={lineIndex}
            >
              {vis(row.text, showWhitespace)}
            </div>
          );
        }

        if (row.kind === "cols3") {
          lineIndex += 1;
          return (
            <div
              key={i}
              className={[styles.rowCols3, rowClass(row.variant)].filter(Boolean).join(" ")}
              data-line={lineIndex}
            >
              <span className={styles.col1}>{vis(row.c1, showWhitespace)}</span>
              <span className={styles.col2}>{vis(row.c2, showWhitespace)}</span>
              <span className={styles.col3}>{vis(row.c3, showWhitespace)}</span>
            </div>
          );
        }

        if (row.kind === "listRule") {
          lineIndex += 1;
          const boldClass = row.variant === "section" ? ` ${styles.listLineBold}` : "";
          if (wideLayout) {
            return <div key={i} className={styles.blank} data-line={lineIndex} aria-hidden />;
          }
          return (
            <div
              key={i}
              className={[styles.listRule, boldClass].filter(Boolean).join(" ")}
              data-line={lineIndex}
              aria-hidden
            />
          );
        }

        if (row.kind === "listMeta") {
          lineIndex += 1;
          const boldClass = row.variant === "section" ? ` ${styles.listLineBold}` : "";
          if (wideLayout) {
            return (
              <div key={i} className={`${styles.rowFixed}${boldClass}`} data-line={lineIndex}>
                {vis(row.text, showWhitespace)}
              </div>
            );
          }
          const tableW = listTableWidthPxScaled(row.widthPx, fontSize, fontStretch);
          return (
            <div
              key={i}
              className={`${styles.listMetaLine}${boldClass}`}
              style={{ width: `${tableW}px` }}
              data-line={lineIndex}
            >
              {vis(row.text, showWhitespace)}
            </div>
          );
        }

        if (row.kind === "listCells") {
          lineIndex += 1;
          const isTitle = row.layout === "title";
          const boldClass = row.variant === "section" ? ` ${styles.listLineBold}` : "";

          if (wideLayout && row.plainText) {
            return (
              <div key={i} className={`${styles.rowFixed}${boldClass}`} data-line={lineIndex}>
                {vis(row.plainText, showWhitespace)}
              </div>
            );
          }

          const columnGap = `${scaleListGapPx(fontSize, fontStretch)}px`;
          const tableW = listTableWidthPxScaled(row.widthPx, fontSize, fontStretch);
          const gridStyle = isTitle
            ? {
                width: `${tableW}px`,
                minWidth: `${tableW}px`,
                columnGap,
              }
            : {
                gridTemplateColumns: listCellsGridColumns(
                  row.widthPx,
                  row.widthCh,
                  fontSize,
                  fontStretch,
                ),
                columnGap,
              };
          return (
            <div
              key={i}
              className={[
                styles.rowListCells,
                isTitle ? styles.rowListTitle : "",
                row.variant === "section" ? styles.listLineBold : "",
                rowClass(row.variant),
              ]
                .filter(Boolean)
                .join(" ")}
              style={gridStyle}
              data-line={lineIndex}
            >
              {row.cells.map((cell, j) => (
                <span
                  key={j}
                  className={[
                    styles.listCell,
                    row.align[j] === "right"
                      ? styles.listCellRight
                      : row.align[j] === "center"
                        ? styles.listCellCenter
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {vis(cell, showWhitespace)}
                </span>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
