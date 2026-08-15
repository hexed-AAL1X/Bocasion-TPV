import { useMemo, useRef, useState } from "react";
import {
  POS_REGISTERS,
  type PosRegister,
  type RegisterStatus,
} from "../../data/posRegisters";
import { isSessionClosedForRegisterAndDate } from "../../services/salesSession";
import { PickerPopup } from "./PickerPopup";
import { PickerCaret } from "./PickerCaret";
import shell from "./salesPickerShell.module.css";
import styles from "./SalesRegisterPicker.module.css";

type Props = {
  value: string;
  onChange: (registerId: string) => void;
  saleDate: Date;
};

function getStatus(registerId: string, saleDate: Date): RegisterStatus {
  return isSessionClosedForRegisterAndDate(registerId, saleDate) ? "Cerrado" : "Abierto";
}

export function SalesRegisterPicker({ value, onChange, saleDate }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => POS_REGISTERS.find((register) => register.id === value) ?? POS_REGISTERS[0],
    [value],
  );
  const selectedStatus = getStatus(selected.id, saleDate);

  const pickRegister = (register: PosRegister) => {
    onChange(register.id);
    setOpen(false);
  };

  return (
    <div className={shell.shell}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          shell.trigger,
          styles.triggerRegister,
          open ? shell.triggerOpen : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Caja seleccionada: ${selected.label}`}
        title={selected.label}
      >
        <span className={shell.triggerText} title={selected.label}>
          {selected.label}
        </span>
        <PickerCaret />
      </button>

      <PickerPopup
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        className={styles.popupRegister}
        popupWidth={300}
        role="listbox"
        ariaLabel="Seleccionar caja"
        estimatedHeight={320}
      >
        <div className={shell.header}>
          <span className={shell.headerTitle}>Seleccionar caja</span>
        </div>

        <div className={shell.body}>
          <div className={styles.listScroll}>
            <div className={styles.listHead} aria-hidden>
              <span className={styles.colCaja}>Caja</span>
              <span className={styles.colTime}>Hora</span>
              <span className={styles.colStatus}>Estado</span>
            </div>

            {POS_REGISTERS.map((register) => {
              const status = getStatus(register.id, saleDate);
              const active = register.id === value;

              return (
                <button
                  key={register.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  title={register.label}
                  className={[styles.listRow, active ? styles.listRowActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => pickRegister(register)}
                >
                  <span className={styles.colCaja}>
                    <span className={styles.rowLabel} title={register.label}>
                      {register.label}
                    </span>
                  </span>
                  <span className={styles.colTime}>{register.openedAtTime}</span>
                  <span
                    className={[
                      styles.colStatus,
                      status === "Abierto" ? styles.statusOpen : styles.statusClosed,
                    ].join(" ")}
                  >
                    {status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={shell.footer}>
          <span className={[shell.footerMark, shell.footerMarkSolid].join(" ")} aria-hidden />
          <span className={shell.footerLabel}>Actual:</span>
          <span
            className={shell.footerValue}
            title={`${selected.label} · ${selected.openedAtTime} · ${selectedStatus}`}
          >
            {selected.label} · {selected.openedAtTime} · {selectedStatus}
          </span>
        </div>
      </PickerPopup>
    </div>
  );
}
