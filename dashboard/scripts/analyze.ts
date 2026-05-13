import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AnalysisReport,
  Author,
  MetricKey,
  MetricStats,
  Outlier,
  OutlierResidual,
  RegressionResult,
  SlimAuthor,
} from "../src/lib/types";
import { NUMERIC_METRICS } from "../src/lib/types";
import { linearRegression, summarize } from "../src/lib/stats";

const REFERENCE_YEAR = 2023;

const DATA_DIR = path.resolve(__dirname, "../data");
const IN = path.join(DATA_DIR, "german-authors.json");
const OUT = path.join(DATA_DIR, "analysis.json");
const SLIM_OUT = path.join(DATA_DIR, "authors-slim.json");

const TOP_N = 25;
const H_MIN_FOR_PCT = 20; // ignore tiny h-indices when ranking relative drop

function topByMetric(authors: Author[], key: MetricKey, n = TOP_N): Outlier[] {
  return [...authors]
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .slice(0, n)
    .map((a) => ({
      name: a.name,
      institution: a.institution,
      field: a.field,
      value: a[key] as number,
    }));
}

function fieldBreakdown(authors: Author[]) {
  const groups = new Map<string, Author[]>();
  for (const a of authors) {
    const f = a.field ?? "Unknown";
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f)!.push(a);
  }
  return [...groups.entries()]
    .map(([field, arr]) => {
      const hs = arr.map((a) => a.h).sort((x, y) => x - y);
      const hns = arr.map((a) => a.hNs).sort((x, y) => x - y);
      const sp = arr.map((a) => a.selfCitePct).sort((x, y) => x - y);
      const median = (v: number[]) => v[Math.floor(v.length / 2)] ?? 0;
      return {
        field,
        count: arr.length,
        medianH: median(hs),
        medianHNs: median(hns),
        medianSelfPct: median(sp),
      };
    })
    .sort((a, b) => b.count - a.count);
}

