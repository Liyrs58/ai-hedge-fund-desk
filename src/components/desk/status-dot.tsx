"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/desk";

const FILL: Record<AgentStatus, string> = {
  idle: "bg-mute",
  reading: "bg-amber/70",
  writing: "bg-amber",
  done: "bg-up",
  veto: "bg-down",
};

export function StatusDot({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0", FILL[status], className)}
    />
  );
}
