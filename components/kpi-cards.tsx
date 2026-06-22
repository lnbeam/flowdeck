"use client";

import {
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Flame,
  Gauge,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
}: {
  label: string;
  icon: LucideIcon;
  accent: string;
  value: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Card className="group relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        label="Total leads"
        icon={Users}
        accent="bg-primary/15 text-primary"
        value={<CountUp value={kpis.totalLeads} format={compact} />}
        footer={
          <>
            <span className="text-foreground tnum">{kpis.leadsLastHour}</span> in
            the last hour
          </>
        }
      />
      <KpiCard
        label="Today"
        icon={CalendarClock}
        accent="bg-cold/15 text-cold"
        value={<CountUp value={kpis.leadsToday} />}
        footer="since midnight"
      />
      <KpiCard
        label="Hot leads"
        icon={Flame}
        accent="bg-hot/15 text-hot"
        value={<CountUp value={kpis.hotLeads} className="text-hot" />}
        footer={
          <>
            <span className="text-foreground tnum">{hotPct}%</span> of pipeline
          </>
        }
      />
      <KpiCard
        label="Avg score"
        icon={Gauge}
        accent="bg-warm/15 text-warm"
        value={
          <>
            <CountUp value={kpis.avgScore} />
            <span className="text-base text-muted-foreground">/100</span>
          </>
        }
        footer="lead quality"
      />
      <KpiCard
        label="Pipeline value"
        icon={DollarSign}
        accent="bg-chart-5/15 text-chart-5"
        value={<CountUp value={kpis.pipelineValue} format={currency} />}
        footer="estimated"
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
  );
}
