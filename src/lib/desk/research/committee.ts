import { roundHalf } from "../signals";
import { lastNote, n1, post, stanceOfSide, type Blackboard } from "./blackboard";
import type { CommitteeVote, Side } from "../types";

function vote(
  board: Blackboard,
  agent: CommitteeVote["agent"],
  side: Side,
  sizePct: number,
  reason: string,
): CommitteeVote {
  const trader = lastNote(board, "trader");
  const out: CommitteeVote = { agent, side, sizePct, reason };
  board.committee.push(out);
  post(board, {
    agent,
    kind: "note",
    stance: stanceOfSide(side),
    score: sizePct,
    claims: [reason],
    cited: trader ? [trader.id] : [],
    replyTo: trader?.id,
    body: reason,
    sizePct,
    side,
  });
  return out;
}

export function runCommittee(board: Blackboard): CommitteeVote[] {
  const proposal = board.proposal;
  if (!proposal) return [];
  const f = board.features;
  const { side, sizePct } = proposal;

  if (side === "HOLD" || sizePct <= 0) {
    vote(board, "aggressive", "HOLD", 0, "Hale is flat. I will not invent a ticket.");
    vote(board, "conservative", "HOLD", 0, "Agreed. No incremental.");
    vote(board, "neutral", "HOLD", 0, "Median is HOLD.");
    return board.committee;
  }

  const aggressiveSize = roundHalf(Math.min(6, sizePct * 1.15));
  vote(
    board,
    "aggressive",
    side,
    aggressiveSize,
    `Take ${n1(aggressiveSize)}%. ${f.ticker} ${n1(f.existingPct)}% now. I will not nick a clean ${side}.`,
  );

  let conservativeSize = roundHalf(sizePct * 0.7);
  let conservativeSide: Side = side;
  let conservativeReason = `Haircut to ${n1(conservativeSize)}%. IV ${n1(f.iv30)}, DD ${n1(f.drawdownPct)}%.`;
  if (f.iv30 > 55) {
    conservativeSize = roundHalf(sizePct * 0.55);
    conservativeReason = `IV ${n1(f.iv30)} is a statement. ${side} ${n1(conservativeSize)}% only. I do not HOLD — I shrink.`;
  }
  if (f.drawdownPct > 4) {
    conservativeSize = Math.min(conservativeSize, 2);
    conservativeReason += ` Book is already down ${n1(f.drawdownPct)}%.`;
  }
  vote(board, "conservative", conservativeSide, conservativeSize, conservativeReason);

  vote(
    board,
    "neutral",
    side,
    sizePct,
    `Median Hale at ${n1(sizePct)}%. Committee can haircut; I will not add.`,
  );

  return board.committee;
}

export function committeeMedian(board: Blackboard): { side: Side; sizePct: number } {
  const proposal = board.proposal;
  if (!proposal) return { side: "HOLD", sizePct: 0 };
  const sizes = board.committee
    .filter((v) => v.side === proposal.side)
    .map((v) => v.sizePct)
    .sort((a, b) => a - b);
  if (sizes.length === 0) return { side: proposal.side, sizePct: proposal.sizePct };
  const mid = sizes[Math.floor(sizes.length / 2)];
  return { side: proposal.side, sizePct: mid };
}
