import { NextResponse } from "next/server";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const tape = await loadQuoteTape();
  return NextResponse.json({
    source: tape.source,
    quotes: tape.quotes,
    note: tape.note,
    asOf: new Date().toISOString(),
  });
}
