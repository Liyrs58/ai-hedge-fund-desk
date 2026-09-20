import { NextResponse } from "next/server";
import { DEMO_COOKIE, demoCookieSetOptions } from "@/lib/desk/demo-auth";

export const dynamic = "force-dynamic";

export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: DEMO_COOKIE,
    value: "",
    ...demoCookieSetOptions(),
    maxAge: 0,
  });
  return response;
}
