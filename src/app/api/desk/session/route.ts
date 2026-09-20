import { NextResponse } from "next/server";
import { getSession } from "@/lib/desk";
import { denyIfUnauthorized } from "@/lib/desk/demo-auth";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";
import { readDeskStore } from "@/lib/desk/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = denyIfUnauthorized(request);
  if (denied) return denied;
  const base = getSession();
  const tape = await loadQuoteTape();
  const stored = await readDeskStore();
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
