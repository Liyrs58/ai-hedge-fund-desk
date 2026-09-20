import { NextResponse } from "next/server";
import { overlayQuotes, UNIVERSE } from "@/lib/desk";
import { fetchYahooSnaps } from "@/lib/desk/yahoo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snaps = await fetchYahooSnaps(UNIVERSE.map((q) => q.symbol));
    if (snaps.length === 0) {
      return NextResponse.json({
        source: "sample" as const,
        quotes: UNIVERSE,
        note: "Yahoo did not answer. Sample marks still on the tape.",
      });
    }
    return NextResponse.json({
      source: "yahoo" as const,
      quotes: overlayQuotes(UNIVERSE, snaps),
      asOf: new Date().toISOString(),
      note: `Yahoo last on ${snaps.map((s) => s.symbol).join(" ")}. PE / RSI / IV stay paper.`,
    });
  } catch {
    return NextResponse.json({
      source: "sample" as const,
      quotes: UNIVERSE,
      note: "Yahoo did not answer. Sample marks still on the tape.",
    });
  }
}
