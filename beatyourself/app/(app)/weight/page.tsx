import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightChart, type WeightChartPoint } from "@/components/features/WeightChart";
import { WeightForm } from "@/components/features/WeightForm";
import { WeightHistoryList, type WeightHistoryRow } from "@/components/features/WeightHistoryList";
import { WeightTargetForm } from "@/components/features/WeightTargetForm";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getLatestWeight, getWeightTarget } from "@/lib/services/weight";
import { formatUtcDayKey } from "@/lib/utils/date-tz";

const HISTORY_LIMIT = 30;

export default async function WeightPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const now = new Date();

  const [latest, target, allLogs] = await Promise.all([
    getLatestWeight(userId),
    getWeightTarget(userId),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { measuredAt: "asc" },
      select: { id: true, weightKg: true, measuredAt: true, note: true },
    }),
  ]);

  const chartData: WeightChartPoint[] = allLogs.map((row) => ({
    date: formatUtcDayKey(row.measuredAt),
    weightKg: row.weightKg,
  }));

  const historyRows: WeightHistoryRow[] = [...allLogs]
    .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())
    .slice(0, HISTORY_LIMIT)
    .map((row) => ({
      id: row.id,
      weightKg: row.weightKg,
      measuredAt: row.measuredAt.toISOString(),
      note: row.note ?? null,
    }));

  const todayKey = formatUtcDayKey(now);

  const targetForClient = target
    ? {
        weightKg: target.weightKg,
        targetDate: target.targetDate ? target.targetDate.toISOString() : null,
      }
    : null;

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Вес</h1>
        <p className="text-muted-foreground mt-1 text-sm">Следи за весом и держи цель в фокусе.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Новое измерение</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightForm />
            <p className="text-muted-foreground mt-3 text-xs">
              Одна запись на день — повторная запись за ту же дату обновляет значение.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Цель</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightTargetForm
              currentTarget={targetForClient}
              latestWeight={latest?.value ?? null}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Динамика</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart
            data={chartData}
            todayKey={todayKey}
            target={targetForClient?.weightKg ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">История</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightHistoryList logs={historyRows} />
        </CardContent>
      </Card>
    </main>
  );
}
