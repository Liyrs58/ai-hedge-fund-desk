import { paperBroker } from "./flags";
import type { Ticket } from "./types";

/**
 * Stub broker. Alpaca paper wiring comes later.
 * LIVE fills are impossible; this function always refuses.
 */
export function submitBrokerOrder(_ticket: Ticket): never {
  void _ticket;
  throw new Error(
    `Broker refused. PAPER_BROKER=${paperBroker()} LIVE_TRADING=false.`,
  );
}
