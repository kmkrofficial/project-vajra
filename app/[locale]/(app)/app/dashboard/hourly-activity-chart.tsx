"use client";

/**
 * Hourly activity bar chart — pure CSS, zero external dependencies.
 * Displays average member check-ins per hour across all recorded days.
 */

interface HourlyDataPoint {
  hour: number;
  count: number;
}

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

export function HourlyActivityChart({ data }: { data: HourlyDataPoint[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Only show hours 5–23 (gyms are rarely open before 5am)
  const visible = data.filter((d) => d.hour >= 5 && d.hour <= 22);

  if (visible.every((d) => d.count === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No check-in data recorded yet.
      </p>
    );
  }

  return (
    <div
      className="flex items-end gap-1 pt-4 sm:gap-2"
      style={{ minHeight: 160 }}
      data-testid="hourly-activity-chart"
    >
      {visible.map((d) => {
        const heightPct = Math.max((d.count / maxCount) * 100, 2);
        return (
          <div
            key={d.hour}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/* Count label — only show if non-zero */}
            <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
              {d.count > 0 ? d.count : ""}
            </span>
            {/* Bar */}
            <div
              className={`w-full rounded-t-sm transition-all sm:rounded-t-md ${
                d.count > 0 ? "bg-primary/60" : "bg-muted"
              }`}
              style={{
                height: `${heightPct}%`,
                minHeight: d.count > 0 ? 4 : 2,
              }}
            />
            {/* Hour label */}
            <span className="text-[9px] font-medium text-muted-foreground sm:text-xs">
              {formatHour(d.hour)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
