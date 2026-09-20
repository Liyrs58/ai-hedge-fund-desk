import { DeskApp } from "@/components/desk/desk-app";
import { getSession } from "@/lib/desk";
import { loadQuoteTape } from "@/lib/desk/quotes-feed";

export default async function Home() {
  const base = getSession();
  const tape = await loadQuoteTape();
  return (
    <DeskApp
      session={{
        ...base,
        quotes: tape.quotes,
        quoteSource: tape.source,
        marksNote: tape.note,
        liveTrading: false,
      }}
    />
  );
}
