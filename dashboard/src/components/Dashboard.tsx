"use client";

import { useMemo, useState } from "react";
import type { AnalysisReport, SlimAuthor } from "@/lib/types";
import { Filters, defaultFilters, type FilterState } from "./Filters";
import { AuthorsTable } from "./AuthorsTable";
import { HistogramH, HistogramSelf, TopAuthorsBar, type TopMetric } from "./Charts";
import { RegressionPanel } from "./RegressionPanel";
import { fmt, pct } from "@/lib/format";
import { summarize } from "@/lib/stats";

type SlimMetricKey =
  | "np"
  | "nc"
  | "ncNs"
  | "h"
  | "hNs"
  | "c"
  | "cNs"
  | "selfPct"
  | "hDelta"
  | "hDeltaPct";

const METRIC_DEFS: { key: SlimMetricKey; label: string; pick: (a: SlimAuthor) => number }[] = [
  { key: "np", label: "Nº de publicações (np)", pick: (a) => a.np },
  { key: "nc", label: "Citações com auto-cit. (nc)", pick: (a) => a.nc },
  { key: "ncNs", label: "Citações sem auto-cit. (nc ns)", pick: (a) => a.ncNs },
  { key: "h", label: "h-index com auto-cit. (h)", pick: (a) => a.h },
  { key: "hNs", label: "h-index sem auto-cit. (h ns)", pick: (a) => a.hNs },
  { key: "c", label: "Composite score (c)", pick: (a) => a.c },
  { key: "cNs", label: "Composite score sem auto-cit. (c ns)", pick: (a) => a.cNs },
  { key: "selfPct", label: "Auto-citação (self%)", pick: (a) => a.selfPct },
  { key: "hDelta", label: "Queda absoluta de h (Δh)", pick: (a) => a.hDelta },
  { key: "hDeltaPct", label: "Queda relativa de h (Δh %)", pick: (a) => a.hDeltaPct },
];

type Props = {
  authors: SlimAuthor[];
  report: AnalysisReport;
};

export function Dashboard({ authors, report }: Props) {
  const fields = useMemo(() => {
    const set = new Set<string>();
    for (const a of authors) if (a.f) set.add(a.f);
    return [...set].sort();
  }, [authors]);

  const hAbsMax = useMemo(
    () => authors.reduce((m, a) => Math.max(m, a.h), 0),
    [authors],
  );

  const [filters, setFilters] = useState<FilterState>(defaultFilters(hAbsMax));
  const [topMetric, setTopMetric] = useState<TopMetric>("hDelta");

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const inst = filters.institutionQuery.trim().toLowerCase();
    return authors.filter((a) => {
      if (q && !a.n.toLowerCase().includes(q)) return false;
      if (filters.field && a.f !== filters.field) return false;
      if (inst && !(a.i ?? "").toLowerCase().includes(inst)) return false;
      if (a.h < filters.hMin || a.h > filters.hMax) return false;
      return true;
    });
  }, [authors, filters]);

  const filteredStats = useMemo(() => {
    if (filtered.length === 0) return [];
    return METRIC_DEFS.map(({ key, label, pick }) => {
      const s = summarize(filtered.map(pick));
      const total = s.outliersHigh + s.outliersLow;
      return {
        key,
        label,
        count: s.count,
        median: s.median,
        q1: s.q1,
        q3: s.q3,
        iqr: s.iqr,
        upperFence: s.upperFence,
        outliers: total,
        outliersPct: s.count === 0 ? 0 : total / s.count,
      };
    });
  }, [filtered]);

  const isFiltered =
    filters.field !== "" ||
    filters.search.trim() !== "" ||
    filters.institutionQuery.trim() !== "" ||
    filters.hMin > 0 ||
    filters.hMax < hAbsMax;

  return (
    <main className="mx-auto max-w-7xl p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Autores alemães — análise de outliers
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {report.authorCount.toLocaleString("pt-BR")} autores ·{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">cntry={report.country}</code>{" "}
          · gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Outliers detectados por IQR (Q3 + 1.5·IQR). Foco no h-index e impacto da remoção das auto-citações.
        </p>
      </header>

      <div className="mb-6">
        <Filters
          filters={filters}
          setFilters={setFilters}
          fields={fields}
          hAbsMax={hAbsMax}
          resultCount={filtered.length}
          totalCount={authors.length}
        />
      </div>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <HistogramH authors={filtered} />
        <HistogramSelf authors={filtered} />
      </section>

      <section className="mb-8">
        <TopAuthorsBar authors={filtered} metric={topMetric} onMetricChange={setTopMetric} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Tabela de autores</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Clique em uma coluna numérica para ordenar. Valores respondem aos filtros acima.
        </p>
        <AuthorsTable authors={filtered} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Estatísticas IQR {isFiltered ? "(amostra filtrada)" : "(base completa)"}
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Recalculada sobre {filtered.length.toLocaleString("pt-BR")} autores que atendem aos filtros atuais.
          Outliers contados como pontos fora de [Q1 − 1.5·IQR, Q3 + 1.5·IQR].
        </p>
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
              <tr>
                <Th>Métrica</Th>
                <Th align="right">Nº de autores (N)</Th>
                <Th align="right">Mediana</Th>
                <Th align="right">1º Quartil (Q1)</Th>
                <Th align="right">3º Quartil (Q3)</Th>
                <Th align="right">Amplitude interquartil (IQR)</Th>
                <Th align="right">Cerca superior (Q3+1.5·IQR)</Th>
                <Th align="right">Outliers</Th>
                <Th align="right">% de outliers</Th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-zinc-500">
                    Nenhum autor corresponde aos filtros.
                  </td>
                </tr>
              ) : (
                filteredStats.map((s) => (
                  <tr key={s.key} className="border-t border-zinc-100 dark:border-zinc-800">
                    <Td>{s.label}</Td>
                    <Td align="right">{fmt(s.count)}</Td>
                    <Td align="right">{fmt(s.median)}</Td>
                    <Td align="right">{fmt(s.q1)}</Td>
                    <Td align="right">{fmt(s.q3)}</Td>
                    <Td align="right">{fmt(s.iqr)}</Td>
                    <Td align="right">{fmt(s.upperFence)}</Td>
                    <Td align="right">{fmt(s.outliers)}</Td>
                    <Td align="right">{pct(s.outliersPct)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Regressão linear: citações (sem auto) ~ anos de carreira
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Modelo y = a + b·x ajustado por OLS após descartar os {report.regression.droppedCount} outliers de self%
          (autores com auto-citação acima da cerca IQR). Em seguida calculamos, para cada outlier descartado, o resíduo
          contra suas citações <strong>com</strong> auto-citação.
        </p>
        <RegressionPanel
          authors={authors}
          regression={report.regression}
          residuals={report.residuals}
        />
      </section>
    </main>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td className={`px-3 py-2 ${align === "right" ? "text-right tabular-nums" : ""}`}>
      {children}
    </td>
  );
}
