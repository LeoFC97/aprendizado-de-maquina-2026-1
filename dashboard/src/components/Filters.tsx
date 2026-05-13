"use client";

export type FilterState = {
  search: string;
  field: string; // "" = all
  institutionQuery: string;
  hMin: number;
  hMax: number;
};

export const defaultFilters = (hAbsMax: number): FilterState => ({
  search: "",
  field: "",
  institutionQuery: "",
  hMin: 0,
  hMax: hAbsMax,
});

type Props = {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  fields: string[];
  hAbsMax: number;
  resultCount: number;
  totalCount: number;
};

export function Filters({ filters, setFilters, fields, hAbsMax, resultCount, totalCount }: Props) {
  const update = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch });

  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Buscar autor">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Sobrenome, inicial..."
            className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <Field label="Área (Science-Metrix)">
          <select
            value={filters.field}
            onChange={(e) => update({ field: e.target.value })}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Todas ({fields.length})</option>
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Instituição contém">
          <input
            type="text"
            value={filters.institutionQuery}
            onChange={(e) => update({ institutionQuery: e.target.value })}
            placeholder="Max Planck, TU Munich..."
            className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <Field label={`h-index entre ${filters.hMin} e ${filters.hMax}`}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={hAbsMax}
              value={filters.hMin}
              onChange={(e) => update({ hMin: Math.max(0, Number(e.target.value) || 0) })}
              className="w-20 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-zinc-500">→</span>
            <input
              type="number"
              min={0}
              max={hAbsMax}
              value={filters.hMax}
              onChange={(e) => update({ hMax: Math.min(hAbsMax, Number(e.target.value) || hAbsMax) })}
              className="w-20 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          Mostrando{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {resultCount.toLocaleString("pt-BR")}
          </strong>{" "}
          de {totalCount.toLocaleString("pt-BR")} autores
        </span>
        <button
          type="button"
          onClick={() => setFilters(defaultFilters(hAbsMax))}
          className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
