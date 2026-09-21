import { AS_OF } from "./limits";
import type { FieldProvenance, QuoteProvenance } from "./types";

export function sampleAsOf(): string {
  return AS_OF;
}

export function nowAsOf(): string {
  return new Date().toISOString();
}

export function sampleProvenance(): QuoteProvenance {
  const row: FieldProvenance = { source: "sample", asOf: sampleAsOf() };
  return {
    mark: { ...row },
    fundamentals: { ...row },
    technicals: { ...row },
    news: { source: "sample", asOf: sampleAsOf() },
  };
}

export function formatProvenanceBadge(p: FieldProvenance): string {
  const src = p.source.toUpperCase();
  const short =
    p.asOf.length > 16 && p.asOf.includes("T")
      ? `${p.asOf.slice(0, 16).replace("T", " ")}${p.asOf.endsWith("Z") ? " UTC" : ""}`
      : p.asOf;
  return `${src} · ${short}`;
}
