"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import type { Challenge } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface ActiveChallengesListProps {
  challenges: Challenge[];
}

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

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function deadlineLabel(endDate: Date): string {
  const days = differenceInCalendarDays(endDate, new Date());
  if (days < 0) return "Срок истёк";
  if (days === 0) return "Сегодня последний день";
  return `Осталось ${days} ${pluralizeDays(days)}`;
}

export function ActiveChallengesList({ challenges }: ActiveChallengesListProps) {
  if (challenges.length === 0) {
    return (
      <section aria-label="Активные челленджи" className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Активные челленджи</h2>
        <EmptyState
          size="compact"
          icon={Sparkles}
          title="Нет активных челленджей."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/challenges/new">
                <Plus />
                Создать?
              </Link>
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section aria-label="Активные челленджи" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Активные челленджи</h2>
        <span className="text-muted-foreground text-sm tabular-nums">{challenges.length}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => (
          <ActiveChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </section>
  );
}

function ActiveChallengeCard({ challenge }: { challenge: Challenge }) {
  const reduceMotion = useReducedMotion();
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
      <Card className="h-full transition-shadow hover:shadow-md">
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
          <div
            className="bg-secondary relative h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={`Прогресс ${pct} процентов`}
          >
            <motion.div
              className={cn("bg-primary h-full rounded-full")}
              initial={{ width: reduceMotion ? `${pct}%` : 0 }}
              animate={{ width: `${pct}%` }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                ease: "easeOut",
              }}
            />
          </div>
          <p className="text-muted-foreground text-xs">{deadlineLabel(challenge.endDate)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

