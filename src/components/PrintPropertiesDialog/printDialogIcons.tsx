type IconProps = { size?: number };

export const PRINT_FORMATS = [
  { value: "calidad", label: "CALIDAD" },
  { value: "borrador", label: "BORRADOR" },
] as const;

export type PrintFormatId = (typeof PRINT_FORMATS)[number]["value"];

/** Impresora con hoja de salida — estilo diálogo clásico. */
export function PrintActionIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="7" y="1.5" width="10" height="5" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <line x1="8.5" y1="3.5" x2="15.5" y2="3.5" stroke="#c0c0c0" strokeWidth="0.8" />
      <rect x="4" y="7" width="16" height="8" rx="1" fill="#d8d8d8" stroke="#5a5a5a" strokeWidth="1.1" />
      <rect x="5.5" y="8.5" width="13" height="2.5" fill="#9a9a9a" />
      <circle cx="17" cy="13" r="1" fill="#4a4a4a" />
      <rect x="7" y="14" width="10" height="7.5" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <line x1="8.5" y1="16.5" x2="15.5" y2="16.5" stroke="#d0d0d0" strokeWidth="0.8" />
      <line x1="8.5" y1="18.5" x2="14" y2="18.5" stroke="#d0d0d0" strokeWidth="0.8" />
    </svg>
  );
}

/** Documento con lupa — vista preliminar. */
export function PreviewActionIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="3" width="11" height="14" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <line x1="6" y1="7" x2="13" y2="7" stroke="#c8c8c8" strokeWidth="0.8" />
      <line x1="6" y1="9.5" x2="12" y2="9.5" stroke="#c8c8c8" strokeWidth="0.8" />
      <line x1="6" y1="12" x2="13" y2="12" stroke="#c8c8c8" strokeWidth="0.8" />
      <circle cx="16" cy="15" r="4.5" fill="#f0f0f0" stroke="#5a5a5a" strokeWidth="1.2" />
      <circle cx="16" cy="15" r="2.8" fill="#fff" stroke="#7a7a7a" strokeWidth="1" />
      <line x1="19.2" y1="18.2" x2="22" y2="21" stroke="#5a5a5a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Carpeta con flecha de salida — exportar. */
export function ExportActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M3 8h7l2 2h9v10H3V8z"
        fill="#f4e4a8"
        stroke="#8a7a4a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M10 8V6h4v2" fill="#e8d890" stroke="#8a7a4a" strokeWidth="0.8" />
      <path
        d="M14 11v5h3l-4 4-4-4h3v-5h2z"
        fill="#217346"
        stroke="#145a32"
        strokeWidth="0.6"
      />
    </svg>
  );
}

/** Hoja Excel (barra verde + X). */
export function ExcelActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="0.8" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="4" y="3" width="6" height="18" fill="#217346" />
      <text x="5.2" y="14.5" fontSize="8" fontWeight="700" fill="#fff" fontFamily="Segoe UI, Arial, sans-serif">
        X
      </text>
      <line x1="11" y1="8" x2="18" y2="8" stroke="#d0d0d0" strokeWidth="0.9" />
      <line x1="11" y1="11" x2="18" y2="11" stroke="#d0d0d0" strokeWidth="0.9" />
      <line x1="11" y1="14" x2="16" y2="14" stroke="#d0d0d0" strokeWidth="0.9" />
      <line x1="11" y1="17" x2="17" y2="17" stroke="#d0d0d0" strokeWidth="0.9" />
    </svg>
  );
}

/** Documento con etiqueta PDF roja. */
export function PdfActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="0.8" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="6" y="14" width="9" height="5" fill="#c62828" />
      <text x="6.8" y="18" fontSize="4.5" fontWeight="700" fill="#fff" fontFamily="Segoe UI, Arial, sans-serif">
        PDF
      </text>
      <line x1="7" y1="7" x2="17" y2="7" stroke="#e0e0e0" strokeWidth="0.8" />
      <line x1="7" y1="10" x2="15" y2="10" stroke="#e0e0e0" strokeWidth="0.8" />
    </svg>
  );
}

/** Ventana de navegador con etiqueta HTML. */
export function HtmlActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="3" y="5" width="18" height="4.5" fill="#4a90d9" stroke="#6a6a6a" strokeWidth="1" />
      <circle cx="5.5" cy="7.2" r="0.8" fill="#fff" />
      <circle cx="7.8" cy="7.2" r="0.8" fill="#fff" />
      <text x="10" y="8.3" fontSize="4" fontWeight="700" fill="#fff" fontFamily="Consolas, monospace">
        HTML
      </text>
      <text x="6" y="15" fontSize="5.5" fill="#1565c0" fontFamily="Consolas, monospace">
        {"</>"}
      </text>
      <line x1="6" y1="17.5" x2="16" y2="17.5" stroke="#d0d0d0" strokeWidth="0.8" />
    </svg>
  );
}

