/**
 * Iconos SVG compartidos entre todos los diálogos CRUD del sistema.
 * Centraliza las definiciones para evitar duplicación.
 */

export function TitleMaximizeIcon({ restore }: { restore?: boolean }) {
  if (restore) {
    return (
      <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
        <rect x="0.5" y="2.5" width="6" height="6" fill="#9ab8d0" stroke="#1a1a1a" strokeWidth="0.9" />
        <rect x="3.5" y="0.5" width="6" height="6" fill="#d8e8f8" stroke="#1a1a1a" strokeWidth="0.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
      <rect x="0.5" y="0.5" width="9" height="9" fill="#d8e8f8" stroke="#1a1a1a" strokeWidth="0.9" />
    </svg>
  );
}

export function NavIcon({ kind }: { kind: "first" | "prev" | "next" | "last" }) {
  const color = "#c42b1c";
  const sw = 1.75;
  const cap = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      {kind === "first" && (
        <>
          <line x1="2.5" y1="3" x2="2.5" y2="13" stroke={color} strokeWidth={sw} {...cap} />
          <line x1="5" y1="3" x2="5" y2="13" stroke={color} strokeWidth={sw} {...cap} />
          <polyline points="10,5.5 6.5,8 10,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
        </>
      )}
      {kind === "prev" && (
        <polyline points="10,5.5 6.5,8 10,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
      )}
      {kind === "next" && (
        <polyline points="6,5.5 9.5,8 6,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
      )}
      {kind === "last" && (
        <>
          <polyline points="6,5.5 9.5,8 6,10.5" fill="none" stroke={color} strokeWidth={sw} {...cap} />
          <line x1="11" y1="3" x2="11" y2="13" stroke={color} strokeWidth={sw} {...cap} />
          <line x1="13.5" y1="3" x2="13.5" y2="13" stroke={color} strokeWidth={sw} {...cap} />
        </>
      )}
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="10" cy="10" r="6.5" fill="#fff" stroke="#666" strokeWidth="1.2" />
      <line x1="15" y1="15" x2="20" y2="20" stroke="#666" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="6" y="2" width="12" height="5" rx="0.5" fill="#e8e8e8" stroke="#7a7a7a" strokeWidth="1.2" />
      <rect x="4" y="9" width="16" height="9" rx="1" fill="#f4f4f4" stroke="#7a7a7a" strokeWidth="1.2" />
      <rect x="7" y="13" width="10" height="6" fill="#fff" stroke="#9a9a9a" strokeWidth="1" />
    </svg>
  );
}

/** variant "transfer" solo usado en AlmacenesDialog */
export function DocIcon({ variant }: { variant: "new" | "delete" | "edit" | "transfer" }) {
  if (variant === "delete") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="5" y="5" width="14" height="14" fill="#fff" stroke="#888" strokeWidth="1" />
        <line x1="8" y1="8" x2="16" y2="16" stroke="#c42b1c" strokeWidth="2" />
        <line x1="16" y1="8" x2="8" y2="16" stroke="#c42b1c" strokeWidth="2" />
      </svg>
    );
  }
  if (variant === "edit") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="4" y="4" width="13" height="16" fill="#fff" stroke="#888" strokeWidth="1" />
        <path d="M12 14l6-6 2 2-6 6h-2z" fill="#ffd" stroke="#666" strokeWidth="0.8" />
      </svg>
    );
  }
  if (variant === "transfer") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="2" y="6" width="8" height="10" fill="#fff" stroke="#888" strokeWidth="1" />
        <rect x="14" y="6" width="8" height="10" fill="#fff" stroke="#888" strokeWidth="1" />
        <path d="M10 11h4M12 9l2 2-2 2" fill="none" stroke="#316ac5" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="5" y="3" width="14" height="18" fill="#fff" stroke="#888" strokeWidth="1" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        d="M5 5v4h4M19 19v-4h-4"
        fill="none"
        stroke="#316ac5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10a7 7 0 0 1 12-2.5M17.5 14A7 7 0 0 1 5.5 16"
        fill="none"
        stroke="#316ac5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
