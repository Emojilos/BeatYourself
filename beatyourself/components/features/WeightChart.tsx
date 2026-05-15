"use client";

import * as React from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface WeightChartPoint {
  date: string;
  weightKg: number;
}

interface WeightChartProps {
  data: WeightChartPoint[];
  todayKey: string;
  target: number | null;
}

const RANGE_OPTIONS = [
  { value: "30", days: 30, label: "30 дней" },
  { value: "90", days: 90, label: "90 дней" },
  { value: "365", days: 365, label: "365 дней" },
  { value: "all", days: null, label: "Всё" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

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

function formatKg(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function dayKeyDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aDate = Date.UTC(ay, am - 1, ad);
  const bDate = Date.UTC(by, bm - 1, bd);
  return Math.round((aDate - bDate) / (24 * 60 * 60 * 1000));
}

function buildMovingAverage(points: WeightChartPoint[], windowDays: number): WeightChartPoint[] {
  const result: WeightChartPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const anchor = points[i];
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0; j--) {
      const diff = dayKeyDiff(anchor.date, points[j].date);
      if (diff > windowDays - 1) break;
      sum += points[j].weightKg;
      count += 1;
    }
    if (count > 0) result.push({ date: anchor.date, weightKg: sum / count });
  }
  return result;
}

interface ChartGeometry {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  xFor: (key: string) => number;
  yFor: (kg: number) => number;
  minKg: number;
  maxKg: number;
  firstKey: string;
  lastKey: string;
}

function buildGeometry(
  points: WeightChartPoint[],
  ma: WeightChartPoint[],
  target: number | null,
): ChartGeometry {
  const width = 600;
  const height = 220;
  const paddingTop = 16;
  const paddingBottom = 28;
  const paddingLeft = 36;
  const paddingRight = 12;

  const firstKey = points[0].date;
  const lastKey = points[points.length - 1].date;
  const totalDays = Math.max(1, dayKeyDiff(lastKey, firstKey));

  const values = [
    ...points.map((p) => p.weightKg),
    ...ma.map((p) => p.weightKg),
    ...(target !== null ? [target] : []),
  ];
  let minKg = Math.min(...values);
  let maxKg = Math.max(...values);
  if (minKg === maxKg) {
    minKg -= 1;
    maxKg += 1;
  }
  const span = maxKg - minKg;
  const pad = span * 0.1;
  minKg = Math.floor((minKg - pad) * 10) / 10;
  maxKg = Math.ceil((maxKg + pad) * 10) / 10;

  const xFor = (key: string) => {
    const offset = dayKeyDiff(key, firstKey);
    return paddingLeft + (offset / totalDays) * (width - paddingLeft - paddingRight);
  };
  const yFor = (kg: number) => {
    const ratio = (kg - minKg) / (maxKg - minKg);
    return height - paddingBottom - ratio * (height - paddingTop - paddingBottom);
  };

  return {
    width,
    height,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    xFor,
    yFor,
    minKg,
    maxKg,
    firstKey,
    lastKey,
  };
}

