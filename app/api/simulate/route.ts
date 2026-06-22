import { NextRequest, NextResponse } from "next/server";
import { buildEvent } from "@/lib/event";
import { addEvent } from "@/lib/store";
import { generateRawLead } from "@/lib/leadgen";

export const dynamic = "force-dynamic";

/**
 * Built-in traffic simulator. Generates realistic (but fake) leads through the
 * EXACT same enrich + store path as /api/ingest, so the deployed dashboard is
 * never empty even when the real n8n workflow isn't actively firing.
 *
 *   ?n=<1..50>            how many leads to create (default 1)
 *   ?spreadHours=<0..72>  back-date the leads across the last N hours so an
 *                         initial seed paints a believable 24h history
 */
async function run(n: number, spreadHours: number) {
  const now = Date.now();
  const created: { id: string; tier: string; score: number }[] = [];

  for (let i = 0; i < n; i++) {
    const ts =
      spreadHours > 0
        ? now - Math.floor(Math.random() * spreadHours * 3600 * 1000)
        : now;
    const ev = buildEvent(generateRawLead(), { simulated: true, ts });
    await addEvent(ev);
    created.push({ id: ev.id, tier: ev.tier, score: ev.score });
  }
  return created;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const n = Math.min(50, Math.max(1, Number(searchParams.get("n")) || 1));
  const spreadHours = Math.min(
    72,
    Math.max(0, Number(searchParams.get("spreadHours")) || 0),
  );
  const created = await run(n, spreadHours);
  return NextResponse.json({ ok: true, created: created.length, items: created });
}

// Allow GET so a browser or a Vercel Cron job can trigger it too.
export async function GET(req: NextRequest) {
  return POST(req);
}
