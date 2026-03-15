"use client";

/**
 * Simple CSS bar chart — zero external dependencies.
 * Each bar scales relative to the max value in the dataset.
 */

import { useTranslations } from "next-intl";

interface DataPoint {
  month: string;
  revenue: number;
}

export function RevenueChart({ data }: { data: DataPoint[] }) {
  const t = useTranslations("analytics");

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("noRevenueData")}
      </p>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div
      className="flex items-end gap-3 pt-4"
      style={{ minHeight: 200 }}
      data-testid="revenue-chart"
    >
      {data.map((d) => {
        const heightPct = Math.max((d.revenue / maxRevenue) * 100, 4);
        return (
          <div
            key={`${d.month}`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/* Value label */}
            <span className="text-xs font-medium text-muted-foreground">
              ₹{d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue}
            </span>
            {/* Bar */}
            <div
              className="w-full rounded-t-md bg-primary transition-all"
              style={{ height: `${heightPct}%`, minHeight: 4 }}
            />
            {/* Month label */}
            <span className="text-xs font-medium text-muted-foreground">
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}
