import { lastNote, n1, n2, post, type Blackboard } from "./blackboard";
import type { AgentNote } from "../types";

const MAX_ROUNDS = 2;

function analystBundle(board: Blackboard) {
  return {
    fnd: lastNote(board, "fundamental"),
    news: lastNote(board, "news"),
    sen: lastNote(board, "sentiment"),
    tec: lastNote(board, "technical"),
  };
}

export function runBull(board: Blackboard, round: number): AgentNote {
  const { fnd, news, sen, tec } = analystBundle(board);
  const bear = lastNote(board, "bear");
  const prior = lastNote(board, "bull");
  let score = Math.min(
    3,
    (fnd?.score ?? 0) * 0.4 + (tec?.score ?? 0) * 0.35 + (news?.score ?? 0) * 0.25 + 0.35,
  );

  const claims: string[] = [];
  if (round === 1) {
    claims.push(
      `Chen ${n2(fnd?.score ?? 0)}; Varga ${n2(tec?.score ?? 0)}; Walsh ${n2(news?.score ?? 0)}.`,
    );
    claims.push(
      board.features.existingPct > 0
        ? "Add is a continuation, not a new sleeve."
        : "Flat sleeve — this is an open, not a top-up.",
    );
    claims.push(
      score > 0.4
        ? "I want the name on the tape today."
        : "Long case is thin. I will not oversell it.",
    );
  } else {
    const bearIv = bear?.claims.find((c) => /IV/i.test(c));
    if (bearIv) {
      score -= 0.15;
      claims.push(
        `Novak's IV point stands as a haircut, not a veto. ${board.ticker} ${n1(board.features.existingPct)}% now.`,
      );
    } else {
      claims.push("Novak has not put a number on the short. I keep the long.");
    }
    if ((tec?.score ?? 0) < 0) {
      score -= 0.2;
      claims.push("I will not fight a breakdown with a hero bid.");
    } else {
      claims.push("Waiting for a perfect dip is how this desk misses the grind.");
    }
  }

  const cited = [fnd, news, sen, tec, bear, prior]
    .filter((n): n is AgentNote => !!n)
    .map((n) => n.id);

  return post(board, {
    agent: "bull",
    kind: round === 1 ? "thesis" : "rebuttal",
    stance: "long",
    score,
    claims,
    cited,
    replyTo: (bear ?? fnd)?.id,
    round,
    body: claims.join(" "),
  });
}

export function runBear(board: Blackboard, round: number): AgentNote {
  const { fnd, news, sen, tec } = analystBundle(board);
  const bull = lastNote(board, "bull");
  const prior = lastNote(board, "bear");
  let score = Math.max(
    -3,
    (fnd?.score ?? 0) * 0.3 + (sen?.score ?? 0) * 0.3 + (news?.score ?? 0) * 0.25 - 0.5,
  );

  const claims: string[] = [];
  if (round === 1) {
    claims.push(
      `Okonkwo ${n2(sen?.score ?? 0)}; Walsh ${n2(news?.score ?? 0)}; IV ${n1(board.features.iv30)}.`,
    );
    claims.push(
      board.features.peNtm > 40
        ? "Multiple is the whole story and it is the wrong story."
        : board.features.dist50Pct > 3
          ? "Paying up for a 50d extension is a hope add."
          : "If there is no catalyst, there is no trade.",
    );
    claims.push("Size is the risk, not the anecdote.");
  } else {
    const bullOpen = bull?.claims.find((c) => /sleeve|continuation|grind/i.test(c));
    if (bullOpen) {
      score -= 0.1;
      claims.push(
        `Patel's continuation still has to fit ${board.features.sector} ${n1(board.features.sectorPct)}% and name ${n1(board.features.existingPct)}%.`,
      );
    }
    claims.push(
      (bull?.score ?? 0) > 0.5
        ? "If Hale buys here, I want it small. Flow will not rescue a miss."
        : "A short needs a catalyst. Multiple complaints are not a ticket.",
    );
    if ((tec?.score ?? 0) < -0.4) {
      score -= 0.2;
      claims.push("Varga already lost the averages. That is my tape.");
    }
  }

  const cited = [fnd, news, sen, tec, bull, prior]
    .filter((n): n is AgentNote => !!n)
    .map((n) => n.id);

  return post(board, {
    agent: "bear",
    kind: round === 1 ? "thesis" : "rebuttal",
    stance: "short",
    score,
    claims,
    cited,
    replyTo: (bull ?? sen)?.id,
    round,
    body: claims.join(" "),
  });
}

export function runResearch(board: Blackboard): void {
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    runBull(board, round);
    runBear(board, round);
    const bull = lastNote(board, "bull");
    const bear = lastNote(board, "bear");
    if (bull && bear && Math.abs(bull.score + bear.score) < 0.25 && round >= 2) {
      break;
    }
  }
}
