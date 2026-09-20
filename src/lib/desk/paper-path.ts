import { fillTicket, normalizeBook, SEED_BOOK } from "./book";
import { priceTicket } from "./execution";
import { buildMockRun } from "./pipeline";
import { detectProvider } from "./provider";
import { isLiveTrading } from "./trading-mode";
import { UNIVERSE } from "./universe";

export interface PaperCheck {
  ok: boolean;
  report: string[];
  failures: string[];
}

function expect(failures: string[], cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

export function runPaperPath(): PaperCheck {
  const failures: string[] = [];
  const report: string[] = [];
  const ts = "2026-09-20T16:00:00.000Z";
  const book = normalizeBook(SEED_BOOK);

  const nvdaQ = UNIVERSE.find((q) => q.symbol === "NVDA");
  const tslaQ = UNIVERSE.find((q) => q.symbol === "TSLA");
  expect(failures, !!nvdaQ && !!tslaQ, "Sample universe must include NVDA and TSLA.");
  if (!nvdaQ || !tslaQ) {
    return { ok: false, report, failures };
  }

  const nvda = buildMockRun("NVDA", nvdaQ, book, UNIVERSE, ts);
  const agents = new Set(nvda.notes.map((n) => n.agent));
  report.push(
    `NVDA ${nvda.ticket.side} ${nvda.ticket.sizePct}% ${nvda.ticket.shares} sh · ${nvda.ticket.riskDecision} · ${nvda.messages.length} marks · ${agents.size} seats`,
  );
  expect(failures, nvda.messages.length >= 11, `NVDA tape too short (${nvda.messages.length}).`);
  expect(failures, agents.size >= 11, `NVDA seats ${agents.size}, want 11.`);
  expect(failures, nvda.ticket.side === "BUY", `NVDA side ${nvda.ticket.side}, want BUY.`);
  expect(failures, nvda.ticket.shares > 0, "NVDA ticket has no shares.");
  expect(failures, nvda.ticket.vetoed === false, "NVDA was vetoed on the seed book.");

  const filled = priceTicket({ ...nvda.ticket, status: "filled" }, nvdaQ);
  expect(failures, typeof filled.fillPx === "number" && (filled.fillPx ?? 0) > 0, "NVDA fill px missing.");
  expect(failures, (filled.feeUsd ?? 0) > 0, "NVDA fee missing.");
  const after = fillTicket(book, filled, nvdaQ);
  const pos = after.positions.find((p) => p.ticker === "NVDA");
  expect(failures, !!pos && pos.shares > 0, "NVDA fill did not hit the book.");
  expect(failures, after.cash < book.cash, "NVDA fill did not debit cash.");
  report.push(
    `NVDA fill ${filled.fillPx} slip ${filled.slippageBps}bp fee ${filled.feeUsd} cash ${filled.cashDelta} → book ${pos?.shares ?? 0} sh`,
  );

  const tsla = buildMockRun("TSLA", tslaQ, book, UNIVERSE, ts);
  report.push(
    `TSLA ${tsla.ticket.side} ${tsla.ticket.sizePct}% ${tsla.ticket.shares} sh · ${tsla.ticket.riskDecision} · vetoed=${tsla.ticket.vetoed}`,
  );
  expect(failures, tsla.ticket.side === "SELL", `TSLA side ${tsla.ticket.side}, want SELL.`);
  expect(failures, tsla.ticket.shares > 0, "TSLA short has no shares.");
  expect(failures, isLiveTrading() === false, "LIVE_TRADING must stay false.");
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    expect(failures, detectProvider() === "mock", "No NVIDIA key must stay MOCK.");
  }

  return { ok: failures.length === 0, report, failures };
}
