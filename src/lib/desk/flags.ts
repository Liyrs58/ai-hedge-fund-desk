/**
 * Paper desk flags. LIVE_TRADING cannot enable a broker.
 * PAPER_BROKER stays "off" — Alpaca paper is a stub for later.
 */
export const LIVE_TRADING = false;
export const NVIDIA_MODEL = "google/gemma-4-31b-it";
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
/** NIM cold start is ~2 min. Non-stream can hang — always stream. */
export const NVIDIA_TIMEOUT_MS = 180_000;

export type PaperBrokerId = "off";

export function isLiveTrading(): boolean {
  return false;
}

export function paperBroker(): PaperBrokerId {
  void process.env.PAPER_BROKER;
  return "off";
}

export function nvidiaBaseUrl(): string {
  return NVIDIA_BASE_URL;
}

export function nvidiaModel(): string {
  return NVIDIA_MODEL;
}
