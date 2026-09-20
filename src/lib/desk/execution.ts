import { FEE_BPS } from "./limits";
import { roundPx } from "./signals";
import type { FillQuote, Quote, Side, Ticket } from "./types";

export function slippageBps(shares: number, quote: Quote): number {
  const adv = quote.avgVolumeM * 1_000_000;
  const part = adv > 0 ? Math.abs(shares) / adv : 0;
  return 2 + part * 4_000 + quote.iv30 * 0.15;
}

export function quoteFill(
  side: Side,
  shares: number,
  quote: Quote,
): FillQuote {
  const slip = slippageBps(shares, quote);
  const slipFrac = slip / 10_000;
  const fillPx = roundPx(
    side === "SELL" ? quote.mark * (1 - slipFrac) : quote.mark * (1 + slipFrac),
  );
  const notional = Math.abs(shares) * fillPx;
  const feeUsd = roundPx(notional * (FEE_BPS / 10_000));
  const signed = side === "SELL" ? -Math.abs(shares) : Math.abs(shares);
  const cashDelta = roundPx(-signed * fillPx - feeUsd);
  return {
    fillPx,
    slippageBps: roundPx(slip),
    feeBps: FEE_BPS,
    feeUsd,
    notional: roundPx(notional),
    cashDelta,
  };
}

export function priceTicket(ticket: Ticket, quote: Quote): Ticket {
  if (ticket.side === "HOLD" || ticket.shares <= 0 || ticket.vetoed) {
    return {
      ...ticket,
      fillPx: null,
      slippageBps: 0,
      feeBps: FEE_BPS,
      feeUsd: 0,
      cashDelta: 0,
      notional: 0,
    };
  }
  const fill = quoteFill(ticket.side, ticket.shares, quote);
  return {
    ...ticket,
    fillPx: fill.fillPx,
    slippageBps: fill.slippageBps,
    feeBps: fill.feeBps,
    feeUsd: fill.feeUsd,
    cashDelta: fill.cashDelta,
    notional: fill.notional,
    sector: quote.sector,
  };
}
