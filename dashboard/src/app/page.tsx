import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisReport, SlimAuthor } from "@/lib/types";
import { Dashboard } from "@/components/Dashboard";

async function loadData(): Promise<{ authors: SlimAuthor[]; report: AnalysisReport } | null> {
  const dataDir = path.resolve(process.cwd(), "data");
  const slimFile = path.join(dataDir, "authors-slim.json");
  const reportFile = path.join(dataDir, "analysis.json");
  if (!fs.existsSync(slimFile) || !fs.existsSync(reportFile)) return null;
  const authors = JSON.parse(fs.readFileSync(slimFile, "utf8")) as SlimAuthor[];
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8")) as AnalysisReport;
  return { authors, report };
}

export default async function Home() {
  const data = await loadData();

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl p-8 font-sans">
        <h1 className="text-2xl font-semibold">Análise indisponível</h1>
        <p className="mt-4 text-zinc-600">
          Gere os dados antes de iniciar o dashboard:
        </p>
        <pre className="mt-4 rounded bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
{`python3 scripts/convert_xlsx.py   # one-time
npm run etl`}
        </pre>
      </main>
    );
  }

  return <Dashboard authors={data.authors} report={data.report} />;
}
