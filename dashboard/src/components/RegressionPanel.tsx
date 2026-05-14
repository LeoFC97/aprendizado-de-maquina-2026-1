"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OutlierResidual, RegressionResult, SlimAuthor } from "@/lib/types";
import { fmt, pct } from "@/lib/format";

const REFERENCE_YEAR = 2023;
const SAMPLE_SIZE = 1500;

function deterministicSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

type Props = {
  authors: SlimAuthor[];
  regression: RegressionResult;
  residuals: OutlierResidual[];
};

export function RegressionPanel({ authors, regression, residuals }: Props) {
  const threshold = regression.selfPctThreshold;

  // Split into clean (used in fit) and outliers (excluded), then sample clean
  // so the scatter stays responsive. All outliers are kept (377 ≈ negligible).
  const { cleanSample, outlierPoints } = useMemo(() => {
    const clean: { x: number; y: number; name: string }[] = [];
    const out: { x: number; y: number; name: string }[] = [];
    for (const a of authors) {
      if (a.fy <= 0) continue;
      const x = REFERENCE_YEAR - a.fy;
      const point = { x, y: a.ncNs, name: a.n };
      if (a.selfPct > threshold) out.push(point);
      else clean.push(point);
    }
    return {
      cleanSample: deterministicSample(clean, SAMPLE_SIZE),
      outlierPoints: out,
    };
  }, [authors, threshold]);

  // Build the regression line over the visible x-range
  const lineData = useMemo(() => {
    const xs = [
      ...cleanSample.map((p) => p.x),
      ...outlierPoints.map((p) => p.x),
    ];
    if (xs.length === 0) return [];
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    return [
      { x: xMin, line: regression.a + regression.b * xMin },
      { x: xMax, line: regression.a + regression.b * xMax },
    ];
  }, [cleanSample, outlierPoints, regression]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="a (intercepto)" value={fmt(regression.a, 2)} />
        <Stat label="b (inclinação)" value={fmt(regression.b, 2)} />
        <Stat label="R²" value={fmt(regression.r2, 4)} />
        <Stat
          label="n (ajuste)"
          value={`${regression.n.toLocaleString("pt-BR")} de ${(regression.n + regression.droppedCount).toLocaleString("pt-BR")}`}
          hint={`${regression.droppedCount} outliers self% descartados (limite ${pct(regression.selfPctThreshold)})`}
        />
      </div>

      <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-1 font-medium">Dispersão e reta ajustada</h3>
        <p className="mb-3 text-xs text-zinc-500">
          x = {regression.xLabel} (ref. {regression.referenceYear}) · y = {regression.yLabel}.
          Pontos cinzas: amostra de {cleanSample.length.toLocaleString("pt-BR")} autores não-outliers.
          Pontos vermelhos: {outlierPoints.length} outliers de self% (excluídos do fit).
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              type="number"
              dataKey="x"
              name="anos"
              tick={{ fontSize: 11, fill: "currentColor" }}
              label={{ value: "Anos desde 1ª publicação", position: "insideBottom", offset: -5, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="citações (sem auto)"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: "rgb(24 24 27)",
                border: "1px solid rgb(63 63 70)",
                borderRadius: 6,
                color: "rgb(244 244 245)",
                fontSize: 12,
              }}
              formatter={(v, n) => [typeof v === "number" ? fmt(v, 0) : v, n]}
              labelFormatter={(_, p) => {
                const point = (p as unknown as ReadonlyArray<{ payload?: { name?: string; x?: number } }> | undefined)?.[0]?.payload;
                return point?.name ? `${point.name} · ${point.x} anos` : "";
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Scatter
              name="não-outliers (amostra)"
              data={cleanSample}
              fill="#94a3b8"
              shape="circle"
              opacity={0.4}
            />
            <Scatter
              name="outliers self%"
              data={outlierPoints}
              fill="#ef4444"
              shape="circle"
            >
              {outlierPoints.map((_, i) => (
                <Cell key={i} fill="#ef4444" />
              ))}
            </Scatter>
            <Line
              type="linear"
              data={lineData}
              dataKey="line"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              name={`y = ${regression.a.toFixed(1)} + (${regression.b.toFixed(2)})·x`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ResidualsTable residuals={residuals} />
    </div>
  );
}

function ResidualsTable({ residuals }: { residuals: OutlierResidual[] }) {
  const [sortKey, setSortKey] = useState<keyof OutlierResidual>("residual");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const PAGE = 25;

  const sorted = useMemo(() => {
    const arr = [...residuals];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "desc" ? bv - av : av - bv;
      }
      return 0;
    });
    return arr;
  }, [residuals, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const slice = sorted.slice(page * PAGE, (page + 1) * PAGE);

  const sort = (key: keyof OutlierResidual) => {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="font-medium">Resíduos: outliers de self% vs. modelo</h3>
        <p className="text-xs text-zinc-500">
          Para cada autor com auto-citação acima da cerca IQR, comparamos as citações reais
          <strong> com auto-cit. (nc)</strong> contra o previsto pelo modelo ajustado nos não-outliers.
          Resíduo &gt; 0 = mais citações reais do que o esperado para o tempo de carreira.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <Th>Autor</Th>
              <Th>Instituição · Área</Th>
              <Th align="right" onClick={() => sort("yearsActive")} active={sortKey === "yearsActive"} dir={sortDir}>Anos de carreira (anos)</Th>
              <Th align="right" onClick={() => sort("selfPct")} active={sortKey === "selfPct"} dir={sortDir}>Auto-citação (self%)</Th>
              <Th align="right" onClick={() => sort("nc")} active={sortKey === "nc"} dir={sortDir}>Citações com auto-cit. (nc)</Th>
              <Th align="right" onClick={() => sort("ncNs")} active={sortKey === "ncNs"} dir={sortDir}>Citações sem auto-cit. (nc ns)</Th>
              <Th align="right" onClick={() => sort("predicted")} active={sortKey === "predicted"} dir={sortDir}>Previsto (ŷ)</Th>
              <Th align="right" onClick={() => sort("residual")} active={sortKey === "residual"} dir={sortDir}>Resíduo</Th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr
                key={`${r.name}-${i}`}
                className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {r.institution ?? "—"} · {r.field ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.yearsActive}</td>
                <td className="px-3 py-2 text-right tabular-nums">{pct(r.selfPct)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.nc, 0)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.ncNs, 0)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.predicted, 0)}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                    r.residual >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {r.residual >= 0 ? "+" : ""}
                  {fmt(r.residual, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
        <span>
          Página {page + 1} de {totalPages} · {sorted.length} outliers
        </span>
        <div className="flex gap-1">
          <PageBtn disabled={page === 0} onClick={() => setPage(0)}>«</PageBtn>
          <PageBtn disabled={page === 0} onClick={() => setPage(page - 1)}>‹</PageBtn>
          <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>›</PageBtn>
          <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</PageBtn>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-zinc-300 px-2 py-0.5 disabled:opacity-30 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}

function Th({
  children,
  align = "left",
  active,
  dir,
  onClick,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
}) {
  const arrow = active ? (dir === "desc" ? "▼" : "▲") : "";
  return (
    <th
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      } ${onClick ? "cursor-pointer select-none" : ""} ${
        active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
      }`}
      onClick={onClick}
    >
      {children}
      {arrow && <span className="ml-1">{arrow}</span>}
    </th>
  );
}
