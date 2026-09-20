import { sharesForPct } from "../book";
import { roundHalf, roundPx } from "../signals";
import { lastNote, n1, n2, post, stanceOfSide, type Blackboard } from "./blackboard";
import type { Side, TraderProposal } from "../types";

export function runTrader(board: Blackboard) {
  const f = board.features;
  const bull = lastNote(board, "bull");
  const bear = lastNote(board, "bear");
  const fnd = lastNote(board, "fundamental");
  const tec = lastNote(board, "technical");
  const sen = lastNote(board, "sentiment");
  const news = lastNote(board, "news");

  const research = ((bull?.score ?? 0) + (bear?.score ?? 0)) / 2;
  const conviction = board.scores.combined * 0.55 + research * 0.45;
  const abs = Math.abs(conviction);

  let side: Side = "HOLD";
  let sizePct = 0;
  let stop: number | null = null;
  let reason = `Conviction ${n2(conviction)} is noise. No ticket.`;

  if (f.existingPct >= 7 && conviction < 1.2 && conviction > -0.8) {
    reason = `Already ${n1(f.existingPct)}% NAV. Combined ${n2(conviction)} after Patel/Novak is not an add.`;
  } else if (
    f.existingPct === 0 &&
    Math.abs(f.sectorPct) < 0.2 &&
    f.volRatio < 0.95 &&
    Math.abs(f.changePct) < 0.4 &&
    abs < 1.6
  ) {
    reason = `New ${f.sector} sleeve on a dead tape (vol ${n2(f.volRatio)}\u00d7 ADV). Sit.`;
  } else if (f.existingPct > 5 && f.dist50Pct > 2 && conviction < 1.2 && conviction > 0) {
    stop = f.sma50;
    reason = `Name already in book at ${n1(f.existingPct)}% and ${n1(f.dist50Pct)}% over the 50d. Wait for ${n2(f.sma50)}.`;
  } else if (abs < 0.45) {
    reason = `Conviction ${n2(conviction)} is noise. No ticket.`;
  } else {
    side = conviction > 0 ? "BUY" : "SELL";
    let raw = Math.min(6, Math.max(2, 2.8 + abs * 2.4));
    if (f.existingPct > 0 && side === "BUY") {
      raw = Math.min(raw, Math.max(0, 8 - f.existingPct), 4);
      if (raw < 1.5) {
        side = "HOLD";
        reason = "Room under the 8% informal name cap is gone.";
        raw = 0;
      }
    }
    if (side === "SELL") raw = Math.min(raw, 6);
    if (side !== "HOLD") {
      sizePct = roundHalf(raw);
      stop =
        side === "BUY"
          ? roundPx(Math.min(f.sma50 * 0.97, f.mark * 0.92))
          : roundPx(Math.max(f.sma50, f.mark * 1.08));
      reason =
        side === "BUY"
          ? `Patel ${n2(bull?.score ?? 0)} vs Novak ${n2(bear?.score ?? 0)}. Buy the grind ${n1(sizePct)}%.`
          : `Tape and multiple both wrong. Short ${n1(sizePct)}%.`;
    }
  }

  const shares =
    side === "HOLD" ? 0 : sharesForPct(f.nav, sizePct, board.quote.mark);
  const cited = [bull, bear, fnd, tec, sen, news]
    .filter((n): n is NonNullable<typeof n> => !!n)
    .map((n) => n.id);

  const proposal: TraderProposal = {
    side,
    sizePct,
    shares,
    stop,
    reason,
    conviction,
    cited,
  };
  board.proposal = proposal;

  const body =
    side === "HOLD"
      ? `Proposal: HOLD. ${reason} Conviction ${n2(conviction)} from Chen/Walsh/Okonkwo/Varga then Patel/Novak.`
      : `Proposal: ${side} ${n1(sizePct)}% NAV, day, ${shares} sh, limit ${n2(board.quote.mark)}. Stop ${stop ?? "\u2014"}. ${reason} Conviction ${n2(conviction)}.`;

  post(board, {
    agent: "trader",
    kind: "proposal",
    stance: stanceOfSide(side),
    score: conviction,
    claims: [
      side === "HOLD"
        ? `Proposal: HOLD. ${reason}`
        : `Proposal: ${side} ${n1(sizePct)}% NAV, ${shares} sh, stop ${stop ?? "\u2014"}.`,
      `FND ${n2(fnd?.score ?? 0)} / NWS ${n2(news?.score ?? 0)} / SEN ${n2(sen?.score ?? 0)} / TEC ${n2(tec?.score ?? 0)}.`,
    ],
    cited,
    replyTo: (bear ?? bull)?.id,
    body,
    sizePct,
    side,
  });

  return proposal;
}
