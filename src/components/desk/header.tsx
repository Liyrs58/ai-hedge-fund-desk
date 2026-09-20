"use client";

import { fmtPct, fmtPx, type PaperBrokerId, type Quote, type QuoteSource } from "@/lib/desk";
import { SessionClock } from "./session-clock";

export type LlmBadge = "MOCK" | "NVIDIA/google/gemma-4-31b-it" | "FALLBACK MOCK";

export function DeskHeader({
  quote,
  quoteSource,
  llm,
  paperBroker,
}: {
  quote: Quote;
  quoteSource: QuoteSource;
  llm: LlmBadge;
  paperBroker: PaperBrokerId;
}) {
  const marks = quoteSource === "yahoo" ? "LIVE" : "SAMPLE";
  return (
    <header className="flex items-end justify-between gap-4 px-5 pb-3 pt-4">
      <div className="flex items-end gap-6">
        <h1 className="font-heading text-[34px] leading-none font-semibold tracking-[-0.03em]">
          DESK
        </h1>
        <div className="mb-0.5 flex flex-wrap items-center gap-2 font-mono text-[12px]">
          <span className="text-ink">{quote.symbol}</span>
          <span className="text-mute">
            {fmtPx(quote.mark)} {fmtPct(quote.changePct)}
          </span>
          <Badge qa="badge-marks" tone={marks === "LIVE" ? "live" : "sample"}>
            {marks}
          </Badge>
          <Badge qa="badge-llm" tone={llm.startsWith("NVIDIA") ? "live" : "sample"}>
            {llm}
          </Badge>
          <Badge qa="badge-trading" tone="sample">
            PAPER
          </Badge>
          <Badge qa="badge-broker" tone={paperBroker === "alpaca" ? "live" : "sample"}>
            {paperBroker}
          </Badge>
        </div>
      </div>
      <SessionClock />
    </header>
  );
}

function Badge({
  children,
  qa,
  tone,
}: {
  children: string;
  qa: string;
  tone: "live" | "sample";
}) {
  return (
    <span
      data-qa={qa}
      className={
        tone === "live"
          ? "border border-copper px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-copper"
          : "border border-ink px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-ink"
      }
    >
      {children}
    </span>
  );
}
