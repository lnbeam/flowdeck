"use client";

import {
  ChevronRight,
  CircleDot,
  Database,
  Gauge,
  GitBranch,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAGES: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: Webhook, label: "Webhook", sub: "new lead" },
  { icon: ShieldCheck, label: "Validate", sub: "clean + dedupe" },
  { icon: Gauge, label: "Score & Route", sub: "Code node" },
  { icon: GitBranch, label: "Branch", sub: "hot / warm / cold" },
  { icon: Database, label: "POST /api/ingest", sub: "→ dashboard" },
];

export function WorkflowDiagram({
  live,
  last,
}: {
  live: boolean;
  last?: { status: string; ts: number };
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5">
              <s.icon className="h-4 w-4 shrink-0 text-primary" />
              <div className="leading-tight">
                <div className="whitespace-nowrap text-xs font-medium">
                  {s.label}
                </div>
                <div className="whitespace-nowrap text-[10px] text-muted-foreground">
                  {s.sub}
                </div>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground",
                  live && "animate-pulse text-primary/70",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          n8n:{" "}
          <span className="font-medium text-foreground">
            Lead Capture &amp; Routing
          </span>
        </span>
        {last && (
          <Badge
            variant={last.status === "error" ? "error" : "success"}
            className="gap-1"
          >
            <CircleDot className="h-3 w-3" /> last run {timeAgo(last.ts)}
          </Badge>
        )}
      </div>
    </div>
  );
}
