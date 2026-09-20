import { roundPx } from "./signals";
import type { MarkSnap } from "./universe";

export type YahooSnap = MarkSnap;

interface ChartPayload {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketVolume?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null | undefined>;
          volume?: Array<number | null | undefined>;
        }>;
      };
    }>;
  };
}

function sparkFromCloses(closes: number[], mark: number): number[] {
  const last = closes.slice(-24);
  if (last.length < 8) return [];
  last[last.length - 1] = mark;
  return last.map((n) => roundPx(n));
}

export async function fetchYahooSnap(
  symbol: string,
  signal: AbortSignal,
): Promise<YahooSnap | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo&includePrePost=false`;
  const res = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "AHF-Desk/2.9 (paper; +https://github.com/Liyrs58/ai-hedge-fund-desk)",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ChartPayload;
  const result = json.chart?.result?.[0];
  const meta = result?.meta;
  const mark = meta?.regularMarketPrice;
  if (!mark || !Number.isFinite(mark) || mark <= 0) return null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? mark;
  const change = mark - prev;
  const changePct = prev !== 0 ? (change / prev) * 100 : 0;
  const volumeM =
    (meta.regularMarketVolume ?? 0) > 0
      ? (meta.regularMarketVolume as number) / 1_000_000
      : 0;
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  return {
    symbol: symbol.toUpperCase(),
    mark: roundPx(mark),
    change: roundPx(change),
    changePct: roundPx(changePct),
    volumeM: roundPx(volumeM),
    spark: sparkFromCloses(closes, mark),
  };
}

export async function fetchYahooSnaps(
  symbols: string[],
  timeoutMs = 4500,
): Promise<YahooSnap[]> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const settled = await Promise.allSettled(
      symbols.map((s) => fetchYahooSnap(s, ac.signal)),
    );
    return settled.flatMap((row) =>
      row.status === "fulfilled" && row.value ? [row.value] : [],
    );
  } finally {
    clearTimeout(timer);
  }
}
