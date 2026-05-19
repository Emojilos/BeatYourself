"use client";

import * as React from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface WaterChartPoint {
  date: string;
  total: number;
}

interface WaterChartProps {
  data: WaterChartPoint[];
  goal: number;
  todayKey: string;
}

const RANGE_OPTIONS = [
  { value: "30", days: 30, label: "30 дней" },
  { value: "90", days: 90, label: "90 дней" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMl(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

const MONTH_LABELS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

interface ChartBucket {
  key: string;
  total: number;
}

function buildBuckets(data: WaterChartPoint[], todayKey: string, days: number): ChartBucket[] {
  const map = new Map<string, number>();
  for (const point of data) map.set(point.date, point.total);
  const buckets: ChartBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = shiftDayKey(todayKey, -i);
    buckets.push({ key, total: map.get(key) ?? 0 });
  }
  return buckets;
}

export function WaterChart({ data, goal, todayKey }: WaterChartProps) {
  const [range, setRange] = React.useState<RangeValue>("30");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const days = RANGE_OPTIONS.find((opt) => opt.value === range)!.days;
  const buckets = React.useMemo(() => buildBuckets(data, todayKey, days), [data, todayKey, days]);

  const maxBar = Math.max(goal, ...buckets.map((b) => b.total), 1);
  const total = buckets.reduce((acc, b) => acc + b.total, 0);
  const daysWithLogs = buckets.filter((b) => b.total > 0).length;
  const averagePerLoggedDay = daysWithLogs > 0 ? Math.round(total / daysWithLogs) : 0;

  const chartHeight = 160;
  const chartTopPadding = 16;
  const barGap = days === 30 ? 4 : 2;
  const barWidth = days === 30 ? 14 : 6;
  const chartWidth = days * (barWidth + barGap) - barGap;
  const goalY = chartTopPadding + (chartHeight - chartTopPadding) * (1 - goal / maxBar);

  const monthMarkers: { x: number; label: string }[] = [];
  let lastMonth = -1;
  buckets.forEach((bucket, idx) => {
    const month = Number(bucket.key.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      monthMarkers.push({
        x: idx * (barWidth + barGap) + barWidth / 2,
        label: MONTH_LABELS[month],
      });
      lastMonth = month;
    }
  });

  const activeBucket = activeIndex !== null ? buckets[activeIndex] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="text-muted-foreground">Среднее в дни с записями</div>
          <div className="text-foreground text-lg font-semibold tabular-nums">
            {formatMl(averagePerLoggedDay)} мл
          </div>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeValue)}>
          <TabsList>
            {RANGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={`График потребления воды за ${days} дней`}
          width={chartWidth}
          height={chartHeight + 28}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`}
          className="text-foreground"
        >
          <line
            x1={0}
            x2={chartWidth}
            y1={goalY}
            y2={goalY}
            strokeDasharray="3 3"
            className="stroke-primary/50"
            strokeWidth={1}
          />
          {buckets.map((bucket, idx) => {
            const ratio = bucket.total / maxBar;
            const height = (chartHeight - chartTopPadding) * ratio;
            const x = idx * (barWidth + barGap);
            const y = chartHeight - height;
            const reached = bucket.total >= goal;
            return (
              <g key={bucket.key}>
                <rect
                  x={x}
                  y={chartTopPadding}
                  width={barWidth}
                  height={chartHeight - chartTopPadding}
                  className="fill-muted/40"
                  rx={2}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() =>
                    setActiveIndex((current) => (current === idx ? null : current))
                  }
                  onClick={() => setActiveIndex(idx)}
                  style={{ cursor: "pointer" }}
                />
                {bucket.total > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(2, height)}
                    rx={2}
                    className={cn(
                      reached ? "fill-primary" : "fill-primary/60",
                      activeIndex === idx && "fill-primary",
                    )}
                    style={{ pointerEvents: "none" }}
                  />
                ) : null}
              </g>
            );
          })}
          {monthMarkers.map((marker) => (
            <text
              key={`${marker.x}-${marker.label}`}
              x={marker.x}
              y={chartHeight + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {marker.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
        <span>
          Цель: <span className="text-foreground font-medium tabular-nums">{formatMl(goal)}</span>{" "}
          мл/день
        </span>
        {activeBucket ? (
          <span className="text-foreground">
            <span className="font-medium">{formatDayLabel(activeBucket.key)}:</span>{" "}
            <span className="tabular-nums">{formatMl(activeBucket.total)}</span> мл
          </span>
        ) : (
          <span>Наведи на столбец, чтобы увидеть день</span>
        )}
      </div>
    </div>
  );
}
