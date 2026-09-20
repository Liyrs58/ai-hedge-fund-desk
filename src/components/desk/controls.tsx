"use client";

import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/desk";

export type Pace = "stream" | "instant";
export type View = "floor" | "tabs";

export function ControlStrip({
  quotes,
  ticker,
  onTicker,
  pace,
  onPace,
  view,
  onView,
  running,
  canSkip,
  onRun,
  onSkip,
  onReset,
  onRefreshMarks,
  marksBusy,
}: {
  quotes: Quote[];
  ticker: string;
  onTicker: (symbol: string) => void;
  pace: Pace;
  onPace: (pace: Pace) => void;
  view: View;
  onView: (view: View) => void;
  running: boolean;
  canSkip: boolean;
  onRun: () => void;
  onSkip: () => void;
  onReset: () => void;
  onRefreshMarks: () => void;
  marksBusy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink px-5 py-2 font-mono text-[11px]">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Name">
        <span className="mr-2 tracking-[0.16em] text-mute">NAME</span>
        {quotes.map((q) => (
          <button
            key={q.symbol}
            type="button"
            onClick={() => onTicker(q.symbol)}
            className={cn(
              "cursor-pointer border px-2 py-1 tracking-[0.08em]",
              q.symbol === ticker
                ? "border-copper text-copper"
                : "border-transparent text-ink hover:border-ink",
            )}
            data-qa={`name-${q.symbol}`}
          >
            {q.symbol}
          </button>
        ))}
      </div>

      <Toggle
        label="Pace"
        value={pace}
        options={[
          { id: "stream", label: "Stream" },
          { id: "instant", label: "Instant" },
        ]}
        onChange={onPace}
      />

      <Toggle
        label="View"
        value={view}
        options={[
          { id: "floor", label: "Floor" },
          { id: "tabs", label: "Tabs" },
        ]}
        onChange={onView}
      />

      <div className="ml-auto flex items-center gap-2">
        {canSkip ? (
          <button
            type="button"
            onClick={onSkip}
            data-qa="skip"
            className="cursor-pointer border border-ink px-2 py-1 tracking-[0.14em] uppercase"
          >
            Skip to mark
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRefreshMarks}
          disabled={marksBusy}
          data-qa="refresh-marks"
          className="cursor-pointer border border-ink px-2 py-1 tracking-[0.14em] uppercase disabled:cursor-wait disabled:opacity-50"
        >
          {marksBusy ? "Marks\u2026" : "Refresh marks"}
        </button>
        <button
          type="button"
          onClick={onReset}
          data-qa="reset-book"
          className="cursor-pointer border border-ink px-2 py-1 tracking-[0.14em] uppercase"
        >
          Reset book
        </button>
        <button
          type="button"
          onClick={() => onRun()}
          data-qa="run-desk"
          aria-pressed={running}
          className="cursor-pointer border border-ink bg-ink px-3 py-1 tracking-[0.14em] text-paper uppercase"
        >
          Run desk
        </button>
      </div>
    </div>
  );
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <span className="mr-1 tracking-[0.16em] text-mute">{label.toUpperCase()}</span>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          data-qa={`${label.toLowerCase()}-${opt.id}`}
          className={cn(
            "cursor-pointer border px-2 py-1 tracking-[0.08em] uppercase",
            value === opt.id
              ? "border-copper text-copper"
              : "border-transparent hover:border-ink",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
