import type { Agent, AgentId } from "./types";

export const AGENTS: Agent[] = [
  {
    id: "fundamental",
    code: "FND",
    abbrev: "FA",
    title: "Fundamental Analyst",
    name: "M. Chen",
    seat: "04-A",
    mandate: "Filings, NTM, cash, dilution. No tape.",
  },
  {
    id: "sentiment",
    code: "SEN",
    abbrev: "SA",
    title: "Sentiment Analyst",
    name: "A. Okonkwo",
    seat: "04-B",
    mandate: "News, options skew, flow. 10-day horizon.",
  },
  {
    id: "technical",
    code: "TEC",
    abbrev: "TA",
    title: "Technical Analyst",
    name: "L. Varga",
    seat: "04-C",
    mandate: "Levels, RSI, MACD, volume. Stops only.",
  },
  {
    id: "trader",
    code: "TRD",
    abbrev: "T",
    title: "Trader",
    name: "J. Hale",
    seat: "04-D",
    mandate: "Size and timing. One proposal per name.",
  },
  {
    id: "risk",
    code: "RSK",
    abbrev: "RM",
    title: "Risk Manager",
    name: "K. Sato",
    seat: "04-E",
    mandate: "Veto, trim, limits. Last word on the ticket.",
  },
];

export const AGENT_BY_ID: Record<AgentId, Agent> = Object.fromEntries(
  AGENTS.map((agent) => [agent.id, agent]),
) as Record<AgentId, Agent>;
