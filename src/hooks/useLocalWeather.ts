import { useEffect, useState } from "react";
import { REFRESH_MS, loadLocalWeather, type LocalWeather } from "../services/weather";

export function useLocalWeather(skip = false) {
  const [weather, setWeather] = useState<LocalWeather | null>(null);

  useEffect(() => {
    if (skip) return;

    let cancelled = false;

    async function load() {
      try {
        const data = await loadLocalWeather();
        if (!cancelled) setWeather(data);
      } catch {
        if (!cancelled) setWeather(null);
      }
    }

    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [skip]);

  return weather;
}
