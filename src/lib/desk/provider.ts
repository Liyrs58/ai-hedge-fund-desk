import { normalizeBook, SEED_BOOK } from "./book";
import { UNIVERSE } from "./universe";
import { runPipeline } from "./pipeline";
import { STARTING_NAV } from "./limits";
import type { Book, DebateMessage, DeskRun, ProviderId, Quote } from "./types";

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

const REWRITE_PROMPT = `You are rewriting a paper-trading desk transcript.
Return ONLY JSON: { "bodies": string[] }
The array MUST be the same length and order as the input messages.
Rewrite each body in clipped desk English (no marketing, no adjectives-for-hire).
Do not change numbers, tickers, sides, sizes, stops, or who is speaking.
Do not add agents. Do not invent fills.`;

function extractBodies(text: string, expected: number): string[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in model output");
  const parsed = JSON.parse(text.slice(start, end + 1)) as { bodies?: string[] };
  if (!Array.isArray(parsed.bodies) || parsed.bodies.length !== expected) {
    throw new Error("body count mismatch");
  }
  return parsed.bodies.map((b) => String(b));
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
      temperature: 0.3,
      messages: [
        { role: "system", content: REWRITE_PROMPT },
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
      max_tokens: 2500,
      messages: [{ role: "user", content: `${REWRITE_PROMPT}\n\n${prompt}` }],
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
        contents: [{ parts: [{ text: `${REWRITE_PROMPT}\n\n${prompt}` }] }],
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
      temperature: 0.3,
      messages: [
        { role: "system", content: REWRITE_PROMPT },
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

function packMessages(messages: DebateMessage[]): string {
  return JSON.stringify(
    messages.map((m) => ({
      agent: m.agent,
      kind: m.kind,
      body: m.body,
      score: m.score,
    })),
  );
}

function applyBodies(
  messages: DebateMessage[],
  bodies: string[],
): DebateMessage[] {
  return messages.map((m, i) => ({ ...m, body: bodies[i] ?? m.body }));
}

export async function runDesk(
  ticker: string,
  quote: Quote,
  book: Book = SEED_BOOK,
  quotes: Quote[] = UNIVERSE,
): Promise<DeskRun> {
  const ts = new Date().toISOString();
  const provider = detectProvider();
  const computed = runPipeline({
    ticker,
    quote,
    book: normalizeBook(book),
    quotes,
    ts,
  });

  const base: DeskRun = {
    id: `run-${ticker}-${Date.now()}`,
    ticker: quote.symbol,
    quote,
    messages: computed.messages,
    ticket: computed.ticket,
    checks: computed.checks,
    provider: "mock",
    fallbackFrom: null,
  };

  if (provider === "mock") {
    return base;
  }

  try {
    const text = await liveText(
      provider,
      `NAV context ${STARTING_NAV}. Rewrite these ${computed.messages.length} messages:\n${packMessages(computed.messages)}`,
    );
    const bodies = extractBodies(text, computed.messages.length);
    return {
      ...base,
      messages: applyBodies(computed.messages, bodies),
      provider,
      fallbackFrom: null,
    };
  } catch {
    return {
      ...base,
      provider: "mock",
      fallbackFrom: provider,
    };
  }
}