function buildPath(points: WeightChartPoint[], g: ChartGeometry): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const x = g.xFor(points[0].date);
    const y = g.yFor(points[0].weightKg);
    return `M${x.toFixed(2)},${y.toFixed(2)} L${(x + 0.01).toFixed(2)},${y.toFixed(2)}`;
  }
  return points
    .map((p, idx) => {
      const x = g.xFor(p.date);
      const y = g.yFor(p.weightKg);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildMonthMarkers(g: ChartGeometry): { x: number; label: string }[] {
  const markers: { x: number; label: string }[] = [];
  const [fy, fm] = g.firstKey.split("-").map(Number);
  const [ly, lm] = g.lastKey.split("-").map(Number);
  let y = fy;
  let m = fm;
  let lastX = -Infinity;
  while (y < ly || (y === ly && m <= lm)) {
    const key = `${y}-${String(m).padStart(2, "0")}-01`;
    const x = g.xFor(key);
    if (x >= g.paddingLeft && x <= g.width - g.paddingRight && x - lastX > 48) {
      markers.push({ x, label: MONTH_LABELS[m - 1] });
      lastX = x;
    }
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return markers;
}

export function WeightChart({ data, todayKey, target }: WeightChartProps) {
  const [range, setRange] = React.useState<RangeValue>("90");
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const filtered = React.useMemo(() => {
    const option = RANGE_OPTIONS.find((opt) => opt.value === range)!;
    if (option.days === null) return data;
    const sinceDiff = option.days - 1;
    return data.filter((point) => dayKeyDiff(todayKey, point.date) <= sinceDiff);
  }, [data, range, todayKey]);

  const ma = React.useMemo(() => buildMovingAverage(filtered, 7), [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-3">
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
        <p className="text-muted-foreground text-sm">
          В выбранном диапазоне нет измерений. Добавь запись или переключи период.
        </p>
      </div>
    );
  }

  const geometry = buildGeometry(filtered, ma, target);
  const linePath = buildPath(filtered, geometry);
  const maPath = buildPath(ma, geometry);
  const monthMarkers = buildMonthMarkers(geometry);
  const targetY = target !== null ? geometry.yFor(target) : null;
  const hoverPoint = hoverIndex !== null ? filtered[hoverIndex] : null;
  const yTicks = [geometry.minKg, (geometry.minKg + geometry.maxKg) / 2, geometry.maxKg];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-xs">
          Линия: точные измерения. Тонкая пунктирная: среднее за 7 дней.
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
          aria-label="График веса за выбранный период"
          width={geometry.width}
          height={geometry.height}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          className="text-foreground"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((tick) => {
            const y = geometry.yFor(tick);
            return (
              <g key={tick}>
                <line
                  x1={geometry.paddingLeft}
                  x2={geometry.width - geometry.paddingRight}
                  y1={y}
                  y2={y}
                  className="stroke-muted/40"
                  strokeWidth={1}
                />
                <text
                  x={geometry.paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {formatKg(tick, 1)}
                </text>
              </g>
            );
          })}

          {targetY !== null && target !== null ? (
            <g>
              <line
                x1={geometry.paddingLeft}
                x2={geometry.width - geometry.paddingRight}
                y1={targetY}
                y2={targetY}
                className="stroke-emerald-500"
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <text
                x={geometry.width - geometry.paddingRight}
                y={targetY - 4}
                textAnchor="end"
                className="fill-emerald-600 text-[10px] font-medium tabular-nums"
              >
                Цель {formatKg(target, 1)}
              </text>
            </g>
          ) : null}

          {maPath ? (
            <path
              d={maPath}
              fill="none"
              strokeWidth={1.4}
              strokeDasharray="2 3"
              className="stroke-primary/60"
            />
          ) : null}

          <path
            d={linePath}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-primary"
          />

          {filtered.map((point, idx) => {
            const x = geometry.xFor(point.date);
            const y = geometry.yFor(point.weightKg);
            const active = hoverIndex === idx;
            return (
              <g key={point.date}>
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 5 : 3}
                  className={active ? "fill-primary" : "fill-primary/80"}
                />
                <rect
                  x={x - 8}
                  y={geometry.paddingTop}
                  width={16}
                  height={geometry.height - geometry.paddingTop - geometry.paddingBottom}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(idx)}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}

          {monthMarkers.map((marker) => (
            <text
              key={`${marker.x}-${marker.label}`}
              x={marker.x}
              y={geometry.height - 8}
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
          Период:{" "}
          <span className="text-foreground font-medium">
            {RANGE_OPTIONS.find((opt) => opt.value === range)!.label}
          </span>
        </span>
        {hoverPoint ? (
          <span className="text-foreground">
            <span className="font-medium">{formatDayLabel(hoverPoint.date)}:</span>{" "}
            <span className="tabular-nums">{formatKg(hoverPoint.weightKg, 1)}</span> кг
          </span>
        ) : (
          <span>Наведи курсор на точку, чтобы увидеть значение</span>
        )}
      </div>
    </div>
  );
}
