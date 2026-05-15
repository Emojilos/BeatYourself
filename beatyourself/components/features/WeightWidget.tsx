"use client";

import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface WeightWidgetPoint {
  date: string;
  weightKg: number;
}

interface WeightWidgetProps {
  latest: { value: number; delta: number | null; measuredAt: string } | null;
  recent: WeightWidgetPoint[];
}

function formatKg(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(abs);
  return `${delta >= 0 ? "+" : "−"}${formatted}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function Sparkline({ points }: { points: WeightWidgetPoint[] }) {
  if (points.length < 2) return null;

  const width = 96;
  const height = 32;
  const padding = 2;
  const values = points.map((p) => p.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const step = (width - padding * 2) / (points.length - 1);
  const path = points
    .map((p, idx) => {
      const x = padding + idx * step;
      const y = height - padding - ((p.weightKg - min) / range) * (height - padding * 2);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="График веса"
      className="text-primary"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function WeightWidget({ latest, recent }: WeightWidgetProps) {
  if (!latest) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
              <Scale className="size-5" aria-hidden />
            </div>
            <div>
              <div className="text-foreground text-sm font-medium">Вес</div>
              <div className="text-muted-foreground text-xs">Пока нет измерений</div>
            </div>
          </div>
          <Link
            href="/weight"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            Добавить
          </Link>
        </CardContent>
      </Card>
    );
  }

  const delta = latest.delta;
  const deltaSign = delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
            <Scale className="size-5" aria-hidden />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-2xl leading-none font-semibold tabular-nums">
                {formatKg(latest.value)}
              </span>
              <span className="text-muted-foreground text-sm">кг</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {delta !== null && deltaSign !== "flat" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                    deltaSign === "up" ? "text-orange-600" : "text-emerald-600",
                  )}
                >
                  {deltaSign === "up" ? (
                    <TrendingUp className="size-3" aria-hidden />
                  ) : (
                    <TrendingDown className="size-3" aria-hidden />
                  )}
                  {formatDelta(delta)} кг
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">— нет дельты</span>
              )}
              <span className="text-muted-foreground text-xs">{formatDate(latest.measuredAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sparkline points={recent} />
          <Link
            href="/weight"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            Открыть
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
