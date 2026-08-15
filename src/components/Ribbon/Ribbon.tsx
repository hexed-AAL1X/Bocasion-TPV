import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RibbonTabId } from "../../data/ribbon";
import { ribbonTabs } from "../../data/ribbon";
import { fetchSunatExchangeRates } from "../../utils/exchangeRates";
import { getEfficientMode } from "../../services/performanceSettings";
import { getRibbonTabDirection } from "../../utils/ribbonTabDirection";
import { RibbonToolbarContent } from "./RibbonToolbarContent";
import styles from "./Ribbon.module.css";

const EFFICIENT = getEfficientMode();

/** Gracia al salir con el mouse (ms) — tiempo para moverse a los iconos del ribbon */
const RIBBON_LEAVE_GRACE_MS = EFFICIENT ? 80 : 180;
/** Retardo antes de abrir por hover (evita aperturas accidentales al pasar el mouse) */
const RIBBON_HOVER_OPEN_DELAY_MS = EFFICIENT ? 40 : 100;
/** Mantener abierto tras clic en la barra (ms) */
const RIBBON_CLICK_HOLD_MS = EFFICIENT ? 2500 : 3500;

type Props = {
  activeTab: RibbonTabId;
  onTabChange: (tab: RibbonTabId) => void;
  onEntidadesAction?: (actionId: string) => void;
  /** Modo caja: oculta iconos del ribbon; hover o Ctrl+Shift+R lo muestran */
  compact?: boolean;
};

type Currency = "USD" | "EUR";
type ExchangeRate = { buy: string; sell: string };

function useExchangeRate() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [rates, setRates] = useState<Record<Currency, ExchangeRate>>({
    USD: { buy: "3.412", sell: "3.417" },
    EUR: { buy: "3.973", sell: "4.162" },
  });

  useEffect(() => {
    if (EFFICIENT) return;

    async function fetchRates() {
      const live = await fetchSunatExchangeRates();
      if (live.USD || live.EUR) {
        setRates((prev) => ({
          USD: live.USD ?? prev.USD,
          EUR: live.EUR ?? prev.EUR,
        }));
      }
    }

    fetchRates();
    const id = setInterval(fetchRates, 600_000);
    return () => clearInterval(id);
  }, []);

  return { currency, setCurrency, rate: rates[currency] };
}

function ExchangeTicker() {
  const { currency, setCurrency, rate } = useExchangeRate();

  return (
    <div className={styles.exchange}>
      <button
        className={styles.currencyToggle}
        onClick={() => setCurrency(currency === "USD" ? "EUR" : "USD")}
        title="Cambiar moneda"
      >
        {currency === "USD" ? "$" : "€"}
      </button>
      <span className={styles.exchangeLabel}>Compra:</span>
      <span className={styles.exchangeVal}>{rate.buy}</span>
      <span className={styles.exchangeLabel}>Venta:</span>
      <span className={styles.exchangeVal}>{rate.sell}</span>
    </div>
  );
}

function toolbarPaneClass(direction: ReturnType<typeof getRibbonTabDirection>): string {
  if (direction === 1) return styles.toolbarPaneFromRight;
  if (direction === -1) return styles.toolbarPaneFromLeft;
  return styles.toolbarPaneFade;
}