/** Documento Word (barra azul + W). */
export function WordActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="0.8" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="4" y="3" width="6" height="18" fill="#2b579a" />
      <text x="5" y="14.5" fontSize="8" fontWeight="700" fill="#fff" fontFamily="Segoe UI, Arial, sans-serif">
        W
      </text>
      <line x1="11" y1="8" x2="18" y2="8" stroke="#d0d0d0" strokeWidth="0.9" />
      <line x1="11" y1="11" x2="18" y2="11" stroke="#d0d0d0" strokeWidth="0.9" />
      <line x1="11" y1="14" x2="17" y2="14" stroke="#d0d0d0" strokeWidth="0.9" />
    </svg>
  );
}

/** Tabla DBF (dBase). */
export function DbfActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="0.8" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="4" y="4" width="16" height="5" fill="#d4d0c8" stroke="#6a6a6a" strokeWidth="1" />
      <text x="6" y="8" fontSize="4.5" fontWeight="700" fill="#333" fontFamily="Consolas, monospace">
        DBF
      </text>
      <line x1="4" y1="12" x2="20" y2="12" stroke="#c0c0c0" strokeWidth="0.8" />
      <line x1="10" y1="9" x2="10" y2="20" stroke="#c0c0c0" strokeWidth="0.8" />
      <line x1="4" y1="15.5" x2="20" y2="15.5" stroke="#e0e0e0" strokeWidth="0.8" />
      <line x1="4" y1="18.5" x2="20" y2="18.5" stroke="#e0e0e0" strokeWidth="0.8" />
    </svg>
  );
}

/** Imagen JPG. */
export function JpgActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="5.5" y="6" width="13" height="9" fill="#87ceeb" stroke="#5a8ab0" strokeWidth="0.8" />
      <circle cx="9" cy="9" r="1.4" fill="#ffd54f" />
      <path d="M6 14l3.5-2.5 2.5 2 4-3.5 2 4H6z" fill="#4caf50" />
      <rect x="6" y="16.5" width="8" height="2.5" fill="#e65100" />
      <text x="14.5" y="18.3" fontSize="4" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        JPG
      </text>
    </svg>
  );
}

/** Imagen PNG. */
export function PngActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="5.5" y="6" width="13" height="9" fill="#b3e5fc" stroke="#5a8ab0" strokeWidth="0.8" />
      <circle cx="9" cy="9" r="1.4" fill="#ffca28" />
      <path d="M6 14l3.5-2.5 2.5 2 4-3.5 2 4H6z" fill="#66bb6a" />
      <rect x="6" y="16.5" width="8" height="2.5" fill="#00897b" />
      <text x="14" y="18.3" fontSize="4" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        PNG
      </text>
    </svg>
  );
}

/** Bloc de notas con líneas de texto. */
export function TxtActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="0.8" fill="#fffef5" stroke="#6a6a6a" strokeWidth="1" />
      <rect x="5" y="3" width="3" height="18" fill="#e8e0c8" />
      <line x1="10" y1="8" x2="17" y2="8" stroke="#b0b0b0" strokeWidth="0.9" />
      <line x1="10" y1="11" x2="17" y2="11" stroke="#b0b0b0" strokeWidth="0.9" />
      <line x1="10" y1="14" x2="16" y2="14" stroke="#b0b0b0" strokeWidth="0.9" />
      <line x1="10" y1="17" x2="15" y2="17" stroke="#b0b0b0" strokeWidth="0.9" />
    </svg>
  );
}

/** Sobre de correo. */
export function EmailActionIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="1" fill="#fff" stroke="#6a6a6a" strokeWidth="1.1" />
      <path d="M3 7.5l9 6.5 9-6.5" fill="none" stroke="#6a6a6a" strokeWidth="1.2" />
      <path d="M3 18l7.5-5.5M21 18l-7.5-5.5" fill="none" stroke="#a0a0a0" strokeWidth="0.9" />
    </svg>
  );
}

/** Pila de hojas — copias. */
export function CopiesActionIcon({ size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="7" y="2" width="12" height="15" fill="#f0f0f0" stroke="#9a9a9a" strokeWidth="0.9" />
      <rect x="5" y="4" width="12" height="15" fill="#fafafa" stroke="#8a8a8a" strokeWidth="0.9" />
      <rect x="3" y="6" width="12" height="15" fill="#fff" stroke="#6a6a6a" strokeWidth="1" />
      <line x1="5.5" y1="10" x2="12.5" y2="10" stroke="#d0d0d0" strokeWidth="0.8" />
      <line x1="5.5" y1="13" x2="12" y2="13" stroke="#d0d0d0" strokeWidth="0.8" />
      <line x1="5.5" y1="16" x2="11" y2="16" stroke="#d0d0d0" strokeWidth="0.8" />
    </svg>
  );
}

/** Puerta con flecha de salida. */
export function ExitActionIcon({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="4" width="10" height="16" fill="#f0f0f0" stroke="#6a6a6a" strokeWidth="1.1" />
      <circle cx="11" cy="12" r="1" fill="#8a8a8a" />
      <path
        d="M14 12h6M18 9l3 3-3 3"
        fill="none"
        stroke="#c62828"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
