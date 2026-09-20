"use client";

import {
  fmtPx,
  fmtShares,
  fmtUsd,
  positionPnl,
  type Book,
  type Exposure,
  type Quote,
} from "@/lib/desk";
import { cn } from "@/lib/utils";

export function BookStrip({
  book,
  exposure,
  quotes,
}: {
  book: Book;
  exposure: Exposure;
  quotes: Record<string, Quote>;
}) {
  return (
    <div className="border-t border-ink">
      <div className="flex items-center justify-between px-4 py-1.5 font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
        <span>Book</span>
        <span className="tabular-nums text-ink">NAV {fmtUsd(exposure.nav)}</span>
      </div>
      <table className="w-full font-mono text-[11px]">
        <tbody>
          {book.positions.map((pos) => {
            const mark = quotes[pos.ticker]?.mark ?? pos.avg;
            const pnl = positionPnl(pos, mark);
            return (
              <tr key={pos.ticker} className="border-t border-hair">
                <td className="px-4 py-1">{pos.ticker}</td>
                <td className="py-1 text-right tabular-nums">
                  {fmtShares(pos.shares)}
                </td>
                <td className="py-1 text-right tabular-nums text-mute">
                  {fmtPx(mark)}
                </td>
                <td
                  className={cn(
                    "px-4 py-1 text-right tabular-nums",
                    pnl < 0 ? "text-copper" : "text-ink",
                  )}
                >
                  {fmtUsd(pnl)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-hair">
            <td className="px-4 py-1 text-mute">CASH</td>
            <td colSpan={3} className="px-4 py-1 text-right tabular-nums">
              {fmtUsd(book.cash)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
