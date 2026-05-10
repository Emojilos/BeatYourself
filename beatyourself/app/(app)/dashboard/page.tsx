import { Plus } from "lucide-react";

import { ActiveChallengesList } from "@/components/features/ActiveChallengesList";
import { ActivityForm } from "@/components/features/ActivityForm";
import { StreakBlock } from "@/components/features/StreakBlock";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id);

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
      <ActiveChallengesList challenges={data.activeChallenges} />
    </main>
  );
}
