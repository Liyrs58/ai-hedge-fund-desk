import { overlayQuotes, UNIVERSE } from "./universe";
import { fetchYahooSnaps } from "./yahoo";
import type { Quote, QuoteSource } from "./types";

export interface QuoteTape {
  source: QuoteSource;
  quotes: Quote[];
  note: string | null;
}

const SAMPLE_NOTE = "Yahoo did not answer. Sample marks still on the tape.";

let lastTape: QuoteTape | null = null;

export function lastQuoteTape(): QuoteTape | null {
  return lastTape;
}

export async function loadQuoteTape(timeoutMs = 2800): Promise<QuoteTape> {
  try {
    const snaps = await fetchYahooSnaps(
      UNIVERSE.map((q) => q.symbol),
      timeoutMs,
    );
    if (snaps.length === 0) {
      lastTape = { source: "sample", quotes: UNIVERSE, note: SAMPLE_NOTE };
      return lastTape;
    }
    lastTape = {
      source: "yahoo",
      quotes: overlayQuotes(UNIVERSE, snaps),
      note: `Yahoo last on ${snaps.map((s) => s.symbol).join(" ")}. PE / RSI / IV stay paper.`,
    };
    return lastTape;
  } catch {
    lastTape = { source: "sample", quotes: UNIVERSE, note: SAMPLE_NOTE };
    return lastTape;
  }
}
