import type { LeadEvent, SnapshotResponse, Tier } from "./types";
import { backendName } from "./store";

function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const SCORE_BANDS: { label: string; min: number; max: number; tier: Tier }[] = [
  { label: "0–24", min: 0, max: 24, tier: "cold" },
  { label: "25–44", min: 25, max: 44, tier: "cold" },
  { label: "45–59", min: 45, max: 59, tier: "warm" },
  { label: "60–69", min: 60, max: 69, tier: "warm" },
  { label: "70–84", min: 70, max: 84, tier: "hot" },
  { label: "85–100", min: 85, max: 100, tier: "hot" },
];

/** Build the full dashboard snapshot from the raw event list. */
export function buildSnapshot(input: LeadEvent[], now = Date.now()): SnapshotResponse {
  // Newest first, regardless of how the store returned them (live adds vs
  // back-filled seed can interleave timestamps).
  const events = [...input].sort((a, b) => b.ts - a.ts);
  const total = events.length;
  const todayStart = startOfToday(now);
  const hourAgo = now - 60 * 60 * 1000;

  const tiers = { hot: 0, warm: 0, cold: 0 };
  const sourceMap = new Map<string, number>();
  let scoreSum = 0;
  let pipelineValue = 0;
  let leadsToday = 0;
  let leadsLastHour = 0;
  let success = 0;
  let latencySum = 0;

  for (const e of events) {
    tiers[e.tier]++;
    scoreSum += e.score;
    pipelineValue += e.estValue;
    sourceMap.set(e.source, (sourceMap.get(e.source) ?? 0) + 1);
    if (e.ts >= todayStart) leadsToday++;
    if (e.ts >= hourAgo) leadsLastHour++;
    if (e.workflow.status === "success") success++;
    latencySum += e.workflow.durationMs;
  }

  // 24h hourly volume buckets.
  const buckets: { t: number; count: number }[] = [];
  const hourMs = 60 * 60 * 1000;
  const base = Math.floor(now / hourMs) * hourMs;
  for (let i = 23; i >= 0; i--) {
    buckets.push({ t: base - i * hourMs, count: 0 });
  }
  for (const e of events) {
    const idx = Math.floor((e.ts - (base - 23 * hourMs)) / hourMs);
    if (idx >= 0 && idx < 24) buckets[idx].count++;
  }

  const scoreBands = SCORE_BANDS.map((b) => ({
    label: b.label,
    tier: b.tier,
    count: events.filter((e) => e.score >= b.min && e.score <= b.max).length,
  }));

  const sources = [...sourceMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const executions = events.slice(0, 14).map((e) => ({
    id: e.workflow.executionId,
    workflow: e.workflow.name,
    status: e.workflow.status,
    durationMs: e.workflow.durationMs,
    ts: e.ts,
    label: `${e.company} · ${e.tier.toUpperCase()}`,
    node: e.workflow.node,
  }));

  return {
    generatedAt: now,
    backend: backendName(),
    kpis: {
      totalLeads: total,
      leadsToday,
      hotLeads: tiers.hot,
      avgScore: total ? Math.round(scoreSum / total) : 0,
      pipelineValue,
      successRate: total ? Math.round((success / total) * 1000) / 10 : 100,
      avgLatencyMs: total ? Math.round(latencySum / total) : 0,
      leadsLastHour,
    },
    tiers,
    sources,
    volume: buckets,
    scoreBands,
    feed: events.slice(0, 24),
    executions,
    lastEventTs: events[0]?.ts ?? null,
  };
}
