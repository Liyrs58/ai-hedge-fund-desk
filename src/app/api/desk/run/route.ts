import { NextResponse } from "next/server";
import { getQuote, runDesk } from "@/lib/desk";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ticker?: string; nav?: number };
    const ticker = body.ticker?.toUpperCase().trim();
    if (!ticker) {
      return NextResponse.json({ error: "ticker required" }, { status: 400 });
    }
    const quote = getQuote(ticker);
    const run = await runDesk(ticker, quote, body.nav);
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "desk failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
