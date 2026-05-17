"use client";

import * as React from "react";
import { Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteWeightAction } from "@/actions/weight";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

export interface WeightHistoryRow {
  id: string;
  weightKg: number;
  measuredAt: string;
  note: string | null;
}

interface WeightHistoryListProps {
  logs: WeightHistoryRow[];
}

function formatKg(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function WeightHistoryList({ logs }: WeightHistoryListProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());

  const visibleLogs = React.useMemo(
    () => logs.filter((log) => !hiddenIds.has(log.id)),
    [logs, hiddenIds],
  );

  async function handleDelete(id: string) {
    setPendingId(id);
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const result = await deleteWeightAction(id);
    if (!result.success) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error(result.error || "Не удалось удалить измерение");
    } else {
      toast.success("Измерение удалено");
    }
    setPendingId(null);
  }

  if (visibleLogs.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={Scale}
        title="Записей о весе пока нет."
        description="Добавь первое измерение в форме выше."
      />
    );
  }

  return (
    <ul className="divide-border divide-y">
      {visibleLogs.map((log) => (
        <li key={log.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-sm font-medium tabular-nums">
                {formatKg(log.weightKg)} кг
              </span>
              <span className="text-muted-foreground text-xs">{formatDate(log.measuredAt)}</span>
            </div>
            {log.note ? (
              <p className="text-muted-foreground mt-1 text-xs break-words">{log.note}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pendingId !== null}
            onClick={() => void handleDelete(log.id)}
            aria-label={`Удалить измерение ${formatKg(log.weightKg)} кг`}
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
