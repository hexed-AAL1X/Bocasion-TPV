import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppBootSplash } from "./components/AppBootSplash";
import { LoginScreen } from "./components/LoginScreen";
import { DEFAULT_VENDOR } from "./data/vendors";
import type { Vendor } from "./data/vendors";
import { initSalesSessionForLogin } from "./services/salesSession";
import { ThemeProvider } from "./theme/ThemeProvider";
import { getEfficientMode } from "./services/performanceSettings";
import {
  currentHeapMB,
  logMemSnapshot,
  logPerfEvent,
  logPerfLoginVsApp,
  logPerfStartupSummary,
} from "./utils/perfLog";
import appStyles from "./App.module.css";

const EFFICIENT_MODE = getEfficientMode();

logPerfEvent("App módulo cargado", EFFICIENT_MODE);
logPerfStartupSummary(EFFICIENT_MODE);

let appShellModulePromise: Promise<typeof import("./components/AppShell")> | null = null;

function loadAppShellModule(reason: string): Promise<typeof import("./components/AppShell")> {
  if (appShellModulePromise) {
    logPerfEvent(`AppShell — caché (${reason})`, EFFICIENT_MODE);
    return appShellModulePromise;
  }
  logPerfEvent(`AppShell — descarga iniciada (${reason})`, EFFICIENT_MODE);
  appShellModulePromise = import("./components/AppShell").then((m) => {
    logPerfEvent("AppShell — descarga completa", EFFICIENT_MODE);
    logMemSnapshot("AppShell en memoria");
    return m;
  });
  return appShellModulePromise;
}

const LazyAppShell = lazy(() =>
  loadAppShellModule("montaje").then((m) => ({ default: m.AppShell })),
);

if (!EFFICIENT_MODE) {
  void loadAppShellModule("prefetch arranque");
}

const LOGIN_FADE_MS = EFFICIENT_MODE ? 80 : 180;
const SPLASH_FADE_MS = EFFICIENT_MODE ? 80 : 180;
const MIN_SPLASH_MS = EFFICIENT_MODE ? 0 : 80;

type AppPhase = "login" | "loading" | "ventas";

type ShellProps = {
  vendor: Vendor;
  onChangeVendor: (v: Vendor) => void;
  onExit: () => void;
  onReady: () => void;
};

function AppShellReady({ onReady, ...props }: ShellProps) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <LazyAppShell {...props} />;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("login");
  const [loginMounted, setLoginMounted] = useState(true);
  const [loginExiting, setLoginExiting] = useState(false);
  const [splashExiting, setSplashExiting] = useState(false);
  const [vendor, setVendor] = useState<Vendor>(DEFAULT_VENDOR);
  const loginRenderedRef = useRef(false);
  const loginHeapRef = useRef<number | null>(null);
  const loadStartedAtRef = useRef(0);
  const loginTimerRef = useRef<number | null>(null);
  const splashTimerRef = useRef<number | null>(null);
  const shellReadyRef = useRef(false);

  useEffect(() => {
    // Modo eficiente: no precargar AppShell en el login (ahorra RAM/CPU).
    if (EFFICIENT_MODE) {
      return () => {
        if (loginTimerRef.current) window.clearTimeout(loginTimerRef.current);
        if (splashTimerRef.current) window.clearTimeout(splashTimerRef.current);
      };
    }
    void loadAppShellModule("login idle");
    return () => {
      if (loginTimerRef.current) window.clearTimeout(loginTimerRef.current);
      if (splashTimerRef.current) window.clearTimeout(splashTimerRef.current);
    };
  }, []);

  if (!loginRenderedRef.current) {
    loginRenderedRef.current = true;
    loginHeapRef.current = currentHeapMB();
    logPerfEvent("LoginScreen — primer render", EFFICIENT_MODE);
    logMemSnapshot("Solo login (sin AppShell)");
  }

  const finishSplash = useCallback(() => {
    setSplashExiting(true);
    if (splashTimerRef.current) window.clearTimeout(splashTimerRef.current);
    splashTimerRef.current = window.setTimeout(() => {
      setPhase("ventas");
      setSplashExiting(false);
      splashTimerRef.current = null;
    }, SPLASH_FADE_MS);
  }, []);

  const handleShellReady = useCallback(() => {
    if (phase !== "loading" || shellReadyRef.current) return;
    shellReadyRef.current = true;
    const elapsed = Date.now() - loadStartedAtRef.current;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    if (wait > 0) {
      window.setTimeout(finishSplash, wait);
    } else {
      finishSplash();
    }
  }, [phase, finishSplash]);

  const handleLoginLoadingStart = useCallback(() => {
    logMemSnapshot("Antes de descargar AppShell (modo eficiente)");
    void loadAppShellModule("login confirmado");
  }, []);

  const handleAuth = useCallback(
    (v: Vendor) => {
      logPerfEvent("Montando módulo de ventas", EFFICIENT_MODE);
      initSalesSessionForLogin(v.usuario);
      setVendor(v);
      shellReadyRef.current = false;
      loadStartedAtRef.current = Date.now();

      setLoginExiting(true);
      setPhase("loading");
      void loadAppShellModule("login confirmado");

      if (loginTimerRef.current) window.clearTimeout(loginTimerRef.current);
      loginTimerRef.current = window.setTimeout(() => {
        setLoginMounted(false);
        setLoginExiting(false);
        loginTimerRef.current = null;
      }, LOGIN_FADE_MS);

      requestAnimationFrame(() => {
        logPerfLoginVsApp(loginHeapRef.current, EFFICIENT_MODE);
      });
    },
    [],
  );

  const handleLogout = useCallback(() => {
    shellReadyRef.current = false;
    setPhase("login");
    setLoginMounted(true);
    setLoginExiting(false);
    setSplashExiting(false);
  }, []);

  const handleChangeVendor = useCallback((v: Vendor) => setVendor(v), []);

  const showSplash = phase === "loading" || splashExiting;
  const showVentas = phase === "loading" || phase === "ventas";

  return (
    <ThemeProvider>
      {loginMounted ? (
        <div
          className={[
            appStyles.loginLayer,
            loginExiting ? appStyles.loginLayerExit : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <LoginScreen
            onAuthenticated={handleAuth}
            onLoadingStart={handleLoginLoadingStart}
          />
        </div>
      ) : null}

      {showVentas ? (
        <div className={appStyles.ventasLayer}>
          <Suspense fallback={null}>
            <AppShellReady
              vendor={vendor}
              onChangeVendor={handleChangeVendor}
              onExit={handleLogout}
              onReady={handleShellReady}
            />
          </Suspense>
        </div>
      ) : null}

      {showSplash ? <AppBootSplash exiting={splashExiting} /> : null}
    </ThemeProvider>
  );
}
