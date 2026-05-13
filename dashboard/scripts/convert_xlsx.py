#!/usr/bin/env python3
"""One-time XLSX -> filtered CSV converter.

The xlsx npm package is unusably slow on this 86MB workbook (>16min and counting),
so we preprocess once with openpyxl (read-only streaming) and let TypeScript take
over with a much cheaper CSV. Re-run only when the source file changes.
"""
from __future__ import annotations

import csv
import os
import sys
import time
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl not available. Install with: pip3 install openpyxl")

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE = ROOT / "Table_1_Authors_singleyr_2023_pubs_since_1788.xlsx"
OUT_DIR = Path(__file__).resolve().parent.parent / "data"
TARGET_COUNTRY = "deu"
COUNTRY_COL_IDX = 2  # 0-based: authfull, inst_name, cntry, ...


def main() -> None:
    if not SOURCE.exists():
        sys.exit(f"Source not found: {SOURCE}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"authors-{TARGET_COUNTRY}.csv"

    t0 = time.time()
    wb = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    ws = wb["Data"]

    n = 0
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:
                writer.writerow(row)
                continue
            if row[COUNTRY_COL_IDX] == TARGET_COUNTRY:
                writer.writerow(row)
                n += 1

    elapsed = time.time() - t0
    print(f"rows: {n}  elapsed: {elapsed:.1f}s")
    print(f"output: {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
