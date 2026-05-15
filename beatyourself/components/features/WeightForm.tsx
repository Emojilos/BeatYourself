"use client";

import * as React from "react";
import { toast } from "sonner";

import { logWeightAction } from "@/actions/weight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayDateInputValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function WeightForm() {
  const [weight, setWeight] = React.useState("");
  const [date, setDate] = React.useState(todayDateInputValue);
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numeric = Number(weight.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Введите вес больше нуля");
      return;
    }
    if (!date) {
      toast.error("Укажите дату измерения");
      return;
    }
    setPending(true);
    const result = await logWeightAction({
      weightKg: numeric,
      measuredAt: new Date(`${date}T00:00:00.000Z`),
      note: note.trim() ? note.trim() : undefined,
    });
    setPending(false);
    if (!result.success) {
      toast.error(result.error || "Не удалось сохранить измерение");
      return;
    }
    toast.success("Измерение сохранено");
    setWeight("");
    setNote("");
    setDate(todayDateInputValue());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="weight-input">Вес (кг)</Label>
          <Input
            id="weight-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={499.9}
            placeholder="75.4"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="weight-date-input">Дата</Label>
          <Input
            id="weight-date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayDateInputValue()}
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="weight-note-input">Заметка</Label>
        <textarea
          id="weight-note-input"
          rows={2}
          placeholder="Утром, натощак (опционально)"
          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Сохраняем..." : "Сохранить"}
      </Button>
    </form>
  );
}
