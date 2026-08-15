import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { startup } from "vite-plugin-electron";

function electronDev(): Plugin {
  return {
    name: "electron-dev",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        const port = typeof address === "object" && address ? address.port : 5173;
        process.env.VITE_DEV_SERVER_URL = `http://localhost:${port}/`;

        void startup().then(() => {
          console.log("\n  ➜  Electron: ventana de escritorio iniciada (use esta, no el navegador)\n");
        });

        const electronApp = (
          process as NodeJS.Process & { electronApp?: { kill: (signal?: NodeJS.Signals) => void } }
        ).electronApp;

        let reloadTimer: ReturnType<typeof setTimeout> | null = null;
        let restartPending = false;
        const scheduleRestart = () => {
          if (reloadTimer) clearTimeout(reloadTimer);
          reloadTimer = setTimeout(() => {
            if (restartPending) return;
            restartPending = true;
            console.log("\n  ➜  Reiniciando Electron (cambio en main/preload)…\n");
            electronApp?.kill();
            setTimeout(() => {
              restartPending = false;
              void startup().then(() => {
                console.log("\n  ➜  Electron reiniciado\n");
              });
            }, 2000);
          }, 3000);
        };

        for (const file of [
          "electron/main.cjs",
          "electron/preload.cjs",
          "electron/navaSql.cjs",
          "electron/exportFolderReveal.cjs",
        ]) {
          fs.watch(path.resolve(file), scheduleRestart);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const remoteApi = (env.VITE_API_BASE_URL ?? "").trim();
  const apiPort = env.API_PORT || "3001";
  const apiTarget = `http://localhost:${apiPort}`;

  const server: import("vite").UserConfig["server"] = {
    watch: {
      ignored: ["**/.env", "**/.env.*"],
    },
    proxy: {
      "/proxy-external/bcrp": {
        target: "https://estadisticas.bcrp.gob.pe",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-external\/bcrp/, ""),
      },
      "/proxy-external/open-meteo": {
        target: "https://api.open-meteo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-external\/open-meteo/, ""),
      },
      "/proxy-external/open-meteo-geo": {
        target: "https://geocoding-api.open-meteo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-external\/open-meteo-geo/, ""),
      },
      "/proxy-external/ip-api": {
        target: "http://ip-api.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-external\/ip-api/, ""),
      },
      "/proxy-external/rucpe": {
        target: "https://consulta.rucpe.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-external\/rucpe/, ""),
        configure: (proxy) => {
          const key = (env.RUCPE_API_KEY || env.VITE_RUCPE_API_KEY || "").trim();
          if (!key) return;
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("X-API-Key", key);
          });
        },
      },
    },
  };

  if (!remoteApi) {
    server.proxy = {
      ...server.proxy,
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    };
  }

  return {
    base: "./",
    clearScreen: false,
    server: {
      ...server,
      // Puerto fijo: Tauri espera http://localhost:5173
      port: 5173,
      strictPort: true,
    },
    // No arrancar Electron cuando el comando viene de `tauri dev` / `tauri build`
    plugins: [
      react(),
      ...(process.env.TAURI_ENV_PLATFORM || process.env.TAURI_CLI ? [] : [electronDev()]),
    ],
  };
});