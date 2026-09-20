import { cookies } from "next/headers";
import { DeskApp } from "@/components/desk/desk-app";
import { DemoGate } from "@/components/desk/demo-gate";
import { getSession } from "@/lib/desk";
import { DEMO_COOKIE, demoAuthRequired, verifyDemoCookie } from "@/lib/desk/demo-auth";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";
import { readDeskStore } from "@/lib/desk/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (demoAuthRequired()) {
    const jar = await cookies();
    if (!verifyDemoCookie(jar.get(DEMO_COOKIE)?.value)) {
      return <DemoGate />;
    }
  }
  const base = getSession();
  const tape = await loadQuoteTape();
  const stored = await readDeskStore();
  return (
    <DeskApp
      session={{
        ...base,
        quotes: tape.quotes,
        quoteSource: tape.source,
        marksNote: tape.note,
        liveTrading: false,
        book: stored.book,
        blotter: stored.blotter,
      }}
    />
  );
}
