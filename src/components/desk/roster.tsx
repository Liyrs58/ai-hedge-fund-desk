"use client";

import { AgentIcon, LiveDot } from "./marks";
import { AGENTS, type AgentId } from "@/lib/desk";
import { cn } from "@/lib/utils";

export type DisplayStatus = "IDLE" | "SPEAKING" | "READY" | "WATCHING";

export function AgentRoster({
  statuses,
  lastAt,
  live,
  uptime,
  selected,
  onSelect,
}: {
  statuses: Record<AgentId, DisplayStatus>;
  lastAt: Record<AgentId, string>;
  live: boolean;
  uptime: string;
  selected: AgentId | null;
  onSelect: (id: AgentId) => void;
}) {
  const speaking = AGENTS.filter((a) => statuses[a.id] === "SPEAKING").length;
  return (
    <aside className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
        <span className="font-mono text-[12px] tracking-[0.16em]">DESK</span>
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em]">
          <LiveDot className={live ? "bg-copper" : "bg-mute"} />
          <span className={live ? "text-copper" : "text-mute"}>LIVE</span>
        </span>
      </div>
      <ul className="desk-scroll min-h-0 flex-1 overflow-auto">
        {AGENTS.map((agent) => {
          const status = statuses[agent.id];
          const hot = status === "SPEAKING";
          const active = selected === agent.id;
          return (
            <li key={agent.id} className="border-b border-hair">
              <button
                type="button"
                onClick={() => onSelect(agent.id)}
                data-qa={`agent-${agent.id}`}
                className={cn(
                  "grid w-full cursor-pointer grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-1.5 text-left",
                  active ? "bg-[#ebe6d8]" : "hover:bg-[#ebe6d8]/60",
                )}
              >
                <span className="flex size-9 items-center justify-center border border-ink text-ink">
                  <AgentIcon id={agent.id} />
                </span>
                <div className="min-w-0">
                  <div className="font-sans text-[13px] font-medium tracking-[0.04em] uppercase">
                    {agent.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-mute">
                    {hot ? <LiveDot /> : null}
                    <span className={hot ? "text-copper" : ""}>{status}</span>
                    {active ? <span className="text-copper">FILTER</span> : null}
                  </div>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-mute">
                  {lastAt[agent.id] ?? "\u2014"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[11px] tracking-wide text-mute">
        <span>
          {AGENTS.length} AGENTS \u00b7 {speaking} SPEAKING
        </span>
        <span>UPTIME {uptime}</span>
      </div>
    </aside>
  );
}
