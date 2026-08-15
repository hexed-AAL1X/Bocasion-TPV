import { fetchExternalJson } from "./fetchExternalJson";

export type ExchangeRate = { buy: string; sell: string };

type BcrpResponse = {
  config?: { series?: Array<{ name: string }> };
  periods?: Array<{ values: string[] }>;
};

function formatBcrpDate(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function parseBcrpMulti(data: BcrpResponse | null): Partial<Record<"USD" | "EUR", ExchangeRate>> {
  if (!data?.periods?.length || !data.config?.series?.length) return {};

  const period = [...data.periods].reverse().find((p) =>
    p.values.some((v) => v !== "n.d." && !Number.isNaN(Number(v))),
  );
  if (!period) return {};

  const out: Partial<Record<"USD" | "EUR", ExchangeRate>> = {};
  const series = data.config.series;

  for (let i = 0; i + 1 < series.length; i += 2) {
    const sell = parseFloat(period.values[i]);
    const buy = parseFloat(period.values[i + 1]);
    if (Number.isNaN(buy) || Number.isNaN(sell) || buy < 2 || sell < 2) continue;

    const label = series[i].name;
    const rate = { buy: buy.toFixed(3), sell: sell.toFixed(3) };
    if (label.includes("Euro")) out.EUR = rate;
    else if (label.includes("US$")) out.USD = rate;
  }

  return out;
}

/** Tipo de cambio USD/EUR vía BCRP (interbancario), sin depender de apis.net.pe. */
export async function fetchSunatExchangeRates(): Promise<
  Partial<Record<"USD" | "EUR", ExchangeRate>>
> {
  const today = new Date();

  for (let daysBack = 0; daysBack <= 5; daysBack += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    const dateStr = formatBcrpDate(date);
    const url =
      `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/` +
      `PD04637PD-PD04638PD-PD04647PD-PD04648PD/json/${dateStr}/${dateStr}`;

    const data = await fetchExternalJson<BcrpResponse>(url);
    const rates = parseBcrpMulti(data);
    if (rates.USD || rates.EUR) return rates;
  }

  return {};
}
