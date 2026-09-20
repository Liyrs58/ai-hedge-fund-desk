import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "ahf_demo";
export const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function demoAuthRequired(): boolean {
  return Boolean(process.env.DEMO_ACCESS_CODE?.trim());
}

export function demoAccessCode(): string {
  return process.env.DEMO_ACCESS_CODE?.trim() ?? "";
}

/** Prefer AUTH_SECRET; fall back to a derived secret so a single code still gates the demo. */
export function authSigningSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  const code = demoAccessCode();
  if (code) return `ahf-demo:${code}`;
  return "";
}

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signDemoCookie(now = Date.now()): string {
  const secret = authSigningSecret();
  if (!secret) throw new Error("AUTH_SECRET (or DEMO_ACCESS_CODE) required to sign the demo cookie.");
  const payload = `v1.${now}`;
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifyDemoCookie(value: string | undefined | null): boolean {
  if (!demoAuthRequired()) return true;
  if (!value) return false;
  const secret = authSigningSecret();
  if (!secret) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [version, iatRaw, sig] = parts;
  const payload = `${version}.${iatRaw}`;
  const expected = hmac(payload, secret);
  if (!safeEqual(sig, expected)) return false;
  const iat = Number(iatRaw);
  if (!Number.isFinite(iat)) return false;
  const ageMs = Date.now() - iat;
  if (ageMs < 0 || ageMs > COOKIE_MAX_AGE_SEC * 1000) return false;
  return true;
}

export function parseCookieHeader(header: string | null, name = DEMO_COOKIE): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function requestAuthed(request: Request): boolean {
  if (!demoAuthRequired()) return true;
  return verifyDemoCookie(parseCookieHeader(request.headers.get("cookie")));
}

export function unauthorizedJson(): Response {
  return Response.json(
    { error: "demo access required", auth: { required: true } },
    { status: 401 },
  );
}

export function denyIfUnauthorized(request: Request): Response | null {
  if (requestAuthed(request)) return null;
  return unauthorizedJson();
}

export function cookieSecure(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function demoCookieSetOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}

export function codesMatch(input: string, expected: string): boolean {
  return safeEqual(input, expected);
}
