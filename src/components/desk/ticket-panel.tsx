"use client";

import { LiveDot, MarkCheck, MarkX } from "./marks";
import { BookStrip } from "./book-strip";
import {
  fmtShares,
  fmtUsd,
  type Book,
  type Exposure,
  type Quote,
  type Ticket,
  type RiskCheck,
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
  onVeto,
  onApprove,
}: {
  ticket: Ticket | null;
  pending: boolean;
  clock: string;
  checks: RiskCheck[];
  book: Book;
  exposure: Exposure;
  quotes: Record<string, Quote>;
  onVeto: () => void;
  onApprove: () => void;
}) {
  const status = !ticket
    ? pending
      ? "PENDING"
      : "—"
    : ticket.status === "filled"
      ? "FILLED"
      : ticket.status === "vetoed"
        ? "VETOED"
        : "PENDING";

  const actionable = !!ticket && ticket.status === "proposed";
  const sizeShares = ticket
    ? ticket.proposedShares || ticket.shares
    : 0;
  const notional = ticket
    ? (ticket.proposedShares || ticket.shares) * ticket.mark
    : 0;

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
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-2 font-mono">
            <Cell label="Symbol" value={ticket.ticker} />
            <Cell label="Side" value={ticket.proposedSide} />
            <Cell
              label="Size"
              value={sizeShares ? fmtShares(sizeShares) : "—"}
            />
            <Cell
              label="Notional"
              value={sizeShares ? `${fmtUsd(notional)} (est.)` : "—"}
            />
          </div>

          <div className="border-b border-t border-ink px-4 py-3">
            <div className="font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
              Thesis (excerpt)
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed">{ticket.thesis}</p>
          </div>

          <RiskTable checks={checks} />

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
          <div key={c.label} className="flex items-center justify-between">
            <dt className="uppercase tracking-wide">{c.label}</dt>
            <dd
              className={cn(
                "tracking-[0.12em]",
                c.flag === "WARNING" ? "text-copper" : "text-ink",
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
