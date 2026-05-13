export function fmt(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "-";
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
