import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { formatSaleDateLabel, isSameDay, toDateKey } from "../../services/salesSession";
import { PickerPopup } from "./PickerPopup";
import { PickerCaret } from "./PickerCaret";
import shell from "./salesPickerShell.module.css";
import styles from "./SalesDayCalendar.module.css";

const WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  datesWithSales?: Date[];
  /** Ancla externa: no renderiza el trigger propio */
  anchorRef?: RefObject<HTMLElement | null>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ariaLabel?: string;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(month: Date): Array<Date | null> {
  const first = startOfMonth(month);
  const startOffset = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function SalesDayCalendar({
  value,
  onChange,
  datesWithSales = [],
  anchorRef: externalAnchorRef,
  open: controlledOpen,
  onOpenChange,
  ariaLabel = "Seleccionar fecha de venta",
}: Props) {
  const internalTriggerRef = useRef<HTMLButtonElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(value));
  const today = useMemo(() => new Date(), []);
  const salesKeys = useMemo(
    () => new Set(datesWithSales.map((date) => toDateKey(date))),
    [datesWithSales],
  );

  const isAnchored = Boolean(externalAnchorRef);
  const open = isAnchored ? Boolean(controlledOpen) : internalOpen;
  const anchorRef = externalAnchorRef ?? internalTriggerRef;

  const setOpen = (next: boolean) => {
    if (isAnchored) {
      onOpenChange?.(next);
      return;
    }
    setInternalOpen(next);
  };

  useEffect(() => {
    setViewMonth(startOfMonth(value));
  }, [value]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const selectDate = (date: Date) => {
    if (date > today) return;
    onChange(date);
    setOpen(false);
  };

  const goToToday = () => {
    onChange(today);
    setViewMonth(startOfMonth(today));
    setOpen(false);
  };

  const popup = (
    <PickerPopup
      open={open}
      onClose={() => setOpen(false)}
      anchorRef={anchorRef}
      className={styles.popupCalendar}
      popupWidth={212}
      role="dialog"
      ariaLabel={ariaLabel}
      estimatedHeight={260}
    >
      <div className={shell.headerNav}>
        <button
          type="button"
          className={shell.navBtn}
          onClick={() =>
            setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
          }
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className={shell.headerTitle}>
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          className={shell.navBtn}
          onClick={() =>
            setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
          }
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className={shell.body}>
        <div className={styles.weekdays}>
          {WEEKDAYS.map((day) => (
            <span key={day} className={styles.weekday}>{day}</span>
          ))}
        </div>

        <div className={styles.grid}>
          {cells.map((date, index) => {
            if (!date) {
              return <span key={`empty-${index}`} className={styles.dayEmpty} aria-hidden />;
            }

            const isFuture = date > today;
            const selected = isSameDay(date, value);
            const isToday = isSameDay(date, today);
            const hasSales = salesKeys.has(toDateKey(date));

            return (
              <button
                key={toDateKey(date)}
                type="button"
                className={[
                  styles.dayCell,
                  selected ? styles.daySelected : "",
                  isToday ? styles.dayToday : "",
                  isFuture ? styles.dayDisabled : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectDate(date)}
                disabled={isFuture}
                aria-label={formatSaleDateLabel(date)}
                aria-pressed={selected}
              >
                <span className={styles.dayInner}>{date.getDate()}</span>
                {hasSales ? <span className={styles.salesDot} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className={[shell.footer, shell.footerBtn].join(" ")}
        onClick={goToToday}
      >
        <span className={[shell.footerMark, shell.footerMarkRing].join(" ")} aria-hidden />
        <span className={shell.footerLabel}>Hoy:</span>
        <span className={shell.footerValue}>{formatSaleDateLabel(today)}</span>
      </button>
    </PickerPopup>
  );

  if (isAnchored) {
    return popup;
  }

  return (
    <div className={shell.shell}>
      <button
        ref={internalTriggerRef}
        type="button"
        className={[shell.trigger, styles.triggerCalendar, open ? shell.triggerOpen : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Fecha de venta: ${formatSaleDateLabel(value)}`}
      >
        <span className={shell.triggerText}>{formatSaleDateLabel(value)}</span>
        <PickerCaret />
      </button>
      {popup}
    </div>
  );
}
