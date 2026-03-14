"use client";

/**
 * Pure CSS donut chart — zero external dependencies.
 * Uses conic-gradient to render a ring chart of active vs churned members.
 */

interface DonutChartProps {
  active: number;
  churned: number;
}

export function DonutChart({ active, churned }: DonutChartProps) {
  const total = active + churned;

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No member data yet.
      </p>
    );
  }

  const activePct = Math.round((active / total) * 100);
  const churnedPct = 100 - activePct;

  return (
    <div className="flex flex-col items-center gap-4" data-testid="donut-chart">
      {/* Donut ring */}
      <div
        className="relative size-36"
        style={{
          borderRadius: "50%",
          background: `conic-gradient(
            var(--color-primary) 0% ${activePct}%,
            var(--color-destructive) ${activePct}% 100%
          )`,
        }}
      >
        {/* Inner cutout */}
        <div className="absolute inset-4 flex items-center justify-center rounded-full bg-card">
          <span className="text-lg font-bold text-foreground">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          <span className="text-muted-foreground">Active ({activePct}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Churned ({churnedPct}%)</span>
        </div>
      </div>
    </div>
  );
}
