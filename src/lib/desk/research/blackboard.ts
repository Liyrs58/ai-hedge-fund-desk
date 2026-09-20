import type {
  AgentId,
  AgentNote,
  Book,
  CommitteeVote,
  Exposure,
  Quote,
  Ticket,
  TraderProposal,
} from "../types";
import type { Features, Scores } from "../signals";
import type { RiskVerdict } from "../risk-engine";
import type { NewsItem } from "../types";

export interface Blackboard {
  ticker: string;
  ts: string;
  quote: Quote;
  book: Book;
  quotes: Quote[];
  news: NewsItem[];
  notes: AgentNote[];
  proposal: TraderProposal | null;
  committee: CommitteeVote[];
  verdict: RiskVerdict | null;
  ticket: Ticket | null;
  seq: number;
  exposure: Exposure;
  features: Features;
  scores: Scores;
}

export function lastNote(board: Blackboard, agent: AgentId): AgentNote | undefined {
  for (let i = board.notes.length - 1; i \u003e= 0; i--) {
    if (board.notes[i].agent === agent) return board.notes[i];
  }
  return undefined;
}

export function notesOf(board: Blackboard, agent: AgentId): AgentNote[] {
  return board.notes.filter((n) =\u003e n.agent === agent);
}

export function post(
  board: Blackboard,
  partial: Omit\u003cAgentNote, "id"\u003e \u0026 { id?: string },
): AgentNote {
  board.seq += 1;
  const note: AgentNote = {
    ...partial,
    id: partial.id ?? `${board.ticker}-n${board.seq}`,
    cited: partial.cited ?? [],
  };
  board.notes.push(note);
  return note;
}

export function n1(n: number): string {
  return n.toFixed(1);
}

export function n2(n: number): string {
  return n.toFixed(2);
}

export function signedPct(n: number): string {
  const sign = n \u003e 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function stanceOfSide(side: "BUY" | "SELL" | "HOLD"): AgentNote["stance"] {
  if (side === "BUY") return "long";
  if (side === "SELL") return "short";
  return "flat";
}
