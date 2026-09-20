export type Side = "BUY" | "SELL" | "HOLD";

export type AgentId =
  | "fundamental"
  | "sentiment"
  | "technical"
  | "trader"
  | "risk";

export type AgentStatus = "idle" | "reading" | "writing" | "done" | "veto";

export type MessageKind =
  | "note"
  | "thesis"
  | "rebuttal"
  | "proposal"
  | "veto"
  | "mark";

export type TicketStatus =
  | "proposed"
  | "approved"
  | "trimmed"
  | "vetoed"
  | "filled";

export type ProviderId = "mock" | "openai" | "anthropic" | "gemini" | "grok";

export interface Agent {
  id: AgentId;
  code: string;
  abbrev: string;
  title: string;
  name: string;
  seat: string;
  mandate: string;
}

export interface Quote {
  symbol: string;
  name: string;
  sector: string;
  mark: number;
  change: number;
  changePct: number;
  volumeM: number;
  avgVolumeM: number;
  rsi14: number;
  macdHist: number;
  sma50: number;
  sma200: number;
  peNtm: number;
  fcfYield: number;
  iv30: number;
  beta: number;
  mktCapB: number;
  spark: number[];
}

export interface DebateMessage {
  id: string;
  agent: AgentId;
  kind: MessageKind;
  body: string;
  delayMs: number;
  at: string;
}

export interface Ticket {
  id: string;
  ticker: string;
  side: Side;
  proposedSide: Side;
  proposedSizePct: number;
  sizePct: number;
  shares: number;
  proposedShares: number;
  mark: number;
  stop: number | null;
  thesis: string;
  riskNote: string;
  vetoed: boolean;
  trimmed: boolean;
  status: TicketStatus;
}

export interface Position {
  ticker: string;
  shares: number;
  avg: number;
  sector: string;
}

export interface Book {
  cash: number;
  positions: Position[];
}

export interface Exposure {
  nav: number;
  grossPct: number;
  netPct: number;
  longPct: number;
  shortPct: number;
  sectorPct: Record<string, number>;
  namePct: Record<string, number>;
  dailyVar: number;
}

export interface DeskRun {
  id: string;
  ticker: string;
  quote: Quote;
  messages: DebateMessage[];
  ticket: Ticket;
  provider: ProviderId;
  fallbackFrom: ProviderId | null;
}

export interface SessionPayload {
  asOf: string;
  sessionLabel: string;
  provider: ProviderId;
  quotes: Quote[];
  book: Book;
  blotter: Ticket[];
  limits: RiskLimits;
}

export interface RiskLimits {
  grossPct: number;
  singleNamePct: number;
  sectorPct: number;
  shortPct: number;
  dailyVar: number;
}
