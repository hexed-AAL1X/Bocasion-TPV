import { useEffect, useMemo, useState } from "react";
import { searchClients, type Client } from "../../data/clients";
import styles from "./ClientSelectorDialog.module.css";

type Props = {
  initialQuery?: string;
  onSelect: (client: Client) => void;
  onClose: () => void;
};

export function ClientSelectorDialog({ initialQuery = "", onSelect, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Client | null>(null);

  const results = useMemo(() => searchClients(query), [query]);

  useEffect(() => {
    setSelected(null);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && selected) onSelect(selected);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onSelect, selected]);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="client-selector-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="client-selector-title" className={styles.titleText}>
            Seleccionar
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colDoc}>DNI/RUC</th>
                <th className={styles.colName}>Cliente</th>
              </tr>
            </thead>
            <tbody>
              {results.map((client) => (
                <tr
                  key={client.document}
                  className={`${styles.row} ${selected?.document === client.document ? styles.rowSelected : ""}`}
                  onClick={() => setSelected(client)}
                  onDoubleClick={() => onSelect(client)}
                >
                  <td className={styles.colDoc}>{client.document}</td>
                  <td className={styles.colName}>{client.name}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={2} className={styles.emptyMsg}>
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnConfirm}
            disabled={!selected}
            onClick={handleConfirm}
          >
            Seleccionar
          </button>
        </footer>
      </div>
    </div>
  );
}
