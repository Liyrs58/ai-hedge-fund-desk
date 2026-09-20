import { roundPx } from "./signals";

export interface ComputedTechnicals {
  rsi14: number;
  macdHist: number;
  sma50: number;
  sma200: number;
  ok: boolean;
}

function sma(closes: number[], n: number): number | null {
  if (closes.length < n) return null;
  const slice = closes.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

/** Wilder RSI(14) on daily closes. */
export function rsiWilder(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function emaSeries(closes: number[], period: number): number[] | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i]! * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

/** MACD histogram = MACD line − signal (12/26/9). */
export function macdHistogram(closes: number[]): number | null {
  if (closes.length < 35) return null;
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  if (!ema12 || !ema26) return null;
  const macdLine: number[] = [];
  const offset12 = closes.length - ema12.length;
  const offset26 = closes.length - ema26.length;
  for (let i = 0; i < closes.length; i++) {
    const i12 = i - offset12;
    const i26 = i - offset26;
    if (i12 < 0 || i26 < 0) continue;
    macdLine.push(ema12[i12]! - ema26[i26]!);
  }
  if (macdLine.length < 9) return null;
  const signal = emaSeries(macdLine, 9);
  if (!signal || signal.length === 0) return null;
  return macdLine[macdLine.length - 1]! - signal[signal.length - 1]!;
}

export function computeTechnicals(closes: number[]): ComputedTechnicals | null {
  const clean = closes.filter((n) => Number.isFinite(n) && n > 0);
  if (clean.length < 30) return null;
  const rsi = rsiWilder(clean, 14);
  const macd = macdHistogram(clean);
  const s50 = sma(clean, 50);
  const s200 = sma(clean, 200);
  if (rsi === null || macd === null) return null;
  return {
    rsi14: roundPx(rsi),
    macdHist: roundPx(macd),
    sma50: s50 !== null ? roundPx(s50) : 0,
    sma200: s200 !== null ? roundPx(s200) : 0,
    ok: s50 !== null && s200 !== null,
  };
}