async function main() {
  if (!fs.existsSync(IN)) {
    throw new Error(`Missing ${IN}. Run npm run etl:extract first.`);
  }
  const authors: Author[] = JSON.parse(fs.readFileSync(IN, "utf8"));
  console.log(`Loaded ${authors.length} authors`);

  const stats: MetricStats[] = NUMERIC_METRICS.map((m) => {
    const values = authors.map((a) => a[m] as number).filter((v) => Number.isFinite(v));
    const s = summarize(values);
    const outliersPct = s.count > 0 ? (s.outliersLow + s.outliersHigh) / s.count : 0;
    return { metric: m, ...s, outliersPct };
  });

  const topUpperOutliers = NUMERIC_METRICS.reduce(
    (acc, m) => {
      acc[m] = topByMetric(authors, m);
      return acc;
    },
    {} as Record<MetricKey, Outlier[]>,
  );

  // h-index focused analyses
  const topHDelta = [...authors]
    .sort((a, b) => b.hDelta - a.hDelta)
    .slice(0, TOP_N)
    .map((a) => ({
      name: a.name,
      institution: a.institution,
      field: a.field,
      value: a.hDelta,
    }));

  const topHDeltaPct = [...authors]
    .filter((a) => a.h >= H_MIN_FOR_PCT)
    .sort((a, b) => b.hDeltaPct - a.hDeltaPct)
    .slice(0, TOP_N)
    .map((a) => ({
      name: a.name,
      institution: a.institution,
      field: a.field,
      value: a.hDeltaPct,
    }));

  const topSelfCitePct = [...authors]
    .sort((a, b) => b.selfCitePct - a.selfCitePct)
    .slice(0, TOP_N)
    .map((a) => ({
      name: a.name,
      institution: a.institution,
      field: a.field,
      value: a.selfCitePct,
    }));

  // === Regressão linear ===
  // y = a + bx, com x = anos desde a 1ª publicação, y = nc2323(ns) (cit. sem auto-cit.).
  // Ajustado em autores que NÃO são outliers de self%, conforme enunciado.
  const selfStats = stats.find((s) => s.metric === "selfCitePct")!;
  const selfFence = selfStats.upperFence;

  const cleanPoints = authors
    .filter((a) => a.selfCitePct <= selfFence)
    .filter((a) => a.firstYear > 0)
    .map((a) => ({ x: REFERENCE_YEAR - a.firstYear, y: a.ncNs }));

  const reg = linearRegression(cleanPoints);
  const regression: RegressionResult = {
    a: reg.a,
    b: reg.b,
    r2: reg.r2,
    n: reg.n,
    xLabel: "anos desde a 1ª publicação",
    yLabel: "nc2323 (sem auto-citações)",
    selfPctThreshold: selfFence,
    droppedCount: authors.length - cleanPoints.length,
    referenceYear: REFERENCE_YEAR,
  };

  // Resíduos: para cada autor que é outlier em self% (foi excluído do fit),
  // comparamos suas citações REAIS (com auto-cit, nc) contra o esperado pelo
  // modelo. Diferença positiva indica autor com muito mais citações do que
  // a regressão prevê para alguém com o mesmo tempo de carreira.
  const residuals: OutlierResidual[] = authors
    .filter((a) => a.selfCitePct > selfFence)
    .filter((a) => a.firstYear > 0)
    .map<OutlierResidual>((a) => {
      const yearsActive = REFERENCE_YEAR - a.firstYear;
      const predicted = regression.a + regression.b * yearsActive;
      return {
        name: a.name,
        institution: a.institution,
        field: a.field,
        yearsActive,
        selfPct: Number(a.selfCitePct.toFixed(4)),
        nc: a.nc,
        ncNs: a.ncNs,
        predicted: Number(predicted.toFixed(1)),
        residual: Number((a.nc - predicted).toFixed(1)),
      };
    })
    .sort((a, b) => b.residual - a.residual);

  const report: AnalysisReport = {
    generatedAt: new Date().toISOString(),
    country: "deu",
    authorCount: authors.length,
    stats,
    topUpperOutliers,
    topHDelta,
    topHDeltaPct,
    topSelfCitePct,
    fieldBreakdown: fieldBreakdown(authors),
    regression,
    residuals,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT}`);

  const slim: SlimAuthor[] = authors.map((a) => ({
    n: a.name,
    i: a.institution,
    f: a.field,
    np: a.np,
    h: a.h,
    hNs: a.hNs,
    hDelta: a.hDelta,
    hDeltaPct: Number(a.hDeltaPct.toFixed(4)),
    selfPct: Number(a.selfCitePct.toFixed(4)),
    c: Number(a.c.toFixed(3)),
    cNs: Number(a.cNs.toFixed(3)),
    fy: a.firstYear,
    nc: a.nc,
    ncNs: a.ncNs,
  }));
  fs.writeFileSync(SLIM_OUT, JSON.stringify(slim));
  const slimKb = (fs.statSync(SLIM_OUT).size / 1024).toFixed(0);
  console.log(`Wrote ${SLIM_OUT} (${slimKb} KB)`);

  // brief summary to stdout
  console.log("\nIQR outliers per column (% of total):");
  for (const s of stats) {
    const total = s.outliersLow + s.outliersHigh;
    console.log(
      `  ${s.metric.padEnd(12)} total=${String(total).padStart(4)} (${(s.outliersPct * 100).toFixed(2)}%)  upper=${s.outliersHigh} lower=${s.outliersLow}`,
    );
  }

  console.log(
    `\nRegression y = a + b·x  (x=anos desde 1ª publicação, y=cit. sem auto-cit.)`,
  );
  console.log(
    `  selfPct threshold (Q3+1.5·IQR): ${selfFence.toFixed(4)} — droppped ${regression.droppedCount} outliers`,
  );
  console.log(`  a = ${regression.a.toFixed(2)}`);
  console.log(`  b = ${regression.b.toFixed(2)}`);
  console.log(`  R² = ${regression.r2.toFixed(4)}  (n=${regression.n})`);

  console.log(`\nTop 5 self% outliers by residual (nc - predicted):`);
  for (const r of residuals.slice(0, 5)) {
    console.log(
      `  +${r.residual.toFixed(0).padStart(7)}  self=${(r.selfPct * 100).toFixed(1)}% nc=${r.nc} pred=${r.predicted.toFixed(0)}  ${r.name}`,
    );
  }
  console.log(`\nTop 5 self% outliers by MOST negative residual:`);
  for (const r of residuals.slice(-5).reverse()) {
    console.log(
      `  ${r.residual.toFixed(0).padStart(7)}  self=${(r.selfPct * 100).toFixed(1)}% nc=${r.nc} pred=${r.predicted.toFixed(0)}  ${r.name}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
