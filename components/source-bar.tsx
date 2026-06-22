"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/chart-tooltip";

export function SourceBar({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 14, left: 6, bottom: 0 }}
        barCategoryGap={7}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={132}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10.5, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="count"
          name="Leads"
          radius={[0, 5, 5, 0]}
          fill="hsl(var(--chart-2))"
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
