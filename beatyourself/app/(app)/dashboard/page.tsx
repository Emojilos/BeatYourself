import { StreakBlock } from "@/components/features/StreakBlock";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id);

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6">
      <StreakBlock current={data.streak.current} longest={data.streak.longest} />
    </main>
  );
}
