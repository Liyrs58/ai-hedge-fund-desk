import { NextResponse } from "next/server";
import { runPaperPath } from "@/lib/desk/paper-path";

export const dynamic = "force-dynamic";

export function GET() {
  const result = runPaperPath();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
