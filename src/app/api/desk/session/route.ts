import { NextResponse } from "next/server";
import { getSession } from "@/lib/desk";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";
import { readDeskStore } from "@/lib/desk/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = getSession();
  const tape = await loadQuoteTape();
  const stored = readDeskStore();
  return NextResponse.json({
    ...base,
    quotes: tape.quotes,
    quoteSource: tape.source,
    marksNote: tape.note,
    liveTrading: false as const,
    book: stored.book,
    blotter: stored.blotter,
  });
}
