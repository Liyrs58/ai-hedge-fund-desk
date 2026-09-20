export type Side = "BUY" | "SELL" | "HOLD";

export type AgentId =
  | "fundamental"
  | "news"
  | "sentiment"
  | "technical"
  | "bull"
  | "bear"
  | "trader"
  | "aggressive"
  | "conservative"
  | "neutral"
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

export type ProviderId = "mock" | "nvidia";

export type QuoteSource = "sample" | "yahoo";

export type RiskDecision = "pass" | "trim" | "veto";

export type CheckFlag = "OK" | "WARNING" | "FAIL";

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
  replyTo?: string;
  score?: number;
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
  ts: string;
  sector?: string;
  riskDecision?: RiskDecision;
  riskRules?: string[];
  fillPx?: number | null;
  slippageBps?: number;
  feeBps?: number;
  feeUsd?: number;
  cashDelta?: number;
  notional?: number;
  broker?: "simulator" | "alpaca";
  brokerOrderId?: string | null;
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
  peakNav: number;
}

export interface Exposure {
  nav: number;
  peakNav: number;
  drawdownPct: number;
  grossPct: number;
  netPct: number;
  longPct: number;
  shortPct: number;
  sectorPct: Record<string, number>;
  namePct: Record<string, number>;
  dailyVar: number;
}

export interface RiskCheckView {
  id: string;
  label: string;
  flag: CheckFlag;
  detail: string;
}

export interface DeskRun {
  id: string;
  ticker: string;
  quote: Quote;
  messages: DebateMessage[];
  ticket: Ticket;
  checks: RiskCheckView[];
  provider: ProviderId;
  fallbackFrom: ProviderId | null;
}

export interface SessionPayload {
  asOf: string;
  sessionLabel: string;
  provider: ProviderId;
  quotes: Quote[];
  quoteSource: QuoteSource;
  marksNote: string | null;
  liveTrading: false;
  paperBroker: "off" | "alpaca" | "missing-keys";
  llmModel: string;
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
  maxDrawdownPct: number;
}

export interface AgentNote {
  id: string;
  agent: AgentId;
  kind: MessageKind;
  stance: "long" | "short" | "flat";
  score: number;
  claims: string[];
  cited: string[];
  replyTo?: string;
  body: string;
  round?: number;
  sizePct?: number;
  side?: Side;
}

export interface NewsItem {
  ticker: string;
  headline: string;
  source: string;
  hoursAgo: number;
  polarity: number;
}

export interface TraderProposal {
  side: Side;
  sizePct: number;
  shares: number;
  stop: number | null;
  reason: string;
  conviction: number;
  cited: string[];
}

export interface CommitteeVote {
  agent: Extract<AgentId, "aggressive" | "conservative" | "neutral">;
  side: Side;
  sizePct: number;
  reason: string;
}

export interface FillQuote {
  fillPx: number;
  slippageBps: number;
  feeBps: number;
  feeUsd: number;
  notional: number;
  cashDelta: number;
}
