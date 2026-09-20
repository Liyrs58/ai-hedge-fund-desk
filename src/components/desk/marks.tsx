import type { AgentId } from "@/lib/desk";

export function AgentIcon({ id }: { id: AgentId }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    "aria-hidden": true as const,
  };

  if (id === "fundamental") {
    return (
      <svg {...common}>
        <path d="M7 4.5h7.2L19 9.2V19.5H7z" />
        <path d="M14.2 4.5V9.2H19" />
        <path d="M10 13h6M10 16h4" />
      </svg>
    );
  }
  if (id === "sentiment") {
    return (
      <svg {...common}>
        <rect x="6" y="4.5" width="12" height="15" />
        <path d="M9 9h6M9 12.5h6M9 16h4" />
      </svg>
    );
  }
  if (id === "technical") {
    return (
      <svg {...common}>
        <path d="M5 18V6" />
        <path d="M5 18h14" />
        <path d="M8 14v-3M12 14V8M16 14v-5" />
      </svg>
    );
  }
  if (id === "trader") {
    return (
      <svg {...common}>
        <path d="M6 16.5h12M8 13h8M10 9.5h4" />
        <path d="M7 16.5 12 6.5 17 16.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 4.5 19 7.5v5.2c0 4.2-3 6.8-7 8.3-4-1.5-7-4.1-7-8.3V7.5z" />
    </svg>
  );
}

export function MarkX() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function MarkCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M2.5 7.2 5.6 10.4 11.5 3.8" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function LiveDot({ className = "bg-copper" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-2 rounded-full ${className}`} />;
}
