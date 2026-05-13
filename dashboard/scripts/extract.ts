import * as fs from "node:fs";
import * as path from "node:path";
import type { Author } from "../src/lib/types";

const DATA_DIR = path.resolve(__dirname, "../data");
const CSV_IN = path.join(DATA_DIR, "authors-deu.csv");
const JSON_OUT = path.join(DATA_DIR, "german-authors.json");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c === "\r") {
        // skip
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const num = (s: string | undefined): number => {
  if (!s || s.trim() === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const str = (s: string | undefined): string | null => {
  if (!s || s.trim() === "") return null;
  return s;
};

async function main() {
  if (!fs.existsSync(CSV_IN)) {
    throw new Error(
      `Missing ${CSV_IN}. Run \`python3 scripts/convert_xlsx.py\` first (one-time XLSX→CSV conversion).`,
    );
  }
  const t0 = Date.now();
  const text = fs.readFileSync(CSV_IN, "utf8");
  const rows = parseCsv(text);
  console.log(`Parsed CSV: ${rows.length - 1} data rows in ${Date.now() - t0}ms`);

  const header = rows[0];
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Column not found: ${name}`);
    return i;
  };

  const I = {
    authfull: idx("authfull"),
    inst: idx("inst_name"),
    cntry: idx("cntry"),
    np: idx("np6023"),
    first: idx("firstyr"),
    last: idx("lastyr"),
    selfPct: idx("self%"),
    rankAll: idx("rank"),
    rankNs: idx("rank (ns)"),
    nc: idx("nc2323"),
    ncNs: idx("nc2323 (ns)"),
    h: idx("h23"),
    hNs: idx("h23 (ns)"),
    hm: idx("hm23"),
    hmNs: idx("hm23 (ns)"),
    c: idx("c"),
    cNs: idx("c (ns)"),
    field: idx("sm-field"),
    subfield: idx("sm-subfield-1"),
  };

  const authors: Author[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < header.length) continue;
    const h = num(row[I.h]);
    const hNs = num(row[I.hNs]);
    const c = num(row[I.c]);
    const cNs = num(row[I.cNs]);
    const hDelta = h - hNs;
    const cDelta = c - cNs;
    authors.push({
      name: row[I.authfull],
      institution: str(row[I.inst]),
      country: row[I.cntry],
      firstYear: num(row[I.first]),
      lastYear: num(row[I.last]),
      field: str(row[I.field]),
      subfield: str(row[I.subfield]),
      np: num(row[I.np]),
      rankAll: num(row[I.rankAll]),
      rankNs: num(row[I.rankNs]),
      selfCitePct: num(row[I.selfPct]),
      nc: num(row[I.nc]),
      h,
      hm: num(row[I.hm]),
      c,
      ncNs: num(row[I.ncNs]),
      hNs,
      hmNs: num(row[I.hmNs]),
      cNs,
      hDelta,
      hDeltaPct: h > 0 ? hDelta / h : 0,
      cDelta,
      cDeltaPct: c > 0 ? cDelta / c : 0,
    });
  }

  fs.writeFileSync(JSON_OUT, JSON.stringify(authors));
  const kb = (fs.statSync(JSON_OUT).size / 1024).toFixed(0);
  console.log(`Wrote ${JSON_OUT} (${authors.length} authors, ${kb} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
