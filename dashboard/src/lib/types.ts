export type RawAuthor = {
  authfull: string;
  inst_name: string | null;
  cntry: string;
  np6023: number;
  firstyr: number;
  lastyr: number;
  "rank (ns)": number;
  "nc2323 (ns)": number;
  "h23 (ns)": number;
  "hm23 (ns)": number;
  "nps (ns)": number;
  "ncs (ns)": number;
  "cpsf (ns)": number;
  "ncsf (ns)": number;
  "npsfl (ns)": number;
  "ncsfl (ns)": number;
  "c (ns)": number;
  "npciting (ns)": number;
  "cprat (ns)": number;
  "np6023 cited2323 (ns)": number;
  "self%": number;
  rank: number;
  nc2323: number;
  h23: number;
  hm23: number;
  nps: number;
  ncs: number;
  cpsf: number;
  ncsf: number;
  npsfl: number;
  ncsfl: number;
  c: number;
  npciting: number;
  cprat: number;
  "np6023 cited2323": number;
  np6023_rw: number;
  nc2323_to_rw: number;
  nc2323_rw: number;
  "sm-subfield-1": string | null;
  "sm-subfield-1-frac": number | null;
  "sm-subfield-2": string | null;
  "sm-subfield-2-frac": number | null;
  "sm-field": string | null;
  "sm-field-frac": number | null;
  "rank sm-subfield-1": number | null;
  "rank sm-subfield-1 (ns)": number | null;
  "sm-subfield-1 count": number | null;
};

export type Author = {
  name: string;
  institution: string | null;
  country: string;
  firstYear: number;
  lastYear: number;
  field: string | null;
  subfield: string | null;
  np: number;
  rankAll: number;
  rankNs: number;
  selfCitePct: number;

  // with self-citations
  nc: number;
  h: number;
  hm: number;
  c: number;

  // without self-citations
  ncNs: number;
  hNs: number;
  hmNs: number;
  cNs: number;

  // derived
  hDelta: number;       // h - hNs (absolute drop)
  hDeltaPct: number;    // (h - hNs) / h
  cDelta: number;
  cDeltaPct: number;
};

export const NUMERIC_METRICS = [
  "np",
  "nc",
  "ncNs",
  "h",
  "hNs",
  "hm",
  "hmNs",
  "c",
  "cNs",
  "selfCitePct",
  "hDelta",
  "hDeltaPct",
] as const;

export type MetricKey = (typeof NUMERIC_METRICS)[number];

export type SlimAuthor = {
  n: string;            // name
  i: string | null;     // institution
  f: string | null;     // field
  np: number;
  h: number;
  hNs: number;
  hDelta: number;
  hDeltaPct: number;
  selfPct: number;
  c: number;
  cNs: number;
};

export type MetricStats = {
  metric: MetricKey;
  count: number;
  min: number;
  max: number;
  mean: number;
  std: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outliersLow: number;
  outliersHigh: number;
};

export type Outlier = {
  name: string;
  institution: string | null;
  field: string | null;
  value: number;
};

export type AnalysisReport = {
  generatedAt: string;
  country: string;
  authorCount: number;
  stats: MetricStats[];
  topUpperOutliers: Record<MetricKey, Outlier[]>;
  // h-index specific analyses
  topHDelta: Outlier[];         // largest absolute drop
  topHDeltaPct: Outlier[];      // largest relative drop (filtered to h >= threshold)
  topSelfCitePct: Outlier[];    // highest self-citation %
  fieldBreakdown: { field: string; count: number; medianH: number; medianHNs: number; medianSelfPct: number }[];
};
