import { Activity, Award, Footprints, Map, Timer, User } from "lucide-react";
import type { Difficulty } from "@prisma/client";

import { ProfileArchive } from "@/components/features/ProfileArchive";
import { ProfileSignOutButton } from "@/components/features/ProfileSignOutButton";
import { StravaSection } from "@/components/features/StravaSection";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getProfileData, type ProfileFilter, type ProfileStats } from "@/lib/services/profile";

interface ProfilePageProps {
  searchParams: Promise<{
    year?: string;
    difficulty?: string;
    strava?: string;
    reason?: string;
  }>;
}

function parseStravaCallback(value: string | undefined): "connected" | "error" | null {
  if (value === "connected") return "connected";
  if (value === "error") return "error";
  return null;
}

const DIFFICULTY_VALUES = new Set<Difficulty>(["easy", "medium", "hard"]);

function parseFilter(params: { year?: string; difficulty?: string }): ProfileFilter {
  const filter: ProfileFilter = {};
  if (params.year) {
    const y = Number.parseInt(params.year, 10);
    if (Number.isFinite(y)) filter.year = y;
  }
  if (params.difficulty && DIFFICULTY_VALUES.has(params.difficulty as Difficulty)) {
    filter.difficulty = params.difficulty as Difficulty;
  }
  return filter;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await requireSession();
  const params = await searchParams;
  const filter = parseFilter(params);

  const data = await getProfileData(session.user.id, filter);

  const fallbackName = data.user.name ?? session.user.name ?? data.user.email;
  const initial = (fallbackName || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="container mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <header className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center overflow-hidden rounded-full">
          {data.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.user.avatarUrl}
              alt={fallbackName}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xl font-semibold" aria-hidden>
              {initial}
            </span>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">{data.user.name ?? "Без имени"}</h1>
          <p className="text-muted-foreground text-sm">{data.user.email}</p>
        </div>
      </header>

      <StatsBlock stats={data.stats} />

      <StravaSection
        connection={data.stravaConnection}
        callbackStatus={parseStravaCallback(params.strava)}
        callbackReason={params.reason ?? null}
      />

      <ProfileArchive
        completed={data.completed}
        failed={data.failed}
        availableYears={data.availableYears}
        currentYear={filter.year ?? null}
        currentDifficulty={filter.difficulty ?? null}
      />

      <section
        aria-label="Действия профиля"
        className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end"
      >
        <ProfileSignOutButton />
      </section>
    </main>
  );
}

function StatsBlock({ stats }: { stats: ProfileStats }) {
  const items: { icon: typeof User; label: string; value: string }[] = [
    {
      icon: Activity,
      label: "Всего активностей",
      value: formatInteger(stats.totalActivities),
    },
    {
      icon: Map,
      label: "Дистанция, км",
      value: formatDistance(stats.totalDistanceKm),
    },
    {
      icon: Footprints,
      label: "Шагов",
      value: formatInteger(stats.totalSteps),
    },
    {
      icon: Timer,
      label: "Время, ч",
      value: formatHours(stats.totalDurationMin),
    },
    {
      icon: Award,
      label: "Текущий streak",
      value: `${stats.currentStreak} ${pluralizeDays(stats.currentStreak)}`,
    },
    {
      icon: Award,
      label: "Лучший streak",
      value: `${stats.longestStreak} ${pluralizeDays(stats.longestStreak)}`,
    },
  ];

  return (
    <section aria-label="Статистика" className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Статистика</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function formatInteger(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function formatDistance(km: number): string {
  if (km >= 100) return new Intl.NumberFormat("ru-RU").format(Math.round(km));
  return km.toFixed(1);
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}
