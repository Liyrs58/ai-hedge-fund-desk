import type { NewsItem } from "./types";

export const NEWS_WIRE: Record<string, NewsItem[]> = {
  NVDA: [
    {
      ticker: "NVDA",
      headline: "Hyperscaler capex guides hold; data-center bookings described as ‘sold through’ FY26.",
      source: "WIRE",
      hoursAgo: 14,
      polarity: 0.42,
    },
    {
      ticker: "NVDA",
      headline: "Export-control chatter, no new filing. Street treats it as noise.",
      source: "FILING",
      hoursAgo: 30,
      polarity: -0.08,
    },
    {
      ticker: "NVDA",
      headline: "SOX peers lag. NVDA still the must-own, bid less crowded than July.",
      source: "DESK",
      hoursAgo: 6,
      polarity: 0.28,
    },
  ],
  AAPL: [
    {
      ticker: "AAPL",
      headline: "China iPhone units flattish. Services mix unchanged in the last 10-Q.",
      source: "10-Q",
      hoursAgo: 48,
      polarity: -0.05,
    },
    {
      ticker: "AAPL",
      headline: "Buyback authorization still the bid. No hardware catalyst this week.",
      source: "WIRE",
      hoursAgo: 20,
      polarity: 0.1,
    },
  ],
  MSFT: [
    {
      ticker: "MSFT",
      headline: "Azure growth still high-20s. Capex guided up; that is the debate.",
      source: "WIRE",
      hoursAgo: 26,
      polarity: 0.18,
    },
    {
      ticker: "MSFT",
      headline: "Copilot headlines stale. No event in the next ten sessions.",
      source: "DESK",
      hoursAgo: 11,
      polarity: 0.02,
    },
  ],
  TSLA: [
    {
      ticker: "TSLA",
      headline: "Delivery print 11 sessions out. Street already fading the number.",
      source: "WIRE",
      hoursAgo: 8,
      polarity: -0.46,
    },
    {
      ticker: "TSLA",
      headline: "Auto gross margin still compressed. Energy storage the only clean line.",
      source: "10-Q",
      hoursAgo: 40,
      polarity: -0.38,
    },
    {
      ticker: "TSLA",
      headline: "Robotaxi remains a 2027 story priced in 2026 paper.",
      source: "DESK",
      hoursAgo: 16,
      polarity: -0.55,
    },
  ],
  JPM: [
    {
      ticker: "JPM",
      headline: "NII guided stable. CET1 15.7%. Credit not the swing factor.",
      source: "WIRE",
      hoursAgo: 22,
      polarity: 0.32,
    },
    {
      ticker: "JPM",
      headline: "IB pipeline the only open question. No scandal, no downgrade.",
      source: "DESK",
      hoursAgo: 9,
      polarity: 0.12,
    },
  ],
  XOM: [
    {
      ticker: "XOM",
      headline: "OPEC cut is in the tape. WTI chopped $2 for eight sessions.",
      source: "WIRE",
      hoursAgo: 18,
      polarity: 0.04,
    },
    {
      ticker: "XOM",
      headline: "Permian volumes intact; Guyana is duration. Commodity is the problem.",
      source: "DESK",
      hoursAgo: 28,
      polarity: 0.08,
    },
  ],
};

export function newsFor(ticker: string): NewsItem[] {
  return NEWS_WIRE[ticker.toUpperCase()] ?? [];
}

export function newsPolarity(items: NewsItem[]): number {
  if (items.length === 0) return 0;
  return items.reduce((s, n) => s + n.polarity, 0) / items.length;
}
