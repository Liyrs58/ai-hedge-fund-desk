import { NextResponse } from "next/server";
import { denyIfUnauthorized } from "@/lib/desk/demo-auth";
import { applyApprovedFill } from "@/lib/desk/fill-path";
import { isLiveTrading } from "@/lib/desk/flags";
import { writeDeskStore } from "@/lib/desk/store";
import type { Book, Quote, Ticket } from "@/lib/desk";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = denyIfUnauthorized(request);
  if (denied) return denied;
  if (isLiveTrading()) {
    return NextResponse.json(
      { error: "LIVE_TRADING is false. Paper desk only." },
      { status: 403 },
    );
  }
  try {
    const body = (await request.json()) as {
      ticket?: Ticket;
      quote?: Quote;
      book?: Book;
      blotter?: Ticket[];
      quotes?: Quote[];
    };
    if (!body.ticket || !body.quote || !body.book || !Array.isArray(body.blotter)) {
      return NextResponse.json(
        { error: "ticket, quote, book, and blotter required" },
        { status: 400 },
      );
    }
    const quotes = Array.isArray(body.quotes) && body.quotes.length > 0
      ? body.quotes
      : [body.quote];
    const filled = await applyApprovedFill({
      ticket: body.ticket,
      quote: body.quote,
      book: body.book,
      blotter: body.blotter,
      quotes,
    });
    const saved = await writeDeskStore(filled.book, filled.blotter);
    return NextResponse.json({
      ...saved,
      ticket: filled.ticket,
      broker: filled.broker,
      fillSource: filled.fillSource,
      liveTrading: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "approve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
