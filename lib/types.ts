export type Tier = "hot" | "warm" | "cold";
export type WorkflowStatus = "success" | "error";

/** A raw lead as it first arrives at the n8n webhook (before enrichment). */
export interface RawLead {
  name?: string;
  email?: string;
  company?: string;
  source?: string;
  channel?: string;
  message?: string;
  intent?: string;
  industry?: string;
  region?: string;
  employees?: number;
}

/** A fully enriched + scored lead event, as stored and shown on the dashboard. */
export interface LeadEvent {
  id: string;
  ts: number; // epoch ms
  name: string;
  email: string;
  company: string;
  source: string;
  channel: string;
  message: string;
  intent: string;
  industry: string;
  region: string;
  employees: number;
  score: number; // 0-100
  tier: Tier;
  routedTo: string;
  estValue: number; // estimated pipeline value, USD
  workflow: {
    name: string;
    executionId: string;
    status: WorkflowStatus;
    durationMs: number;
    node?: string; // node that failed, when status === "error"
  };
  simulated: boolean;
}

export interface KpiBlock {
  totalLeads: number;
  leadsToday: number;
  hotLeads: number;
  avgScore: number;
  pipelineValue: number;
  successRate: number; // 0-100
  avgLatencyMs: number;
  leadsLastHour: number;
}

export interface SnapshotResponse {
  generatedAt: number;
  backend: "upstash" | "memory";
  kpis: KpiBlock;
  tiers: { hot: number; warm: number; cold: number };
  sources: { label: string; count: number }[];
  volume: { t: number; count: number }[]; // hourly buckets, last 24h
  scoreBands: { label: string; count: number; tier: Tier }[];
  feed: LeadEvent[]; // most recent enriched leads
  executions: {
    id: string;
    workflow: string;
    status: WorkflowStatus;
    durationMs: number;
    ts: number;
    label: string;
    node?: string;
  }[];
  lastEventTs: number | null;
}
