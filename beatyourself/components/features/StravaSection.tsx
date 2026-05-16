"use client";

import Link from "next/link";
import * as React from "react";
import { Activity, AlertTriangle, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";

import { disconnectStravaAction, syncStravaAction } from "@/actions/strava";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StravaConnection } from "@/lib/services/profile";

interface StravaSectionProps {
  connection: StravaConnection | null;
  callbackStatus?: "connected" | "error" | null;
  callbackReason?: string | null;
}

const REASON_LABELS: Record<string, string> = {
  not_configured: "Strava интеграция не настроена",
  invalid_state: "Сессия OAuth истекла, попробуйте ещё раз",
  exchange_failed: "Не удалось обменять код на токен",
  access_denied: "Доступ к Strava отклонён",
  unknown: "Неизвестная ошибка",
};

export function StravaSection({ connection, callbackStatus, callbackReason }: StravaSectionProps) {
  const [syncPending, setSyncPending] = React.useState(false);
  const [disconnectPending, setDisconnectPending] = React.useState(false);
  const callbackHandled = React.useRef(false);

  React.useEffect(() => {
    if (callbackHandled.current) return;
    if (callbackStatus === "connected") {
      toast.success("Strava подключён");
      callbackHandled.current = true;
    } else if (callbackStatus === "error") {
      const reason = callbackReason ?? "unknown";
      const message = REASON_LABELS[reason] ?? `Не удалось подключить Strava: ${reason}`;
      toast.error(message);
      callbackHandled.current = true;
    }
  }, [callbackStatus, callbackReason]);

  async function handleSync() {
    setSyncPending(true);
    const result = await syncStravaAction();
    setSyncPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Синхронизировано ${result.data.upserted} ${pluralizeActivities(result.data.upserted)}`,
    );
  }

  async function handleDisconnect() {
    setDisconnectPending(true);
    try {
      await disconnectStravaAction();
      toast.success("Strava отключён");
    } catch {
      toast.error("Не удалось отключить Strava");
    } finally {
      setDisconnectPending(false);
    }
  }

  return (
    <section aria-label="Strava" className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Strava</h2>
      <Card>
        <CardContent className="space-y-4 py-5">
          {connection ? (
            <ConnectedView
              connection={connection}
              syncPending={syncPending}
              disconnectPending={disconnectPending}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
          ) : (
            <DisconnectedView />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function DisconnectedView() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Подключите Strava, чтобы автоматически подтягивать пробежки и прогулки.
      </p>
      <Button asChild variant="default">
        <Link href="/api/strava/connect">
          <Activity />
          Подключить Strava
        </Link>
      </Button>
    </div>
  );
}

interface ConnectedViewProps {
  connection: StravaConnection;
  syncPending: boolean;
  disconnectPending: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}

function ConnectedView({
  connection,
  syncPending,
  disconnectPending,
  onSync,
  onDisconnect,
}: ConnectedViewProps) {
  const lastSyncLabel = connection.lastSyncAt
    ? `последняя синхронизация: ${formatRelativeRu(connection.lastSyncAt)}`
    : "ещё не синхронизировано";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          Athlete ID: <span className="tabular-nums">{connection.athleteId}</span>
        </p>
        <p className="text-muted-foreground text-xs">{lastSyncLabel}</p>
      </div>

      {connection.needsReconnect ? (
        <ReconnectBanner />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="default" size="sm" onClick={onSync} disabled={syncPending}>
            <RefreshCw className={syncPending ? "animate-spin" : undefined} />
            {syncPending ? "Синхронизируем…" : "Синхронизировать сейчас"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            disabled={disconnectPending}
          >
            <Unlink />
            {disconnectPending ? "Отключаем…" : "Отключить"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ReconnectBanner() {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="inline-flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4" aria-hidden />
        Требуется переподключение Strava
      </p>
      <Button asChild variant="default" size="sm">
        <Link href="/api/strava/connect">
          <Activity />
          Переподключить
        </Link>
      </Button>
    </div>
  );
}

function pluralizeActivities(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "активностей";
  const last = n % 10;
  if (last === 1) return "активность";
  if (last >= 2 && last <= 4) return "активности";
  return "активностей";
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatRelativeRu(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "только что";
  if (diffMs < MINUTE) return "только что";
  if (diffMs < HOUR) {
    const n = Math.floor(diffMs / MINUTE);
    return `${n} ${pluralizeMinutes(n)} назад`;
  }
  if (diffMs < DAY) {
    const n = Math.floor(diffMs / HOUR);
    return `${n} ${pluralizeHours(n)} назад`;
  }
  const n = Math.floor(diffMs / DAY);
  return `${n} ${pluralizeDays(n)} назад`;
}

function pluralizeMinutes(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "минут";
  const last = n % 10;
  if (last === 1) return "минуту";
  if (last >= 2 && last <= 4) return "минуты";
  return "минут";
}

function pluralizeHours(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "часов";
  const last = n % 10;
  if (last === 1) return "час";
  if (last >= 2 && last <= 4) return "часа";
  return "часов";
}

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}
