import { RISK_LIMITS, STARTING_NAV } from "./limits";
import type { Book, Exposure, Position, Quote, Ticket } from "./types";

export const SEED_BOOK: Book = {
  cash: 814_430,
  positions: [
    { ticker: "AAPL", shares: 400, avg: 221.4, sector: "Technology" },
    { ticker: "MSFT", shares: 120, avg: 412.1, sector: "Technology" },
    { ticker: "JPM", shares: 200, avg: 198.5, sector: "Financials" },
  ],
  peakNav: STARTING_NAV,
};

export function cloneBook(book: Book): Book {
  return {
    cash: book.cash,
    positions: book.positions.map((p) => ({ ...p })),
    peakNav: book.peakNav ?? STARTING_NAV,
  };
}

export function normalizeBook(book: Book): Book {
  return {
    cash: book.cash,
    positions: (book.positions ?? []).map((p) => ({ ...p })),
    peakNav: book.peakNav ?? STARTING_NAV,
  };
}

export function positionValue(position: Position, mark: number): number {
  return position.shares * mark;
}

export function positionPnl(position: Position, mark: number): number {
  return (mark - position.avg) * position.shares;
}

export function markBook(
  book: Book,
  quotes: Record<string, Quote> | Quote[],
): Exposure {
  const map: Record<string, Quote> = Array.isArray(quotes)
    ? Object.fromEntries(quotes.map((q) => [q.symbol, q]))
    : quotes;

  const sectorPct: Record<string, number> = {};
  const namePct: Record<string, number> = {};
  let long = 0;
  let short = 0;
  /** Vol-weighted exposure proxy: Σ |value| × (iv30/100) × 0.06 — not VaR. */
  let riskProxyTotal = 0;

  for (const pos of book.positions) {
    const quote = map[pos.ticker];
    const mark = quote?.mark ?? pos.avg;
    const value = pos.shares * mark;
    if (value >= 0) long += value;
    else short += Math.abs(value);
    riskProxyTotal += Math.abs(value) * ((quote?.iv30 ?? 25) / 100) * 0.06;
    namePct[pos.ticker] = value;
    const sector = quote?.sector ?? pos.sector;
    sectorPct[sector] = (sectorPct[sector] ?? 0) + value;
  }

  const nav = book.cash + long - short;
  const denom = nav === 0 ? STARTING_NAV : nav;
  const peakNav = Math.max(book.peakNav ?? STARTING_NAV, nav);
  const drawdownPct = peakNav > 0 ? Math.max(0, ((peakNav - nav) / peakNav) * 100) : 0;

  const toPct = (n: number) => (n / denom) * 100;

  const namePctOut: Record<string, number> = {};
  for (const [k, v] of Object.entries(namePct)) namePctOut[k] = toPct(v);
  const sectorPctOut: Record<string, number> = {};
  for (const [k, v] of Object.entries(sectorPct)) sectorPctOut[k] = toPct(v);

  return {
    nav,
    peakNav,
    drawdownPct,
    grossPct: toPct(long + short),
    netPct: toPct(long - short),
    longPct: toPct(long),
    shortPct: toPct(short),
    sectorPct: sectorPctOut,
    namePct: namePctOut,
    dailyRiskProxy: riskProxyTotal,
  };
}

export function withPeak(book: Book, quotes: Quote[] | Record<string, Quote>): Book {
  const next = normalizeBook(book);
  const exp = markBook(next, quotes);
  next.peakNav = Math.max(next.peakNav, exp.nav);
  return next;
}

export function ticketNotional(ticket: Ticket): number {
  const px = ticket.fillPx ?? ticket.mark;
  return ticket.shares * px;
}

export function sharesForPct(nav: number, pct: number, mark: number): number {
  if (mark <= 0 || pct <= 0) return 0;
  return Math.max(0, Math.round((nav * (pct / 100)) / mark));
}

export function canFill(ticket: Ticket): boolean {
  return !ticket.vetoed && ticket.side !== "HOLD" && ticket.shares > 0;
}

export function fillTicket(book: Book, ticket: Ticket, quote?: Quote): Book {
  if (!canFill(ticket)) return cloneBook(book);

  const next = cloneBook(book);
  const px = ticket.fillPx ?? ticket.mark;
  const fee = ticket.feeUsd ?? 0;
  const signedShares =
    ticket.side === "SELL" ? -ticket.shares : ticket.shares;
  const cashDelta = -signedShares * px - fee;
  next.cash = Math.round((next.cash + cashDelta) * 100) / 100;

  const sector = quote?.sector ?? ticket.sector ?? "Unknown";
  const existing = next.positions.find((p) => p.ticker === ticket.ticker);
  if (!existing) {
    if (signedShares !== 0) {
      next.positions.push({
        ticker: ticket.ticker,
        shares: signedShares,
        avg: px,
        sector,
      });
    }
    return next;
  }

  const newShares = existing.shares + signedShares;
  if (newShares === 0) {
    next.positions = next.positions.filter((p) => p.ticker !== ticket.ticker);
    return next;
  }

  if (existing.shares === 0 || Math.sign(existing.shares) !== Math.sign(newShares)) {
    existing.avg = px;
    existing.shares = newShares;
    existing.sector = sector;
    return next;
  }

  // Only an increase in the same direction changes the weighted average
  // entry price. Reducing a long or covering a short realizes part of the
  // position, but the remaining shares keep their original cost basis.
  if (Math.sign(existing.shares) !== Math.sign(signedShares)) {
    existing.shares = newShares;
    existing.sector = sector;
    return next;
  }

  const oldValue = existing.shares * existing.avg;
  const addValue = signedShares * px;
  existing.shares = newShares;
  existing.avg = (oldValue + addValue) / newShares;
  existing.sector = sector;
  return next;
}

export function attachSectors(book: Book, quotes: Quote[]): Book {
  const map = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
  const next = normalizeBook(book);
  next.positions = next.positions.map((p) => ({
    ...p,
    sector: map[p.ticker]?.sector ?? p.sector,
  }));
  return next;
}

export function limitBreaches(exposure: Exposure): string[] {
  const out: string[] = [];
  if (exposure.grossPct > RISK_LIMITS.grossPct) {
    out.push(`Gross ${exposure.grossPct.toFixed(1)}% > ${RISK_LIMITS.grossPct}%`);
  }
  if (exposure.shortPct > RISK_LIMITS.shortPct) {
    out.push(`Short ${exposure.shortPct.toFixed(1)}% > ${RISK_LIMITS.shortPct}%`);
  }
  if (exposure.dailyRiskProxy > RISK_LIMITS.dailyRiskProxy) {
    out.push(`RiskProxy ${Math.round(exposure.dailyRiskProxy)} > ${RISK_LIMITS.dailyRiskProxy}`);
  }
  if (exposure.drawdownPct > RISK_LIMITS.maxDrawdownPct) {
    out.push(
      `Drawdown ${exposure.drawdownPct.toFixed(1)}% > ${RISK_LIMITS.maxDrawdownPct}%`,
    );
  }
  for (const [name, pct] of Object.entries(exposure.namePct)) {
    if (Math.abs(pct) > RISK_LIMITS.singleNamePct) {
      out.push(`${name} ${pct.toFixed(1)}% > ${RISK_LIMITS.singleNamePct}%`);
    }
  }
  for (const [sector, pct] of Object.entries(exposure.sectorPct)) {
    if (Math.abs(pct) > RISK_LIMITS.sectorPct) {
      out.push(`${sector} ${pct.toFixed(1)}% > ${RISK_LIMITS.sectorPct}%`);
    }
  }
  return out;
}
