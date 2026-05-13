export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return { a: 0, b: 0, r2: 0, n };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const xbar = sx / n;
  const ybar = sy / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    const dx = p.x - xbar;
    num += dx * (p.y - ybar);
    den += dx * dx;
  }
  const b = den === 0 ? 0 : num / den;
  const a = ybar - b * xbar;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    const yhat = a + b * p.x;
    ssRes += (p.y - yhat) ** 2;
    ssTot += (p.y - ybar) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { a, b, r2, n };
}

export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliersLow = sorted.filter((v) => v < lowerFence).length;
  const outliersHigh = sorted.filter((v) => v > upperFence).length;
  return {
    count: n,
    min,
    max,
    mean,
    std,
    q1,
    median,
    q3,
    iqr,
    lowerFence,
    upperFence,
    outliersLow,
    outliersHigh,
  };
}
