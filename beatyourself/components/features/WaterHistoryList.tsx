"use client";

import * as React from "react";
import type { WaterLog } from "@prisma/client";
import { Droplet, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteWaterAction } from "@/actions/water";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

interface WaterHistoryListProps {
  logs: WaterLog[];
  tz: string;
}

function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(date);
}

function formatMl(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function WaterHistoryList({ logs, tz }: WaterHistoryListProps) {
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
    const result = await deleteWaterAction(id);
    if (!result.success) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error(result.error || "Не удалось удалить запись");
    } else {
      toast.success("Запись удалена");
    }
    setPendingId(null);
  }

  if (visibleLogs.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={Droplet}
        title="Сегодня записей о воде пока нет."
        description="Добавь первую порцию, чтобы увидеть прогресс."
      />
    );
  }

  return (
    <ul className="divide-border divide-y">
      {visibleLogs.map((log) => (
        <li key={log.id} className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium tabular-nums">{formatMl(log.amountMl)} мл</div>
            <div className="text-muted-foreground text-xs tabular-nums">
              {formatTime(log.loggedAt, tz)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pendingId !== null}
            onClick={() => void handleDelete(log.id)}
            aria-label={`Удалить запись на ${formatMl(log.amountMl)} мл`}
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
