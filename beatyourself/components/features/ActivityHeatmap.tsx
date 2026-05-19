"use client";

import * as React from "react";
import type { ActivityType } from "@prisma/client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HeatmapActivity, HeatmapCell } from "@/lib/services/dashboard";
import { shiftDayKey } from "@/lib/utils/date-tz";
import { cn } from "@/lib/utils";

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";
const MOBILE_DAYS = 90;
const DESKTOP_DAYS = 365;

// Monday-first ordering. Show only Mon/Wed/Fri to avoid label crowding.
const DAY_LABELS = ["Пн", "", "Ср", "", "Пт", "", ""] as const;
const MONTH_NAMES = [
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

interface ActivityHeatmapProps {
  cells: HeatmapCell[];
  todayKey: string;
}

interface SelectedDay {
  dateKey: string;
  count: number;
  activities: HeatmapActivity[];
}

function dayKeyToUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function jsDayOfWeekToMondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function colorClassForCount(count: number): string {
  if (count === 0) return "fill-muted";
  if (count === 1) return "fill-primary/30";
  if (count <= 3) return "fill-primary/65";
  return "fill-primary";
}

function formatRussianDayFull(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatActivityType(t: ActivityType): string {
  if (t === "run") return "Бег";
  if (t === "walk") return "Ходьба";
  return "Другое";
}

function formatPace(distanceKm: number | null, durationMin: number | null): string | null {
  if (!distanceKm || distanceKm <= 0) return null;
  if (!durationMin || durationMin <= 0) return null;
  const paceMin = durationMin / distanceKm;
  if (!Number.isFinite(paceMin)) return null;
  const totalSeconds = Math.round(paceMin * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")} мин/км`;
}

function pluralizeActivities(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "активностей";
  const last = n % 10;
  if (last === 1) return "активность";
  if (last >= 2 && last <= 4) return "активности";
  return "активностей";
}

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

interface GridCell {
  dateKey: string | null;
  count: number;
  activities: HeatmapActivity[];
}

interface MonthLabel {
  text: string;
  columnIndex: number;
}

function buildGrid(
  cells: HeatmapCell[],
  todayKey: string,
  days: number,
): { columns: GridCell[][]; monthLabels: MonthLabel[] } {
  const earliestKey = shiftDayKey(todayKey, -(days - 1));
  const earliestDate = dayKeyToUtcDate(earliestKey);
  const todayDate = dayKeyToUtcDate(todayKey);
  const earliestDayIndex = jsDayOfWeekToMondayIndex(earliestDate.getUTCDay());
  const todayDayIndex = jsDayOfWeekToMondayIndex(todayDate.getUTCDay());
  const trailingPadding = 6 - todayDayIndex;
  const totalCells = earliestDayIndex + days + trailingPadding;
  const weeks = Math.max(1, Math.ceil(totalCells / 7));

  const cellsByDate = new Map<string, HeatmapCell>();
  for (const c of cells) cellsByDate.set(c.date, c);

  const columns: GridCell[][] = [];
  const monthLabels: MonthLabel[] = [];
  let prevMonth: number | null = null;

  for (let c = 0; c < weeks; c += 1) {
    const column: GridCell[] = [];
    for (let r = 0; r < 7; r += 1) {
      const cellIndex = c * 7 + r;
      const offsetFromEarliest = cellIndex - earliestDayIndex;
      if (offsetFromEarliest < 0 || offsetFromEarliest >= days) {
        column.push({ dateKey: null, count: 0, activities: [] });
        continue;
      }
      const dateKey = shiftDayKey(earliestKey, offsetFromEarliest);
      const fromService = cellsByDate.get(dateKey);
      column.push({
        dateKey,
        count: fromService?.count ?? 0,
        activities: fromService?.activities ?? [],
      });
    }
    const firstActiveCell = column.find((cell) => cell.dateKey !== null);
    if (firstActiveCell?.dateKey) {
      const month = dayKeyToUtcDate(firstActiveCell.dateKey).getUTCMonth();
      if (prevMonth === null || month !== prevMonth) {
        monthLabels.push({ text: MONTH_NAMES[month], columnIndex: c });
        prevMonth = month;
      }
    }
    columns.push(column);
  }

  return { columns, monthLabels };
}

export function ActivityHeatmap({ cells, todayKey }: ActivityHeatmapProps) {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedDay | null>(null);

  React.useEffect(() => {
    const mq = window.matchMedia(DESKTOP_BREAKPOINT);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const days = isDesktop ? DESKTOP_DAYS : MOBILE_DAYS;
  const { columns, monthLabels } = React.useMemo(
    () => buildGrid(cells, todayKey, days),
    [cells, todayKey, days],
  );

  const cellSize = isDesktop ? 11 : 14;
  const gap = isDesktop ? 3 : 4;
  const dayLabelWidth = 28;
  const monthLabelHeight = 16;
  const gridWidth = columns.length * (cellSize + gap) - gap;
  const gridHeight = 7 * (cellSize + gap) - gap;
  const svgWidth = dayLabelWidth + gridWidth;
  const svgHeight = monthLabelHeight + gridHeight;

  const totalActivities = cells.reduce((sum, c) => sum + c.count, 0);

  function openCell(cell: GridCell) {
    if (!cell.dateKey) return;
    setSelected({
      dateKey: cell.dateKey,
      count: cell.count,
      activities: cell.activities,
    });
  }

  return (
    <section aria-label="Календарь активности" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Календарь активности</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {totalActivities} {pluralizeActivities(totalActivities)} / {days} {pluralizeDays(days)}
        </span>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="overflow-x-auto">
          <svg
            role="img"
            aria-label={`Карта активности за ${days} ${pluralizeDays(days)}`}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="text-muted-foreground"
          >
            {monthLabels.map((m, idx) => (
              <text
                key={`month-${m.columnIndex}-${idx}`}
                x={dayLabelWidth + m.columnIndex * (cellSize + gap)}
                y={monthLabelHeight - 4}
                fontSize={10}
                className="fill-current"
              >
                {m.text}
              </text>
            ))}

            {DAY_LABELS.map((label, rowIndex) =>
              label ? (
                <text
                  key={`day-${rowIndex}`}
                  x={0}
                  y={monthLabelHeight + rowIndex * (cellSize + gap) + cellSize - 2}
                  fontSize={10}
                  className="fill-current"
                >
                  {label}
                </text>
              ) : null,
            )}

            {columns.map((column, c) =>
              column.map((cell, r) => {
                if (!cell.dateKey) return null;
                const x = dayLabelWidth + c * (cellSize + gap);
                const y = monthLabelHeight + r * (cellSize + gap);
                const isToday = cell.dateKey === todayKey;
                const label = `${cell.dateKey}: ${cell.count} ${pluralizeActivities(cell.count)}`;
                return (
                  <rect
                    key={`cell-${c}-${r}`}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    ry={2}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      colorClassForCount(cell.count),
                      "cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus-visible:opacity-80",
                      isToday && "stroke-foreground/40",
                    )}
                    strokeWidth={isToday ? 1 : 0}
                    onClick={() => openCell(cell)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCell(cell);
                      }
                    }}
                    aria-label={label}
                  >
                    <title>{label}</title>
                  </rect>
                );
              }),
            )}
          </svg>
        </div>

        <Legend />
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selected ? formatRussianDayFull(dayKeyToUtcDate(selected.dateKey)) : ""}
            </SheetTitle>
            <SheetDescription>
              {selected && selected.count === 0
                ? "В этот день не было активностей."
                : selected
                  ? `${selected.count} ${pluralizeActivities(selected.count)}.`
                  : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && selected.activities.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {selected.activities.map((act) => (
                <ActivityRow key={act.id} activity={act} />
              ))}
            </ul>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function ActivityRow({ activity }: { activity: HeatmapActivity }) {
  const pace = formatPace(activity.distanceKm, activity.durationMin);
  return (
    <li className="bg-muted/40 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{formatActivityType(activity.activityType)}</span>
        {activity.source === "strava" ? (
          <span className="text-muted-foreground text-xs">Strava</span>
        ) : null}
      </div>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
        {activity.distanceKm != null ? <span>{activity.distanceKm} км</span> : null}
        {activity.durationMin != null ? <span>{Math.round(activity.durationMin)} мин</span> : null}
        {activity.steps != null ? <span>{activity.steps} шагов</span> : null}
        {pace ? <span>{pace}</span> : null}
      </div>
      {activity.note ? <p className="text-foreground mt-2 text-xs">{activity.note}</p> : null}
    </li>
  );
}

function Legend() {
  return (
    <div className="text-muted-foreground mt-3 flex items-center justify-end gap-2 text-xs">
      <span>Меньше</span>
      <span className="bg-muted inline-block size-3 rounded-sm" aria-hidden />
      <span className="bg-primary/30 inline-block size-3 rounded-sm" aria-hidden />
      <span className="bg-primary/65 inline-block size-3 rounded-sm" aria-hidden />
      <span className="bg-primary inline-block size-3 rounded-sm" aria-hidden />
      <span>Больше</span>
    </div>
  );
}
