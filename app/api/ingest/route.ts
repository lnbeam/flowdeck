import { NextRequest, NextResponse } from "next/server";
import { buildEvent } from "@/lib/event";
import { addEvent } from "@/lib/store";
import type { RawLead, WorkflowStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The connection point for the n8n workflow.
 * n8n's final "HTTP Request" node POSTs an enriched lead here.
 *
 * Auth: if INGEST_TOKEN is set, the request must carry header
 *       `x-ingest-token: <INGEST_TOKEN>`.
 *
 * Body: a (possibly raw) lead. If score/tier are missing we re-derive them
 *       with the same scoring engine the workflow uses, so a minimal payload
 *       still works.
 */
export async function POST(req: NextRequest) {
  const token = process.env.INGEST_TOKEN;
  if (token) {
    if (req.headers.get("x-ingest-token") !== token) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  const raw: RawLead = {
    name: body.name,
    email: body.email,
    company: body.company,
    source: body.source,
    channel: body.channel,
    message: body.message,
    intent: body.intent,
    industry: body.industry,
    region: body.region,
    employees:
      typeof body.employees === "number"
        ? body.employees
        : Number(body.employees) || undefined,
  };

  const wf = body.workflow ?? {};
  const event = buildEvent(raw, {
    simulated: Boolean(body.simulated),
    status: wf.status as WorkflowStatus | undefined,
    durationMs: typeof wf.durationMs === "number" ? wf.durationMs : undefined,
    executionId: typeof wf.executionId === "string" ? wf.executionId : undefined,
  });

  await addEvent(event);

  return NextResponse.json({
    ok: true,
    id: event.id,
    score: event.score,
    tier: event.tier,
    routedTo: event.routedTo,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST a lead JSON here. Auth header: x-ingest-token.",
  });
}
