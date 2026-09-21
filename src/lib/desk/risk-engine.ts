import { cloneBook, fillTicket, markBook, sharesForPct } from "./book";
import { MIN_TRADE_PCT, RISK_LIMITS } from "./limits";
import { roundHalf } from "./signals";
import type {
  Book,
  CheckFlag,
  Exposure,
  Quote,
  RiskDecision,
  Side,
  Ticket,
} from "./types";

export interface RiskRule {
  id: string;
  label: string;
  flag: CheckFlag;
  detail: string;
}

export interface RiskVerdict {
  decision: RiskDecision;
  side: Side;
  sizePct: number;
  shares: number;
  trimmed: boolean;
  vetoed: boolean;
  rules: RiskRule[];
  note: string;
}

function hypothetical(
  book: Book,
  quote: Quote,
  quotes: Quote[],
  side: Side,
  shares: number,
): Exposure {
  const probe: Ticket = {
    id: "probe",
    ticker: quote.symbol,
    side,
    proposedSide: side,
    proposedSizePct: 0,
    sizePct: 0,
    shares,
    proposedShares: shares,
    mark: quote.mark,
    stop: null,
    thesis: "",
    riskNote: "",
    vetoed: false,
    trimmed: false,
    status: "proposed",
    ts: "",
    fillPx: quote.mark,
    feeUsd: 0,
    sector: quote.sector,
  };
  const next = fillTicket(cloneBook(book), probe, quote);
  return markBook(next, quotes);
}

function breaches(exp: Exposure, ticker: string, sector: string): string[] {
  const out: string[] = [];
  if (exp.grossPct > RISK_LIMITS.grossPct) out.push("GROSS");
  if (exp.shortPct > RISK_LIMITS.shortPct) out.push("SHORT");
  if (exp.dailyRiskProxy > RISK_LIMITS.dailyRiskProxy) out.push("RISK_PROXY");
  if (exp.drawdownPct > RISK_LIMITS.maxDrawdownPct) out.push("DRAWDOWN");
  if (Math.abs(exp.namePct[ticker] ?? 0) > RISK_LIMITS.singleNamePct) {
    out.push("NAME");
  }
  if (Math.abs(exp.sectorPct[sector] ?? 0) > RISK_LIMITS.sectorPct) {
    out.push("SECTOR");
  }
  return out;
}

function isRiskReducing(next: Exposure, current: Exposure, ticker: string): boolean {
  return (
    next.grossPct < current.grossPct &&
    next.shortPct <= current.shortPct &&
    Math.abs(next.namePct[ticker] ?? 0) < Math.abs(current.namePct[ticker] ?? 0)
  );
}

function applicableBreaches(
  next: Exposure,
  current: Exposure,
  ticker: string,
  sector: string,
): string[] {
  const hit = breaches(next, ticker, sector);
  if (
    current.drawdownPct > RISK_LIMITS.maxDrawdownPct &&
    isRiskReducing(next, current, ticker)
  ) {
    return hit.filter((id) => id !== "DRAWDOWN");
  }
  return hit;
}

function flagRule(
  id: string,
  label: string,
  flag: CheckFlag,
  detail: string,
): RiskRule {
  return { id, label, flag, detail };
}

