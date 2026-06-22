"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { LeadEvent, Tier } from "@/lib/types";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const routeShort: Record<Tier, string> = {
  hot: "Advisor",
  warm: "SDR",
  cold: "Nurture",
};
const tierAvatar: Record<Tier, string> = {
  hot: "bg-hot/15 text-hot",
  warm: "bg-warm/15 text-warm",
  cold: "bg-cold/15 text-cold",
};
const tierText: Record<Tier, string> = {
  hot: "text-hot",
  warm: "text-warm",
  cold: "text-cold",
};

function FeedRow({ e }: { e: LeadEvent }) {
  const failed = e.workflow.status === "error";
  return (
    <div className="flex animate-fade-up items-center gap-3 border-b border-border/40 px-1 py-2.5 last:border-0">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
          tierAvatar[e.tier],
        )}
      >
        {initials(e.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{e.name}</span>
          <Badge
            variant={e.tier}
            className="px-1.5 py-0 text-[10px] uppercase tracking-wide"
          >
            {e.tier}
          </Badge>
          {failed && (
            <Badge variant="error" className="px-1.5 py-0 text-[10px]">
              failed
            </Badge>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {e.company} · {e.intent} · {e.source}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-sm font-semibold tnum", tierText[e.tier])}>
          {e.score}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {routeShort[e.tier]}
        </div>
      </div>
      <div className="w-12 shrink-0 text-right text-[10px] text-muted-foreground">
        {timeAgo(e.ts)}
      </div>
    </div>
  );
}

export function LiveFeed({ events }: { events: LeadEvent[] }) {
  return (
    <ScrollArea className="h-[420px] pr-3">
      {events.length === 0 ? (
        <div className="grid h-[380px] place-items-center text-sm text-muted-foreground">
          Waiting for leads…
        </div>
      ) : (
        events.map((e) => <FeedRow key={e.id} e={e} />)
      )}
    </ScrollArea>
  );
}
