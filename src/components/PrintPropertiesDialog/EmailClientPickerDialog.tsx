import {useEffect, useMemo, type ReactElement, useRef } from "react";
import { showAppMessage } from "../../utils/appDialog";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./EmailClientPickerDialog.module.css";

type EmailClient = "gmail" | "outlook" | "outlook365" | "yahoo" | "default";

type Props = {
  subject: string;
  body: string;
  attachmentPath?: string | null;
  onWebEmailReady?: () => void;
  onClose: () => void;
};

function buildEmailUrl(client: EmailClient, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  switch (client) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&su=${s}&body=${b}`;
    case "outlook":
      return `https://outlook.live.com/mail/0/deeplink/compose?subject=${s}&body=${b}`;
    case "outlook365":
      return `https://outlook.office.com/mail/deeplink/compose?subject=${s}&body=${b}`;
    case "yahoo":
      return `https://compose.mail.yahoo.com/?subject=${s}&body=${b}`;
    case "default":
      return `mailto:?subject=${s}&body=${b}`;
  }
}

function GmailIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="4" fill="#fff" stroke="#dadce0" />
      <path d="M4 9.5v11A1.5 1.5 0 0 0 5.5 22H9V14l5 4 5-4v8h3.5A1.5 1.5 0 0 0 24 20.5v-11l-10 8-10-8z" fill="#EA4335" />
      <path d="M4 9.5 14 17.5l10-8V8a1.5 1.5 0 0 0-1.5-1.5h-17A1.5 1.5 0 0 0 4 8v1.5z" fill="#4285F4" />
      <path d="M9 14v8H5.5A1.5 1.5 0 0 1 4 20.5V9.5l5 4.5z" fill="#34A853" />
      <path d="M19 14v8h3.5A1.5 1.5 0 0 0 24 20.5V9.5L19 14z" fill="#FBBC04" />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="4" fill="#0078D4" />
      <rect x="3" y="8" width="14" height="13" rx="1.5" fill="#fff" opacity="0.15" />
      <rect x="3" y="8" width="14" height="13" rx="1.5" fill="none" stroke="#fff" strokeWidth="0.5" />
      <text x="10" y="17.5" textAnchor="middle" fontFamily="Segoe UI, sans-serif" fontSize="9" fontWeight="700" fill="#fff">O</text>
      <rect x="15" y="11" width="10" height="9" rx="1" fill="#50E6FF" opacity="0.9" />
      <text x="20" y="17.5" textAnchor="middle" fontFamily="Segoe UI, sans-serif" fontSize="8" fontWeight="700" fill="#0078D4">✉</text>
    </svg>
  );
}

function Outlook365Icon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="4" fill="#D83B01" />
      <text x="14" y="19" textAnchor="middle" fontFamily="Segoe UI, sans-serif" fontSize="13" fontWeight="800" fill="#fff">365</text>
    </svg>
  );
}

function YahooIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="4" fill="#6001D2" />
      <text x="14" y="19.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900" fill="#fff">Y!</text>
    </svg>
  );
}

function DefaultMailIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="4" fill="#4a7ec5" />
      <rect x="5" y="9" width="18" height="12" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M5 10.5 14 17l9-6.5" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

const ALL_CLIENTS: {
  id: EmailClient;
  label: string;
  sublabel: string;
  Icon: () => ReactElement;
}[] = [
  { id: "default", label: "Cliente predeterminado", sublabel: "Adjunta el archivo automáticamente", Icon: DefaultMailIcon },
  { id: "gmail", label: "Gmail", sublabel: "Inicia sesión una vez; adjunta el archivo automático", Icon: GmailIcon },
  { id: "outlook", label: "Outlook / Hotmail", sublabel: "Abre Outlook; pegue el adjunto con Ctrl+V", Icon: OutlookIcon },
  { id: "outlook365", label: "Microsoft 365", sublabel: "Abre Outlook 365; pegue el adjunto con Ctrl+V", Icon: Outlook365Icon },
  { id: "yahoo", label: "Yahoo Mail", sublabel: "Abre Yahoo; pegue el adjunto con Ctrl+V", Icon: YahooIcon },
];

