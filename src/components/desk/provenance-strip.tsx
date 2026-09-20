"use client";

import { formatProvenanceBadge } from "@/lib/desk/provenance";
import type { Quote } from "@/lib/desk";

const GROUPS: Array<{ key: keyof Quote["provenance"]; label: string }> = [
  { key: "mark", label: "MARK" },
  { key: "fundamentals", label: "FUNDAMENTALS" },
  { key: "technicals", label: "TECHNICALS" },
  { key: "news", label: "NEWS" },
];

export function ProvenanceStrip({ quote }: { quote: Quote }) {
  const p = quote.provenance;
  return (
    <div
      data-qa="provenance-strip"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule px-5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-mute"
    >
      <span className="text-ink">PROVENANCE</span>
      {GROUPS.map(({ key, label }) => (
        <span key={key} data-qa={`prov-${key}`}>
          <span className="text-mute">{label}</span>{" "}
          <span className="text-ink">{formatProvenanceBadge(p[key])}</span>
        </span>
      ))}
    </div>
  );
}
