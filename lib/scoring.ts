import type { LeadEvent, RawLead, Tier } from "./types";

/**
 * Lead scoring + routing engine.
 *
 * This is intentionally a pure, dependency-free function so the EXACT same
 * logic can live in three places and always agree:
 *   1. The n8n "Score & Route Lead" Code node (see n8n/lead-intake-workflow.json)
 *   2. The server-side simulator (/api/simulate)
 *   3. A defensive re-score in /api/ingest if a raw lead arrives unscored
 */

const INTENT_WEIGHT: Record<string, number> = {
  demo: 30,
  pricing: 20,
  partnership: 16,
  evaluation: 24,
  support: 2,
  job: -10,
  other: 4,
};

const CHANNEL_WEIGHT: Record<string, number> = {
  referral: 14,
  organic: 9,
  paid: 6,
  social: 4,
  web: 1,
  outbound: 5,
};

const INDUSTRY_WEIGHT: Record<string, number> = {
  SaaS: 8,
  Fintech: 10,
  Healthcare: 8,
  Ecommerce: 6,
  Manufacturing: 5,
  Education: 3,
  Agency: 4,
  Logistics: 5,
  Other: 2,
};

function sizeWeight(employees: number): number {
  if (employees >= 1000) return 22;
  if (employees >= 250) return 16;
  if (employees >= 50) return 10;
  if (employees >= 10) return 5;
  return 1;
}

export interface ScoreResult {
  score: number;
  tier: Tier;
  routedTo: string;
  estValue: number;
}

export function tierFor(score: number): Tier {
  if (score >= 70) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

export function routeFor(tier: Tier): string {
  if (tier === "hot") return "Sales · Senior AE (priority)";
  if (tier === "warm") return "Sales · SDR queue";
  return "Marketing · Nurture sequence";
}

export function scoreLead(lead: RawLead): ScoreResult {
  const intent = (lead.intent ?? "other").toLowerCase();
  const channel = (lead.channel ?? "web").toLowerCase();
  const industry = lead.industry ?? "Other";
  const employees = lead.employees ?? 1;

  let score = 10; // baseline
  score += INTENT_WEIGHT[intent] ?? INTENT_WEIGHT.other;
  score += CHANNEL_WEIGHT[channel] ?? CHANNEL_WEIGHT.web;
  score += INDUSTRY_WEIGHT[industry] ?? INDUSTRY_WEIGHT.Other;
  score += sizeWeight(employees);

  // Business-email bonus (not a free webmail provider).
  const email = (lead.email ?? "").toLowerCase();
  const freemail = /@(gmail|yahoo|hotmail|outlook|icloud|proton)\./.test(email);
  if (email.includes("@") && !freemail) score += 6;

  // Buying-signal keywords in the message.
  const msg = (lead.message ?? "").toLowerCase();
  if (/(budget|urgent|asap|this quarter|q[1-4]|rolling out|migrate)/.test(msg)) {
    score += 5;
  }

  score = Math.max(1, Math.min(100, Math.round(score)));
  const tier = tierFor(score);

  // Estimated pipeline value scales with company size and intent quality.
  const sizeFactor = Math.max(1, Math.log10(employees + 1));
  const intentFactor = tier === "hot" ? 1.6 : tier === "warm" ? 1.0 : 0.55;
  const estValue = Math.round((1200 * sizeFactor * intentFactor) / 50) * 50;

  return { score, tier, routedTo: routeFor(tier), estValue };
}

/** Apply scoring to a raw lead and return a complete (still id/ts-less) record. */
export function enrich(
  raw: RawLead,
): Omit<LeadEvent, "id" | "ts" | "workflow" | "simulated"> {
  const r = scoreLead(raw);
  return {
    name: raw.name ?? "Unknown",
    email: raw.email ?? "unknown@example.com",
    company: raw.company ?? "Unknown Co.",
    source: raw.source ?? "Website Form",
    channel: raw.channel ?? "web",
    message: raw.message ?? "",
    intent: raw.intent ?? "other",
    industry: raw.industry ?? "Other",
    region: raw.region ?? "—",
    employees: raw.employees ?? 1,
    score: r.score,
    tier: r.tier,
    routedTo: r.routedTo,
    estValue: r.estValue,
  };
}
