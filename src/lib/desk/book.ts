import { RISK_LIMITS, STARTING_NAV } from "./limits";
import type { Book, Exposure, Position, Quote, Ticket } from "./types";

export const SEED_BOOK: Book = {
  cash: 814_430,
  positions: [
    { ticker: "AAPL", shares: 400, avg: 221.4, sector: "Technology" },
    { ticker: "MSFT", shares: 120, avg: 412.1, sector: "Technology" },
    { ticker: "JPM", shares: 200, avg: 198.5, sector: "Financials" },
  ],
};

export function cloneBook(book: Book): Book {
  return {
    cash: book.cash,
    positions: book.positions.map((p) => ({ ...p })),
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
  let absVar = 0;

  for (const pos of book.positions) {
    const quote = map[pos.ticker];
    const mark = quote?.mark ?? pos.avg;
    const value = pos.shares * mark;
    if (value >= 0) long += value;
    else short += Math.abs(value);
    absVar += Math.abs(value) * ((quote?.iv30 ?? 25) / 100) * 0.06;
    namePct[pos.ticker] = value;
    const sector = quote?.sector ?? pos.sector;
    sectorPct[sector] = (sectorPct[sector] ?? 0) + value;
  }

  const nav = book.cash + long - short;
  const denom = nav === 0 ? STARTING_NAV : nav;

  const toPct = (n: number) => (n / denom) * 100;

  const namePctOut: Record<string, number> = {};
  for (const [k, v] of Object.entries(namePct)) namePctOut[k] = toPct(v);
  const sectorPctOut: Record<string, number> = {};
  for (const [k, v] of Object.entries(sectorPct)) sectorPctOut[k] = toPct(v);

  return {
    nav,
    grossPct: toPct(long + short),
    netPct: toPct(long - short),
    longPct: toPct(long),
    shortPct: toPct(short),
    sectorPct: sectorPctOut,
    namePct: namePctOut,
    dailyVar: absVar,
  };
}

export function ticketNotional(ticket: Ticket): number {
  return ticket.shares * ticket.mark;
}

export function sharesForPct(nav: number, pct: number, mark: number): number {
  if (mark <= 0) return 0;
  return Math.max(0, Math.round((nav * (pct / 100)) / mark));
}

export function canFill(ticket: Ticket): boolean {
  return !ticket.vetoed && ticket.side !== "HOLD" && ticket.shares > 0;
}

export function fillTicket(book: Book, ticket: Ticket): Book {
  if (!canFill(ticket)) return cloneBook(book);

  const next = cloneBook(book);
  const signedShares =
    ticket.side === "SELL" ? -ticket.shares : ticket.shares;
  const cashDelta = -signedShares * ticket.mark;
  next.cash = Math.round((next.cash + cashDelta) * 100) / 100;

  const existing = next.positions.find((p) => p.ticker === ticket.ticker);
  if (!existing) {
    if (signedShares !== 0) {
      next.positions.push({
        ticker: ticket.ticker,
        shares: signedShares,
        avg: ticket.mark,
        sector: "Unknown",
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
    existing.avg = ticket.mark;
    existing.shares = newShares;
    return next;
  }

  const oldValue = existing.shares * existing.avg;
  const addValue = signedShares * ticket.mark;
  existing.shares = newShares;
  existing.avg = (oldValue + addValue) / newShares;
  return next;
}

export function attachSectors(book: Book, quotes: Quote[]): Book {
  const map = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
  return {
    ...book,
    positions: book.positions.map((p) => ({
      ...p,
      sector: map[p.ticker]?.sector ?? p.sector,
    })),
  };
}

export function limitBreaches(exposure: Exposure): string[] {
  const out: string[] = [];
  if (exposure.grossPct > RISK_LIMITS.grossPct) {
    out.push(`Gross ${exposure.grossPct.toFixed(1)}% > ${RISK_LIMITS.grossPct}%`);
  }
  if (exposure.shortPct > RISK_LIMITS.shortPct) {
    out.push(`Short ${exposure.shortPct.toFixed(1)}% > ${RISK_LIMITS.shortPct}%`);
  }
  if (exposure.dailyVar > RISK_LIMITS.dailyVar) {
    out.push(`VaR ${Math.round(exposure.dailyVar)} > ${RISK_LIMITS.dailyVar}`);
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
