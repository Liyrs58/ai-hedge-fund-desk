import { sharesForPct } from "./book";
import type {
  AgentId,
  DebateMessage,
  MessageKind,
  Quote,
  Side,
  Ticket,
} from "./types";

interface ScriptTicket {
  side: Side;
  proposedSide: Side;
  proposedSizePct: number;
  sizePct: number;
  stop: number | null;
  thesis: string;
  riskNote: string;
  vetoed: boolean;
  trimmed: boolean;
}

interface Script {
  ticker: string;
  ticket: ScriptTicket;
  lines: Array<{
    agent: AgentId;
    kind: MessageKind;
    body: string;
    delayMs?: number;
  }>;
}

const SCRIPTS: Record<string, Script> = {
  NVDA: {
    ticker: "NVDA",
    ticket: {
      side: "BUY",
      proposedSide: "BUY",
      proposedSizePct: 5,
      sizePct: 3.5,
      stop: 164,
      thesis:
        "Data-center compounding intact; tape not extended. Buy the grind, not a breakout. Stop 164.",
      riskNote:
        "Trim 5.0% → 3.5%. Tech book already 14% and IV 38 vs 20d realized 29. Approved.",
      vetoed: false,
      trimmed: true,
    },
    lines: [
      {
        agent: "fundamental",
        kind: "thesis",
        body: "FY26 DC implied ~$48B. Gross margin last print 75.8%. Inventory days 92 vs 118 prior — supply catching demand, not a glut. NTM PE 32.4 vs SOX 28; FCF yield 2.1% with net cash. Customer concentration is the flag: MSFT/META/GOOG still ~40% of DC. This is a compounder, not a value name. I will not fade it on multiple alone.",
      },
      {
        agent: "sentiment",
        kind: "note",
        body: "Tape is tired, not broken. 30d news polarity +0.18 after +0.41 in July. WSB mentions −22% WoW. 25d skew steep; put/call 0.92 vs 0.71 90d. Export-control chatter, no filing. The ‘must-own’ bid is fading. Constructive, but this is no longer crowded-long fuel. I would not add into a CPI week.",
      },
      {
        agent: "technical",
        kind: "thesis",
        body: "Mark 178.42. 50d 169.10, 200d 142.80 — still above both. RSI(14) 62, not overbought. MACD hist +0.41 after flattening. Volume 1.1× 20d. Support 171 (8/14 gap), fail opens 164. Resistance 184 then 192. This is a grind, not a breakout. I buy a dip into 171. I do not chase 178.",
      },
      {
        agent: "fundamental",
        kind: "rebuttal",
        body: "Waiting for 171 risks missing if hyperscaler capex holds. The 10-K does not care about the gap. If we want the name, size the grind. Do not wait for a level the tape may not give us.",
      },
      {
        agent: "technical",
        kind: "rebuttal",
        body: "Then do not size 8%. A grind is a 3–5% add with a stop under 164, in the book, not in a footnote. I will not underwrite a chase through 184 on this volume.",
      },
      {
        agent: "sentiment",
        kind: "rebuttal",
        body: "Skew is paying for downside into the print. If Hale buys here, I want it small. Flow is not going to rescue a 5% miss on guidance.",
      },
      {
        agent: "trader",
        kind: "proposal",
        body: "Proposal: BUY 5.0% NAV, day, limit 178.60. Stop 164.00 (8.1% name risk, ~40bp NAV). Thesis: DC compounding intact, tape not extended, add on the grind. I am not waiting for 171 — that is a hope, not a bid.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Gross tech 14.3% now; 5% NVDA puts single-name 5% and sector ~18%, inside the 40% hard. IV 38 vs realized 29 — we are paying vol. Trim to 3.5%. Stop must be a working order, not a note. No veto.",
      },
      {
        agent: "trader",
        kind: "note",
        body: "Accept 3.5%. Working stop 164. If 171 trades I will ask for the rest. Not before.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Ticket stands: BUY 3.5% NAV @ 178.42. Approved.",
      },
    ],
  },
  AAPL: {
    ticker: "AAPL",
    ticket: {
      side: "HOLD",
      proposedSide: "HOLD",
      proposedSizePct: 0,
      sizePct: 0,
      stop: null,
      thesis:
        "Already 9.1% of NAV. No incremental edge vs 228. Services mix is known. Sit.",
      riskNote: "No ticket. Single-name already inside the book. Do not add.",
      vetoed: false,
      trimmed: false,
    },
    lines: [
      {
        agent: "fundamental",
        kind: "thesis",
        body: "We already hold 400 shares, 9.1% NAV at the mark. Gross margin 46.5%, services 25% of revenue and still the multiple. NTM PE 28.1, FCF yield 3.4%. China iPhone units look flattish; buybacks remain the bid. Nothing in the last 10-Q changes the hold. I do not see an add at 228.",
      },
      {
        agent: "sentiment",
        kind: "note",
        body: "News polarity ~0. News cycle is hardware rumor, not a catalyst. Put/call 0.78, IV 22.6 — quiet. No squeeze, no dump. Retail is elsewhere. This name does not move on a Sunday desk.",
      },
      {
        agent: "technical",
        kind: "thesis",
        body: "Mark 228.15, −0.41%. 50d 226.40, 200d 214.90. RSI 48. MACD hist −0.12. Range 224–232 for 11 sessions. A break of 224 opens 218. No setup. I am not a buyer of the range midpoint.",
      },
      {
        agent: "trader",
        kind: "proposal",
        body: "Proposal: HOLD. No incremental. If 224 fails I will come back with a trim, not an add. Thesis is already in the book from 17 SEP.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Agreed. AAPL is the largest name. Adding here is concentration, not conviction. No ticket.",
      },
    ],
  },
  MSFT: {
    ticker: "MSFT",
    ticket: {
      side: "HOLD",
      proposedSide: "BUY",
      proposedSizePct: 3,
      sizePct: 0,
      stop: 418,
      thesis: "Azure growth is not new. Sit on 120 shares. Wait for 418.",
      riskNote:
        "Trader asked +3%. Veto on the add — name already in book, tape extended vs 50d. HOLD.",
      vetoed: true,
      trimmed: false,
    },
    lines: [
      {
        agent: "fundamental",
        kind: "thesis",
        body: "Azure growth still high-20s. Capex guided up again; that is the debate, not the print. NTM PE 29.6, FCF yield 2.8%. Office and LinkedIn carry the multiple when Azure pauses. Clean balance sheet. I like the name. I do not like paying 428 after a 50d ride from 401.",
      },
      {
        agent: "sentiment",
        kind: "note",
        body: "Copilot headlines are stale. IV 21.4, among the cheapest in SOX. That is not a buy signal — it is a low-vol grind. Flow is institutional, not event-driven. No reason to chase the last 80bp.",
      },
      {
        agent: "technical",
        kind: "thesis",
        body: "Mark 428.70, +0.88%. 50d 418.20. RSI 55. Holding the 50d since August. First real support 418, then 409. I will bid 418. I will not bid 428.70.",
      },
      {
        agent: "trader",
        kind: "proposal",
        body: "Proposal: BUY 3.0% add, limit 428.80, stop 418. We already have 120 shares. I want to top up into year-end. Hale.",
      },
      {
        agent: "risk",
        kind: "veto",
        body: "Veto. Single-name would go ~8.1% on a name that has not pulled in. Tech sector would still be inside 40%, but this is a hope add, not a level. Bid 418 in the next session if it trades. No ticket today.",
      },
      {
        agent: "trader",
        kind: "note",
        body: "Veto taken. Working idea only: 418. I will not fight Sato on a 3% hope.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Final: HOLD. Existing 120 shares stay. No fill.",
      },
    ],
  },
  TSLA: {
    ticker: "TSLA",
    ticket: {
      side: "HOLD",
      proposedSide: "SELL",
      proposedSizePct: 12,
      sizePct: 0,
      stop: 258,
      thesis:
        "Delivery miss risk into the print. Short was the idea; size was not. Flat.",
      riskNote:
        "Veto. 12% single-name short vs 15% book short cap and 8% informal hard on one name. IV 62. No ticket.",
      vetoed: true,
      trimmed: false,
    },
    lines: [
      {
        agent: "fundamental",
        kind: "thesis",
        body: "Auto gross margin still compressed. Energy storage is the only clean line. NTM PE 74 on a delivery number the street already faded. FCF yield 0.9%. Robotaxi is a 2027 story priced in 2026 paper. I am not long. A short needs a catalyst, not a multiple complaint.",
      },
      {
        agent: "sentiment",
        kind: "note",
        body: "Polarity −0.34, worst in the book. WSB still long-biased, which is fuel if it breaks. IV 61.8, earnings 11 sessions out. Skew is bid on both wings — this is a volatility event, not a directional gift. Crowded-short is the risk.",
      },
      {
        agent: "technical",
        kind: "thesis",
        body: "Mark 241.80, −2.18%. Lost the 50d 258.60 and the 200d 249.10. RSI 38. MACD hist −1.08. Next support 232 then 218. A close back through 249 kills the breakdown. I will short a failed retest of 249, not a naked 12% dump into earnings.",
      },
      {
        agent: "fundamental",
        kind: "rebuttal",
        body: "If Varga needs 249, we may not get it. Deliveries print before that retest. I would rather be small-short now than perfect later.",
      },
      {
        agent: "sentiment",
        kind: "rebuttal",
        body: "Small is the word. 12% is a statement, not a trade. Squeeze math on this name is ugly. I have seen this desk get carried out on TSLA for less.",
      },
      {
        agent: "trader",
        kind: "proposal",
        body: "Proposal: SELL 12.0% NAV short, stop 258. Thesis: lost both moving averages, polarity washed out, multiple does not belong on a delivery miss. I want it on before the print.",
      },
      {
        agent: "risk",
        kind: "veto",
        body: "Veto. 12% is inside the 15% book short cap and still insane as a single name — informal hard is 8%, and even that is fat on IV 62. Earnings in 11 sessions. We have no TSLA in the book; opening a 12% short is a new book, not a trade. No trim. No ticket.",
      },
      {
        agent: "trader",
        kind: "note",
        body: "Veto taken. I will not resubmit at 4% into the print. If 249 fails after earnings, I come back.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Final: HOLD. Flat. Sato.",
      },
    ],
  },
  JPM: {
    ticker: "JPM",
    ticket: {
      side: "BUY",
      proposedSide: "BUY",
      proposedSizePct: 4,
      sizePct: 4,
      stop: 204,
      thesis:
        "NII durable, credit clean, 12.8×. Add 4% to the existing 200 shares.",
      riskNote: "Approved 4.0%. Financials go ~8.5%, inside 40%. Stop 204.",
      vetoed: false,
      trimmed: false,
    },
    lines: [
      {
        agent: "fundamental",
        kind: "thesis",
        body: "NII guided stable. CET1 15.7%, reserve coverage conservative. NTM PE 12.8, FCF yield 4.1%. IB pipeline is the swing factor, not credit. We already hold 200 shares from 17 SEP @ 198.50. An add is a continuation, not a new idea. I support it.",
      },
      {
        agent: "sentiment",
        kind: "note",
        body: "Quiet tape. IV 18.9. Rates vol is the only headline. No scandal, no downgrade. Put/call 0.71. This is a professional bid, not a story.",
      },
      {
        agent: "technical",
        kind: "thesis",
        body: "Mark 214.33, +0.62%. 50d 207.90, 200d 198.40. RSI 57. Holding higher lows since June. Support 207 then 204. I will underwrite an add with a stop under 204. Do not fade a bank that is above both averages.",
      },
      {
        agent: "trader",
        kind: "proposal",
        body: "Proposal: BUY 4.0% NAV add, limit 214.40, stop 204.00. Stacks on the 200 we already have. Thesis: NII durable, credit clean, 12.8× is not a rich bank.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Financials 4.3% now, 8.5% after the add. Single-name ~8.5%. Both inside hard limits. VaR bump is small — IV 19. Approved 4.0%. Stop in the book.",
      },
    ],
  },
  XOM: {
    ticker: "XOM",
    ticket: {
      side: "HOLD",
      proposedSide: "BUY",
      proposedSizePct: 6,
      sizePct: 0,
      stop: 112,
      thesis: "FCF is real. The tape already has the OPEC cut. No add.",
      riskNote:
        "Veto. Energy is a new sector sleeve on a CPI week. WTI beta 0.9. No ticket.",
      vetoed: true,
      trimmed: false,
    },
    lines: [
      {
        agent: "fundamental",
        kind: "thesis",
        body: "FCF yield 6.8%, NTM PE 14.2, buyback still live. Permian volumes are the engine; Guyana is the duration. Balance sheet is a fortress. On paper this is the cheapest quality in the book. The problem is the commodity, not the company.",
      },
      {
        agent: "sentiment",
        kind: "note",
        body: "OPEC cut is in the tape. WTI has chopped $2 for eight sessions. Polarity +0.05. No one is surprised. Energy ETF flows flat. This is not a new bid.",
      },
      {
        agent: "technical",
        kind: "thesis",
        body: "Mark 118.90, +0.15%. 50d 117.40, 200d 112.10. RSI 52. Dead range 116–121. I have no edge at the midpoint. A break of 116 opens 112. I would buy 112, not 119.",
      },
      {
        agent: "trader",
        kind: "proposal",
        body: "Proposal: BUY 6.0% NAV, new sleeve, stop 112. Thesis: 6.8% FCF, fortress, we have zero energy. I want the ballast against the tech book.",
      },
      {
        agent: "risk",
        kind: "veto",
        body: "Veto. Opening a 6% energy sleeve on a CPI week is a macro bet dressed as a name. WTI realized 38, beta 0.9, and we have no crude hedge. Ballast is a portfolio conversation, not a Monday ticket. Bid 112 if Varga’s level trades. Not 118.90.",
      },
      {
        agent: "trader",
        kind: "note",
        body: "Veto taken. I will not fight a sector-open on this print. Idea file: 112.",
      },
      {
        agent: "risk",
        kind: "mark",
        body: "Final: HOLD. Flat energy. Sato.",
      },
    ],
  },
};

