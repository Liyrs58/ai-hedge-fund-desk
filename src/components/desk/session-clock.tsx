"use client";

import { useEffect, useState } from "react";
import { isCashOpen, padDate, padSession, tzLabel } from "@/lib/desk";

export function SessionClock() {
  const now = useNow();
  if (!now) {
    return (
      <span className="font-mono text-[12px] tabular-nums tracking-wide text-mute">
        --:--:-- ET
      </span>
    );
  }
  return (
    <span className="font-mono text-[12px] tabular-nums tracking-wide text-ink">
      {padSession(now)} {tzLabel(now)}
      <span className="mx-3 text-mute"> </span>
      {padDate(now)}
      <span className="ml-4 text-mute">v2.7.1</span>
    </span>
  );
}

export function useNow(ms = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), ms);
    return () => {
      window.clearTimeout(t);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}

export function marketLabel(now: Date | null): string {
  if (!now) return "—";
  return isCashOpen(now) ? "OPEN (ET)" : "CLOSED (ET)";
}
