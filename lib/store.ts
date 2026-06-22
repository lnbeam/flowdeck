import type { LeadEvent } from "./types";

/**
 * Storage abstraction.
 *
 * - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, events are
 *   persisted in an Upstash Redis list via the REST API (no SDK needed).
 *   This is REQUIRED on Vercel, where serverless functions are stateless and
 *   short-lived.
 * - Otherwise we fall back to an in-process array — fine for `next dev`,
 *   but not durable across serverless invocations.
 */

const KEY = "flowdeck:events";
const CAP = 600; // keep the most recent N events

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(URL && TOKEN);

export function backendName(): "upstash" | "memory" {
  return useUpstash ? "upstash" : "memory";
}

// ---- In-memory fallback ----------------------------------------------------
// Stash on globalThis so it survives Next.js hot-reloads in dev.
const g = globalThis as unknown as { __flowdeck?: LeadEvent[] };
if (!g.__flowdeck) g.__flowdeck = [];
const mem = g.__flowdeck;

// ---- Upstash REST helper ---------------------------------------------------
async function redis(command: (string | number)[]): Promise<any> {
  const res = await fetch(URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.result;
}

// ---- Public API ------------------------------------------------------------
export async function addEvent(event: LeadEvent): Promise<void> {
  if (useUpstash) {
    await redis(["LPUSH", KEY, JSON.stringify(event)]);
    await redis(["LTRIM", KEY, 0, CAP - 1]);
    return;
  }
  mem.unshift(event);
  if (mem.length > CAP) mem.length = CAP;
}

export async function getEvents(limit = CAP): Promise<LeadEvent[]> {
  if (useUpstash) {
    const raw: string[] = (await redis(["LRANGE", KEY, 0, limit - 1])) ?? [];
    return raw
      .map((s) => {
        try {
          return JSON.parse(s) as LeadEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is LeadEvent => e !== null);
  }
  return mem.slice(0, limit);
}

export async function count(): Promise<number> {
  if (useUpstash) {
    return (await redis(["LLEN", KEY])) ?? 0;
  }
  return mem.length;
}
