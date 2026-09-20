import { NextResponse } from "next/server";
import { getSession } from "@/lib/desk";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = getSession();
  const tape = await loadQuoteTape();
  return NextResponse.json({
    ...base,
    quotes: tape.quotes,
    quoteSource: tape.source,
    marksNote: tape.note,
    liveTrading: false as const,
  });
}
