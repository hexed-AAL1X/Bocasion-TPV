import { useEffect, useState, type ReactNode } from "react";
import { AboutDialog } from "./AboutDialog/AboutDialog";
import { COMPANY_NAME } from "../config/brand";
import { useLocalWeather } from "../hooks/useLocalWeather";
import { getEfficientMode } from "../services/performanceSettings";
import { ThemeToggleButton } from "../theme/ThemeToggleButton";
import type { Vendor } from "../data/vendors";
import styles from "./StatusBar.module.css";

const EFFICIENT = getEfficientMode();

const session = {
  tienda: "Demo Tienda",
  ptoVta: "Caja 01",
  almacen: "Almacén principal",
};

function formatFechaContable(d: Date) {
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatDate(d: Date) {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

const WeatherSvg: Record<string, ReactNode> = {
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  "cloud-sun": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9z"/>
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>
    </svg>
  ),
  "cloud-fog": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="7" y1="17" x2="17" y2="17"/>
    </svg>
  ),
  "cloud-rain": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/>
    </svg>
  ),
};

type Props = {
  vendor: Vendor;
};

export function StatusBar({ vendor }: Props) {
  const [now, setNow] = useState(new Date());
  const [aboutOpen, setAboutOpen] = useState(false);
  const weather = useLocalWeather(EFFICIENT);
  const tienda = vendor.tienda || session.tienda;
  const ptoVta = vendor.ptoVta || vendor.nombre || session.ptoVta;
  const almacen = vendor.almacen || session.almacen;

  useEffect(() => {
    const interval = EFFICIENT ? 60_000 : 1_000;
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.welcome}>
          <span className={styles.welcomeIcon} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          ¡Bienvenido!
        </div>
        <span className={styles.sep} aria-hidden />
        <div className={styles.meta}>
          {weather && (
            <span><em>Ubicación:</em> {weather.locality}</span>
          )}
          <span><em>Tienda:</em> {tienda}</span>
          <span><em>Pto.Vta:</em> {ptoVta}</span>
          <span><em>Almacén:</em> {almacen}</span>
          <span><em>Vendedor:</em> {vendor.nombre} ({vendor.usuario})</span>
          <span><em>Fecha contable:</em> {formatFechaContable(now)}</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.infoRow}>
          <ThemeToggleButton embedded />
          {weather && (
            <div className={styles.weather} title={weather.locality}>
              <span className={styles.weatherIcon}>{WeatherSvg[weather.icon]}</span>
              <span className={styles.weatherTemp}>{weather.temp}°C</span>
              <span className={styles.weatherDesc}>{weather.desc}</span>
            </div>
          )}
          <span className={styles.date}>{formatDate(now)}</span>
          <span className={styles.time}>{formatTime(now)}</span>
        </div>
        <button
          type="button"
          className={styles.companyBtn}
          onClick={() => setAboutOpen(true)}
          title={`Acerca de — ${COMPANY_NAME}`}
        >
          © {COMPANY_NAME}
        </button>
      </div>
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </footer>
  );
}
