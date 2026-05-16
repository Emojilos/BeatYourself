import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { CheckCircle2, ChevronLeft, Flag, Target, XCircle } from "lucide-react";
import type { Activity, Challenge } from "@prisma/client";

import { ChallengeDetailActions } from "@/components/features/ChallengeDetailActions";
import { ChallengeProgressChart } from "@/components/features/ChallengeProgressChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireSession } from "@/lib/auth/session";
import { listActivities } from "@/lib/services/activities";
import { buildDailySeries } from "@/lib/services/challenge-progress";
import { getChallenge } from "@/lib/services/challenges";
import { formatUtcDayKey } from "@/lib/utils/date-tz";
import { cn } from "@/lib/utils";

const DIFFICULTY_LABEL: Record<Challenge["difficulty"], string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

const DIFFICULTY_CLASSNAME: Record<Challenge["difficulty"], string> = {
  easy: "bg-green-100 text-green-900 hover:bg-green-100",
  medium: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  hard: "bg-red-100 text-red-900 hover:bg-red-100",
};

const STATUS_LABEL: Record<Challenge["status"], string> = {
  active: "Активный",
  completed: "Завершён",
  failed: "Не выполнен",
  archived: "В архиве",
};

const STATUS_CLASSNAME: Record<Challenge["status"], string> = {
  active: "bg-primary/10 text-primary hover:bg-primary/10",
  completed: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  failed: "bg-red-100 text-red-900 hover:bg-red-100",
  archived: "bg-muted text-muted-foreground hover:bg-muted",
};

const TYPE_LABEL: Record<Challenge["type"], string> = {
  cumulative: "Накопительный",
  single_day: "За один день",
};

const METRIC_LABEL: Record<Challenge["metric"], string> = {
  steps: "Шаги",
  distance_km: "Дистанция",
  duration_min: "Время",
  runs_count: "Количество пробежек",
  custom: "Произвольная метрика",
};

const ACTIVITY_TYPE_LABEL: Record<Activity["activityType"], string> = {
  run: "Бег",
  walk: "Ходьба",
  other: "Другое",
};

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

function pluralizeActivities(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "активностей";
  const last = n % 10;
  if (last === 1) return "активность";
  if (last >= 2 && last <= 4) return "активности";
  return "активностей";
}

function formatRussianDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return new Intl.NumberFormat("ru-RU").format(n);
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

function deadlineLabel(challenge: Challenge): string {
  if (challenge.status === "completed") {
    return challenge.completedAt
      ? `Завершён ${formatRussianDate(challenge.completedAt)}`
      : "Завершён";
  }
  if (challenge.status === "failed") return "Не выполнен";
  if (challenge.status === "archived") return "В архиве";

  const days = differenceInCalendarDays(challenge.endDate, new Date());
  if (days < 0) return "Срок истёк";
  if (days === 0) return "Сегодня последний день";
  return `Осталось ${days} ${pluralizeDays(days)}`;
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

interface ChallengeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengeDetailPage({ params }: ChallengeDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;

  const challenge = await getChallenge(session.user.id, id);
  if (!challenge) notFound();

  const activities = await listActivities(session.user.id, {
    from: challenge.startDate,
    to: challenge.endDate,
  });

  const series = buildDailySeries(challenge, activities);
  const todayKey = formatUtcDayKey(new Date());
  const pct =
    challenge.targetValue > 0
      ? Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
      : 0;
  const remaining = Math.max(0, challenge.targetValue - challenge.currentValue);

  const statusIcon =
    challenge.status === "completed" ? (
      <CheckCircle2 className="size-5 text-emerald-600" />
    ) : challenge.status === "failed" ? (
      <XCircle className="size-5 text-red-600" />
    ) : challenge.status === "archived" ? (
      <Flag className="text-muted-foreground size-5" />
    ) : (
      <Target className="text-primary size-5" />
    );

  return (
    <main className="container mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-3">
        <Link
          href="/challenges"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />К челленджам
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {challenge.color ? (
              <span
                aria-hidden
                className="mt-1 inline-block size-4 shrink-0 rounded-full"
                style={{ backgroundColor: challenge.color }}
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{challenge.title}</h1>
              {challenge.description ? (
                <p className="text-muted-foreground mt-1 text-sm">{challenge.description}</p>
              ) : null}
            </div>
          </div>
          <Badge className={DIFFICULTY_CLASSNAME[challenge.difficulty]}>
            {DIFFICULTY_LABEL[challenge.difficulty]}
          </Badge>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="font-normal">
            {TYPE_LABEL[challenge.type]}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {METRIC_LABEL[challenge.metric]}
          </Badge>
          <Badge className={cn("font-normal", STATUS_CLASSNAME[challenge.status])}>
            {STATUS_LABEL[challenge.status]}
          </Badge>
          <span>·</span>
          <span>
            {formatRussianDate(challenge.startDate)} — {formatRussianDate(challenge.endDate)}
          </span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {statusIcon}
              Прогресс
            </CardTitle>
            <span className="text-muted-foreground text-xs">{deadlineLabel(challenge)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-foreground text-4xl font-semibold tabular-nums">
              {formatNumber(challenge.currentValue)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              из {formatNumber(challenge.targetValue)} {challenge.unit}
            </span>
            <span className="text-primary ml-auto text-2xl font-semibold tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} aria-label={`Прогресс ${pct} процентов`} />
          {challenge.status === "active" && remaining > 0 ? (
            <p className="text-muted-foreground text-xs">
              Осталось {formatNumber(remaining)} {challenge.unit} до цели.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {challenge.type === "cumulative" ? "Накопление прогресса" : "Лучший результат по дням"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChallengeProgressChart
            type={challenge.type}
            target={challenge.targetValue}
            unit={challenge.unit}
            series={series}
            todayKey={todayKey}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Активности · {activities.length} {pluralizeActivities(activities.length)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              В периоде челленджа пока нет активностей. Добавь первую, чтобы увидеть прогресс.
            </p>
          ) : (
            <ul className="space-y-3">
              {activities.map((activity) => {
                const pace = formatPace(activity.distanceKm, activity.durationMin);
                return (
                  <li key={activity.id} className="bg-muted/30 rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {ACTIVITY_TYPE_LABEL[activity.activityType]}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatRussianDate(activity.activityDate)}
                        {activity.source === "strava" ? " · Strava" : ""}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
                      {activity.distanceKm != null ? (
                        <span>{formatNumber(activity.distanceKm)} км</span>
                      ) : null}
                      {activity.durationMin != null ? (
                        <span>{Math.round(activity.durationMin)} мин</span>
                      ) : null}
                      {activity.steps != null ? (
                        <span>{formatNumber(activity.steps)} шагов</span>
                      ) : null}
                      {pace ? <span>{pace}</span> : null}
                    </div>
                    {activity.note ? (
                      <p className="text-foreground mt-2 text-xs">{activity.note}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ChallengeDetailActions challenge={challenge} />
    </main>
  );
}