async function openEmailWithAttachment(subject: string, body: string, attachmentPath: string): Promise<void> {
  const api = window.bocasoft;
  if (!api?.composeEmailWithAttachment) {
    throw new Error(
      "El envío con adjunto solo funciona en la ventana de escritorio Electron. Reinicie la aplicación.",
    );
  }
  await api.composeEmailWithAttachment({ subject, body, attachmentPath });
}

export function EmailClientPickerDialog({
  subject,
  body,
  attachmentPath,
  onWebEmailReady,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const hasAttachment = Boolean(attachmentPath?.trim());

  const clients = useMemo(() => {
    if (!hasAttachment) {
      return ALL_CLIENTS.map((client) =>
        client.id === "default"
          ? { ...client, sublabel: "Aplicación de correo del sistema" }
          : client,
      );
    }
    return ALL_CLIENTS;
  }, [hasAttachment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  const openWebClient = (client: EmailClient) => {
    const url = buildEmailUrl(client, subject, body);
    if (client === "default") {
      window.location.href = url;
    } else {
      void window.bocasoft?.openExternal?.(url);
      if (!window.bocasoft?.openExternal) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleSelect = async (client: EmailClient) => {
    if (hasAttachment && attachmentPath) {
      if (client === "default") {
        try {
          await openEmailWithAttachment(subject, body, attachmentPath);
          requestClose();
        } catch (err) {
          const detail = err instanceof Error ? err.message : "";
          await showAppMessage(
            "No se pudo abrir el correo",
            detail
              ? `No se pudo abrir el correo con adjunto.\n\n${detail}`
              : "No se pudo abrir el correo con adjunto.",
          );
        }
        return;
      }

      if (client === "gmail" && window.bocasoft?.openGmailComposeWithAttachment) {
        try {
          const result = await window.bocasoft.openGmailComposeWithAttachment({
            subject,
            body,
            attachmentPath,
          });
          if (!result.attached) {
            if (result.needsLogin) {
              await showAppMessage(
                "Gmail",
                "Inicie sesión en Gmail en la ventana que se abrió.\n\n" +
                  "Luego vuelva a exportar y enviar por correo para adjuntar el archivo.\n\n" +
                  "Como respaldo, el archivo quedó copiado: pulse Ctrl+V en el cuerpo del correo.",
              );
            } else {
              await showAppMessage(
                "Gmail",
                "No se pudo adjuntar automáticamente en Gmail.\n\n" +
                  "El archivo quedó copiado: haga clic en el cuerpo del correo y pulse Ctrl+V.",
              );
            }
          }
          onWebEmailReady?.();
          requestClose();
        } catch (err) {
          const detail = err instanceof Error ? err.message : "";
          await showAppMessage(
            "No se pudo abrir Gmail",
            detail ? `${detail}` : "No se pudo abrir Gmail.",
          );
        }
        return;
      }

      const url = buildEmailUrl(client, subject, body);
      try {
        if (window.bocasoft?.openWebEmailWithAttachment) {
          await window.bocasoft.openWebEmailWithAttachment({ url, attachmentPath });
          onWebEmailReady?.();
        } else {
          openWebClient(client);
        }
        requestClose();
      } catch (err) {
        const detail = err instanceof Error ? err.message : "";
        await showAppMessage(
          "Correo",
          detail
            ? `No se pudo preparar el correo.\n\n${detail}`
            : "No se pudo preparar el correo.",
        );
      }
      return;
    }

    openWebClient(client);
    requestClose();
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="email-picker-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="email-picker-title" className={styles.titleText}>
            Seleccionar cliente de correo
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.hint}>
            {hasAttachment
              ? "Con Gmail se abre una ventana integrada: inicie sesión la primera vez y el adjunto se agrega solo. Outlook/Yahoo abren en el navegador."
              : "Seleccione la aplicación con la que desea enviar el correo:"}
          </p>
          <ul className={styles.clientList} role="listbox" aria-label="Clientes de correo">
            {clients.map(({ id, label, sublabel, Icon }) => (
              <li key={id} role="none">
                <button
                  type="button"
                  className={styles.clientBtn}
                  onClick={() => void handleSelect(id)}
                  role="option"
                  aria-selected="false"
                >
                  <span className={styles.clientIcon}>
                    <Icon />
                  </span>
                  <span className={styles.clientInfo}>
                    <span className={styles.clientLabel}>{label}</span>
                    <span className={styles.clientSub}>{sublabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.btn} onClick={requestClose}>
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  );
}
