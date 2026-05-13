import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AnalysisReport,
  Author,
  MetricKey,
  MetricStats,
  Outlier,
  SlimAuthor,
} from "../src/lib/types";
import { NUMERIC_METRICS } from "../src/lib/types";
import { summarize } from "../src/lib/stats";

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
    return { metric: m, ...summarize(values) };
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
  }));
  fs.writeFileSync(SLIM_OUT, JSON.stringify(slim));
  const slimKb = (fs.statSync(SLIM_OUT).size / 1024).toFixed(0);
  console.log(`Wrote ${SLIM_OUT} (${slimKb} KB)`);

  // brief summary to stdout
  console.log("\nIQR outlier counts (upper):");
  for (const s of stats) {
    console.log(`  ${s.metric.padEnd(12)} q1=${s.q1.toFixed(2)} q3=${s.q3.toFixed(2)} upperFence=${s.upperFence.toFixed(2)} highOutliers=${s.outliersHigh}`);
  }
  console.log(`\nTop 5 authors by absolute h-index drop (self-citations removed):`);
  for (const o of topHDelta.slice(0, 5)) {
    console.log(`  ${o.value.toFixed(0)}  ${o.name}  (${o.institution ?? "-"})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
