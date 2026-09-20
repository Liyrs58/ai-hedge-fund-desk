import type { Quote } from "./types";

function walk(seed: number, start: number, n = 24): number[] {
  let x = start;
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647;
    const r = s / 2147483647;
    x *= 1 + (r - 0.47) * 0.028;
    out.push(Math.round(x * 100) / 100);
  }
  out[out.length - 1] = start;
  return out;
}

export const UNIVERSE: Quote[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA CORP",
    sector: "Technology",
    mark: 178.42,
    change: 2.19,
    changePct: 1.24,
    volumeM: 312.4,
    avgVolumeM: 284.1,
    rsi14: 62.1,
    macdHist: 0.41,
    sma50: 169.1,
    sma200: 142.8,
    peNtm: 32.4,
    fcfYield: 2.1,
    iv30: 38.2,
    beta: 1.72,
    mktCapB: 4370,
    spark: walk(11, 178.42),
  },
  {
    symbol: "AAPL",
    name: "APPLE INC",
    sector: "Technology",
    mark: 228.15,
    change: -0.94,
    changePct: -0.41,
    volumeM: 48.2,
    avgVolumeM: 52.6,
    rsi14: 48.3,
    macdHist: -0.12,
    sma50: 226.4,
    sma200: 214.9,
    peNtm: 28.1,
    fcfYield: 3.4,
    iv30: 22.6,
    beta: 1.18,
    mktCapB: 3380,
    spark: walk(23, 228.15),
  },
  {
    symbol: "MSFT",
    name: "MICROSOFT CORP",
    sector: "Technology",
    mark: 428.7,
    change: 3.74,
    changePct: 0.88,
    volumeM: 22.1,
    avgVolumeM: 21.4,
    rsi14: 54.8,
    macdHist: 0.22,
    sma50: 418.2,
    sma200: 401.5,
    peNtm: 29.6,
    fcfYield: 2.8,
    iv30: 21.4,
    beta: 0.92,
    mktCapB: 3190,
    spark: walk(41, 428.7),
  },
  {
    symbol: "TSLA",
    name: "TESLA INC",
    sector: "Consumer",
    mark: 241.8,
    change: -5.39,
    changePct: -2.18,
    volumeM: 98.7,
    avgVolumeM: 81.3,
    rsi14: 38.4,
    macdHist: -1.08,
    sma50: 258.6,
    sma200: 249.1,
    peNtm: 74.2,
    fcfYield: 0.9,
    iv30: 61.8,
    beta: 2.11,
    mktCapB: 776,
    spark: walk(59, 241.8),
  },
  {
    symbol: "JPM",
    name: "JPMORGAN CHASE",
    sector: "Financials",
    mark: 214.33,
    change: 1.32,
    changePct: 0.62,
    volumeM: 8.4,
    avgVolumeM: 9.1,
    rsi14: 57.2,
    macdHist: 0.18,
    sma50: 207.9,
    sma200: 198.4,
    peNtm: 12.8,
    fcfYield: 4.1,
    iv30: 18.9,
    beta: 1.08,
    mktCapB: 612,
    spark: walk(73, 214.33),
  },
  {
    symbol: "XOM",
    name: "EXXON MOBIL",
    sector: "Energy",
    mark: 118.9,
    change: 0.18,
    changePct: 0.15,
    volumeM: 14.6,
    avgVolumeM: 16.2,
    rsi14: 51.6,
    macdHist: 0.04,
    sma50: 117.4,
    sma200: 112.1,
    peNtm: 14.2,
    fcfYield: 6.8,
    iv30: 24.1,
    beta: 0.88,
    mktCapB: 508,
    spark: walk(89, 118.9),
  },
];

export const QUOTE_BY_SYMBOL: Record<string, Quote> = Object.fromEntries(
  UNIVERSE.map((q) => [q.symbol, q]),
);

export function getQuote(symbol: string): Quote {
  const quote = QUOTE_BY_SYMBOL[symbol.toUpperCase()];
  if (!quote) {
    throw new Error(`Unknown ticker ${symbol}`);
  }
  return quote;
}
