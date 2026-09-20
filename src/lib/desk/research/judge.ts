import { sharesForPct } from "../book";
import { evaluateTicket } from "../risk-engine";
import { lastNote, n1, n2, post, stanceOfSide, type Blackboard } from "./blackboard";
import { committeeMedian } from "./committee";
import type { Ticket } from "../types";

export function runJudge(board: Blackboard): Ticket {
  const proposal = board.proposal;
  if (!proposal) {
    throw new Error("Judge called with no trader proposal");
  }
  const median = committeeMedian(board);
  const startSide = median.side;
  const startPct = median.sizePct;
  const startShares =
    startSide === "HOLD" ? 0 : sharesForPct(board.features.nav, startPct, board.quote.mark);

  const verdict = evaluateTicket(
    { side: startSide, sizePct: startPct, shares: startShares },
    board.book,
    board.quote,
    board.quotes,
    board.exposure,
  );
  board.verdict = verdict;

  const trader = lastNote(board, "trader");
  const neu = lastNote(board, "neutral");

  const ticket: Ticket = {
    id: `${board.quote.symbol}-${board.ts}`,
    ticker: board.quote.symbol,
    side: verdict.side,
    proposedSide: proposal.side,
    proposedSizePct: proposal.sizePct,
    sizePct: verdict.sizePct,
    shares: verdict.shares,
    proposedShares: proposal.shares,
    mark: board.quote.mark,
    stop: proposal.stop,
    thesis:
      verdict.side === "HOLD"
        ? proposal.reason
        : verdict.side === "BUY"
          ? `Buy the grind, not a breakout. ${n1(verdict.sizePct)}% NAV. Stop ${proposal.stop ?? "\u2014"}.`
          : `Short the breakdown. ${n1(verdict.sizePct)}% NAV. Stop ${proposal.stop ?? "\u2014"}.`,
    riskNote: verdict.note,
    vetoed: verdict.vetoed,
    trimmed: verdict.trimmed || verdict.sizePct < proposal.sizePct - 0.01,
    status: "proposed",
    ts: board.ts,
    sector: board.quote.sector,
    riskDecision: verdict.decision,
    riskRules: verdict.rules.map((r) => r.id),
  };
  board.ticket = ticket;

  const riskBody = verdict.vetoed
    ? `Veto. ${verdict.note} Committee median ${n1(startPct)}% could not fit.`
    : verdict.trimmed
      ? `${verdict.note} Committee median ${n1(startPct)}%. Stop must be a working order, not a note. No veto.`
      : `${verdict.note} Committee median ${n1(startPct)}%. No veto.`;

  post(board, {
    agent: "risk",
    kind: verdict.vetoed ? "veto" : "mark",
    stance: stanceOfSide(verdict.side),
    score: verdict.sizePct,
    claims: [verdict.note, ...verdict.rules.map((r) => `${r.label}: ${r.flag} \u2014 ${r.detail}`)],
    cited: [trader, neu].filter((n): n is NonNullable<typeof n> => !!n).map((n) => n.id),
    replyTo: trader?.id,
    body: riskBody,
    sizePct: verdict.sizePct,
    side: verdict.side,
  });

  const traderAck = verdict.vetoed
    ? "Veto taken. I will not resubmit into this print."
    : verdict.trimmed
      ? `Accept ${n1(verdict.sizePct)}%. Working stop ${proposal.stop ?? "n/a"}. If the level trades I will ask for the rest. Not before.`
      : `Ticket stands. Working stop ${proposal.stop ?? "n/a"}.`;

  post(board, {
    agent: "trader",
    kind: "note",
    stance: stanceOfSide(verdict.side),
    score: verdict.sizePct,
    claims: [traderAck],
    cited: [board.notes[board.notes.length - 1].id],
    replyTo: board.notes[board.notes.length - 1].id,
    body: traderAck,
  });

  const riskFinal = verdict.vetoed
    ? "Final: HOLD. Flat incremental. Sato."
    : `Ticket stands: ${verdict.side} ${n1(verdict.sizePct)}% NAV @ ${n2(board.quote.mark)}. ${verdict.trimmed ? "Trimmed. " : ""}Approved.`;

  post(board, {
    agent: "risk",
    kind: "mark",
    stance: stanceOfSide(verdict.side),
    score: verdict.sizePct,
    claims: [riskFinal],
    cited: [board.notes[board.notes.length - 1].id],
    replyTo: board.notes[board.notes.length - 1].id,
    body: riskFinal,
  });

  return ticket;
}
