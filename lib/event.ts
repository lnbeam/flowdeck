import type { LeadEvent, RawLead, WorkflowStatus } from "./types";
import { enrich } from "./scoring";

const WORKFLOW_NAME = "Lead Capture & Routing";
const ERROR_NODES = ["Enrich Lead", "CRM Upsert", "Calendar Booking"];

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

interface BuildOpts {
  simulated?: boolean;
  /** Force a specific workflow status (used by /api/ingest with real n8n meta). */
  status?: WorkflowStatus;
  durationMs?: number;
  executionId?: string;
  /** Override the event timestamp (used to back-fill a 24h history on seed). */
  ts?: number;
}

/**
 * Turns a raw lead into a complete, scored LeadEvent with execution metadata.
 * Used by both the simulator and the ingest endpoint.
 */
export function buildEvent(raw: RawLead, opts: BuildOpts = {}): LeadEvent {
  const enriched = enrich(raw);

  // ~7% of simulated runs "fail" so the execution monitor has signal.
  const failed = opts.status ? opts.status === "error" : Math.random() < 0.07;
  const status: WorkflowStatus = failed ? "error" : "success";

  const durationMs =
    opts.durationMs ?? Math.round(320 + Math.random() * 1500);

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${shortId()}`,
    ts: opts.ts ?? Date.now(),
    ...enriched,
    workflow: {
      name: WORKFLOW_NAME,
      executionId: opts.executionId ?? `exec_${shortId()}`,
      status,
      durationMs,
      node: failed ? ERROR_NODES[Math.floor(Math.random() * ERROR_NODES.length)] : undefined,
    },
    simulated: opts.simulated ?? false,
  };
}
