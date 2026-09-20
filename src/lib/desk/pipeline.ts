import { markBook, normalizeBook } from "./book";
import { newsFor } from "./news";
import { extractFeatures, scoreAll } from "./signals";
import { buildRiskChecks } from "./risk-checks";
import type { RiskVerdict } from "./risk-engine";
import type {
  AgentNote,
  Book,
  DebateMessage,
  Quote,
  RiskCheckView,
  Ticket,
} from "./types";
import type { Features, Scores } from "./signals";
import {
  runFundamental,
  runNews,
  runSentiment,
  runTechnical,
} from "./research/analysts";
import { runResearch } from "./research/researchers";
import { runTrader } from "./research/trader";
import { runCommittee } from "./research/committee";
import { runJudge } from "./research/judge";
import type { Blackboard } from "./research/blackboard";

export interface PipelineResult {
  messages: DebateMessage[];
  ticket: Ticket;
  notes: AgentNote[];
  features: Features;
  scores: Scores;
  verdict: RiskVerdict;
  checks: RiskCheckView[];
}

function hhmmss(total: number): string {
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function notesToTape(ticker: string, notes: AgentNote[]): DebateMessage[] {
  let seconds = 9 * 3600 + 41 * 60 + 3;
  return notes.map((note, i) => {
    const delayMs = i === 0 ? 420 : 720 + (i % 3) * 140;
    if (i > 0) seconds += Math.max(12, Math.round(delayMs / 35));
    return {
      id: `${ticker}-m${i + 1}`,
      agent: note.agent,
      kind: note.kind,
      body: note.body,
      delayMs,
      at: hhmmss(seconds),
      replyTo: note.replyTo,
      score: note.score,
    };
  });
}

export function runPipeline(args: {
  ticker: string;
  quote: Quote;
  book: Book;
  quotes: Quote[];
  ts: string;
}): PipelineResult {
  const book = normalizeBook(args.book);
  const exposure = markBook(book, args.quotes);
  const features = extractFeatures(args.quote, book, exposure);
  const scores = scoreAll(features);

  const board: Blackboard = {
    ticker: args.quote.symbol,
    ts: args.ts,
    quote: args.quote,
    book,
    quotes: args.quotes,
    exposure,
    features,
    scores,
    news: newsFor(args.quote.symbol),
    notes: [],
    proposal: null,
    committee: [],
    verdict: null,
    ticket: null,
    seq: 0,
  };

  runFundamental(board);
  runNews(board);
  runSentiment(board);
  runTechnical(board);
  runResearch(board);
  runTrader(board);
  runCommittee(board);
  const ticket = runJudge(board);

  if (!board.verdict) {
    throw new Error("pipeline produced no risk verdict");
  }

  const checks = buildRiskChecks(ticket, args.quote, exposure, board.verdict);
  const messages = notesToTape(args.quote.symbol, board.notes);

  return {
    messages,
    ticket,
    notes: board.notes,
    features,
    scores,
    verdict: board.verdict,
    checks,
  };
}

export function buildMockRun(
  ticker: string,
  quote: Quote,
  book: Book,
  quotes: Quote[],
  ts: string,
): PipelineResult {
  return runPipeline({ ticker, quote, book, quotes, ts });
}

export function listScriptTickers(): string[] {
  return ["NVDA", "AAPL", "MSFT", "TSLA", "JPM", "XOM"];
}
