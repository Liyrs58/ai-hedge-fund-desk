/**
 * This desk is paper-only. LIVE_TRADING is documented as false and cannot
 * enable a broker, even if someone sets the env to true.
 */
export function isLiveTrading(): boolean {
  return false;
}

export const LIVE_TRADING = false;
