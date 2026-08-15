export function formatSoles(amount: number): string {
  return `S/ ${amount.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatQty(qty: number): string {
  return `${qty.toFixed(2)} UND`;
}
