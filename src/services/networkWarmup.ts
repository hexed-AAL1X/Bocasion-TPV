/** Precalienta DNS/TLS a APIs (no bloquea el arranque ni toca SQL). */
export function warmNetworkConnections(): void {
  const run = () => {
    void window.bocasoft?.warmupHttp?.().catch(() => {
      /* ignore */
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 1500);
  }
}
