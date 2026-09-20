export function fmtPx(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtUsd(n: number, digits = 0): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtPct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtPctPlain(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtShares(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtVol(n: number): string {
  return `${n.toFixed(1)}M`;
}

export function signedClass(n: number): string {
  if (n > 0.0001) return "text-up";
  if (n < -0.0001) return "text-down";
  return "text-mute";
}

export function padSession(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function padDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(now);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = (parts.find((p) => p.type === "month")?.value ?? "").toUpperCase();
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${day}-${month}-${year}`;
}

export function tzLabel(now: Date): string {
  const raw = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).formatToParts(now);
  return raw.find((p) => p.type === "timeZoneName")?.value ?? "ET";
}

export function isCashOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  if (weekday === "Sat" || weekday === "Sun") return false;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}
