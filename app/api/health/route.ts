import { NextResponse } from "next/server";
import { backendName, count } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Lightweight health/diagnostics endpoint — shows which store backend is live. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "enrolldeck",
    backend: backendName(),
    events: await count(),
    authRequired: Boolean(process.env.INGEST_TOKEN),
    time: new Date().toISOString(),
  });
}
