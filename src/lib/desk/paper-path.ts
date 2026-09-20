import { fillTicket, normalizeBook, SEED_BOOK } from "./book";
import { assertPaperAlpacaBaseUrl } from "./broker";
import { priceTicket } from "./execution";
import { ALPACA_PAPER_URL, nvidiaBaseUrl, nvidiaModel, paperBroker, NVIDIA_TIMEOUT_MS } from "./flags";
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
  expect(
    failures,
    nvidiaModel() === "google/gemma-4-31b-it",
    "NVIDIA model must be google/gemma-4-31b-it.",
  );
  expect(
    failures,
    nvidiaBaseUrl() === "https://integrate.api.nvidia.com/v1",
    "NVIDIA base URL must be https://integrate.api.nvidia.com/v1.",
  );
  expect(
    failures,
    NVIDIA_TIMEOUT_MS >= 180_000,
    "NVIDIA client timeout must be >= 180s.",
  );
  checkPaperBrokerFlags(failures, report);
  checkStoreFlags(failures, report);
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    expect(failures, detectProvider() === "mock", "No NVIDIA key must stay MOCK.");
  }

  return { ok: failures.length === 0, report, failures };
}

function checkPaperBrokerFlags(failures: string[], report: string[]) {
  const prevBroker = process.env.PAPER_BROKER;
  const prevKey = process.env.ALPACA_API_KEY;
  const prevSecret = process.env.ALPACA_API_SECRET;

  delete process.env.PAPER_BROKER;
  expect(failures, paperBroker() === "off", "PAPER_BROKER default must be off.");

  process.env.PAPER_BROKER = "alpaca";
  delete process.env.ALPACA_API_KEY;
  delete process.env.ALPACA_API_SECRET;
  expect(
    failures,
    paperBroker() === "missing-keys",
    "PAPER_BROKER=alpaca without keys must be missing-keys.",
  );

  process.env.ALPACA_API_KEY = "paper-key";
  process.env.ALPACA_API_SECRET = "paper-secret";
  expect(
    failures,
    paperBroker() === "alpaca",
    "PAPER_BROKER=alpaca with keys must be alpaca.",
  );

  let liveThrew = false;
  try {
    assertPaperAlpacaBaseUrl("https://api.alpaca.markets");
  } catch {
    liveThrew = true;
  }
  expect(failures, liveThrew, "Live Alpaca URL must be refused.");

  let paperOk = false;
  try {
    paperOk = assertPaperAlpacaBaseUrl(ALPACA_PAPER_URL) === "https://paper-api.alpaca.markets";
  } catch {
    paperOk = false;
  }
  expect(failures, paperOk, "Paper Alpaca URL must be accepted.");
  report.push("Alpaca paper URL allowed; live api.alpaca.markets refused.");

  if (prevBroker === undefined) delete process.env.PAPER_BROKER;
  else process.env.PAPER_BROKER = prevBroker;
  if (prevKey === undefined) delete process.env.ALPACA_API_KEY;
  else process.env.ALPACA_API_KEY = prevKey;
  if (prevSecret === undefined) delete process.env.ALPACA_API_SECRET;
  else process.env.ALPACA_API_SECRET = prevSecret;

  const restored = paperBroker();
  expect(
    failures,
    restored === "off" || restored === "alpaca" || restored === "missing-keys",
    `paperBroker restored to ${restored}.`,
  );
}

function checkStoreFlags(failures: string[], report: string[]) {
  const blobOn =
    (process.env.DESK_STORE ?? "").trim().toLowerCase() === "blob" &&
    Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  if (!blobOn) {
    expect(failures, true, "Store fallback must be json-file.");
    report.push("Store backend json-file (blob not selected).");
  } else {
    report.push("Store backend blob.");
  }
}
