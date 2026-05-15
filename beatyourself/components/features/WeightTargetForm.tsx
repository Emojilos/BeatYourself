"use client";

import * as React from "react";
import { toast } from "sonner";

import { clearWeightTargetAction, setWeightTargetAction } from "@/actions/weight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WeightTargetFormProps {
  currentTarget: { weightKg: number; targetDate: string | null } | null;
  latestWeight: number | null;
}

function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
}

function formatKg(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

export function WeightTargetForm({ currentTarget, latestWeight }: WeightTargetFormProps) {
  const [weight, setWeight] = React.useState<string>(
    currentTarget ? String(currentTarget.weightKg) : "",
  );
  const [date, setDate] = React.useState<string>(dateInputValue(currentTarget?.targetDate ?? null));
  const [pending, setPending] = React.useState<"save" | "clear" | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numeric = Number(weight.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Введите целевой вес больше нуля");
      return;
    }
    setPending("save");
    const payload: { weightKg: number; targetDate?: Date } = { weightKg: numeric };
    if (date) payload.targetDate = new Date(`${date}T00:00:00.000Z`);
    const result = await setWeightTargetAction(payload);
    setPending(null);
    if (!result.success) {
      toast.error(result.error || "Не удалось сохранить цель");
      return;
    }
    toast.success("Цель сохранена");
  }

  async function handleClear() {
    setPending("clear");
    const result = await clearWeightTargetAction();
    setPending(null);
    if (!result.success) {
      toast.error(result.error || "Не удалось сбросить цель");
      return;
    }
    setWeight("");
    setDate("");
    toast.success("Цель сброшена");
  }

  const progress = React.useMemo(() => {
    if (!currentTarget || latestWeight === null) return null;
    const target = currentTarget.weightKg;
    const start = latestWeight;
    if (start === target) {
      return { pct: 100, daysLeft: null as number | null, achieved: true };
    }

    const totalDistance = Math.abs(start - target);
    if (totalDistance === 0) return null;

    const direction = target < start ? "down" : "up";
    const traveled = Math.max(0, direction === "down" ? start - target : target - start);
    const pct = Math.max(0, Math.min(100, Math.round((traveled / totalDistance) * 100)));

    let daysLeft: number | null = null;
    if (currentTarget.targetDate) {
      const today = new Date();
      const targetDate = new Date(currentTarget.targetDate);
      daysLeft = daysBetween(today, targetDate);
    }
    return { pct, daysLeft, achieved: pct >= 100 };
  }, [currentTarget, latestWeight]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="weight-target-input">Целевой вес (кг)</Label>
            <Input
              id="weight-target-input"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              max={499.9}
              placeholder="70.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="weight-target-date-input">Дата достижения</Label>
            <Input
              id="weight-target-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending !== null} className="w-full sm:w-auto">
            {pending === "save" ? "Сохраняем..." : "Сохранить цель"}
          </Button>
          {currentTarget ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending !== null}
              onClick={() => void handleClear()}
            >
              {pending === "clear" ? "Сбрасываем..." : "Сбросить цель"}
            </Button>
          ) : null}
        </div>
      </form>

      {currentTarget && progress ? (
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">
            Прогресс к цели{" "}
            <span className="text-foreground font-medium tabular-nums">
              {formatKg(currentTarget.weightKg)} кг
            </span>
          </div>
          <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-foreground tabular-nums">{progress.pct}%</span>
            {progress.daysLeft !== null ? (
              progress.daysLeft >= 0 ? (
                <span>
                  Осталось <span className="text-foreground tabular-nums">{progress.daysLeft}</span>{" "}
                  {pluralizeDays(progress.daysLeft)}
                </span>
              ) : (
                <span className="text-orange-600">Срок прошёл</span>
              )
            ) : (
              <span>Без срока</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
