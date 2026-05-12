"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, Filter, XCircle } from "lucide-react";
import type { Challenge, Difficulty } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProfileArchiveProps {
  completed: Challenge[];
  failed: Challenge[];
  availableYears: number[];
  currentYear: number | null;
  currentDifficulty: Difficulty | null;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

const MEDAL_CLASSNAME: Record<Difficulty, string> = {
  easy: "bg-orange-100 text-orange-900 border-orange-300",
  medium: "bg-slate-100 text-slate-900 border-slate-300",
  hard: "bg-yellow-100 text-yellow-900 border-yellow-300",
};

const MEDAL_LABEL: Record<Difficulty, string> = {
  easy: "Бронза",
  medium: "Серебро",
  hard: "Золото",
};

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatRussianDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function ProfileArchive({
  completed,
  failed,
  availableYears,
  currentYear,
  currentDifficulty,
}: ProfileArchiveProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `/profile?${qs}` : "/profile", { scroll: false });
    },
    [router, searchParams],
  );

  const hasFilters = currentYear !== null || currentDifficulty !== null;

  return (
    <section aria-label="Архив челленджей" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Архив челленджей</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="text-muted-foreground size-4" aria-hidden />
          <label className="sr-only" htmlFor="archive-year-filter">
            Год
          </label>
          <select
            id="archive-year-filter"
            value={currentYear !== null ? String(currentYear) : ""}
            onChange={(e) => updateParam("year", e.target.value || null)}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="">Все годы</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="archive-difficulty-filter">
            Сложность
          </label>
          <select
            id="archive-difficulty-filter"
            value={currentDifficulty ?? ""}
            onChange={(e) => updateParam("difficulty", e.target.value || null)}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="">Любая сложность</option>
            <option value="easy">Легко</option>
            <option value="medium">Средне</option>
            <option value="hard">Сложно</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => router.push("/profile", { scroll: false })}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <XCircle className="size-3.5" />
              Сбросить
            </button>
          )}
        </div>
      </div>

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
          <TabsTrigger value="completed">Завершённые ({completed.length})</TabsTrigger>
          <TabsTrigger value="failed">Проваленные ({failed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="completed" className="mt-4">
          {completed.length === 0 ? (
            <EmptyArchiveState label="Завершённых челленджей пока нет." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((c) => (
                <CompletedChallengeCard key={c.id} challenge={c} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="failed" className="mt-4">
          {failed.length === 0 ? (
            <EmptyArchiveState label="Проваленных челленджей нет." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {failed.map((c) => (
                <FailedChallengeCard key={c.id} challenge={c} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function CompletedChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-tight">{challenge.title}</CardTitle>
          <Badge
            className={cn(
              "inline-flex items-center gap-1 border",
              MEDAL_CLASSNAME[challenge.difficulty],
            )}
          >
            <Award className="size-3.5" />
            {MEDAL_LABEL[challenge.difficulty]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium tabular-nums">
          {formatNumber(challenge.currentValue)} {challenge.unit}
        </p>
        <p className="text-muted-foreground text-xs">
          {challenge.completedAt
            ? `Завершён ${formatRussianDate(challenge.completedAt)}`
            : `Окончание ${formatRussianDate(challenge.endDate)}`}
        </p>
        <p className="text-muted-foreground text-xs">
          Сложность: {DIFFICULTY_LABEL[challenge.difficulty]}
        </p>
      </CardContent>
    </Card>
  );
}

function FailedChallengeCard({ challenge }: { challenge: Challenge }) {
  const pct =
    challenge.targetValue > 0
      ? Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
      : 0;
  return (
    <Card className="h-full opacity-90">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-tight">{challenge.title}</CardTitle>
          <Badge className="bg-red-50 text-red-900 hover:bg-red-50">Не выполнен</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
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
          <div className="h-full rounded-full bg-red-400/70" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-muted-foreground text-xs">
          Срок истёк {formatRussianDate(challenge.endDate)}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyArchiveState({ label }: { label: string }) {
  return (
    <div className="bg-card rounded-xl border border-dashed py-10 text-center">
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
