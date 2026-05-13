"use client";

import { useMemo, useState } from "react";
import type { AnalysisReport, SlimAuthor } from "@/lib/types";
import { Filters, defaultFilters, type FilterState } from "./Filters";
import { AuthorsTable } from "./AuthorsTable";
import { HistogramH, HistogramSelf, TopAuthorsBar, type TopMetric } from "./Charts";
import { fmt } from "@/lib/format";

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
          Estatísticas IQR (base completa, sem filtros)
        </h2>
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
              <tr>
                <Th>Métrica</Th>
                <Th align="right">N</Th>
                <Th align="right">Mediana</Th>
                <Th align="right">Q1</Th>
                <Th align="right">Q3</Th>
                <Th align="right">IQR</Th>
                <Th align="right">Cerca sup.</Th>
                <Th align="right">Outliers altos</Th>
              </tr>
            </thead>
            <tbody>
              {report.stats.map((s) => (
                <tr key={s.metric} className="border-t border-zinc-100 dark:border-zinc-800">
                  <Td><code>{s.metric}</code></Td>
                  <Td align="right">{fmt(s.count)}</Td>
                  <Td align="right">{fmt(s.median)}</Td>
                  <Td align="right">{fmt(s.q1)}</Td>
                  <Td align="right">{fmt(s.q3)}</Td>
                  <Td align="right">{fmt(s.iqr)}</Td>
                  <Td align="right">{fmt(s.upperFence)}</Td>
                  <Td align="right">{fmt(s.outliersHigh)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
