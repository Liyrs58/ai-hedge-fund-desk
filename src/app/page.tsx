import { DeskApp } from "@/components/desk/desk-app";
import { getSession } from "@/lib/desk";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";
import { readDeskStore } from "@/lib/desk/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const base = getSession();
  const tape = await loadQuoteTape();
  const stored = readDeskStore();
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
