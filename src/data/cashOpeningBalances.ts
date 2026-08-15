export type CashOpeningCurrency = "soles" | "dolar" | "euros";

export type CashOpeningBalance = Record<CashOpeningCurrency, number>;

export const CASH_OPENING_CURRENCIES: {
  id: CashOpeningCurrency;
  label: string;
  symbol: string;
}[] = [
  { id: "soles", label: "SOLES", symbol: "S/." },
  { id: "dolar", label: "DOLAR", symbol: "US$" },
  { id: "euros", label: "EUROS", symbol: "Eur" },
];

const STORAGE_KEY = "bocasoft-cash-opening-v1";

export function emptyCashOpeningBalance(): CashOpeningBalance {
  return { soles: 0, dolar: 0, euros: 0 };
}

export function formatOpeningAmount(value: number): string {
  return value.toFixed(2);
}

function loadAll(): Record<string, CashOpeningBalance> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CashOpeningBalance>;
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, CashOpeningBalance>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getCashOpeningBalances(registerId: string): CashOpeningBalance {
  return loadAll()[registerId] ?? emptyCashOpeningBalance();
}

export function saveCashOpeningBalances(registerId: string, balances: CashOpeningBalance): void {
  const all = loadAll();
  all[registerId] = balances;
  saveAll(all);
}
