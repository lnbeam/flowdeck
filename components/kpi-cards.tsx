"use client";

import {
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Flame,
  Gauge,
  Info,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CountUp } from "@/components/count-up";
import { compact, currency } from "@/lib/format";
import type { KpiBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  icon: Icon,
  accent,
  value,
  footer,
  info,
}: {
  label: string;
  icon: LucideIcon;
  accent: string;
  value: React.ReactNode;
  footer: React.ReactNode;
  info: string;
}) {
  return (
    <Card className="group relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`What does "${label}" mean?`}
                  className="text-muted-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{info}</TooltipContent>
            </Tooltip>
          </span>
          <span
            className={cn(
              "grid h-7 w-7 place-items-center rounded-lg",
              accent,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5 text-2xl font-semibold tracking-tight tnum xl:text-[1.75rem]">
          {value}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{footer}</div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpis }: { kpis: KpiBlock }) {
  const hotPct = kpis.totalLeads
    ? Math.round((kpis.hotLeads / kpis.totalLeads) * 100)
    : 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total leads"
          icon={Users}
          accent="bg-primary/15 text-primary"
          value={<CountUp value={kpis.totalLeads} format={compact} />}
          info="Every lead the n8n workflow has ingested via POST /api/ingest since tracking began. The line below counts how many arrived in the last hour."
          footer={
            <>
              <span className="text-foreground tnum">{kpis.leadsLastHour}</span>{" "}
              in the last hour
            </>
          }
        />
        <KpiCard
          label="Today"
          icon={CalendarClock}
          accent="bg-cold/15 text-cold"
          value={<CountUp value={kpis.leadsToday} />}
          info="Leads received since midnight (local time). Resets at the start of each day."
          footer="since midnight"
        />
        <KpiCard
          label="High-intent"
          icon={Flame}
          accent="bg-hot/15 text-hot"
          value={<CountUp value={kpis.hotLeads} className="text-hot" />}
          info="Leads the Code node scored as 'hot' — highest enrollment intent — and routed straight to a senior advisor. The percentage is their share of all leads."
          footer={
            <>
              <span className="text-foreground tnum">{hotPct}%</span> of leads
            </>
          }
        />
        <KpiCard
          label="Avg lead score"
          icon={Gauge}
          accent="bg-warm/15 text-warm"
          value={
            <>
              <CountUp value={kpis.avgScore} />
              <span className="text-base text-muted-foreground">/100</span>
            </>
          }
          info="Average enrollment-intent score (0–100) the workflow assigns from each prospect's signals. Higher means warmer, more likely-to-enrol leads."
          footer="enrollment intent"
        />
        <KpiCard
          label="Revenue pipeline"
          icon={DollarSign}
          accent="bg-chart-5/15 text-chart-5"
          value={<CountUp value={kpis.pipelineValue} format={currency} />}
          info="Expected tuition revenue across all open leads — each course's price weighted by its tier's close probability. Demo figures only."
          footer="expected tuition"
        />
        <KpiCard
          label="Automation health"
          icon={CheckCircle2}
          accent="bg-live/15 text-live"
          value={
            <CountUp
              value={kpis.successRate}
              format={(n) => `${n.toFixed(1)}%`}
              className={kpis.successRate >= 95 ? "text-live" : "text-warm"}
            />
          }
          info="Share of n8n workflow runs that finished without error. The bar tracks this reliability; the figure below is the average run time."
          footer={
            <div className="mt-1 space-y-1">
              <Progress
                value={kpis.successRate}
                indicatorClassName={
                  kpis.successRate >= 95 ? "bg-live" : "bg-warm"
                }
              />
              <span>{kpis.avgLatencyMs}ms avg run</span>
            </div>
          }
        />
      </div>
    </TooltipProvider>
  );
}
