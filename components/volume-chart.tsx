"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/chart-tooltip";

export function VolumeChart({ data }: { data: { t: number; count: number }[] }) {
  const chart = data.map((d) => ({
    count: d.count,
    label: new Date(d.t).toLocaleTimeString([], {
      hour: "2-digit",
      hour12: false,
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={3}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--border))" }}
          content={<ChartTooltip />}
        />
        <Area
          type="monotone"
          dataKey="count"
          name="Leads"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#volFill)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
