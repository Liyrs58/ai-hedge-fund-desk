import { normalizeBook, SEED_BOOK } from "./book";
import { nvidiaBaseUrl, nvidiaModel } from "./flags";
import { STARTING_NAV } from "./limits";
import { runPipeline } from "./pipeline";
import { UNIVERSE } from "./universe";
import type { Book, DebateMessage, DeskRun, ProviderId, Quote } from "./types";

export { nvidiaModel } from "./flags";

export function detectProvider(): ProviderId {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "mock") return "mock";
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) return "mock";
  if (!forced || forced === "auto" || forced === "nvidia" || forced === "nim") {
    return "nvidia";
  }
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

async function callNvidia(prompt: string): Promise<string> {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) throw new Error("NVIDIA_API_KEY missing");
  const res = await fetch(`${nvidiaBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: nvidiaModel(),
      temperature: 0.2,
      max_tokens: 2500,
      stream: false,
      messages: [
        { role: "system", content: REWRITE_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA ${res.status}`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
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
    const text = await callNvidia(
      `NAV context ${STARTING_NAV}. Rewrite these ${computed.messages.length} messages:\n${packMessages(computed.messages)}`,
    );
    const bodies = extractBodies(text, computed.messages.length);
    return {
      ...base,
      messages: applyBodies(computed.messages, bodies),
      provider: "nvidia",
      fallbackFrom: null,
    };
  } catch {
    return {
      ...base,
      provider: "mock",
      fallbackFrom: "nvidia",
    };
  }
}
