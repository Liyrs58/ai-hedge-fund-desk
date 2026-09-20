"use client";

import { fmtPctPlain, fmtPx, fmtShares, type Ticket } from "@/lib/desk";
import { cn } from "@/lib/utils";

export function Blotter({ tickets }: { tickets: Ticket[] }) {
  return (
    <section className="border-t border-rule bg-panel">
      <div className="flex items-center justify-between px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-mute uppercase">
        <span>Blotter</span>
        <span>{tickets.length} tickets</span>
      </div>
      <div className="desk-scroll max-h-[148px] overflow-auto">
        <table className="w-full min-w-[720px] font-mono text-[11px]">
          <thead className="sticky top-0 bg-panel text-[10px] tracking-wider text-mute">
            <tr className="border-y border-rule">
              <th className="px-3 py-1 text-left font-normal">When</th>
              <th className="px-2 py-1 text-left font-normal">Name</th>
              <th className="px-2 py-1 text-left font-normal">Side</th>
              <th className="px-2 py-1 text-right font-normal">Size</th>
              <th className="px-2 py-1 text-right font-normal">Sh</th>
              <th className="px-2 py-1 text-right font-normal">Mark</th>
              <th className="px-2 py-1 text-left font-normal">Status</th>
              <th className="px-3 py-1 text-left font-normal">Risk</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-rule">
                <td className="px-3 py-1 tabular-nums text-mute">
                  {formatWhen(t.ts)}
                </td>
                <td className="px-2 py-1">{t.ticker}</td>
                <td
                  className={cn(
                    "px-2 py-1",
                    t.side === "BUY"
                      ? "text-amber"
                      : t.side === "SELL"
                        ? "text-down"
                        : "text-mute",
                  )}
                >
                  {t.side}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {fmtPctPlain(t.sizePct)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {t.shares ? fmtShares(t.shares) : "—"}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {fmtPx(t.mark)}
                </td>
                <td
                  className={cn(
                    "px-2 py-1 uppercase",
                    t.vetoed ? "text-down" : "text-dim",
                  )}
                >
                  {t.status}
                </td>
                <td className="max-w-[340px] truncate px-3 py-1 text-dim">
                  {t.riskNote}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(d)
    .toUpperCase();
}
