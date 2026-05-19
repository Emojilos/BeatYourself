import { Plus } from "lucide-react";

import { ActiveChallengesList } from "@/components/features/ActiveChallengesList";
import { ActivityForm } from "@/components/features/ActivityForm";
import { ActivityHeatmap } from "@/components/features/ActivityHeatmap";
import { StreakBlock } from "@/components/features/StreakBlock";
import { WaterRing } from "@/components/features/WaterRing";
import { WeightWidget } from "@/components/features/WeightWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id);

  const weightLatestForClient = data.weightLatest
    ? {
        value: data.weightLatest.value,
        delta: data.weightLatest.delta,
        measuredAt: data.weightLatest.measuredAt.toISOString(),
      }
    : null;

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6">
      <StreakBlock current={data.streak.current} longest={data.streak.longest} />
      <ActivityForm
        trigger={
          <Button size="lg" className="w-full text-base">
            <Plus className="size-5" aria-hidden />
            Добавить активность
          </Button>
        }
      />
      <Card>
        <CardContent className="py-6">
          <WaterRing consumed={data.waterToday.consumed} goal={data.waterToday.goal} size={128} />
        </CardContent>
      </Card>
      <WeightWidget latest={weightLatestForClient} recent={data.weightRecent} />
      <ActiveChallengesList challenges={data.activeChallenges} />
      <ActivityHeatmap cells={data.heatmapData} todayKey={data.heatmapTodayKey} />
    </main>
  );
}