function hhmmss(total: number): string {
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function stamp(
  ticker: string,
  lines: Script["lines"],
): DebateMessage[] {
  let seconds = 9 * 3600 + 41 * 60 + 3;
  return lines.map((line, i) => {
    const delayMs = line.delayMs ?? (i === 0 ? 420 : 780 + (i % 3) * 160);
    if (i > 0) seconds += Math.max(12, Math.round(delayMs / 35));
    return {
      id: `${ticker}-m${i + 1}`,
      agent: line.agent,
      kind: line.kind,
      body: line.body,
      delayMs,
      at: hhmmss(seconds),
    };
  });
}

export function listScriptTickers(): string[] {
  return Object.keys(SCRIPTS);
}

export function buildTicket(
  script: ScriptTicket,
  quote: Quote,
  nav: number,
  ts: string,
): Ticket {
  const shares =
    script.side === "HOLD" ? 0 : sharesForPct(nav, script.sizePct, quote.mark);
  const proposedShares =
    script.proposedSide === "HOLD"
      ? 0
      : sharesForPct(nav, script.proposedSizePct, quote.mark);

  return {
    id: `${quote.symbol}-${ts}`,
    ticker: quote.symbol,
    side: script.side,
    proposedSide: script.proposedSide,
    proposedSizePct: script.proposedSizePct,
    sizePct: script.sizePct,
    shares,
    proposedShares,
    mark: quote.mark,
    stop: script.stop,
    thesis: script.thesis,
    riskNote: script.riskNote,
    vetoed: script.vetoed,
    trimmed: script.trimmed,
    status: "proposed",
    ts,
  };
}

export function getScript(ticker: string): Script {
  const script = SCRIPTS[ticker.toUpperCase()];
  if (!script) {
    throw new Error(`No desk script for ${ticker}`);
  }
  return script;
}

export function buildMockRun(
  ticker: string,
  quote: Quote,
  nav: number,
  ts: string,
) {
  const script = getScript(ticker);
  return {
    messages: stamp(ticker, script.lines),
    ticket: buildTicket(script.ticket, quote, nav, ts),
  };
}
