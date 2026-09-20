import { lastNote, n1, n2, post, signedPct, type Blackboard } from "./blackboard";
import { stanceOf } from "../signals";
import type { AgentNote } from "../types";

function cite(...notes: Array\u003cAgentNote | undefined\u003e): string[] {
  return notes.filter((n): n is AgentNote =\u003e !!n).map((n) =\u003e n.id);
}

export function runFundamental(board: Blackboard): AgentNote {
  const f = board.features;
  const score = board.scores.fundamental;
  const claims = [
    `NTM PE ${n1(f.peNtm)}; FCF yield ${n1(f.fcfYield)}%.`,
    f.existingShares
      ? `Book already has ${f.existingShares} ${f.ticker} (${n1(f.existingPct)}% NAV).`
      : `Flat in the book.`,
    score \u003e 0.6
      ? "Quality is not a fade on multiple alone."
      : score \u003c -0.6
        ? "Multiple does not belong on this print."
        : "Last print is not a new idea.",
  ];
  const lead =
    score \u003e 0.5
      ? `${board.quote.name.split(" ")[0]} still compounds on paper.`
      : score \u003c -0.5
        ? `${f.ticker} is a multiple complaint until the print changes.`
        : `${f.ticker} is known. I do not see a new fundamental.`;
  return post(board, {
    agent: "fundamental",
    kind: "thesis",
    stance: stanceOf(score),
    score,
    claims,
    cited: [],
    body: `${lead} ${claims.join(" ")}`,
  });
}

export function runNews(board: Blackboard): AgentNote {
  const score = board.scores.news;
  const items = board.news;
  const citedFnd = lastNote(board, "fundamental");
  const claims = items.length
    ? items.map(
        (n) =\u003e
          `${n.source} ${n.hoursAgo}h: ${n.headline} (pol ${n.polarity.toFixed(2)}).`,
      )
    : ["No items on the wire."];
  claims.push(
    `Wire polarity ${n2(board.features.newsPolarity)}. Score ${n2(score)}.`,
  );
  if (citedFnd) {
    claims.push(
      `Chen is ${citedFnd.stance}. I ${
        Math.sign(score) === Math.sign(citedFnd.score) ? "rhyme" : "diverge"
      }.`,
    );
  }
  return post(board, {
    agent: "news",
    kind: "note",
    stance: stanceOf(score),
    score,
    claims,
    cited: cite(citedFnd),
    replyTo: citedFnd?.id,
    body: claims.join(" "),
  });
}

export function runSentiment(board: Blackboard): AgentNote {
  const f = board.features;
  const score = board.scores.sentiment;
  const news = lastNote(board, "news");
  const claims = [
    `Session ${signedPct(f.changePct)}; volume ${n2(f.volRatio)}\u00d7 20d ADV.`,
    `IV30 ${n1(f.iv30)}; beta ${n2(f.beta)}.`,
    score \u003e 0.3
      ? "Flow is constructive, not crowded-long fuel."
      : score \u003c -0.3
        ? "This is a volatility event, not a directional gift."
        : "Quiet tape. No squeeze, no dump.",
  ];
  if (news) {
    claims.push(
      `Walsh wire ${n2(news.score)}. I ${
        Math.abs(news.score - score) \u003c 0.5 ? "agree on polarity" : "do not take the wire as flow"
      }.`,
    );
  }
  const lead =
    score \u003e 0.3
      ? "Tape is tired, not broken."
      : score \u003c -0.3
        ? "Polarity is the worst in the book."
        : "News cycle is not a catalyst.";
  return post(board, {
    agent: "sentiment",
    kind: "note",
    stance: stanceOf(score),
    score,
    claims,
    cited: cite(news),
    replyTo: news?.id,
    body: `${lead} ${claims.join(" ")}`,
  });
}

export function runTechnical(board: Blackboard): AgentNote {
  const f = board.features;
  const score = board.scores.technical;
  const fnd = lastNote(board, "fundamental");
  const claims = [
    `Mark ${n2(f.mark)}. 50d ${n2(f.sma50)}, 200d ${n2(f.sma200)} (${signedPct(f.dist50Pct)} vs 50d).`,
    `RSI(14) ${n1(f.rsi14)}; MACD hist ${n2(f.macdHist)}.`,
    score \u003e 0.4
      ? "Above both averages. I underwrite a grind, not a breakout."
      : score \u003c -0.4
        ? "Lost the averages. I will not chase a naked dump."
        : "Range midpoint. I have no setup.",
  ];
  if (fnd \u0026\u0026 fnd.stance === "long" \u0026\u0026 score \u003c 0) {
    claims.push("Chen can like the name. I will not bid this tape.");
  }
  return post(board, {
    agent: "technical",
    kind: "thesis",
    stance: stanceOf(score),
    score,
    claims,
    cited: cite(fnd),
    replyTo: fnd?.id,
    body: `Mark ${n2(f.mark)}, ${signedPct(board.quote.changePct)}. ${claims.join(" ")}`,
  });
}
