import { normalizeBook, SEED_BOOK } from "./book";
import { nvidiaBaseUrl, nvidiaModel, NVIDIA_TIMEOUT_MS } from "./flags";
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

function deltaContent(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") return "";
  const choices = (chunk as { choices?: Array<Record<string, unknown>> }).choices;
  const first = choices?.[0];
  if (!first) return "";
  const delta = first.delta as { content?: unknown } | undefined;
  if (typeof delta?.content === "string") return delta.content;
  const message = first.message as { content?: unknown } | undefined;
  if (typeof message?.content === "string") return message.content;
  return "";
}

function parseSse(buffer: string): string {
  let out = "";
  for (const raw of buffer.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      out += deltaContent(JSON.parse(data));
    } catch {
      /* skip a torn JSON line */
    }
  }
  return out;
}

async function readNvidiaBody(res: Response): Promise<string> {
  if (!res.body) throw new Error("NVIDIA stream missing body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:") || trimmed.includes("\ndata:")) {
    return parseSse(raw);
  }
  try {
    return deltaContent(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

async function callNvidia(prompt: string): Promise<string> {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) throw new Error("NVIDIA_API_KEY missing");
  const res = await fetch(`${nvidiaBaseUrl()}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(NVIDIA_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: nvidiaModel(),
      temperature: 0.2,
      max_tokens: 2500,
      stream: true,
      messages: [
        { role: "system", content: REWRITE_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA ${res.status}`);
  const text = await readNvidiaBody(res);
  if (!text.trim()) throw new Error("NVIDIA empty stream");
  return text;
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
