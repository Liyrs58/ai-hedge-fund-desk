"use client";

import { fmtPct, fmtPx, type Quote } from "@/lib/desk";
import { SessionClock } from "./session-clock";

export function DeskHeader({ quote }: { quote: Quote }) {
  return (
    <header className="flex items-end justify-between gap-4 px-5 pb-3 pt-4">
      <div className="flex items-end gap-6">
        <h1 className="font-heading text-[34px] leading-none font-semibold tracking-[-0.03em]">
          DESK
        </h1>
        <div className="mb-0.5 font-mono text-[12px]">
          <span className="text-ink">{quote.symbol}</span>
          <span className="ml-3 text-mute">
            {fmtPx(quote.mark)} {fmtPct(quote.changePct)}
          </span>
        </div>
      </div>
      <SessionClock />
    </header>
  );
}
