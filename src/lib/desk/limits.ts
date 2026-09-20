import type { RiskLimits } from "./types";

export const RISK_LIMITS: RiskLimits = {
  grossPct: 80,
  singleNamePct: 25,
  sectorPct: 40,
  shortPct: 15,
  dailyVar: 40_000,
};

export const AS_OF = "18 SEP 2026";
export const SESSION_LABEL = "DESK 04 · CASH US";
export const STARTING_NAV = 1_000_000;
