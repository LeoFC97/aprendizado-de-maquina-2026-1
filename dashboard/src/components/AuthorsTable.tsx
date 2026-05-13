"use client";

import { useMemo, useState } from "react";
import type { SlimAuthor } from "@/lib/types";
import { fmt, pct } from "@/lib/format";

type SortKey = keyof Pick<SlimAuthor, "h" | "hNs" | "hDelta" | "hDeltaPct" | "selfPct" | "np" | "c">;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "np", label: "np", format: (v) => fmt(v, 0) },
  { key: "h", label: "h", format: (v) => fmt(v, 0) },
  { key: "hNs", label: "h (ns)", format: (v) => fmt(v, 0) },
  { key: "hDelta", label: "Δh", format: (v) => fmt(v, 0) },
  { key: "hDeltaPct", label: "Δh %", format: pct },
  { key: "selfPct", label: "self%", format: pct },
  { key: "c", label: "c-score", format: (v) => fmt(v, 2) },
];

const PAGE_SIZE = 25;

export function AuthorsTable({ authors }: { authors: SlimAuthor[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("hDelta");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const out = [...authors];
    out.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -diff : diff;
    });
    return out;
  }, [authors, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <Th>#</Th>
              <Th>Autor</Th>
              <Th>Instituição</Th>
              <Th>Área</Th>
              {COLUMNS.map((c) => (
                <Th
                  key={c.key}
                  align="right"
                  sortable
                  active={sortKey === c.key}
                  dir={sortKey === c.key ? sortDir : undefined}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((a, i) => (
              <tr
                key={`${a.n}-${i}`}
                className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <Td>{safePage * PAGE_SIZE + i + 1}</Td>
                <Td>{a.n}</Td>
                <Td>
                  <span className="text-zinc-600 dark:text-zinc-400">{a.i ?? "—"}</span>
                </Td>
                <Td>
                  <span className="text-zinc-600 dark:text-zinc-400">{a.f ?? "—"}</span>
                </Td>
                {COLUMNS.map((c) => (
                  <Td key={c.key} align="right">
                    {c.format(a[c.key] as number)}
                  </Td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={4 + COLUMNS.length} className="px-3 py-8 text-center text-zinc-500">
                  Nenhum autor corresponde aos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
        <span>
          Página {safePage + 1} de {totalPages} · {sorted.length.toLocaleString("pt-BR")} resultados
        </span>
        <div className="flex gap-1">
          <PageBtn disabled={safePage === 0} onClick={() => setPage(0)}>
            «
          </PageBtn>
          <PageBtn disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            ‹
          </PageBtn>
          <PageBtn disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
            ›
          </PageBtn>
          <PageBtn disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
            »
          </PageBtn>
        </div>
      </div>
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
  sortable,
  active,
  dir,
  onClick,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
  active?: boolean;
  dir?: SortDir;
  onClick?: () => void;
}) {
  const arrow = active ? (dir === "desc" ? "▼" : "▲") : "";
  return (
    <th
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      } ${sortable ? "cursor-pointer select-none" : ""} ${
        active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
      }`}
      onClick={onClick}
    >
      {children}
      {arrow && <span className="ml-1">{arrow}</span>}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-3 py-2 ${align === "right" ? "text-right tabular-nums" : ""}`}
    >
      {children}
    </td>
  );
}
