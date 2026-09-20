import { NextResponse } from "next/server";
import { getQuote, normalizeBook, runDesk, SEED_BOOK, UNIVERSE } from "@/lib/desk";
import type { Book } from "@/lib/desk";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ticker?: string; book?: Book };
    const ticker = body.ticker?.toUpperCase().trim();
    if (!ticker) {
      return NextResponse.json({ error: "ticker required" }, { status: 400 });
    }
    const quote = getQuote(ticker);
    const book = normalizeBook(body.book ?? SEED_BOOK);
    const run = await runDesk(ticker, quote, book, UNIVERSE);
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "desk failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
