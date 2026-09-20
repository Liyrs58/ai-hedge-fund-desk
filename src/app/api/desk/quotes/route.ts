import { NextResponse } from "next/server";
import { denyIfUnauthorized } from "@/lib/desk/demo-auth";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = denyIfUnauthorized(request);
  if (denied) return denied;
  const tape = await loadQuoteTape();
  return NextResponse.json({
    source: tape.source,
    quotes: tape.quotes,
    note: tape.note,
    asOf: new Date().toISOString(),
  });
}
