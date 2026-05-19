"use client";

import * as React from "react";
import { toast } from "sonner";

import { setWaterGoalAction } from "@/actions/water";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WaterGoalFormProps {
  currentGoal: number;
}

export function WaterGoalForm({ currentGoal }: WaterGoalFormProps) {
  const [value, setValue] = React.useState(String(currentGoal));
  const [pending, setPending] = React.useState(false);
  const [lastSyncedGoal, setLastSyncedGoal] = React.useState(currentGoal);

  if (currentGoal !== lastSyncedGoal) {
    setLastSyncedGoal(currentGoal);
    setValue(String(currentGoal));
  }

  const numeric = Number(value);
  const dirty = Number.isFinite(numeric) && numeric !== currentGoal;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      toast.error("Введите целое число миллилитров");
      return;
    }
    setPending(true);
    const result = await setWaterGoalAction({ goalMl: numeric });
    setPending(false);
    if (!result.success) {
      toast.error(result.error || "Не удалось сохранить цель");
      return;
    }
    toast.success("Дневная цель обновлена");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="water-goal-input">Дневная цель (мл)</Label>
        <Input
          id="water-goal-input"
          type="number"
          inputMode="numeric"
          min={100}
          max={20000}
          step={50}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={pending || !dirty}>
        {pending ? "Сохраняем..." : "Сохранить"}
      </Button>
    </form>
  );
}
