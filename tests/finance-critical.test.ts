/**
 * Finance-critical unit tests (offline).
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertPaperAlpacaBaseUrl } from "../src/lib/desk/broker";
import { ALPACA_PAPER_URL } from "../src/lib/desk/flags";
import {
  canFill,
  cloneBook,
  fillTicket,
  limitBreaches,
  markBook,
  positionPnl,
  SEED_BOOK,
  sharesForPct,
} from "../src/lib/desk/book";
import { priceTicket, quoteFill } from "../src/lib/desk/execution";
import { FEE_BPS, MIN_TRADE_PCT, RISK_LIMITS, STARTING_NAV } from "../src/lib/desk/limits";
import { evaluateTicket } from "../src/lib/desk/risk-engine";
import { isLiveTrading, LIVE_TRADING } from "../src/lib/desk/flags";
import { UNIVERSE, getQuote } from "../src/lib/desk/universe";
import { computeTechnicals, rsiWilder } from "../src/lib/desk/technicals";
import { formatProvenanceBadge } from "../src/lib/desk/provenance";
import type { Book, Ticket } from "../src/lib/desk/types";

function blankTicket(partial: Partial<Ticket> & Pick<Ticket, "ticker" | "side" | "shares">): Ticket {
  return {
    id: "t1",
    proposedSide: partial.side,
    proposedSizePct: 5,
    sizePct: 5,
    proposedShares: partial.shares,
    mark: 100,
    stop: null,
    thesis: "",
    riskNote: "",
    vetoed: false,
    trimmed: false,
    status: "proposed",
    ts: "2026-09-21T00:00:00.000Z",
    fillPx: 100,
    feeUsd: 0,
    ...partial,
  };
}

describe("name limit in/out", () => {
  it("passes when post-trade name weight is inside singleNamePct", () => {
    const quote = getQuote("XOM");
    const book = cloneBook(SEED_BOOK);
    const exp = markBook(book, UNIVERSE);
    const shares = sharesForPct(exp.nav, 5, quote.mark);
    const verdict = evaluateTicket(
      { side: "BUY", sizePct: 5, shares },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    assert.equal(verdict.vetoed, false);
    assert.ok(verdict.sizePct > 0);
    const next = markBook(
      fillTicket(book, blankTicket({
        ticker: quote.symbol,
        side: "BUY",
        shares: verdict.shares,
        fillPx: quote.mark,
        sector: quote.sector,
      }), quote),
      UNIVERSE,
    );
    assert.ok(Math.abs(next.namePct[quote.symbol] ?? 0) <= RISK_LIMITS.singleNamePct + 0.01);
  });

  it("vetoes when a forced oversized name cannot fit under singleNamePct", () => {
    const quote = getQuote("AAPL");
    const book = cloneBook(SEED_BOOK);
    const exp = markBook(book, UNIVERSE);
    const hugePct = 30;
    const shares = sharesForPct(exp.nav, hugePct, quote.mark);
    const verdict = evaluateTicket(
      { side: "BUY", sizePct: hugePct, shares },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    if (!verdict.vetoed) {
      const next = markBook(
        fillTicket(book, blankTicket({
          ticker: quote.symbol,
          side: "BUY",
          shares: verdict.shares,
          fillPx: quote.mark,
          sector: quote.sector,
        }), quote),
        UNIVERSE,
      );
      assert.ok(Math.abs(next.namePct[quote.symbol] ?? 0) <= RISK_LIMITS.singleNamePct + 0.05);
      assert.ok(verdict.sizePct < hugePct);
    } else {
      assert.equal(verdict.shares, 0);
    }
  });
});

describe("drawdown veto", () => {
  it("vetoes new risk when book drawdown already exceeds maxDrawdownPct", () => {
    const quote = getQuote("NVDA");
    const book: Book = {
      cash: 500_000,
      positions: [],
      peakNav: STARTING_NAV,
    };
    const exp = markBook(book, UNIVERSE);
    assert.ok(exp.drawdownPct > RISK_LIMITS.maxDrawdownPct);
    const shares = sharesForPct(exp.nav, 5, quote.mark);
    const verdict = evaluateTicket(
      { side: "BUY", sizePct: 5, shares },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    assert.equal(verdict.vetoed, true);
    assert.equal(verdict.decision, "veto");
    assert.equal(verdict.shares, 0);
  });

  it("allows a sell that reduces a long while the book is in drawdown", () => {
    const quote = getQuote("AAPL");
    const book: Book = {
      cash: 500_000,
      positions: [{ ticker: "AAPL", shares: 800, avg: quote.mark, sector: quote.sector }],
      peakNav: STARTING_NAV,
    };
    const exp = markBook(book, UNIVERSE);
    assert.ok(exp.drawdownPct > RISK_LIMITS.maxDrawdownPct);
    const verdict = evaluateTicket(
      { side: "SELL", sizePct: 4, shares: 120 },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    assert.equal(verdict.vetoed, false);
    assert.equal(verdict.side, "SELL");
    assert.ok(verdict.shares > 0);
  });
});

describe("short limit", () => {
  it("refuses a short that would breach shortPct", () => {
    const quote = getQuote("TSLA");
    const book = cloneBook(SEED_BOOK);
    const exp = markBook(book, UNIVERSE);
    const hugePct = 40;
    const shares = sharesForPct(exp.nav, hugePct, quote.mark);
    const verdict = evaluateTicket(
      { side: "SELL", sizePct: hugePct, shares },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    if (!verdict.vetoed) {
      const next = markBook(
        fillTicket(book, blankTicket({
          ticker: quote.symbol,
          side: "SELL",
          shares: verdict.shares,
          fillPx: quote.mark,
          sector: quote.sector,
        }), quote),
        UNIVERSE,
      );
      assert.ok(next.shortPct <= RISK_LIMITS.shortPct + 0.05);
      assert.ok(verdict.sizePct < hugePct);
    } else {
      assert.equal(verdict.decision, "veto");
    }
  });
});

describe("sector limit", () => {
  it("trims or vetoes when Technology sleeve would exceed sectorPct", () => {
    const quote = getQuote("NVDA");
    const book = cloneBook(SEED_BOOK);
    const exp = markBook(book, UNIVERSE);
    const hugePct = 50;
    const shares = sharesForPct(exp.nav, hugePct, quote.mark);
    const verdict = evaluateTicket(
      { side: "BUY", sizePct: hugePct, shares },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    if (!verdict.vetoed) {
      const next = markBook(
        fillTicket(book, blankTicket({
          ticker: quote.symbol,
          side: "BUY",
          shares: verdict.shares,
          fillPx: quote.mark,
          sector: quote.sector,
        }), quote),
        UNIVERSE,
      );
      assert.ok(Math.abs(next.sectorPct["Technology"] ?? 0) <= RISK_LIMITS.sectorPct + 0.05);
    } else {
      assert.equal(verdict.shares, 0);
    }
  });
});

describe("risk limit boundaries", () => {
  it("allows exposure exactly at every configured hard limit", () => {
    assert.deepEqual(
      limitBreaches({
        nav: STARTING_NAV,
        peakNav: STARTING_NAV,
        drawdownPct: RISK_LIMITS.maxDrawdownPct,
        grossPct: RISK_LIMITS.grossPct,
        netPct: 0,
        longPct: 65,
        shortPct: RISK_LIMITS.shortPct,
        sectorPct: { Technology: RISK_LIMITS.sectorPct },
        namePct: { AAPL: RISK_LIMITS.singleNamePct },
        dailyRiskProxy: RISK_LIMITS.dailyRiskProxy,
      }),
      [],
    );
  });
});

describe("fees and cash", () => {
  it("debits cash by notional + fee on a BUY fill", () => {
    const quote = getQuote("NVDA");
    const book = cloneBook(SEED_BOOK);
    const shares = 100;
    const priced = priceTicket(
      blankTicket({ ticker: "NVDA", side: "BUY", shares, mark: quote.mark }),
      quote,
    );
    assert.ok((priced.fillPx ?? 0) > quote.mark);
    assert.equal(priced.feeBps, FEE_BPS);
    assert.ok((priced.feeUsd ?? 0) > 0);
    const after = fillTicket(book, priced, quote);
    const expectedDebit = shares * (priced.fillPx as number) + (priced.feeUsd as number);
    assert.ok(Math.abs(book.cash - after.cash - expectedDebit) < 0.02);
  });
});

describe("average cost", () => {
  it("weights average cost on same-side add", () => {
    const quote = getQuote("AAPL");
    const book = cloneBook(SEED_BOOK);
    const before = book.positions.find((p) => p.ticker === "AAPL")!;
    const add = 100;
    const fillPx = 250;
    const after = fillTicket(
      book,
      blankTicket({
        ticker: "AAPL",
        side: "BUY",
        shares: add,
        fillPx,
        feeUsd: 0,
        sector: "Technology",
      }),
      quote,
    );
    const pos = after.positions.find((p) => p.ticker === "AAPL")!;
    const expected =
      (before.shares * before.avg + add * fillPx) / (before.shares + add);
    assert.ok(Math.abs(pos.avg - expected) < 1e-9);
    assert.equal(pos.shares, before.shares + add);
  });
});

describe("close and reverse", () => {
  it("removes the name when shares go to zero", () => {
    const quote = getQuote("JPM");
    const book = cloneBook(SEED_BOOK);
    const pos = book.positions.find((p) => p.ticker === "JPM")!;
    const after = fillTicket(
      book,
      blankTicket({
        ticker: "JPM",
        side: "SELL",
        shares: pos.shares,
        fillPx: quote.mark,
        feeUsd: 0,
        sector: quote.sector,
      }),
      quote,
    );
    assert.equal(after.positions.find((p) => p.ticker === "JPM"), undefined);
  });

  it("resets avg on reverse through zero", () => {
    const quote = getQuote("JPM");
    const book = cloneBook(SEED_BOOK);
    const pos = book.positions.find((p) => p.ticker === "JPM")!;
    const fillPx = 210;
    const after = fillTicket(
      book,
      blankTicket({
        ticker: "JPM",
        side: "SELL",
        shares: pos.shares + 50,
        fillPx,
        feeUsd: 0,
        sector: quote.sector,
      }),
      quote,
    );
    const next = after.positions.find((p) => p.ticker === "JPM")!;
    assert.equal(next.shares, -50);
    assert.equal(next.avg, fillPx);
  });

  it("preserves average cost when reducing a long or covering a short", () => {
    const quote = getQuote("JPM");
    const long: Book = {
      cash: 0,
      positions: [{ ticker: "JPM", shares: 10, avg: 100, sector: quote.sector }],
      peakNav: STARTING_NAV,
    };
    const reducedLong = fillTicket(
      long,
      blankTicket({ ticker: "JPM", side: "SELL", shares: 4, fillPx: 120, sector: quote.sector }),
      quote,
    );
    const remainingLong = reducedLong.positions[0]!;
    assert.equal(remainingLong.shares, 6);
    assert.equal(remainingLong.avg, 100);
    assert.equal(positionPnl(remainingLong, 130), 180);

    const short: Book = {
      cash: 0,
      positions: [{ ticker: "JPM", shares: -10, avg: 100, sector: quote.sector }],
      peakNav: STARTING_NAV,
    };
    const coveredShort = fillTicket(
      short,
      blankTicket({ ticker: "JPM", side: "BUY", shares: 4, fillPx: 80, sector: quote.sector }),
      quote,
    );
    const remainingShort = coveredShort.positions[0]!;
    assert.equal(remainingShort.shares, -6);
    assert.equal(remainingShort.avg, 100);
    assert.equal(positionPnl(remainingShort, 80), 120);
  });
});

describe("no fill after veto", () => {
  it("canFill is false and fillTicket is a no-op when vetoed", () => {
    const quote = getQuote("NVDA");
    const book = cloneBook(SEED_BOOK);
    const ticket = blankTicket({
      ticker: "NVDA",
      side: "BUY",
      shares: 100,
      vetoed: true,
      status: "vetoed",
      fillPx: quote.mark,
    });
    assert.equal(canFill(ticket), false);
    const after = fillTicket(book, ticket, quote);
    assert.equal(after.cash, book.cash);
    assert.equal(after.positions.length, book.positions.length);
  });
});

describe("minimum trade size", () => {
  it("vetoes a sub-minimum ticket without changing the book", () => {
    const quote = getQuote("TSLA");
    const book = cloneBook(SEED_BOOK);
    const before = cloneBook(book);
    const exp = markBook(book, UNIVERSE);
    const sizePct = MIN_TRADE_PCT - 0.1;
    const verdict = evaluateTicket(
      { side: "BUY", sizePct, shares: sharesForPct(exp.nav, sizePct, quote.mark) },
      book,
      quote,
      UNIVERSE,
      exp,
    );
    assert.equal(verdict.vetoed, true);
    assert.equal(verdict.shares, 0);
    assert.deepEqual(book, before);
  });
});

describe("short-side position accounting", () => {
  it("opens a short, adds, covers while preserving basis, then flips long", () => {
    const quote = getQuote("JPM");
    const flat: Book = { cash: 10_000, positions: [], peakNav: STARTING_NAV };
    const opened = fillTicket(
      flat,
      blankTicket({ ticker: "JPM", side: "SELL", shares: 10, fillPx: 100, feeUsd: 0 }),
      quote,
    );
    assert.equal(opened.positions[0]?.shares, -10);
    assert.equal(opened.positions[0]?.avg, 100);
    assert.equal(opened.cash, 11_000);

    const added = fillTicket(
      opened,
      blankTicket({ ticker: "JPM", side: "SELL", shares: 5, fillPx: 110, feeUsd: 0 }),
      quote,
    );
    assert.equal(added.positions[0]?.shares, -15);
    assert.ok(Math.abs((added.positions[0]?.avg ?? 0) - (1_000 + 550) / 15) < 1e-9);

    const covered = fillTicket(
      added,
      blankTicket({ ticker: "JPM", side: "BUY", shares: 6, fillPx: 80, feeUsd: 0 }),
      quote,
    );
    assert.equal(covered.positions[0]?.shares, -9);
    assert.equal(covered.positions[0]?.avg, added.positions[0]?.avg);
    assert.ok(positionPnl(covered.positions[0]!, 80) > 0);

    const flipped = fillTicket(
      covered,
      blankTicket({ ticker: "JPM", side: "BUY", shares: 10, fillPx: 80, feeUsd: 0 }),
      quote,
    );
    assert.equal(flipped.positions[0]?.shares, 1);
    assert.equal(flipped.positions[0]?.avg, 80);
  });
});

describe("live URL reject / paper URL accept", () => {
  it("refuses api.alpaca.markets", () => {
    assert.throws(() => assertPaperAlpacaBaseUrl("https://api.alpaca.markets"));
  });
  it("accepts paper-api.alpaca.markets", () => {
    assert.equal(
      assertPaperAlpacaBaseUrl(ALPACA_PAPER_URL),
      "https://paper-api.alpaca.markets",
    );
  });
  it("LIVE_TRADING stays hard-false", () => {
    assert.equal(LIVE_TRADING, false);
    assert.equal(isLiveTrading(), false);
  });
});

describe("dailyRiskProxy is not VaR (formula smoke)", () => {
  it("equals Σ |value| × iv/100 × 0.06 on the seed book", () => {
    const book = cloneBook(SEED_BOOK);
    const exp = markBook(book, UNIVERSE);
    let expected = 0;
    for (const pos of book.positions) {
      const q = UNIVERSE.find((x) => x.symbol === pos.ticker)!;
      expected += Math.abs(pos.shares * q.mark) * (q.iv30 / 100) * 0.06;
    }
    assert.ok(Math.abs(exp.dailyRiskProxy - expected) < 1e-6);
  });
});

describe("provenance on sample universe", () => {
  it("every quote carries MARK/FUNDAMENTALS/TECHNICALS/NEWS provenance", () => {
    for (const q of UNIVERSE) {
      assert.equal(q.provenance.mark.source, "sample");
      assert.equal(q.provenance.fundamentals.source, "sample");
      assert.equal(q.provenance.technicals.source, "sample");
      assert.equal(q.provenance.news.source, "sample");
      assert.ok(q.provenance.mark.asOf.length > 0);
    }
  });
});

describe("technicals from history", () => {
  it("uses Wilder smoothing across the full price history", () => {
    assert.ok(Math.abs(rsiWilder([1, 2, 3, 2, 3, 2, 3], 3)! - 67.9) < 0.1);
  });

  it("computes RSI and SMAs when given enough synthetic closes", () => {
    const closes: number[] = [];
    let x = 100;
    for (let i = 0; i < 220; i++) {
      x *= 1 + ((i % 7) - 3) * 0.002;
      closes.push(x);
    }
    const rsi = rsiWilder(closes, 14);
    assert.ok(rsi !== null && rsi > 0 && rsi < 100);
    const tech = computeTechnicals(closes);
    assert.ok(tech);
    assert.equal(tech!.ok, true);
    assert.ok(tech!.sma50 > 0);
    assert.ok(tech!.sma200 > 0);
  });
});

describe("timestamp provenance", () => {
  it("shows the UTC timezone on Yahoo timestamps", () => {
    assert.equal(
      formatProvenanceBadge({ source: "yahoo", asOf: "2026-09-21T12:34:56.000Z" }),
      "YAHOO · 2026-09-21 12:34 UTC",
    );
  });
});

describe("quoteFill fee math", () => {
  it("feeUsd = notional × FEE_BPS / 10000", () => {
    const quote = getQuote("MSFT");
    const fill = quoteFill("BUY", 50, quote);
    const expectFee = Math.round(fill.notional * (FEE_BPS / 10_000) * 100) / 100;
    assert.equal(fill.feeUsd, expectFee);
  });
});
