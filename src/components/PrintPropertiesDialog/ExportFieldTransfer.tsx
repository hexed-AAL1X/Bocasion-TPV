import { useMemo, useState, type MouseEvent } from "react";
import type { ExportFieldDef, SelectedExportField } from "../../utils/exportFieldCatalogs";
import styles from "./ExportFieldTransfer.module.css";

type Props = {
  available: ExportFieldDef[];
  exportFields: SelectedExportField[];
  onChange: (next: { available: ExportFieldDef[]; exportFields: SelectedExportField[] }) => void;
  disabled?: boolean;
};

export function ExportFieldTransfer({ available, exportFields, onChange, disabled }: Props) {
  const [selectedAvailable, setSelectedAvailable] = useState<string | null>(null);
  const [selectedExport, setSelectedExport] = useState<string | null>(null);

  const pushState = (nextAvailable: ExportFieldDef[], nextExport: SelectedExportField[]) => {
    onChange({ available: nextAvailable, exportFields: nextExport });
    if (selectedAvailable && !nextAvailable.some((field) => field.columnKey === selectedAvailable)) {
      setSelectedAvailable(null);
    }
    if (selectedExport && !nextExport.some((field) => field.columnKey === selectedExport)) {
      setSelectedExport(null);
    }
  };

  const moveAllRight = () => {
    if (available.length === 0) return;
    pushState(
      [],
      [...exportFields, ...available.map((field) => ({ ...field, enabled: true }))],
    );
  };

  const moveRight = () => {
    const key = selectedAvailable ?? (available.length === 1 ? available[0].columnKey : null);
    if (!key) return;
    const field = available.find((item) => item.columnKey === key);
    if (!field) return;
    pushState(
      available.filter((item) => item.columnKey !== key),
      [...exportFields, { ...field, enabled: true }],
    );
  };

  const moveLeft = () => {
    const key = selectedExport ?? (exportFields.length === 1 ? exportFields[0].columnKey : null);
    if (!key) return;
    const field = exportFields.find((item) => item.columnKey === key);
    if (!field) return;
    pushState(
      [...available, { columnKey: field.columnKey, label: field.label }],
      exportFields.filter((item) => item.columnKey !== key),
    );
  };

  const moveAllLeft = () => {
    if (exportFields.length === 0) return;
    pushState(
      [...available, ...exportFields.map(({ columnKey, label }) => ({ columnKey, label }))],
      [],
    );
  };

  const toggleEnabled = (columnKey: string, enabled: boolean) => {
    setSelectedExport(columnKey);
    pushState(
      available,
      exportFields.map((field) => (field.columnKey === columnKey ? { ...field, enabled } : field)),
    );
  };

  const exportRows = useMemo(
    () =>
      exportFields.map((field) => ({
        ...field,
        selected: field.columnKey === selectedExport,
      })),
    [exportFields, selectedExport],
  );

  const stopBubble = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
  };

  const canMoveRight = available.length > 0 && (selectedAvailable !== null || available.length === 1);
  const canMoveLeft = exportFields.length > 0 && (selectedExport !== null || exportFields.length === 1);

  return (
    <div className={styles.panel}>
      <div className={styles.column}>
        <span className={styles.columnLabel}>Campos disponibles</span>
        <div className={styles.listShell}>
          <ul className={styles.availableList} role="listbox" aria-label="Campos disponibles">
            {available.map((field) => {
              const selected = field.columnKey === selectedAvailable;
              return (
                <li key={field.columnKey} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={disabled}
                    className={[styles.availableItem, selected ? styles.itemSelected : ""].filter(Boolean).join(" ")}
                    onClick={() => setSelectedAvailable(field.columnKey)}
                    onDoubleClick={(event) => {
                      stopBubble(event);
                      pushState(
                        available.filter((entry) => entry.columnKey !== field.columnKey),
                        [...exportFields, { ...field, enabled: true }],
                      );
                    }}
                  >
                    {field.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={styles.transferCol}>
        <button
          type="button"
          className={styles.transferBtn}
          disabled={disabled || available.length === 0}
          onClick={(event) => {
            stopBubble(event);
            moveAllRight();
          }}
          title="Agregar todos"
        >
          |&gt;
        </button>
        <button
          type="button"
          className={styles.transferBtn}
          disabled={disabled || !canMoveRight}
          onClick={(event) => {
            stopBubble(event);
            moveRight();
          }}
          title="Agregar"
        >
          &gt;
        </button>
        <button
          type="button"
          className={styles.transferBtn}
          disabled={disabled || !canMoveLeft}
          onClick={(event) => {
            stopBubble(event);
            moveLeft();
          }}
          title="Quitar"
        >
          &lt;
        </button>
        <button
          type="button"
          className={styles.transferBtn}
          disabled={disabled || exportFields.length === 0}
          onClick={(event) => {
            stopBubble(event);
            moveAllLeft();
          }}
          title="Quitar todos"
        >
          &lt;|
        </button>
      </div>

      <div className={styles.column}>
        <span className={styles.columnLabel}>Campos a exportar</span>
        <div className={styles.listShell}>
          <ul className={styles.exportList} role="listbox" aria-label="Campos a exportar">
            {exportRows.map((field) => (
              <li
                key={field.columnKey}
                role="presentation"
                className={[styles.exportRow, field.selected ? styles.itemSelected : ""].filter(Boolean).join(" ")}
                onClick={() => setSelectedExport(field.columnKey)}
                onDoubleClick={(event) => {
                  stopBubble(event);
                  pushState(
                    [...available, { columnKey: field.columnKey, label: field.label }],
                    exportFields.filter((item) => item.columnKey !== field.columnKey),
                  );
                }}
              >
                <label className={styles.exportItem}>
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    disabled={disabled}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => toggleEnabled(field.columnKey, event.target.checked)}
                  />
                  <span className={styles.exportCode}>{field.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
