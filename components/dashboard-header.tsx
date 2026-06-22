"use client";

import { Activity, Radio, Zap, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

interface HeaderProps {
  connected: boolean;
  live: boolean;
  onToggleLive: () => void;
  onBurst: () => void;
  lastEventTs: number | null;
  backend?: "memory";
}

export function DashboardHeader({
  connected,
  live,
  onToggleLive,
  onBurst,
  lastEventTs,
  backend,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-cold text-primary-foreground shadow-lg shadow-primary/20">
            <Activity className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              EnrollDeck
              <span className="hidden text-muted-foreground sm:inline">
                · Admissions Command Center
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              n8n automation → live dashboard
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected
                  ? "bg-live animate-pulse-ring"
                  : "bg-warm",
              )}
            />
            <span className="text-xs font-medium">
              {connected ? "Connected" : "Reconnecting…"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {lastEventTs ? `· last lead ${timeAgo(lastEventTs)}` : ""}
            </span>
          </div>

          {/* Store backend */}
          <Badge variant="secondary" className="gap-1.5">
            <Server className="h-3 w-3" />
            In-memory
          </Badge>

          {/* Controls */}
          <Button
            variant={live ? "default" : "outline"}
            size="sm"
            onClick={onToggleLive}
            className="gap-1.5"
          >
            <Radio className={cn("h-3.5 w-3.5", live && "animate-pulse")} />
            {live ? "Live" : "Paused"}
          </Button>
          <Button variant="secondary" size="sm" onClick={onBurst} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Simulate burst
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
