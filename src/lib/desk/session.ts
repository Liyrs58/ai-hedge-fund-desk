import { SEED_BLOTTER } from "./blotter";
import { attachSectors, SEED_BOOK } from "./book";
import { detectProvider } from "./provider";
import { AS_OF, RISK_LIMITS, SESSION_LABEL } from "./limits";
import { UNIVERSE } from "./universe";
import type { SessionPayload } from "./types";

export function getSession(): SessionPayload {
  return {
    asOf: AS_OF,
    sessionLabel: SESSION_LABEL,
    provider: detectProvider(),
    quotes: UNIVERSE,
    book: attachSectors(SEED_BOOK, UNIVERSE),
    blotter: SEED_BLOTTER,
    limits: RISK_LIMITS,
  };
}
