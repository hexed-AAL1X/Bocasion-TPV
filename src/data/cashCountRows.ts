export type CashCountRowId =
  | "efectivo_sol"
  | "efectivo_usd"
  | "culqui"
  | "niubiz"
  | "openpay"
  | "izipay"
  | "new_credit"
  | "vales_sodexo"
  | "vales_empresa";

export type CashCountRow = {
  id: CashCountRowId;
  label: string;
  currency: "S/" | "US$" | null;
  icon: "cash" | "card" | "bank" | "coupon" | null;
  /** Valor inicial de referencia del sistema (caja real). */
  initialAmount: number | null;
};

export const CASH_COUNT_ROWS: CashCountRow[] = [
  { id: "efectivo_sol", label: "EFECTIVO (S/.)", currency: "S/", icon: "cash", initialAmount: 0 },
  { id: "efectivo_usd", label: "EFECTIVO (US$)", currency: "US$", icon: "cash", initialAmount: null },
  { id: "culqui", label: "CULQUI", currency: "S/", icon: "card", initialAmount: 0 },
  { id: "niubiz", label: "NIUBIZ", currency: "S/", icon: "card", initialAmount: 0 },
  { id: "openpay", label: "OPENPAY", currency: "S/", icon: "card", initialAmount: 753 },
  { id: "izipay", label: "IZIPAY", currency: "S/", icon: "card", initialAmount: 49 },
  { id: "new_credit", label: "NEW CREDIT", currency: "S/", icon: "bank", initialAmount: 458.5 },
  { id: "vales_sodexo", label: "VALES DE SODEXO", currency: "S/", icon: "coupon", initialAmount: null },
  { id: "vales_empresa", label: "VALES DE LA EMPRESA", currency: "S/", icon: "coupon", initialAmount: null },
];

export function initialCashCountAmounts(): Record<CashCountRowId, number | null> {
  return CASH_COUNT_ROWS.reduce(
    (acc, row) => {
      acc[row.id] = row.initialAmount;
      return acc;
    },
    {} as Record<CashCountRowId, number | null>,
  );
}

export function formatCashCountAmount(row: CashCountRow, amount: number | null): string | null {
  if (amount === null) return null;
  if (row.currency === "US$") return `US$ ${amount.toFixed(2)}`;
  if (row.currency === "S/") return `S/ ${amount.toFixed(2)}`;
  return amount.toFixed(2);
}
