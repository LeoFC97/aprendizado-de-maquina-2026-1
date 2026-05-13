"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SlimAuthor } from "@/lib/types";
import { fmt, pct } from "@/lib/format";

type BinSeries = { bin: string; count: number; mid: number };

function bin(values: number[], binCount: number): BinSeries[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    bin: `${(min + i * width).toFixed(width < 1 ? 2 : 0)}`,
    count: 0,
    mid: min + (i + 0.5) * width,
  }));
  for (const v of values) {
    const i = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / width)));
    bins[i].count++;
  }
  return bins;
}

const AXIS_TICK = { fontSize: 11, fill: "currentColor" };

export function HistogramH({ authors }: { authors: SlimAuthor[] }) {
  const data = useMemo(() => {
    const all = authors.map((a) => a.h);
    const ns = authors.map((a) => a.hNs);
    const binCount = 30;
    const allBins = bin(all, binCount);
    const nsBins = bin(ns, binCount);
    return allBins.map((b, i) => ({
      bin: b.bin,
      h: b.count,
      hNs: nsBins[i]?.count ?? 0,
    }));
  }, [authors]);

  return (
    <ChartCard title="Distribuição de h-index" subtitle="Com auto-citações vs sem">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="bin" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.05 }}
            contentStyle={tooltipStyle}
            formatter={(v, name) => [v as number, name === "h" ? "h (todas cit.)" : "h (sem auto-cit.)"]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="h" name="h (todas)" fill="#6366f1" />
          <Bar dataKey="hNs" name="h (sem auto-cit.)" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HistogramSelf({ authors }: { authors: SlimAuthor[] }) {
  const data = useMemo(() => {
    const values = authors.map((a) => a.selfPct);
    return bin(values, 30).map((b) => ({ bin: b.bin, count: b.count }));
  }, [authors]);

  return (
    <ChartCard title="Distribuição de auto-citação (%)" subtitle="self% por autor">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis
            dataKey="bin"
            tick={AXIS_TICK}
            tickFormatter={(v: string) => `${(Number(v) * 100).toFixed(0)}%`}
          />
          <YAxis tick={AXIS_TICK} />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.05 }}
            contentStyle={tooltipStyle}
            formatter={(v) => [v as number, "autores"]}
            labelFormatter={(v) => `self% ≈ ${(Number(v) * 100).toFixed(1)}%`}
          />
          <Bar dataKey="count" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

type TopMetric = "hDelta" | "hDeltaPct" | "selfPct" | "h" | "hNs" | "np" | "c";

const METRIC_OPTIONS: { key: TopMetric; label: string; format: (v: number) => string }[] = [
  { key: "hDelta", label: "Δh (queda absoluta sem auto-cit.)", format: (v) => fmt(v, 0) },
  { key: "hDeltaPct", label: "Δh % (queda relativa)", format: pct },
  { key: "selfPct", label: "self% (auto-citação)", format: pct },
  { key: "h", label: "h-index (todas cit.)", format: (v) => fmt(v, 0) },
  { key: "hNs", label: "h-index (sem auto-cit.)", format: (v) => fmt(v, 0) },
  { key: "np", label: "Nº de publicações", format: (v) => fmt(v, 0) },
  { key: "c", label: "Composite score", format: (v) => fmt(v, 2) },
];

export function TopAuthorsBar({
  authors,
  metric,
  onMetricChange,
  topN = 15,
}: {
  authors: SlimAuthor[];
  metric: TopMetric;
  onMetricChange: (m: TopMetric) => void;
  topN?: number;
}) {
  const option = METRIC_OPTIONS.find((o) => o.key === metric)!;

  const data = useMemo(() => {
    const minHForPct = metric === "hDeltaPct" ? 20 : 0;
    return [...authors]
      .filter((a) => a.h >= minHForPct)
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .slice(0, topN)
      .reverse() // smallest at bottom so largest is on top in horizontal bar
      .map((a) => ({
        name: a.n,
        value: a[metric] as number,
        institution: a.i ?? "—",
        field: a.f ?? "—",
      }));
  }, [authors, metric, topN]);

  return (
    <ChartCard
      title={`Top ${topN} autores`}
      subtitle={metric === "hDeltaPct" ? "filtro: h ≥ 20 para reduzir ruído" : undefined}
      action={
        <select
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as TopMetric)}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          {METRIC_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      }
    >
      <ResponsiveContainer width="100%" height={Math.max(260, topN * 22)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickFormatter={metric === "hDeltaPct" || metric === "selfPct"
              ? (v: number) => `${(v * 100).toFixed(0)}%`
              : undefined}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...AXIS_TICK, fontSize: 10 }}
            width={170}
          />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.05 }}
            contentStyle={tooltipStyle}
            formatter={(v) => [option.format(v as number), option.label]}
            labelFormatter={(label, payload) => {
              const p = (payload as unknown as ReadonlyArray<{ payload?: { institution?: string; field?: string } }> | undefined)?.[0]?.payload;
              return p ? `${label} · ${p.institution} · ${p.field}` : (label as string);
            }}
          />
          <Bar dataKey="value" fill="#6366f1">
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? "#4f46e5" : "#6366f1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const tooltipStyle = {
  background: "rgb(24 24 27)",
  border: "1px solid rgb(63 63 70)",
  borderRadius: 6,
  color: "rgb(244 244 245)",
  fontSize: 12,
};

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export type { TopMetric };
