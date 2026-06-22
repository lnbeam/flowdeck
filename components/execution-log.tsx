"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SnapshotResponse } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function dur(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function ExecutionLog({
  executions,
}: {
  executions: SnapshotResponse["executions"];
}) {
  return (
    <ScrollArea className="h-[260px] pr-3">
      <div className="space-y-1">
        {executions.map((x) => {
          const failed = x.status === "error";
          return (
            <div
              key={x.id}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-xs",
                failed ? "bg-destructive/5" : "hover:bg-accent/40",
              )}
            >
              {failed ? (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-live" />
              )}
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {x.id}
              </span>
              <span className="truncate text-foreground">{x.label}</span>
              {failed && x.node && (
                <span className="hidden shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive sm:inline">
                  ✕ {x.node}
                </span>
              )}
              <span className="ml-auto shrink-0 tnum text-muted-foreground">
                {dur(x.durationMs)}
              </span>
              <span className="w-12 shrink-0 text-right text-muted-foreground">
                {timeAgo(x.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
