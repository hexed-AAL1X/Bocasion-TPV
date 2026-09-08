import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EmissionPointRecord } from "../../data/emissionPoints";
import {
  PC_POINT_ASSIGNMENTS,
  sortPcPointAssignments,
  type PcPointAssignmentRecord,
} from "../../data/pcPointAssignments";
import {
  emptyPcPointAssignmentForm,
  pcPointAssignmentFormToRecord,
  pcPointAssignmentRecordToForm,
  type PcPointAssignmentFormValues,
} from "../../utils/emissionPointFormUtils";
import { useRepeatingPress, useTableRowFollow } from "../../hooks/useTableRowFollow";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { CarrierDeleteConfirmDialog } from "../TransportistasDialog/CarrierDeleteConfirmDialog";
import { PcPointAssignmentFormDialog } from "./PcPointAssignmentFormDialog";
import styles from "./PcPointAssignmentDialog.module.css";
import { NavIcon, DocIcon, RefreshIcon } from "../shared/dialogIcons";


type Props = {
  emissionPoints: EmissionPointRecord[];
  onClose: () => void;
};

type FormState = { mode: "add" } | { mode: "edit"; recordId: string };

function puntoLabel(point: EmissionPointRecord | undefined): string {
  if (!point) return "";
  return `${point.codigo} - ${point.nombre}`;
}

export function PcPointAssignmentDialog({ emissionPoints, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
  });
  const [rows, setRows] = useState<PcPointAssignmentRecord[]>(() => sortPcPointAssignments(PC_POINT_ASSIGNMENTS));
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PcPointAssignmentRecord | null>(null);
  const [selectedId, setSelectedId] = useState(() => sortPcPointAssignments(PC_POINT_ASSIGNMENTS)[0]?.id ?? "");

  const formInitialValues = useMemo(() => {
    const defaultPunto = emissionPoints.find((point) => point.habilitado)?.id ?? emissionPoints[0]?.id ?? "";
    if (!formState) return emptyPcPointAssignmentForm(rows, defaultPunto);
    if (formState.mode === "add") return emptyPcPointAssignmentForm(rows, defaultPunto);
    const row = rows.find((item) => item.id === formState.recordId);
    return row ? pcPointAssignmentRecordToForm(row) : emptyPcPointAssignmentForm(rows, defaultPunto);
  }, [emissionPoints, formState, rows]);

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const { goFirst, goPrev, goNext, goLast, currentIndex, atStart, atEnd } = useTableRowFollow({
    tableWrapRef,
    rowIds,
    selectedId,
    setSelectedId,
    selectedClassName: styles.rowSelected,
  });
  const firstPress = useRepeatingPress(goFirst, atStart);
  const prevPress = useRepeatingPress(goPrev, atStart);
  const nextPress = useRepeatingPress(goNext, atEnd);
  const lastPress = useRepeatingPress(goLast, atEnd);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const idx = rows.findIndex((row) => row.id === deletedId);
    const next = rows.filter((row) => row.id !== deletedId);
    setRows(sortPcPointAssignments(next));
    setDeleteTarget(null);
    if (next.length > 0) setSelectedId(next[Math.min(idx, next.length - 1)].id);
  }, [deleteTarget, rows]);

  const handleSave = useCallback(
    (values: PcPointAssignmentFormValues) => {
      const point = emissionPoints.find((item) => item.id === values.puntoEmisionId);
      const label = puntoLabel(point);
      if (formState?.mode === "edit") {
        const existing = rows.find((row) => row.id === formState.recordId);
        const record = pcPointAssignmentFormToRecord(values, label, existing);
        setRows((prev) => sortPcPointAssignments(prev.map((row) => (row.id === formState.recordId ? record : row))));
        setSelectedId(record.id);
      } else {
        const record = pcPointAssignmentFormToRecord(values, label);
        setRows((prev) => sortPcPointAssignments([...prev, record]));
        setSelectedId(record.id);
      }
      setFormState(null);
    },
    [emissionPoints, formState, rows],
  );

  const handleRefreshData = useCallback(() => {
    const refreshed = sortPcPointAssignments(PC_POINT_ASSIGNMENTS);
    setRows(refreshed);
    setDeleteTarget(null);
    setFormState(null);
    if (refreshed[0]) setSelectedId(refreshed[0].id);
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={windowRef}
        className={styles.window}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="pc-assignment-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="pc-assignment-title" className={styles.titleText}>
            PC asignado a un punto y almacén fijo
          </h1>
          <div className={styles.titleBtns}>
            <button type="button" className={`${styles.titleSysBtn} ${styles.titleClose}`} onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.navGroup}>
            <button type="button" className={styles.toolbarBtn} title="Primero" disabled={atStart} {...firstPress}>
              <NavIcon kind="first" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Anterior" disabled={atStart} {...prevPress}>
              <NavIcon kind="prev" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Siguiente" disabled={atEnd} {...nextPress}>
              <NavIcon kind="next" />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Último" disabled={atEnd} {...lastPress}>
              <NavIcon kind="last" />
            </button>
          </div>

          <span className={styles.toolbarSep} aria-hidden="true" />

          <button type="button" className={styles.toolbarBtn} title="Nuevo" onClick={() => setFormState({ mode: "add" })}>
            <DocIcon variant="new" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Eliminar"
            disabled={rows.length === 0}
            onClick={() => {
              const row = rows[currentIndex];
              if (row) setDeleteTarget(row);
            }}
          >
            <DocIcon variant="delete" />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Editar"
            disabled={rows.length === 0}
            onClick={() => {
              const row = rows[currentIndex];
              if (row) setFormState({ mode: "edit", recordId: row.id });
            }}
          >
            <DocIcon variant="edit" />
          </button>
          <button type="button" className={styles.toolbarBtn} title="Actualizar datos" onClick={handleRefreshData}>
            <RefreshIcon />
          </button>
        </div>

        <div className={styles.tableWrap} ref={tableWrapRef}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre de la PC</th>
                <th>Punto</th>
                <th>Almacén</th>
                <th>FE - Formato</th>
                <th style={{ width: 72 }}>FE - copias</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    No hubo datos en el resultado...
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    data-row-id={row.id}
                    className={[
                      index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                      row.id === selectedId ? styles.rowSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedId(row.id)}
                    onDoubleClick={() => setFormState({ mode: "edit", recordId: row.id })}
                  >
                    <td>{row.nombrePc}</td>
                    <td>{row.puntoEmisionLabel}</td>
                    <td>{row.almacenPredeterminado}</td>
                    <td>{row.formatoImpresion}</td>
                    <td className={styles.colCenter}>{row.numCopias}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.statusBar}>{rows.length} registros...</div>
      </div>

      {formState ? (
        <PcPointAssignmentFormDialog
          key={formState.mode === "edit" ? formState.recordId : "add"}
          mode={formState.mode}
          initialValues={formInitialValues}
          emissionPoints={emissionPoints}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {deleteTarget ? (
        <CarrierDeleteConfirmDialog
          carrierName={deleteTarget.nombrePc}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}
