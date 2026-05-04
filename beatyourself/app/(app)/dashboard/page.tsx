import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Hello, {session.user.name ?? session.user.email ?? "user"}.
      </p>
    </main>
  );
}
