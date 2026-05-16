"use client";

import * as React from "react";
import type { ChallengeType } from "@prisma/client";

import type { DailyProgressPoint } from "@/lib/services/challenge-progress";

interface ChallengeProgressChartProps {
  type: ChallengeType;
  target: number;
  unit: string;
  series: DailyProgressPoint[];
  todayKey: string;
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
] as const;

function formatNumber(n: number, maxFractionDigits = 1): string {
  if (Number.isInteger(n)) return new Intl.NumberFormat("ru-RU").format(n);
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
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

export function ChallengeProgressChart({
  type,
  target,
  unit,
  series,
  todayKey,
}: ChallengeProgressChartProps) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  if (series.length === 0) {
    return <p className="text-muted-foreground text-sm">Активностей в этом периоде пока нет.</p>;
  }

  const width = 600;
  const height = 220;
  const paddingTop = 18;
  const paddingBottom = 28;
  const paddingLeft = 48;
  const paddingRight = 16;

  const valueKey = type === "cumulative" ? "cumulative" : "daily";
  const peak = series.reduce((m, p) => Math.max(m, p[valueKey]), 0);
  const yMax = Math.max(target, peak) * 1.1 || 1;

  const xFor = (index: number) => {
    if (series.length === 1) return paddingLeft;
    return paddingLeft + (index / (series.length - 1)) * (width - paddingLeft - paddingRight);
  };
  const yFor = (value: number) =>
    height - paddingBottom - (value / yMax) * (height - paddingTop - paddingBottom);

  const targetY = yFor(target);
  const yTicks = [0, yMax / 2, yMax];

  const linePath =
    type === "cumulative"
      ? series
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${xFor(i).toFixed(2)},${yFor(p.cumulative).toFixed(2)}`,
          )
          .join(" ")
      : "";

  const areaPath = linePath
    ? `${linePath} L${xFor(series.length - 1).toFixed(2)},${(height - paddingBottom).toFixed(
        2,
      )} L${xFor(0).toFixed(2)},${(height - paddingBottom).toFixed(2)} Z`
    : "";

  const monthMarkers: { x: number; label: string }[] = [];
  let prevMonth = -1;
  series.forEach((p, i) => {
    const month = Number(p.dayKey.slice(5, 7));
    if (month !== prevMonth) {
      monthMarkers.push({ x: xFor(i), label: MONTH_LABELS[month - 1] });
      prevMonth = month;
    }
  });
  const trimmedMonthMarkers: { x: number; label: string }[] = [];
  let lastX = -Infinity;
  for (const m of monthMarkers) {
    if (m.x - lastX >= 48) {
      trimmedMonthMarkers.push(m);
      lastX = m.x;
    }
  }

  const todayIndex = series.findIndex((p) => p.dayKey === todayKey);
  const todayX = todayIndex >= 0 ? xFor(todayIndex) : null;

  const hoverPoint = hoverIndex !== null ? series[hoverIndex] : null;
  const hoverValue = hoverPoint ? hoverPoint[valueKey] : 0;

  const barSlot =
    series.length === 1
      ? width - paddingLeft - paddingRight
      : (width - paddingLeft - paddingRight) / Math.max(series.length, 1);
  const barWidth = Math.max(2, barSlot * 0.7);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="График прогресса челленджа по дням"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="text-foreground w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={y}
                  y2={y}
                  className="stroke-muted/40"
                  strokeWidth={1}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}

          {type === "cumulative" ? (
            <>
              <path d={areaPath} className="fill-primary/15" />
              <path
                d={linePath}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-primary"
              />
            </>
          ) : (
            series.map((p, i) => {
              const v = p.daily;
              if (v <= 0) return null;
              const x = xFor(i) - barWidth / 2;
              const y = yFor(v);
              return (
                <rect
                  key={p.dayKey}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height - paddingBottom - y}
                  rx={2}
                  className="fill-primary"
                />
              );
            })
          )}

          <g>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={targetY}
              y2={targetY}
              className="stroke-emerald-500"
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
            <text
              x={width - paddingRight}
              y={targetY - 4}
              textAnchor="end"
              className="fill-emerald-600 text-[10px] font-medium tabular-nums"
            >
              Цель {formatNumber(target)} {unit}
            </text>
          </g>

          {todayX !== null ? (
            <line
              x1={todayX}
              x2={todayX}
              y1={paddingTop}
              y2={height - paddingBottom}
              className="stroke-foreground/40"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          ) : null}

          {series.map((p, i) => {
            const x = xFor(i);
            const value = p[valueKey];
            const y = yFor(value);
            const active = hoverIndex === i;
            return (
              <g key={p.dayKey}>
                {type === "cumulative" ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={active ? 4 : 2}
                    className={active ? "fill-primary" : "fill-primary/70"}
                  />
                ) : null}
                <rect
                  x={x - Math.max(8, barSlot / 2)}
                  y={paddingTop}
                  width={Math.max(16, barSlot)}
                  height={height - paddingTop - paddingBottom}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}

          {trimmedMonthMarkers.map((m) => (
            <text
              key={`${m.x}-${m.label}`}
              x={m.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {m.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-xs">
        <span>
          {type === "cumulative"
            ? "Накопленный прогресс по дням"
            : "Значение метрики за каждый день"}
        </span>
        {hoverPoint ? (
          <span className="text-foreground">
            <span className="font-medium">{formatDayLabel(hoverPoint.dayKey)}:</span>{" "}
            <span className="tabular-nums">{formatNumber(hoverValue)}</span> {unit}
          </span>
        ) : (
          <span>Цель — пунктирная линия. Сегодня — вертикальная линия.</span>
        )}
      </div>
    </div>
  );
}
