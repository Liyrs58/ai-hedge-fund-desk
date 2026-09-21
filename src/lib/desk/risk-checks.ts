import type { Exposure, Quote, Ticket } from "./types";
import type { RiskRule, RiskVerdict } from "./risk-engine";

export type { CheckFlag } from "./types";
export type RiskCheck = RiskRule;

const DISPLAY = [
  "Position limit",
  "Liquidity (ADV)",
  "Factor exposure",
  "Vol-weighted risk",
] as const;

export function buildRiskChecks(
  ticket: Ticket,
  quote: Quote,
  exposure: Exposure,
  verdict?: RiskVerdict,
): RiskCheck[] {
  if (verdict?.rules?.length) {
    const mapped = DISPLAY.map((label) => {
      const found = verdict.rules.find((r) => r.label === label);
      return (
        found ?? {
          id: label,
          label,
          flag: "OK" as const,
          detail: "",
        }
      );
    });
    return mapped;
  }

  const signed =
    ticket.proposedSide === "SELL"
      ? -ticket.proposedSizePct
      : ticket.proposedSide === "BUY"
        ? ticket.proposedSizePct
        : 0;
  const nextName = Math.abs((exposure.namePct[ticket.ticker] ?? 0) + signed);
  const nextSector = Math.abs(
    (exposure.sectorPct[quote.sector] ?? 0) + (quote.sector ? signed : 0),
  );
  const bump = ticket.proposedShares * ticket.mark * (quote.iv30 / 100) * 0.06;
  const nextProxy = exposure.dailyRiskProxy + bump;
  const advShares = quote.avgVolumeM * 1_000_000;
  const bpOfAdv =
    advShares > 0 ? (ticket.proposedShares / advShares) * 10_000 : 0;

  return [
    {
      id: "POSITION",
      label: "Position limit",
      flag: nextName > 13.75 ? "WARNING" : "OK",
      detail: `${ticket.ticker} ${nextName.toFixed(1)}%.`,
    },
    {
      id: "LIQUIDITY",
      label: "Liquidity (ADV)",
      flag:
        quote.volumeM < quote.avgVolumeM * 0.95 || bpOfAdv > 0.5
          ? "WARNING"
          : "OK",
      detail: `${bpOfAdv.toFixed(2)}bp ADV.`,
    },
    {
      id: "FACTOR",
      label: "Factor exposure",
      flag: quote.beta > 1.15 || nextSector > 18 ? "WARNING" : "OK",
      detail: `${quote.sector} ${nextSector.toFixed(1)}%.`,
    },
    {
      id: "RISK_PROXY",
      label: "Vol-weighted risk",
      flag: nextProxy > 22_000 ? "WARNING" : "OK",
      detail: `RiskProxy ${Math.round(nextProxy)}.`,
    },
  ];
}
