"use client";

import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

const tierColor: Record<Tier, string> = {
  hot: "bg-hot",
  warm: "bg-warm",
  cold: "bg-cold",
};

export function ScoreFunnel({
  bands,
}: {
  bands: { label: string; count: number; tier: Tier }[];
}) {
  const max = Math.max(1, ...bands.map((b) => b.count));
  return (
    <div className="space-y-2.5">
      {bands.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-right text-xs tnum text-muted-foreground">
            {b.label}
          </span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-secondary/50">
            <div
              className={cn(
                "h-full rounded-md opacity-85 transition-[width] duration-700 ease-out",
                tierColor[b.tier],
              )}
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
          <span className="w-7 text-right text-xs tnum text-foreground">
            {b.count}
          </span>
        </div>
      ))}
    </div>
  );
}
