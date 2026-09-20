import { buildMockRun } from "./debates";
import { STARTING_NAV } from "./limits";
import type { DeskRun, ProviderId, Quote } from "./types";

export function detectProvider(): ProviderId {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "mock") return "mock";
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (
    (forced === "gemini" || forced === "google") &&
    (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
  ) {
    return "gemini";
  }
  if (forced === "grok" && process.env.XAI_API_KEY) return "grok";

  if (forced && forced !== "auto") return "mock";

  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.XAI_API_KEY) return "grok";
  return "mock";
}

const LIVE_PROMPT = `You are the risk chair of a paper trading desk. Return ONLY JSON:
{
  "messages": [{"agent":"fundamental|sentiment|technical|trader|risk","kind":"note|thesis|rebuttal|proposal|veto|mark","body":"..."}],
  "ticket": {
    "side":"BUY|SELL|HOLD",
    "proposedSide":"BUY|SELL|HOLD",
    "proposedSizePct": number,
    "sizePct": number,
    "stop": number|null,
    "thesis":"...",
    "riskNote":"...",
    "vetoed": boolean,
    "trimmed": boolean
  }
}
Rules: 5 agents must speak. Risk may veto or trim. Size is % of NAV. Concrete desk language. No marketing.`;

interface LiveJson {
  messages: DeskRun["messages"];
  ticket: {
    side: DeskRun["ticket"]["side"];
    proposedSide: DeskRun["ticket"]["proposedSide"];
    proposedSizePct: number;
    sizePct: number;
    stop: number | null;
    thesis: string;
    riskNote: string;
    vetoed: boolean;
    trimmed: boolean;
  };
}

function extractJson(text: string): LiveJson {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in model output");
  return JSON.parse(text.slice(start, end + 1)) as LiveJson;
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: LIVE_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message.content ?? "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-0",
      max_tokens: 2000,
      messages: [{ role: "user", content: `${LIVE_PROMPT}\n\n${prompt}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const json = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  return json.content.find((c) => c.type === "text")?.text ?? "";
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${LIVE_PROMPT}\n\n${prompt}` }] }],
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return json.candidates[0]?.content.parts[0]?.text ?? "";
}

async function callGrok(prompt: string): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL ?? "grok-3",
      temperature: 0.4,
      messages: [
        { role: "system", content: LIVE_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Grok ${res.status}`);
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message.content ?? "";
}

async function liveText(provider: ProviderId, prompt: string): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAI(prompt);
    case "anthropic":
      return callAnthropic(prompt);
    case "gemini":
      return callGemini(prompt);
    case "grok":
      return callGrok(prompt);
    default:
      throw new Error("mock");
  }
}

function quoteBrief(quote: Quote): string {
  return [
    `${quote.symbol} ${quote.name} ${quote.sector}`,
    `mark ${quote.mark} ${quote.changePct}%`,
    `RSI ${quote.rsi14} MACD ${quote.macdHist} 50d ${quote.sma50} 200d ${quote.sma200}`,
    `PE ${quote.peNtm} FCF ${quote.fcfYield}% IV ${quote.iv30} beta ${quote.beta}`,
  ].join(" | ");
}

export async function runDesk(
  ticker: string,
  quote: Quote,
  nav = STARTING_NAV,
): Promise<DeskRun> {
  const ts = new Date().toISOString();
  const provider = detectProvider();
  const mock = buildMockRun(ticker, quote, nav, ts);

  if (provider === "mock") {
    return {
      id: `run-${ticker}-${Date.now()}`,
      ticker: quote.symbol,
      quote,
      messages: mock.messages,
      ticket: mock.ticket,
      provider: "mock",
      fallbackFrom: null,
    };
  }

  try {
    const text = await liveText(
      provider,
      `Name: ${quoteBrief(quote)}\nNAV: ${nav}\nPaper only. Produce the debate and final ticket.`,
    );
    const live = extractJson(text);
    const messages = live.messages.map((m, i) => ({
      id: `${ticker}-live-${i + 1}`,
      agent: m.agent,
      kind: m.kind,
      body: m.body,
      delayMs: i === 0 ? 420 : 720,
      at: mock.messages[i]?.at ?? "09:41:03",
    }));
    const shares =
      live.ticket.side === "HOLD"
        ? 0
        : Math.round((nav * (live.ticket.sizePct / 100)) / quote.mark);
    const proposedShares =
      live.ticket.proposedSide === "HOLD"
        ? 0
        : Math.round((nav * (live.ticket.proposedSizePct / 100)) / quote.mark);
    const ticket = {
      ...mock.ticket,
      ...live.ticket,
      id: `${quote.symbol}-${ts}`,
      ticker: quote.symbol,
      mark: quote.mark,
      shares,
      proposedShares,
      ts,
      status: "proposed" as const,
    };
    return {
      id: `run-${ticker}-${Date.now()}`,
      ticker: quote.symbol,
      quote,
      messages,
      ticket,
      provider,
      fallbackFrom: null,
    };
  } catch {
    return {
      id: `run-${ticker}-${Date.now()}`,
      ticker: quote.symbol,
      quote,
      messages: mock.messages,
      ticket: mock.ticket,
      provider: "mock",
      fallbackFrom: provider,
    };
  }
}
