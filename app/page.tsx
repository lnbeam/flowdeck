"use client";

import { Loader2 } from "lucide-react";
import { useSnapshot } from "@/components/use-snapshot";
import { DashboardHeader } from "@/components/dashboard-header";
import { KpiCards } from "@/components/kpi-cards";
import { WorkflowDiagram } from "@/components/workflow-diagram";
import { VolumeChart } from "@/components/volume-chart";
import { TierDonut } from "@/components/tier-donut";
import { SourceBar } from "@/components/source-bar";
import { ScoreFunnel } from "@/components/score-funnel";
import { LiveFeed } from "@/components/live-feed";
import { ExecutionLog } from "@/components/execution-log";
import { Reveal } from "@/components/reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function Page() {
  const {
    data,
    live,
    setLive,
    connected,
    seeding,
    simulate,
  } = useSnapshot();

  return (
    <div className="min-h-screen px-4 pb-10 md:px-6">
      <DashboardHeader
        connected={connected}
        live={live}
        onToggleLive={() => setLive(!live)}
        onBurst={() => simulate(8, 0)}
        lastEventTs={data?.lastEventTs ?? null}
        backend={data?.backend}
      />

      <main className="mx-auto max-w-[1400px] space-y-4">
        {!data || (data.kpis.totalLeads === 0 && seeding) ? (
          <div className="grid h-[60vh] place-items-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">
                {seeding ? "Seeding 24h of demo traffic…" : "Connecting to the workflow…"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Workflow pipeline strip */}
            <Reveal>
              <Card>
                <CardContent className="py-3">
                  <WorkflowDiagram
                    live={live}
                    last={
                      data.lastEventTs
                        ? {
                            status: data.executions[0]?.status ?? "success",
                            ts: data.lastEventTs,
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            </Reveal>

            {/* KPI row */}
            <Reveal delay={0.05}>
              <KpiCards kpis={data.kpis} />
            </Reveal>

            {/* Volume + tier mix */}
            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal delay={0.1} className="lg:col-span-8">
                <Panel
                  title="Lead volume · last 24h"
                  right={<Badge variant="outline">hourly</Badge>}
                >
                  <div className="h-[260px]">
                    <VolumeChart data={data.volume} />
                  </div>
                </Panel>
              </Reveal>
              <Reveal delay={0.15} className="lg:col-span-4">
                <Panel title="Lead tier & routing">
                  <TierDonut tiers={data.tiers} />
                </Panel>
              </Reveal>
            </div>

            {/* Live feed + sources/score */}
            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal delay={0.1} className="lg:col-span-7">
                <Panel
                  title="Live lead feed"
                  right={
                    <Badge variant={live ? "success" : "secondary"} className="gap-1.5">
                      <span
                        className={
                          live
                            ? "h-1.5 w-1.5 rounded-full bg-live animate-pulse"
                            : "h-1.5 w-1.5 rounded-full bg-muted-foreground"
                        }
                      />
                      {live ? "streaming" : "paused"}
                    </Badge>
                  }
                >
                  <LiveFeed events={data.feed} />
                </Panel>
              </Reveal>

              <div className="space-y-4 lg:col-span-5">
                <Reveal delay={0.15}>
                  <Panel title="Top lead sources">
                    <div className="h-[196px]">
                      <SourceBar data={data.sources} />
                    </div>
                  </Panel>
                </Reveal>
                <Reveal delay={0.2}>
                  <Panel title="Lead score distribution">
                    <ScoreFunnel bands={data.scoreBands} />
                  </Panel>
                </Reveal>
              </div>
            </div>

            {/* Execution monitor */}
            <Reveal delay={0.1}>
              <Panel
                title="Automation execution monitor"
                right={
                  <Badge
                    variant={data.kpis.successRate >= 95 ? "success" : "warm"}
                  >
                    {data.kpis.successRate.toFixed(1)}% success
                  </Badge>
                }
              >
                <ExecutionLog executions={data.executions} />
              </Panel>
            </Reveal>

            <footer className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-muted-foreground">
              <span>
                EnrollDeck · mock data only · traffic = built-in simulator + real n8n
                ingest
              </span>
              <span>
                store: <span className="text-foreground">{data.backend}</span> ·
                updates every 2.5s
              </span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
