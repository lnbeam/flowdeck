"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/chart-tooltip";

const TIER_META = [
  { key: "hot", label: "Hot", color: "hsl(var(--hot))", route: "Senior AE" },
  { key: "warm", label: "Warm", color: "hsl(var(--warm))", route: "SDR queue" },
  { key: "cold", label: "Cold", color: "hsl(var(--cold))", route: "Nurture" },
] as const;

export function TierDonut({
  tiers,
}: {
  tiers: { hot: number; warm: number; cold: number };
}) {
  const total = tiers.hot + tiers.warm + tiers.cold;
  const data = TIER_META.map((t) => ({
    name: t.label,
    value: tiers[t.key],
    fill: t.color,
  }));

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={3}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-2xl font-semibold tnum">{total}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              leads
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        {TIER_META.map((t) => {
          const v = tiers[t.key];
          const pct = total ? Math.round((v / total) * 100) : 0;
          return (
            <div key={t.key} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: t.color }}
              />
              <span className="font-medium">{t.label}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                → {t.route}
              </span>
              <span className="ml-auto tnum text-xs text-muted-foreground">
                <span className="text-foreground">{v}</span> · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
