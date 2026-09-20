"use client";

import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  up,
}: {
  data: number[];
  className?: string;
  up: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 72;
  const h = 18;
  const pts = data
    .map((y, i) => {
      const x = (i / (data.length - 1)) * w;
      const py = h - ((y - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("inline-block", className)}
      width={w}
      height={h}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={up ? "#C5D5C0" : "#C4783A"}
        strokeWidth="1.2"
        points={pts}
      />
    </svg>
  );
}
