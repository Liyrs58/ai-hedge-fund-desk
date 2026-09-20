import { STARTING_NAV } from "./limits";
import { newsFor, newsPolarity } from "./news";
import type { Book, Exposure, Quote } from "./types";

export interface Features {
  ticker: string;
  name: string;
  sector: string;
  mark: number;
  changePct: number;
  peNtm: number;
  fcfYield: number;
  rsi14: number;
  macdHist: number;
  sma50: number;
  sma200: number;
  dist50Pct: number;
  dist200Pct: number;
  iv30: number;
  beta: number;
  volRatio: number;
  volumeM: number;
  avgVolumeM: number;
  advShares: number;
  existingPct: number;
  existingShares: number;
  sectorPct: number;
  nav: number;
  cash: number;
  grossPct: number;
  shortPct: number;
  dailyVar: number;
  drawdownPct: number;
  peakNav: number;
  newsPolarity: number;
}

export interface Scores {
  fundamental: number;
  sentiment: number;
  technical: number;
  news: number;
  combined: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function extractFeatures(
  quote: Quote,
  book: Book,
  exposure: Exposure,
): Features {
  const pos = book.positions.find((p) => p.ticker === quote.symbol);
  const existingShares = pos?.shares ?? 0;
  const dist50Pct =
    quote.sma50 > 0 ? ((quote.mark - quote.sma50) / quote.sma50) * 100 : 0;
  const dist200Pct =
    quote.sma200 > 0 ? ((quote.mark - quote.sma200) / quote.sma200) * 100 : 0;
  const advShares = quote.avgVolumeM * 1_000_000;
  const volRatio =
    quote.avgVolumeM > 0 ? quote.volumeM / quote.avgVolumeM : 1;

  return {
    ticker: quote.symbol,
    name: quote.name,
    sector: quote.sector,
    mark: quote.mark,
    changePct: quote.changePct,
    peNtm: quote.peNtm,
    fcfYield: quote.fcfYield,
    rsi14: quote.rsi14,
    macdHist: quote.macdHist,
    sma50: quote.sma50,
    sma200: quote.sma200,
    dist50Pct,
    dist200Pct,
    iv30: quote.iv30,
    beta: quote.beta,
    volRatio,
    volumeM: quote.volumeM,
    avgVolumeM: quote.avgVolumeM,
    advShares,
    existingPct: exposure.namePct[quote.symbol] ?? 0,
    existingShares,
    sectorPct: exposure.sectorPct[quote.sector] ?? 0,
    nav: exposure.nav || STARTING_NAV,
    cash: book.cash,
    grossPct: exposure.grossPct,
    shortPct: exposure.shortPct,
    dailyVar: exposure.dailyVar,
    drawdownPct: exposure.drawdownPct,
    peakNav: exposure.peakNav,
    newsPolarity: newsPolarity(newsFor(quote.symbol)),
  };
}

export function scoreFundamental(f: Features): number {
  let pe = 0;
  if (f.peNtm < 15) pe = 1.2;
  else if (f.peNtm < 25) pe = 0.6;
  else if (f.peNtm < 35) pe = 0;
  else if (f.peNtm < 50) pe = -0.8;
  else pe = -1.8;

  let fcf = 0;
  if (f.fcfYield > 5) fcf = 1.2;
  else if (f.fcfYield > 3) fcf = 0.7;
  else if (f.fcfYield > 2) fcf = 0.2;
  else if (f.fcfYield > 1) fcf = -0.3;
  else fcf = -0.9;

  const crowded = f.existingPct > 8 ? -0.4 : 0;
  return clamp(pe + fcf + crowded, -3, 3);
}

export function scoreTechnical(f: Features): number {
  let trend = 0;
  if (f.mark > f.sma50 && f.sma50 > f.sma200) trend = 1.2;
  else if (f.mark > f.sma50) trend = 0.4;
  else if (f.mark < f.sma50 && f.sma50 < f.sma200) trend = -1.2;
  else if (f.mark < f.sma200) trend = -0.8;
  else trend = -0.4;

  let rsi = 0;
  if (f.rsi14 > 75) rsi = -0.8;
  else if (f.rsi14 > 65) rsi = 0.2;
  else if (f.rsi14 >= 55) rsi = 0.5;
  else if (f.rsi14 >= 45) rsi = 0;
  else if (f.rsi14 >= 35) rsi = -0.4;
  else rsi = -0.9;

  let macd = 0;
  if (f.macdHist > 0.2) macd = 0.5;
  else if (f.macdHist > 0) macd = 0.2;
  else if (f.macdHist < -0.5) macd = -0.8;
  else macd = -0.3;

  const chase = f.dist50Pct > 5 ? -0.5 : 0;
  return clamp(trend + rsi + macd + chase, -3, 3);
}

export function scoreSentiment(f: Features): number {
  const tape = f.changePct / 2;
  const flow = f.volRatio > 1.15 ? 0.3 : f.volRatio < 0.9 ? -0.2 : 0;
  const vol =
    f.iv30 > 50 ? -1.2 : f.iv30 > 35 ? -0.5 : f.iv30 < 22 ? 0.2 : 0;
  return clamp(tape + flow + vol, -3, 3);
}

export function scoreNews(f: Features): number {
  return clamp(f.newsPolarity * 2.5, -3, 3);
}

export function scoreAll(f: Features): Scores {
  const fundamental = scoreFundamental(f);
  const sentiment = scoreSentiment(f);
  const technical = scoreTechnical(f);
  const news = scoreNews(f);
  const combined = clamp(
    fundamental * 0.32 + technical * 0.28 + sentiment * 0.2 + news * 0.2,
    -3,
    3,
  );
  return { fundamental, sentiment, technical, news, combined };
}

export function stanceOf(score: number): "long" | "short" | "flat" {
  if (score > 0.35) return "long";
  if (score < -0.35) return "short";
  return "flat";
}

export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export function roundPx(n: number): number {
  return Math.round(n * 100) / 100;
}
