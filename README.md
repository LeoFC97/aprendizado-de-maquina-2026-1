# Análise de outliers — autores alemães

Trabalho da disciplina **Aprendizado de Máquina (2026.1)**. Detecção de outliers
em métricas bibliométricas de cientistas alemães, com foco no impacto da remoção
das auto-citações no h-index.

## Dataset

[Ioannidis, J. P. A. (2024). *Updated science-wide author databases of standardized citation indicators*](https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/) — Mendeley Data, V8 (Stanford/Elsevier).

Arquivo usado: `Table_1_Authors_singleyr_2023_pubs_since_1788.xlsx` (~86MB,
223 153 autores, 47 colunas, 10 420 com `cntry = deu`).

O XLSX **não é versionado**. Baixe e coloque na raiz do repositório antes de
rodar o ETL.

## Estrutura

```
aprendizado-de-maquina-2026-1/
├── Table_1_Authors_singleyr_2023_pubs_since_1788.xlsx   # download manual (gitignored)
└── dashboard/                                            # Next.js 16 + TypeScript
    ├── scripts/
    │   ├── convert_xlsx.py    # XLSX → CSV filtrado por país (Python/openpyxl, one-time)
    │   ├── extract.ts         # CSV → JSON normalizado (TypeScript)
    │   └── analyze.ts         # JSON → estatísticas IQR + rankings
    ├── src/
    │   ├── app/page.tsx       # server component que carrega os JSONs
    │   ├── components/        # Dashboard, Filters, AuthorsTable, Charts
    │   └── lib/               # types, stats, format
    └── data/                  # artefatos gerados (gitignored para CSVs)
```

## Como rodar

```bash
cd dashboard
npm install

# 1. (uma vez) XLSX → CSV filtrado por país. Usa Python pq xlsx-js trava.
python3 scripts/convert_xlsx.py

# 2. Pipeline TS: extract + analyze
npm run etl

# 3. Dashboard interativo
npm run dev   # http://localhost:3000
```

## Método

- **Filtro:** `cntry = "deu"` (10 420 autores).
- **Métricas analisadas:** `np`, `nc/ncNs`, `h/hNs`, `hm/hmNs`, `c/cNs`,
  `selfCitePct`, `hDelta = h − hNs`, `hDeltaPct = hDelta / h`.
- **Outliers:** IQR clássico, cerca superior em `Q3 + 1.5·IQR`.
- **Foco no h-index:** ranking dos maiores `hDelta` (queda absoluta no h sem
  auto-citações) e `hDeltaPct` (queda relativa, filtrando `h ≥ 20` para evitar
  ruído de autores pequenos).

## Dashboard

- Filtros globais: busca por nome, área (Science-Metrix field), instituição,
  range de h-index.
- Histogramas de h-index (com vs sem auto-cit.) e self%.
- Bar chart Top N com seletor de métrica.
- Tabela paginada e ordenável por qualquer coluna numérica.
- Estatísticas IQR da base completa com % de outliers por coluna.
- Painel de regressão linear `nc(ns) ~ anos de carreira` com scatter, reta
  ajustada e tabela de resíduos dos outliers de self%.

## Análise qualitativa

A discussão sobre **origem dos outliers de auto-citação** e **recomendações para
o sistema alemão de fomento à pesquisa** (DFG, BMBF, Helmholtz, Max-Planck...)
está em [`ANALISE.md`](./ANALISE.md).
