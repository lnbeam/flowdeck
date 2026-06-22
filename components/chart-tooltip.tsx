"use client";

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valueFormat?: (v: number) => string;
}

/** Shared, on-brand tooltip for every Recharts chart. */
export function ChartTooltip({ active, payload, label, valueFormat }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const fmt = valueFormat ?? ((v: number) => String(v));
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && (
        <div className="mb-1 font-medium text-foreground">{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color ?? p.payload?.fill ?? "currentColor" }}
          />
          <span className="capitalize">{p.name}</span>
          <span className="tnum ml-auto pl-3 font-medium text-foreground">
            {fmt(Number(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
}
