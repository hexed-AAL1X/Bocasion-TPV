import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { markAppReady, waitForAppReady } from "./boot/waitForAppReady";
import { warmNetworkConnections } from "./services/networkWarmup";
import { initTheme } from "./theme/theme";
import { initPaletteTheme } from "./theme/applyTokens";
import { applyEfficientModeClass } from "./services/performanceSettings";
import "./styles/globals.css";

async function boot() {
  applyEfficientModeClass();
  const mode = initTheme();
  initPaletteTheme(mode);

  // DNS/TLS en idle: primera consulta DNI/RUC/BCRP más rápida.
  warmNetworkConnections();

  await waitForAppReady();
  markAppReady();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
}

void boot();
