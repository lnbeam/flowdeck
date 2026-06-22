import type { LeadEvent, RawLead, Tier } from "./types";

/**
 * Lead scoring + routing engine — coding-bootcamp admissions funnel.
 *
 * A prospective student (lead) is scored 0–100 by purchase/enrollment intent,
 * then classified Hot / Warm / Cold and routed to the right destination.
 *
 * This is intentionally a pure, dependency-free function so the EXACT same
 * logic can live in three places and always agree:
 *   1. The n8n "Score & Route Lead" Code node (see n8n/lead-intake-workflow.json)
 *   2. The server-side simulator (/api/simulate)
 *   3. A defensive re-score in /api/ingest if a raw lead arrives unscored
 *
 * Field re-use note: the data model keeps generic names — `intent` = the lead's
 * action, `channel` = acquisition channel, `industry` = course/program of
 * interest, `employees` = number of site visits/touchpoints.
 */

const INTENT_WEIGHT: Record<string, number> = {
  "enroll-now": 32,
  "book-call": 26,
  financing: 22,
  pricing: 20,
  syllabus: 14,
  "free-lesson": 12,
  newsletter: 4,
  browsing: 2,
};

const CHANNEL_WEIGHT: Record<string, number> = {
  referral: 16,
  webinar: 12,
  organic: 9,
  paid: 6,
  outbound: 5,
  social: 4,
  web: 1,
};

const PROGRAM_WEIGHT: Record<string, number> = {
  "Data Science": 10,
  Cybersecurity: 9,
  DevOps: 9,
  "Web Development": 8,
  "UX/UI Design": 6,
  "QA Automation": 6,
  "Digital Marketing": 4,
  "Intro to Coding": 2,
};

// Sticker price per program — drives the estimated (probability-weighted) value.
const PROGRAM_PRICE: Record<string, number> = {
  "Data Science": 3000,
  Cybersecurity: 2900,
  DevOps: 2800,
  "Web Development": 2500,
  "UX/UI Design": 2200,
  "QA Automation": 2000,
  "Digital Marketing": 1500,
  "Intro to Coding": 500,
};

// More site visits / touchpoints → warmer lead.
function engagementWeight(visits: number): number {
  if (visits >= 8) return 22;
  if (visits >= 4) return 16;
  if (visits >= 2) return 10;
  if (visits >= 1) return 5;
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
  if (tier === "hot") return "Admissions · Senior Advisor (book a call)";
  if (tier === "warm") return "Admissions · SDR nurture call";
  return "Marketing · Email nurture sequence";
}

export function scoreLead(lead: RawLead): ScoreResult {
  const intent = (lead.intent ?? "browsing").toLowerCase();
  const channel = (lead.channel ?? "web").toLowerCase();
  const program = lead.industry ?? "Intro to Coding";
  const visits = lead.employees ?? 1;

  let score = 10; // baseline
  score += INTENT_WEIGHT[intent] ?? INTENT_WEIGHT.browsing;
  score += CHANNEL_WEIGHT[channel] ?? CHANNEL_WEIGHT.web;
  score += PROGRAM_WEIGHT[program] ?? 2;
  score += engagementWeight(visits);

  const msg = (lead.message ?? "").toLowerCase();
  // Financing / scholarship interest is a strong buying signal.
  if (/(payment plan|installment|financing|scholarship|discount|tuition)/.test(msg)) {
    score += 6;
  }
  // Explicit enrollment-intent keywords.
  if (/(enroll|sign up|start date|cohort|ready|asap|join)/.test(msg)) {
    score += 5;
  }

  score = Math.max(1, Math.min(100, Math.round(score)));
  const tier = tierFor(score);

  // Estimated value = course price × probability of closing for this tier.
  const price = PROGRAM_PRICE[program] ?? 1500;
  const closeFactor = tier === "hot" ? 1.0 : tier === "warm" ? 0.5 : 0.2;
  const estValue = Math.round((price * closeFactor) / 50) * 50;

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
    company: raw.company ?? "Prospective student",
    source: raw.source ?? "Landing Page",
    channel: raw.channel ?? "web",
    message: raw.message ?? "",
    intent: raw.intent ?? "browsing",
    industry: raw.industry ?? "Intro to Coding",
    region: raw.region ?? "—",
    employees: raw.employees ?? 1,
    score: r.score,
    tier: r.tier,
    routedTo: r.routedTo,
    estValue: r.estValue,
  };
}
