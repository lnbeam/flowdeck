import type { LeadEvent } from "./types";

/**
 * Storage — in-memory only.
 *
 * Events live in a process-local array stashed on globalThis (so it survives
 * Next.js hot-reloads in dev). Durable for the lifetime of a running server.
 * The async API is kept intentionally so a real store (Redis/Postgres/etc.)
 * could drop in later without touching callers.
 */

const CAP = 600; // keep the most recent N events

const g = globalThis as unknown as { __flowdeck?: LeadEvent[] };
if (!g.__flowdeck) g.__flowdeck = [];
const mem = g.__flowdeck;

export function backendName(): "memory" {
  return "memory";
}

export async function addEvent(event: LeadEvent): Promise<void> {
  mem.unshift(event);
  if (mem.length > CAP) mem.length = CAP;
}

export async function getEvents(limit = CAP): Promise<LeadEvent[]> {
  return mem.slice(0, limit);
}

export async function count(): Promise<number> {
  return mem.length;
}
