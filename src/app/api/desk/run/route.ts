import { NextResponse } from "next/server";
import { getQuote, normalizeBook, runDesk, SEED_BOOK, UNIVERSE } from "@/lib/desk";
import type { Book, Quote } from "@/lib/desk";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticker?: string;
      book?: Book;
      quotes?: Quote[];
    };
    const ticker = body.ticker?.toUpperCase().trim();
    if (!ticker) {
      return NextResponse.json({ error: "ticker required" }, { status: 400 });
    }
    const quotes =
      Array.isArray(body.quotes) && body.quotes.length > 0 ? body.quotes : UNIVERSE;
    const quote = quotes.find((q) => q.symbol === ticker) ?? getQuote(ticker);
    const book = normalizeBook(body.book ?? SEED_BOOK);
    const run = await runDesk(ticker, quote, book, quotes);
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "desk failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
