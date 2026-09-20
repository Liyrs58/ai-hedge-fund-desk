import { NextResponse } from "next/server";
import { denyIfUnauthorized } from "@/lib/desk/demo-auth";
import { readDeskStore, resetDeskStore, writeDeskStore } from "@/lib/desk/store";
import { isLiveTrading } from "@/lib/desk/flags";
import { normalizeBook } from "@/lib/desk";
import type { Book, Ticket } from "@/lib/desk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = denyIfUnauthorized(request);
  if (denied) return denied;
  return NextResponse.json(await readDeskStore());
}

export async function PUT(request: Request) {
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
      book?: Book;
      blotter?: Ticket[];
      reset?: boolean;
    };
    if (body.reset) {
      return NextResponse.json(await resetDeskStore());
    }
    if (!body.book || !Array.isArray(body.blotter)) {
      return NextResponse.json(
        { error: "book and blotter required" },
        { status: 400 },
      );
    }
    const saved = await writeDeskStore(normalizeBook(body.book), body.blotter);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "store failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
