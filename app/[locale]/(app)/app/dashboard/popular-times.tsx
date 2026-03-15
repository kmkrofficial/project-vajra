"use client";

/**
 * Google-style "Popular Times" chart.
 * Shows average hourly gym occupancy per day of the week with
 * busyness labels (Free / Comfortable / Moderate / Busy) instead of raw counts.
 * Auto-scales bars to fill available height regardless of absolute numbers.
 * Highlights the current hour with a distinct colour on the current day.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

interface HourlyPoint {
  hour: number;
  avg: number;
}

interface DayData {
  dow: number; // 0=Sun .. 6=Sat
  hours: HourlyPoint[];
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// Visible gym hours (5 AM – 10 PM)
const VISIBLE_START = 5;
const VISIBLE_END = 22;

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

/** Map a count value to a busyness tier key based on its ratio to the global max. */
function getBusynessKey(count: number, globalMax: number): string {
  if (count === 0 || globalMax === 0) return "";
  const ratio = count / globalMax;
  if (ratio >= 0.75) return "busy";
  if (ratio >= 0.45) return "moderate";
  if (ratio >= 0.2) return "comfortable";
  return "free";
}

function getBusynessColor(count: number, globalMax: number, isCurrent: boolean): string {
  if (count === 0) return "bg-muted";
  if (isCurrent) return "bg-primary";
  const ratio = count / globalMax;
  if (ratio >= 0.75) return "bg-red-500/70 dark:bg-red-500/60";
  if (ratio >= 0.45) return "bg-orange-400/70 dark:bg-orange-400/60";
  if (ratio >= 0.2) return "bg-blue-400/60 dark:bg-blue-400/50";
  return "bg-green-400/60 dark:bg-green-400/50";
}

export function PopularTimes({ data }: { data: DayData[] }) {
  const t = useTranslations("popularTimes");
  const now = new Date();
  const todayDow = now.getDay();
  const currentHour = now.getHours();

  const [selectedDow, setSelectedDow] = useState(todayDow);
  const selectedDay = data.find((d) => d.dow === selectedDow);
  const visibleHours = selectedDay?.hours.filter(
    (h) => h.hour >= VISIBLE_START && h.hour <= VISIBLE_END
  ) ?? [];

  // Global max across ALL days for consistent busyness labels
  const globalMax = Math.max(
    ...data.flatMap((d) =>
      d.hours.filter((h) => h.hour >= VISIBLE_START && h.hour <= VISIBLE_END).map((h) => h.avg)
    ),
    1
  );

  // Max for the selected day — used for bar height scaling (auto-scale)
  const dayMax = Math.max(...visibleHours.map((h) => h.avg), 1);

  // Check if there's any data at all
  const hasData = data.some((d) => d.hours.some((h) => h.avg > 0));

  // Current hour's busyness for the header
  const currentHourData = selectedDay?.hours.find((h) => h.hour === currentHour);
  const currentKey = currentHourData
    ? getBusynessKey(currentHourData.avg, globalMax)
    : "";

  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("noData")}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="popular-times">
      {/* Day picker */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {DAY_KEYS.map((key, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDow(idx)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors
                ${
                  selectedDow === idx
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              data-testid={`dow-btn-${idx}`}
            >
              <span className="hidden sm:inline">{t(`days.${key}`)}</span>
              <span className="sm:hidden">{t(`daysShort.${key}`)}</span>
            </button>
          ))}
        </div>

        {/* Busyness indicator for current hour */}
        {selectedDow === todayDow && currentKey && (
          <span
            className="text-xs font-semibold text-muted-foreground"
            data-testid="current-busyness"
          >
            {t("rightNow")}&nbsp;
            <span
              className={
                currentKey === "busy"
                  ? "text-red-500"
                  : currentKey === "moderate"
                    ? "text-orange-500"
                    : currentKey === "comfortable"
                      ? "text-blue-500"
                      : "text-green-500"
              }
            >
              {t(currentKey)}
            </span>
          </span>
        )}
      </div>

      {/* Bar chart */}
      <div
        className="flex items-end gap-[3px] sm:gap-1.5"
        style={{ height: 160 }}
        data-testid="popular-times-chart"
      >
        {visibleHours.map((h) => {
          const isCurrent = selectedDow === todayDow && h.hour === currentHour;
          const heightPct = h.avg > 0 ? Math.max((h.avg / dayMax) * 100, 6) : 3;
          const key = getBusynessKey(h.avg, globalMax);
          const label = key ? t(key) : "";
          const color = getBusynessColor(h.avg, globalMax, isCurrent);

          return (
            <div
              key={h.hour}
              className="group relative flex flex-1 flex-col items-center justify-end h-full"
            >
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-md group-hover:block whitespace-nowrap">
                {label || t("noVisitors")} · {t("visitors", { count: h.avg })}
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all ${color}`}
                style={{ height: `${heightPct}%`, minHeight: h.avg > 0 ? 6 : 2 }}
              />

              {/* Hour label */}
              <span className="mt-1 text-[8px] font-medium text-muted-foreground sm:text-[10px]">
                {formatHour(h.hour)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground sm:text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-green-400/60" /> {t("free")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-blue-400/60" /> {t("comfortable")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-orange-400/70" /> {t("moderate")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-red-500/70" /> {t("busy")}
        </span>
      </div>
    </div>
  );
}
