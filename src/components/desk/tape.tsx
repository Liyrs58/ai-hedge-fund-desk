"use client";

import { useEffect, useRef } from "react";
import { LiveDot } from "./marks";
import { AGENT_BY_ID, type AgentId, type DebateMessage } from "@/lib/desk";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<DebateMessage["kind"], string> = {
  note: "note",
  thesis: "thesis",
  rebuttal: "rebut",
  proposal: "proposal",
  veto: "veto",
  mark: "mark",
};

export function DebateStream({
  messages,
  writing,
  running,
  error,
  clock,
  focus,
}: {
  messages: DebateMessage[];
  writing: AgentId | null;
  running: boolean;
  error: string | null;
  clock: string;
  focus: AgentId | null;
}) {
  const visibleCount =
    focus === null ? messages.length : messages.filter((m) => m.agent === focus).length;
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, writing]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2.5 font-mono text-[12px] tracking-[0.14em]">
        <span>DEBATE TRANSCRIPT</span>
        <span className="flex items-center gap-2 text-[11px]">
          STREAM
          <span className="text-mute">·</span>
          <LiveDot className={running || messages.length > 0 ? "bg-copper" : "bg-mute"} />
          <span className={running ? "text-copper" : "text-mute"}>LIVE</span>
        </span>
      </div>
      <div className="desk-scroll min-h-0 flex-1 overflow-auto px-4 py-3">
        {error ? (
          <p className="font-mono text-[12px] text-copper">{error}</p>
        ) : null}
        {!running && messages.length === 0 && !error ? (
          <p
            className="max-w-md font-mono text-[12px] leading-relaxed text-mute"
            data-qa="tape-idle"
          >
            No session on the tape. Pick a name, then run the desk. Analysts mark
            first. Hale proposes. Sato has veto — you still approve or block.
          </p>
        ) : null}
        <ol className="space-y-2.5">
          {messages.map((msg) => {
            const agent = AGENT_BY_ID[msg.agent];
            const veto = msg.kind === "veto";
            const dim = focus !== null && msg.agent !== focus;
            return (
              <li
                key={msg.id}
                data-qa="tape-message"
                className={cn(
                  "tape-in border px-3 py-2.5",
                  veto ? "border-copper" : "border-ink/70",
                  dim && "opacity-30",
                )}
              >
                <div className="mb-1 flex items-baseline justify-between gap-3 font-mono text-[11px]">
                  <span>
                    {msg.at} {agent.title.toUpperCase()} ({agent.abbrev})
                  </span>
                  <span className="text-mute">{msg.at}</span>
                </div>
                <p className="text-[13px] leading-relaxed">
                  <span className="font-mono text-[12px] text-dim">
                    {msg.kind === "note" && msg.agent === "sentiment"
                      ? "signal"
                      : KIND_LABEL[msg.kind]}
                    :{" "}
                  </span>
                  {msg.body}
                </p>
              </li>
            );
          })}
        </ol>
        {writing ? (
          <div className="mt-3 font-mono text-[11px] text-copper">
            {AGENT_BY_ID[writing].title.toUpperCase()} speaking
          </div>
        ) : null}
        <div ref={bottom} />
      </div>
      <div className="flex items-center justify-between border-t border-ink px-4 py-2 font-mono text-[11px] text-mute">
        <span>BUFFER: {visibleCount} messages</span>
        <span className="flex items-center gap-2">
          {clock}
          <LiveDot className={running ? "bg-copper" : "bg-mute"} />
          <span className={running ? "text-copper" : ""}>LIVE</span>
        </span>
      </div>
    </section>
  );
}
