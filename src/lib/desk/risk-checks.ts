import { RISK_LIMITS } from "./limits";
import type { Exposure, Quote, Ticket } from "./types";

export type CheckFlag = "OK" | "WARNING";

export interface RiskCheck {
  label: string;
  flag: CheckFlag;
}

export function buildRiskChecks(
  ticket: Ticket,
  quote: Quote,
  exposure: Exposure,
): RiskCheck[] {
  const signed =
    ticket.proposedSide === "SELL"
      ? -ticket.proposedSizePct
      : ticket.proposedSide === "BUY"
        ? ticket.proposedSizePct
        : 0;
  const nextName = Math.abs((exposure.namePct[ticket.ticker] ?? 0) + signed);
  const nextSector = Math.abs(
    (exposure.sectorPct[quote.sector] ?? 0) +
      (quote.sector ? signed : 0),
  );
  const bump = (ticket.proposedShares * ticket.mark * (quote.iv30 / 100) * 0.06);
  const nextVar = exposure.dailyVar + bump;
  const advShares = quote.avgVolumeM * 1_000_000;
  const bpOfAdv = advShares > 0 ? (ticket.proposedShares / advShares) * 10_000 : 0;

  return [
    {
      label: "Position limit",
      flag: nextName > RISK_LIMITS.singleNamePct * 0.55 ? "WARNING" : "OK",
    },
    {
      label: "Liquidity (ADV)",
      flag:
        quote.volumeM < quote.avgVolumeM * 0.95 || bpOfAdv > 0.5
          ? "WARNING"
          : "OK",
    },
    {
      label: "Factor exposure",
      flag:
        quote.beta > 1.15 || nextSector > RISK_LIMITS.sectorPct * 0.45
          ? "WARNING"
          : "OK",
    },
    {
      label: "Portfolio VaR",
      flag: nextVar > RISK_LIMITS.dailyVar * 0.55 ? "WARNING" : "OK",
    },
  ];
}
