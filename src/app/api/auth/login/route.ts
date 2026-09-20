import { NextResponse } from "next/server";
import {
  codesMatch,
  demoAccessCode,
  demoAuthRequired,
  DEMO_COOKIE,
  demoCookieSetOptions,
  signDemoCookie,
} from "@/lib/desk/demo-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!demoAuthRequired()) {
    return NextResponse.json({ ok: true, required: false });
  }
  let code = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { code?: string; accessCode?: string };
      code = (body.code ?? body.accessCode ?? "").trim();
    } else {
      const form = await request.formData();
      code = String(form.get("code") ?? form.get("accessCode") ?? "").trim();
    }
  } catch {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }
  const expected = demoAccessCode();
  if (!code || !codesMatch(code, expected)) {
    return NextResponse.json({ error: "invalid access code" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, required: true });
  response.cookies.set({
    name: DEMO_COOKIE,
    value: signDemoCookie(),
    ...demoCookieSetOptions(),
  });
  return response;
}
