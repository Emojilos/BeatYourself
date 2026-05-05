import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import type { Challenge } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

function formatRussianDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
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

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const pct =
    challenge.targetValue > 0
      ? Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
      : 0;

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      aria-label={`Челлендж «${challenge.title}»`}
    >
      <Card
        className={cn(
          "h-full transition-shadow hover:shadow-md",
          challenge.status !== "active" && "opacity-90",
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-tight">{challenge.title}</CardTitle>
            <Badge className={DIFFICULTY_CLASSNAME[challenge.difficulty]}>
              {DIFFICULTY_LABEL[challenge.difficulty]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular-nums">
              {formatNumber(challenge.currentValue)} из {formatNumber(challenge.targetValue)}{" "}
              {challenge.unit}
            </span>
            <span className="text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} aria-label={`Прогресс ${pct} процентов`} />
          <p className="text-muted-foreground text-xs">{deadlineLabel(challenge)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
