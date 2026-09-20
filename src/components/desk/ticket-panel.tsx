"use client";

import { LiveDot, MarkCheck, MarkX } from "./marks";
import { BookStrip } from "./book-strip";
import {
  fmtPctPlain,
  fmtPx,
  fmtShares,
  fmtUsd,
  type Book,
  type Exposure,
  type Quote,
  type RiskCheck,
  type Ticket,
} from "@/lib/desk";
import { cn } from "@/lib/utils";

export function PositionTicket({
  ticket,
  pending,
  clock,
  checks,
  book,
  exposure,
  quotes,
  blotter,
  onVeto,
  onApprove,
  approving = false,
}: {
  ticket: Ticket | null;
  pending: boolean;
  clock: string;
  checks: RiskCheck[];
  book: Book;
  exposure: Exposure;
  quotes: Record<string, Quote>;
  blotter: Ticket[];
  onVeto: () => void;
  onApprove: () => void;
  approving?: boolean;
}) {
  const status = !ticket
    ? pending
      ? "PENDING"
      : "\u2014"
    : ticket.status === "filled"
      ? "FILLED"
      : ticket.status === "vetoed"
        ? "VETOED"
        : "PENDING";

  const actionable = !!ticket && ticket.status === "proposed" && !approving;
  const workingShares = ticket
    ? ticket.side === "HOLD"
      ? 0
      : ticket.shares
    : 0;
  const px = ticket?.fillPx ?? ticket?.mark ?? 0;
  const notional = workingShares ? workingShares * px : 0;
  const sideLabel = ticket
    ? ticket.trimmed && ticket.proposedSizePct !== ticket.sizePct
      ? `${ticket.side}`
      : ticket.side
    : "\u2014";

  return (
    <aside className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2.5 font-mono text-[12px] tracking-[0.14em]">
        <span>RISK / TICKET</span>
        <span className="flex items-center gap-2 text-[11px]">
          <LiveDot
            className={status === "PENDING" ? "bg-copper" : "bg-mute"}
          />
          <span className={status === "PENDING" ? "text-copper" : "text-mute"}>
            {status}
          </span>
        </span>
      </div>

      {!ticket ? (
        <div className="flex-1 px-4 py-4 font-mono text-[12px] leading-relaxed text-mute">
          {pending
            ? "Ticket opens when Hale proposes."
            : "No ticket. Run the desk."}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="grid grid-cols-2 font-mono">
            <Cell label="Symbol" value={ticket.ticker} />
            <Cell label="Side" value={sideLabel} />
            <Cell
              label="Size"
              value={
                workingShares
                  ? ticket.trimmed
                    ? `${fmtShares(workingShares)} \u00b7 ${fmtPctPlain(ticket.sizePct)}`
                    : fmtShares(workingShares)
                  : "\u2014"
              }
            />
            <Cell
              label="Notional"
              value={workingShares ? `${fmtUsd(notional)} (est.)` : "\u2014"}
            />
          </div>

          <div className="border-b border-t border-ink px-4 py-3">
            <div className="font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
              Thesis (excerpt)
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed">{ticket.thesis}</p>
            {ticket.trimmed ? (
              <p className="mt-2 font-mono text-[11px] text-copper">
                Sato trim {fmtPctPlain(ticket.proposedSizePct)} \u2192{" "}
                {fmtPctPlain(ticket.sizePct)}
              </p>
            ) : null}
          </div>

          <RiskTable checks={checks} />

          {ticket.status === "filled" && ticket.fillPx ? (
            <FillStrip ticket={ticket} />
          ) : null}

          <div className="mt-auto grid grid-cols-2 gap-3 px-4 py-4">
            <button
              type="button"
              disabled={!actionable}
              onClick={onVeto}
              data-qa="veto"
              className="flex cursor-pointer flex-col items-center gap-1 border border-ink px-2 py-3 font-mono text-[11px] tracking-[0.12em] uppercase disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <MarkX /> Veto
              </span>
              <span className="text-[10px] text-mute">Block trade</span>
            </button>
            <button
              type="button"
              disabled={!actionable}
              onClick={onApprove}
              data-qa="approve"
              className="flex cursor-pointer flex-col items-center gap-1 border border-copper px-2 py-3 font-mono text-[11px] tracking-[0.12em] text-copper uppercase disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <MarkCheck /> Approve
              </span>
              <span className="text-[10px]">Release to market</span>
            </button>
          </div>
        </div>
      )}

      <BookStrip book={book} exposure={exposure} quotes={quotes} />
      <BlotterStrip tickets={blotter} />
      <div className="flex items-center justify-between border-t border-ink px-4 py-2 font-mono text-[11px] text-mute">
        <span>LAST UPDATED {clock}</span>
        <span>BY RISK MANAGER</span>
      </div>
    </aside>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-ink px-4 py-2.5 odd:border-r odd:border-ink [&:nth-child(-n+2)]:border-b">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] tracking-tight">{value}</div>
    </div>
  );
}

function RiskTable({ checks }: { checks: RiskCheck[] }) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
        Risk checks
      </div>
      <dl className="space-y-1.5 font-mono text-[12px]">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-3">
            <dt className="uppercase tracking-wide">{c.label}</dt>
            <dd
              className={cn(
                "tracking-[0.12em]",
                c.flag === "OK" ? "text-ink" : "text-copper",
              )}
            >
              {c.flag}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FillStrip({ ticket }: { ticket: Ticket }) {
  return (
    <div
      className="border-t border-ink px-4 py-2 font-mono text-[11px]"
      data-qa="fill-economics"
    >
      <div className="text-[10px] tracking-[0.16em] text-mute uppercase">
        Fill
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
        <span>PX {fmtPx(ticket.fillPx ?? ticket.mark)}</span>
        <span>SLIP {ticket.slippageBps?.toFixed(1) ?? "0.0"}bp</span>
        <span>FEE {fmtUsd(ticket.feeUsd ?? 0, 2)}</span>
        <span>CASH {fmtUsd(ticket.cashDelta ?? 0, 2)}</span>
      </div>
    </div>
  );
}

function BlotterStrip({ tickets }: { tickets: Ticket[] }) {
  const rows = tickets.slice(0, 4);
  return (
    <div className="border-t border-ink" data-qa="blotter">
      <div className="flex items-center justify-between px-4 py-1.5 font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
        <span>Blotter</span>
        <span className="tabular-nums text-ink">{tickets.length} tickets</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-2 font-mono text-[11px] text-mute">
          No tickets this session.
        </div>
      ) : (
        <table className="w-full font-mono text-[11px]">
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-hair">
                <td className="px-4 py-1">{t.ticker}</td>
                <td className="py-1">{t.side}</td>
                <td className="py-1 text-right tabular-nums">
                  {t.shares ? fmtShares(t.shares) : "\u2014"}
                </td>
                <td className="py-1 text-right tabular-nums text-mute">
                  {t.fillPx ? fmtPx(t.fillPx) : fmtPx(t.mark)}
                </td>
                <td
                  className={cn(
                    "px-4 py-1 text-right uppercase",
                    t.status === "vetoed" ? "text-copper" : "text-ink",
                  )}
                >
                  {t.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
