import { NextResponse } from "next/server";
import { detectProvider } from "@/lib/desk/provider";
import {
  isLiveTrading,
  nvidiaModel,
  paperBroker,
} from "@/lib/desk/flags";
import { lastQuoteTape, loadQuoteTape } from "@/lib/desk/quotes-feed";
import { storeInfo } from "@/lib/desk/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!lastQuoteTape()) {
    await loadQuoteTape(1500);
  }
  const llm = detectProvider();
  const tape = lastQuoteTape();
  const quotes = tape?.source === "yahoo" ? "LIVE" : tape?.source === "sample" ? "SAMPLE" : "UNKNOWN";
  return NextResponse.json({
    ok: true,
    liveTrading: isLiveTrading(),
    paperBroker: paperBroker(),
    llm: {
      provider: llm,
      model: nvidiaModel(),
      badge: llm === "nvidia" ? `NVIDIA/${nvidiaModel()}` : "MOCK",
    },
    quotes: {
      source: tape?.source ?? "unknown",
      badge: quotes,
      note: tape?.note ?? null,
    },
    store: storeInfo(),
  });
}
