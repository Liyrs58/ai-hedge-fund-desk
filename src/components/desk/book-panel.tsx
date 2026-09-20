"use client";

import {
  fmtPct,
  fmtPx,
  fmtShares,
  fmtUsd,
  positionPnl,
  positionValue,
  signedClass,
  type Book,
  type Exposure,
  type Quote,
} from "@/lib/desk";
import { cn } from "@/lib/utils";

export function BookPanel({
  book,
  exposure,
  quotes,
  onReset,
}: {
  book: Book;
  exposure: Exposure;
  quotes: Record<string, Quote>;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-rule px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-mute uppercase">
        <span>Book</span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-mute hover:text-amber"
          >
            Reset seed
          </button>
          <span className="tabular-nums text-foreground">
            NAV {fmtUsd(exposure.nav)}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule font-mono text-[11px]">
        <Stat label="Cash" value={fmtUsd(book.cash)} />
        <Stat label="Gross" value={`${exposure.grossPct.toFixed(1)}%`} />
        <Stat label="Net" value={`${exposure.netPct.toFixed(1)}%`} />
        <Stat label="VaR" value={fmtUsd(exposure.dailyVar)} />
      </div>
      <div className="desk-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full font-mono text-[11px]">
          <thead className="sticky top-0 bg-panel text-[10px] tracking-wider text-mute">
            <tr className="border-b border-rule">
              <th className="px-3 py-1.5 text-left font-normal">Name</th>
              <th className="px-2 py-1.5 text-right font-normal">Sh</th>
              <th className="px-2 py-1.5 text-right font-normal">Avg</th>
              <th className="px-3 py-1.5 text-right font-normal">P&L</th>
            </tr>
          </thead>
          <tbody>
            {book.positions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-mute">
                  Flat book.
                </td>
              </tr>
            ) : (
              book.positions.map((pos) => {
                const mark = quotes[pos.ticker]?.mark ?? pos.avg;
                const pnl = positionPnl(pos, mark);
                const value = positionValue(pos, mark);
                return (
                  <tr key={pos.ticker} className="border-b border-rule">
                    <td className="px-3 py-1.5">
                      <div>{pos.ticker}</div>
                      <div className="text-[10px] text-mute">
                        {fmtUsd(value)} · {pos.sector}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmtShares(pos.shares)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-dim">
                      {fmtPx(pos.avg)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right tabular-nums",
                        signedClass(pnl),
                      )}
                    >
                      {fmtUsd(pnl, 0)}
                      <div className="text-[10px]">
                        {fmtPct(((mark - pos.avg) / pos.avg) * 100)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-3 py-2">
      <div className="text-[10px] tracking-wider text-mute uppercase">{label}</div>
      <div className="tabular-nums">{value}</div>
    </div>
  );
}
