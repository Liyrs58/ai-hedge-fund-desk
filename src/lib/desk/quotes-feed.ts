import { overlayQuotes, UNIVERSE } from "./universe";
import { fetchYahooSnaps } from "./yahoo";
import type { Quote, QuoteSource } from "./types";

export interface QuoteTape {
  source: QuoteSource;
  quotes: Quote[];
  note: string | null;
}

const SAMPLE_NOTE = "Yahoo did not answer. Sample marks still on the tape.";

export async function loadQuoteTape(timeoutMs = 2800): Promise<QuoteTape> {
  try {
    const snaps = await fetchYahooSnaps(
      UNIVERSE.map((q) => q.symbol),
      timeoutMs,
    );
    if (snaps.length === 0) {
      return { source: "sample", quotes: UNIVERSE, note: SAMPLE_NOTE };
    }
    return {
      source: "yahoo",
      quotes: overlayQuotes(UNIVERSE, snaps),
      note: `Yahoo last on ${snaps.map((s) => s.symbol).join(" ")}. PE / RSI / IV stay paper.`,
    };
  } catch {
    return { source: "sample", quotes: UNIVERSE, note: SAMPLE_NOTE };
  }
}
