import {
  attachSectors,
  canFill,
  fillTicket,
  normalizeBook,
  withPeak,
} from "./book";
import { submitPaperOrder, type BrokerFill } from "./broker";
import { priceTicket } from "./execution";
import { paperBroker } from "./flags";
import { isLiveTrading } from "./trading-mode";
import type { Book, Quote, Ticket } from "./types";

export interface PaperFillResult {
  book: Book;
  blotter: Ticket[];
  ticket: Ticket;
  broker: BrokerFill | null;
  fillSource: "alpaca" | "simulator";
}

export async function applyApprovedFill(input: {
  ticket: Ticket;
  quote: Quote;
  book: Book;
  blotter: Ticket[];
  quotes: Quote[];
}): Promise<PaperFillResult> {
  if (isLiveTrading()) {
    throw new Error("LIVE_TRADING is false. Paper desk only.");
  }
  const priced: Ticket = priceTicket(
    { ...input.ticket, status: "filled" },
    input.quote,
  );
  let broker: BrokerFill | null = null;
  const useAlpaca = paperBroker() === "alpaca" && canFill(priced);
  if (useAlpaca) {
    broker = await submitPaperOrder(priced);
    priced.broker = "alpaca";
    priced.brokerOrderId = broker?.orderId ?? null;
  } else {
    priced.broker = "simulator";
    priced.brokerOrderId = null;
  }

  if (canFill(priced)) {
    const nextBook = withPeak(
      attachSectors(
        fillTicket(normalizeBook(input.book), priced, input.quote),
        input.quotes,
      ),
      input.quotes,
    );
    const nextBlotter = [priced, ...input.blotter].slice(0, 24);
    return {
      book: nextBook,
      blotter: nextBlotter,
      ticket: priced,
      broker,
      fillSource: broker ? "alpaca" : "simulator",
    };
  }

  const nextBlotter = [priced, ...input.blotter].slice(0, 24);
  return {
    book: normalizeBook(input.book),
    blotter: nextBlotter,
    ticket: priced,
    broker,
    fillSource: broker ? "alpaca" : "simulator",
  };
}
