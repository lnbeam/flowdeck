import { NextResponse } from "next/server";
import { getEvents } from "@/lib/store";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/** The single read endpoint the dashboard polls for its entire state. */
export async function GET() {
  const events = await getEvents();
  const snapshot = buildSnapshot(events);
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "no-store" },
  });
}