export const Ribbon = memo(function Ribbon({ activeTab, onTabChange, onEntidadesAction, compact }: Props) {
  const prevTabRef = useRef(activeTab);
  const hoveringRef = useRef(false);
  const holdUntilRef = useRef(0);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [compactOpen, setCompactOpen] = useState(false);

  const animDirection = useMemo(
    () => getRibbonTabDirection(prevTabRef.current, activeTab),
    [activeTab],
  );

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const clearEnterTimer = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  }, []);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const isHoldActive = useCallback(() => Date.now() < holdUntilRef.current, []);

  const tryCollapse = useCallback(() => {
    if (hoveringRef.current || isHoldActive()) return;
    setCompactOpen(false);
  }, [isHoldActive]);

  const scheduleCollapse = useCallback(() => {
    clearLeaveTimer();
    leaveTimerRef.current = setTimeout(tryCollapse, RIBBON_LEAVE_GRACE_MS);
  }, [clearLeaveTimer, tryCollapse]);

  const openCompact = useCallback(() => {
    if (!compact) return;
    clearLeaveTimer();
    clearEnterTimer();
    setCompactOpen(true);
  }, [clearEnterTimer, clearLeaveTimer, compact]);

  const scheduleDelayedOpen = useCallback(() => {
    if (!compact || compactOpen) return;
    clearEnterTimer();
    enterTimerRef.current = setTimeout(() => {
      enterTimerRef.current = null;
      if (hoveringRef.current) openCompact();
    }, RIBBON_HOVER_OPEN_DELAY_MS);
  }, [clearEnterTimer, compact, compactOpen, openCompact]);

  const startClickHold = useCallback(() => {
    if (!compact) return;
    holdUntilRef.current = Date.now() + RIBBON_CLICK_HOLD_MS;
    clearHoldTimer();
    clearLeaveTimer();
    clearEnterTimer();
    setCompactOpen(true);
    holdTimerRef.current = setTimeout(() => {
      holdUntilRef.current = 0;
      holdTimerRef.current = null;
      tryCollapse();
    }, RIBBON_CLICK_HOLD_MS);
  }, [clearEnterTimer, clearHoldTimer, clearLeaveTimer, compact, tryCollapse]);

  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;

    if (prev === "archivo" && activeTab !== "archivo" && compact) {
      startClickHold();
      return;
    }

    if (activeTab === "archivo") {
      holdUntilRef.current = 0;
      clearHoldTimer();
      clearLeaveTimer();
      setCompactOpen(false);
    }
  }, [activeTab, compact, startClickHold, clearHoldTimer, clearLeaveTimer]);

  useEffect(() => {
    if (!compact) {
      setCompactOpen(false);
      holdUntilRef.current = 0;
      clearLeaveTimer();
      clearEnterTimer();
      clearHoldTimer();
    }
  }, [compact, clearEnterTimer, clearHoldTimer, clearLeaveTimer]);

  useEffect(
    () => () => {
      clearLeaveTimer();
      clearEnterTimer();
      clearHoldTimer();
    },
    [clearEnterTimer, clearHoldTimer, clearLeaveTimer],
  );

  const showToolbar = activeTab !== "archivo";
  const toolbarCollapsed = !showToolbar || (compact && !compactOpen);

  const handleMouseEnter = () => {
    if (!compact) return;
    hoveringRef.current = true;
    clearLeaveTimer();
    if (compactOpen) return;
    scheduleDelayedOpen();
  };

  const handleMouseLeave = () => {
    if (!compact) return;
    hoveringRef.current = false;
    clearEnterTimer();
    scheduleCollapse();
  };

  const handleFocusCapture = () => {
    if (!compact) return;
    openCompact();
  };

  const handleBlurCapture = (event: React.FocusEvent<HTMLElement>) => {
    if (!compact) return;
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    scheduleCollapse();
  };

  const handleRibbonClick = () => {
    clearEnterTimer();
    startClickHold();
  };

  return (
    <header
      className={[
        styles.ribbon,
        !showToolbar ? styles.ribbonArchivo : "",
        compact ? styles.ribbonCompact : "",
        compact && compactOpen ? styles.ribbonCompactOpen : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={
        compact
          ? "Clic o mantén el mouse un momento para ver el menú. Ctrl+Shift+R fija el ribbon."
          : undefined
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      onClick={handleRibbonClick}
    >
      <nav className={styles.tabs} aria-label="Menú principal">
        {ribbonTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={[
              styles.tab,
              tab.id === "archivo" ? styles.tabArchivo : "",
              activeTab === tab.id ? styles.tabActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <ExchangeTicker />
      </nav>

      <div
        className={[styles.toolbarStage, toolbarCollapsed ? styles.toolbarStageCollapsed : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.toolbarStageClip}>
          {showToolbar ? (
            <div key={activeTab} className={[styles.toolbarPane, toolbarPaneClass(animDirection)].join(" ")}>
              <RibbonToolbarContent tab={activeTab} onEntidadesAction={onEntidadesAction} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
});
