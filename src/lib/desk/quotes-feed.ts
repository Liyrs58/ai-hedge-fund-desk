import { overlayQuotes, UNIVERSE } from "./universe";
import { fetchYahooSnaps } from "./yahoo";
import type { Quote, QuoteSource } from "./types";

export interface QuoteTape {
  source: QuoteSource;
  quotes: Quote[];
  note: string | null;
}

const SAMPLE_NOTE =
  "Yahoo did not answer. SAMPLE marks · SAMPLE fundamentals · SAMPLE technicals · WIRE news.";

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
    const quotes = overlayQuotes(UNIVERSE, snaps);
    const techSrc = quotes.some((q) => q.provenance.technicals.source === "computed")
      ? "COMPUTED technicals"
      : "SAMPLE technicals";
    lastTape = {
      source: "yahoo",
      quotes,
      note: `Yahoo last on ${snaps.map((s) => s.symbol).join(" ")}. MARK=YAHOO · FUNDAMENTALS=SAMPLE · TECHNICALS=${techSrc.split(" ")[0]} · NEWS=WIRE.`,
    };
    return lastTape;
  } catch {
    lastTape = { source: "sample", quotes: UNIVERSE, note: SAMPLE_NOTE };
    return lastTape;
  }
}
