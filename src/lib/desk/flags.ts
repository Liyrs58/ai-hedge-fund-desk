/**
 * Paper desk flags. LIVE_TRADING cannot enable a broker — it is hard-false.
 * PAPER_BROKER may be off | alpaca; alpaca is paper-only.
 */

export const LIVE_TRADING = false;
export const NVIDIA_MODEL = "google/gemma-4-31b-it";
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
/** NIM cold start is ~2 min. Non-stream can hang — always stream. */
export const NVIDIA_TIMEOUT_MS = 180_000;
export const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

export type PaperBrokerId = "off" | "alpaca" | "missing-keys";

export function isLiveTrading(): boolean {
  void process.env.LIVE_TRADING;
  return false;
}

export function paperBroker(): PaperBrokerId {
  const raw = (process.env.PAPER_BROKER ?? "off").trim().toLowerCase();
  if (raw !== "alpaca") return "off";
  const key = process.env.ALPACA_API_KEY?.trim();
  const secret = process.env.ALPACA_API_SECRET?.trim();
  if (!key || !secret) return "missing-keys";
  return "alpaca";
}

export function nvidiaBaseUrl(): string {
  return NVIDIA_BASE_URL;
}

export function nvidiaModel(): string {
  return NVIDIA_MODEL;
}
