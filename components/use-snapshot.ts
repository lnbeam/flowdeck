"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SnapshotResponse } from "@/lib/types";

const POLL_MS = 2500; // how often we re-read dashboard state
const LIVE_TICK_MS = 6000; // how often "live mode" generates a new lead

export interface UseSnapshot {
  data: SnapshotResponse | null;
  live: boolean;
  setLive: (v: boolean) => void;
  connected: boolean;
  lastUpdated: number | null;
  seeding: boolean;
  simulate: (n?: number, spreadHours?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSnapshot(): UseSnapshot {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  const liveRef = useRef(live);
  liveRef.current = live;
  const busy = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshot", { cache: "no-store" });
      const json = (await res.json()) as SnapshotResponse;
      setData(json);
      setConnected(true);
      setLastUpdated(Date.now());
    } catch {
      setConnected(false);
    }
  }, []);

  const simulate = useCallback(
    async (n = 1, spreadHours = 0) => {
      if (busy.current) return;
      busy.current = true;
      try {
        await fetch(`/api/simulate?n=${n}&spreadHours=${spreadHours}`, {
          method: "POST",
        });
        await poll();
      } catch {
        /* ignore */
      } finally {
        busy.current = false;
      }
    },
    [poll],
  );

  // Initial load — if the store is empty, back-fill a believable 24h history.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/snapshot", { cache: "no-store" });
        const json = (await res.json()) as SnapshotResponse;
        if (!mounted) return;
        setData(json);
        setConnected(true);
        if (json.kpis.totalLeads === 0) {
          setSeeding(true);
          await fetch("/api/simulate?n=48&spreadHours=24", { method: "POST" });
          setSeeding(false);
        }
        await poll();
      } catch {
        setConnected(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [poll]);

  // Steady polling loop.
  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // Live traffic generator.
  useEffect(() => {
    const id = setInterval(() => {
      if (liveRef.current) void simulate(1, 0);
    }, LIVE_TICK_MS);
    return () => clearInterval(id);
  }, [simulate]);

  return {
    data,
    live,
    setLive,
    connected,
    lastUpdated,
    seeding,
    simulate,
    refresh: poll,
  };
}
