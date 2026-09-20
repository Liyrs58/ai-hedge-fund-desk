import { NextResponse } from "next/server";
import { getSession } from "@/lib/desk";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getSession());
}
