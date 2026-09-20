import { ALPACA_PAPER_URL, isLiveTrading, paperBroker } from "./flags";
import type { Ticket } from "./types";

export interface BrokerFill {
  broker: "alpaca";
  orderId: string;
  status: string;
  filledQty: string | null;
  filledAvgPrice: string | null;
}

export function alpacaBaseUrl(): string {
  return (process.env.ALPACA_BASE_URL?.trim() || ALPACA_PAPER_URL).replace(/\/+$/, "");
}

/**
 * Paper desk only. Live Alpaca hosts are refused even if keys are present.
 * LIVE_TRADING stays false; this never targets a live account.
 */
export function assertPaperAlpacaBaseUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid ALPACA_BASE_URL: ${url}`);
  }
  const host = parsed.hostname.toLowerCase();
  const paper =
    host === "paper-api.alpaca.markets" ||
    host.startsWith("paper-") ||
    host.includes("paper-api");
  const live =
    host === "api.alpaca.markets" ||
    host === "live.alpaca.markets" ||
    (host.endsWith("alpaca.markets") && !host.includes("paper"));
  if (live || !paper) {
    throw new Error(
      `Refused Alpaca URL ${parsed.origin}. Paper desk only (${ALPACA_PAPER_URL}). LIVE_TRADING=false.`,
    );
  }
  return parsed.origin;
}

function alpacaKeys(): { key: string; secret: string } | null {
  const key = process.env.ALPACA_API_KEY?.trim() ?? "";
  const secret = process.env.ALPACA_API_SECRET?.trim() ?? "";
  if (!key || !secret) return null;
  return { key, secret };
}

/**
 * Submit a paper order to Alpaca when PAPER_BROKER=alpaca and keys are present.
 * Returns null when the local simulator should fill instead.
 * Never sends a live order.
 */
export async function submitPaperOrder(ticket: Ticket): Promise<BrokerFill | null> {
  if (isLiveTrading()) {
    throw new Error("LIVE_TRADING is false. Paper desk only.");
  }
  if (paperBroker() !== "alpaca") return null;
  if (ticket.side === "HOLD" || ticket.shares <= 0 || ticket.vetoed) return null;

  const keys = alpacaKeys();
  if (!keys) return null;

  const base = assertPaperAlpacaBaseUrl(alpacaBaseUrl());
  const res = await fetch(`${base}/v2/orders`, {
    method: "POST",
    headers: {
      "APCA-API-KEY-ID": keys.key,
      "APCA-API-SECRET-KEY": keys.secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbol: ticket.ticker,
      qty: String(Math.abs(ticket.shares)),
      side: ticket.side === "SELL" ? "sell" : "buy",
      type: "market",
      time_in_force: "day",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Alpaca paper order failed (${res.status}): ${text.slice(0, 240)}`);
  }
  let order: {
    id?: string;
    status?: string;
    filled_qty?: string;
    filled_avg_price?: string | null;
  };
  try {
    order = JSON.parse(text) as typeof order;
  } catch {
    throw new Error("Alpaca paper order returned non-JSON.");
  }
  if (!order.id) {
    throw new Error("Alpaca paper order missing id.");
  }
  return {
    broker: "alpaca",
    orderId: order.id,
    status: order.status ?? "accepted",
    filledQty: order.filled_qty ?? null,
    filledAvgPrice: order.filled_avg_price ?? null,
  };
}

/** @deprecated use submitPaperOrder — live fills remain impossible. */
export async function submitBrokerOrder(ticket: Ticket): Promise<BrokerFill | null> {
  return submitPaperOrder(ticket);
}
