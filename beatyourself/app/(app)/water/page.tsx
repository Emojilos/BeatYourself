import { WaterChart } from "@/components/features/WaterChart";
import { WaterGoalForm } from "@/components/features/WaterGoalForm";
import { WaterHistoryList } from "@/components/features/WaterHistoryList";
import { WaterRing } from "@/components/features/WaterRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { DEFAULT_USER_TZ } from "@/lib/services/streaks";
import { getTodayWater, listWaterByDay, listWaterToday } from "@/lib/services/water";
import { formatUserTzDayKey } from "@/lib/utils/date-tz";

export default async function WaterPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const tz = DEFAULT_USER_TZ;
  const now = new Date();

  const [today, todayLogs, byDay] = await Promise.all([
    getTodayWater(userId, tz, now),
    listWaterToday(userId, tz, now),
    listWaterByDay(userId, 90, tz, now),
  ]);

  const todayKey = formatUserTzDayKey(now, tz);

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Вода</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Отслеживай потребление воды и держи цель дня в фокусе.
        </p>
      </header>

      <Card>
        <CardContent className="flex justify-center py-8">
          <WaterRing consumed={today.consumed} goal={today.goal} size={192} portions={[250, 500]} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сегодня</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterHistoryList logs={todayLogs} tz={tz} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Цель</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterGoalForm currentGoal={today.goal} />
            <p className="text-muted-foreground mt-3 text-xs">От 100 до 20000 мл.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">История</CardTitle>
        </CardHeader>
        <CardContent>
          <WaterChart data={byDay} goal={today.goal} todayKey={todayKey} />
        </CardContent>
      </Card>
    </main>
  );
}
