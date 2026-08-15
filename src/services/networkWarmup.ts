/** Precalienta DNS/TLS a APIs (no bloquea el arranque). */
export function warmNetworkConnections(): void {
  const run = () => {
    void window.bocasoft?.warmupHttp?.().catch(() => {
      /* ignore */
    });
    void import("./navaDocs")
      .then((m) => {
        m.prefetchNavaSalesForDate();
        void m.flushNavaInsertQueue();
      })
      .catch(() => {
        /* ignore */
      });
    // Prefetch tipo de cambio en background (usa caché local).
    void import("../utils/exchangeRates")
      .then((m) => m.fetchSunatExchangeRates())
      .catch(() => {
        /* ignore */
      });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1200 });
  } else {
    window.setTimeout(run, 200);
  }
}