export function evaluateTicket(
  proposed: { side: Side; sizePct: number; shares: number },
  book: Book,
  quote: Quote,
  quotes: Quote[],
  current: Exposure,
): RiskVerdict {
  const rules: RiskRule[] = [];
  const side = proposed.side;
  let sizePct = proposed.sizePct;
  let decision: RiskDecision = "pass";

  if (side === "HOLD" || sizePct <= 0 || proposed.shares <= 0) {
    rules.push(
      flagRule(
        "POSITION",
        "Position limit",
        "OK",
        `No incremental. ${quote.symbol} ${current.namePct[quote.symbol]?.toFixed(1) ?? "0.0"}% NAV.`,
      ),
      flagRule(
        "LIQUIDITY",
        "Liquidity (ADV)",
        "OK",
        "No order.",
      ),
      flagRule(
        "FACTOR",
        "Factor exposure",
        "OK",
        `${quote.sector} ${current.sectorPct[quote.sector]?.toFixed(1) ?? "0.0"}%.`,
      ),
      flagRule(
        "RISK_PROXY",
        "Vol-weighted risk",
        current.dailyRiskProxy > RISK_LIMITS.dailyRiskProxy * 0.55 ? "WARNING" : "OK",
        `RiskProxy ${Math.round(current.dailyRiskProxy)} / ${RISK_LIMITS.dailyRiskProxy}.`,
      ),
      flagRule(
        "DRAWDOWN",
        "Drawdown",
        current.drawdownPct > RISK_LIMITS.maxDrawdownPct * 0.6
          ? "WARNING"
          : "OK",
        `DD ${current.drawdownPct.toFixed(1)}% / ${RISK_LIMITS.maxDrawdownPct}%.`,
      ),
    );
    return {
      decision: "pass",
      side: "HOLD",
      sizePct: 0,
      shares: 0,
      trimmed: false,
      vetoed: false,
      rules,
      note: "No ticket. Limits unchanged.",
    };
  }

  if (quote.iv30 > 50) {
    sizePct = roundHalf(sizePct * 0.8);
    decision = "trim";
    rules.push(
      flagRule(
        "IV",
        "Implied vol",
        "WARNING",
        `IV ${quote.iv30.toFixed(1)}. Haircut 20%.`,
      ),
    );
  } else if (quote.iv30 > 36) {
    sizePct = roundHalf(sizePct * 0.78);
    decision = "trim";
    rules.push(
      flagRule(
        "IV",
        "Implied vol",
        "WARNING",
        `IV ${quote.iv30.toFixed(1)} vs 32 bar. Haircut 22%.`,
      ),
    );
  } else {
    rules.push(
      flagRule("IV", "Implied vol", "OK", `IV ${quote.iv30.toFixed(1)}.`),
    );
  }

  if (quote.beta > 1.8) {
    rules.push(
      flagRule(
        "BETA",
        "Beta",
        "WARNING",
        `Beta ${quote.beta.toFixed(2)}. Name is a factor bet.`,
      ),
    );
  }

  let shares = sharesForPct(current.nav, sizePct, quote.mark);
  let next = hypothetical(book, quote, quotes, side, shares);
  let hit = applicableBreaches(next, current, quote.symbol, quote.sector);

  while (hit.length && sizePct >= MIN_TRADE_PCT) {
    sizePct = roundHalf(sizePct - 0.5);
    shares = sharesForPct(current.nav, sizePct, quote.mark);
    next = hypothetical(book, quote, quotes, side, shares);
    hit = applicableBreaches(next, current, quote.symbol, quote.sector);
    decision = "trim";
  }

  if (hit.length || sizePct < MIN_TRADE_PCT || shares <= 0) {
    const failId = hit[0] ?? "SIZE";
    rules.push(
      flagRule(
        failId,
        failId === "NAME"
          ? "Position limit"
          : failId === "RISK_PROXY"
            ? "Vol-weighted risk"
            : failId === "DRAWDOWN"
              ? "Drawdown"
              : "Position limit",
        "FAIL",
        `Cannot fit ${proposed.sizePct.toFixed(1)}% under ${hit.join("/ ") || "min size"}.`,
      ),
    );
    return {
      decision: "veto",
      side: "HOLD",
      sizePct: 0,
      shares: 0,
      trimmed: false,
      vetoed: true,
      rules,
      note: `Veto. ${hit.join(", ") || "Size"} would breach ${JSON.stringify({
        name: RISK_LIMITS.singleNamePct,
        sector: RISK_LIMITS.sectorPct,
        short: RISK_LIMITS.shortPct,
        gross: RISK_LIMITS.grossPct,
      })}. No ticket.`,
    };
  }

  const nextName = Math.abs(next.namePct[quote.symbol] ?? 0);
  const nextSector = Math.abs(next.sectorPct[quote.sector] ?? 0);
  const advShares = quote.avgVolumeM * 1_000_000;
  const bpOfAdv = advShares > 0 ? (shares / advShares) * 10_000 : 0;

  rules.push(
    flagRule(
      "POSITION",
      "Position limit",
      nextName > RISK_LIMITS.singleNamePct * 0.55 ? "WARNING" : "OK",
      `${quote.symbol} ${nextName.toFixed(1)}% / ${RISK_LIMITS.singleNamePct}%.`,
    ),
    flagRule(
      "LIQUIDITY",
      "Liquidity (ADV)",
      quote.volumeM < quote.avgVolumeM * 0.95 || bpOfAdv > 0.5
        ? "WARNING"
        : "OK",
      `${bpOfAdv.toFixed(2)}bp ADV \u00b7 vol ${quote.volumeM.toFixed(1)}M.`,
    ),
    flagRule(
      "FACTOR",
      "Factor exposure",
      quote.beta > 1.15 || nextSector > RISK_LIMITS.sectorPct * 0.45
        ? "WARNING"
        : "OK",
      `${quote.sector} ${nextSector.toFixed(1)}% \u00b7 beta ${quote.beta.toFixed(2)}.`,
    ),
    flagRule(
      "RISK_PROXY",
      "Vol-weighted risk",
      next.dailyRiskProxy > RISK_LIMITS.dailyRiskProxy * 0.55 ? "WARNING" : "OK",
      `RiskProxy ${Math.round(next.dailyRiskProxy)} / ${RISK_LIMITS.dailyRiskProxy}.`,
    ),
    flagRule(
      "DRAWDOWN",
      "Drawdown",
      next.drawdownPct > RISK_LIMITS.maxDrawdownPct * 0.6 ? "WARNING" : "OK",
      `DD ${next.drawdownPct.toFixed(1)}% / ${RISK_LIMITS.maxDrawdownPct}%.`,
    ),
  );

  const unique: RiskRule[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const key = rule.label;
    if (seen.has(key) && rule.id !== "IV" && rule.id !== "BETA") continue;
    if (rule.id === "IV" || rule.id === "BETA") {
      unique.push(rule);
      continue;
    }
    seen.add(key);
    unique.push(rule);
  }

  const display = unique.filter((r) =>
    ["Position limit", "Liquidity (ADV)", "Factor exposure", "Vol-weighted risk", "Drawdown"].includes(
      r.label,
    ),
  );

  const trimmed = decision === "trim" || sizePct < proposed.sizePct - 0.01;
  const note = trimmed
    ? `Trim ${proposed.sizePct.toFixed(1)}% \u2192 ${sizePct.toFixed(1)}%. ${quote.symbol} ${nextName.toFixed(1)}%, ${quote.sector} ${nextSector.toFixed(1)}%. Inside hard limits. ${quote.iv30 > 36 ? `IV ${quote.iv30.toFixed(1)}.` : ""} Approved.`
    : `Approved ${sizePct.toFixed(1)}%. ${quote.symbol} ${nextName.toFixed(1)}%, ${quote.sector} ${nextSector.toFixed(1)}%. RiskProxy ${Math.round(next.dailyRiskProxy)}. Stop in the book.`;

  return {
    decision: trimmed ? "trim" : "pass",
    side,
    sizePct,
    shares,
    trimmed,
    vetoed: false,
    rules: display.length ? display : unique,
    note: note.replace(/\s+/g, " ").trim(),
  };
}
