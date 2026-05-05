import Link from "next/link";
import type { Challenge } from "@prisma/client";
import { Plus, Sparkles } from "lucide-react";

import { ChallengeCard } from "@/components/features/ChallengeCard";
import { ChallengesTabs } from "@/components/features/ChallengesTabs";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { listChallenges } from "@/lib/services/challenges";

export default async function ChallengesPage() {
  const session = await requireSession();
  const all = await listChallenges(session.user.id);

  const active = all.filter((c) => c.status === "active");
  const archive = all.filter((c) => c.status !== "active");

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Челленджи</h1>
          <p className="text-muted-foreground text-sm">Личные цели и активные вызовы.</p>
        </div>
        {all.length > 0 ? (
          <Button asChild>
            <Link href="/challenges/new">
              <Plus />
              Создать челлендж
            </Link>
          </Button>
        ) : null}
      </header>

      {all.length === 0 ? (
        <EmptyState />
      ) : (
        <ChallengesTabs
          activeCount={active.length}
          archiveCount={archive.length}
          active={
            active.length === 0 ? (
              <EmptyTabState message="Нет активных челленджей." withCta />
            ) : (
              <ChallengeGrid items={active} />
            )
          }
          archive={
            archive.length === 0 ? (
              <EmptyTabState message="Архив пока пуст." />
            ) : (
              <ChallengeGrid items={archive} />
            )
          }
        />
      )}
    </main>
  );
}

function ChallengeGrid({ items }: { items: Challenge[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card rounded-xl border border-dashed py-16 text-center">
      <Sparkles className="text-muted-foreground/60 mx-auto mb-4 size-10" />
      <p className="text-base font-medium">Пока нет челленджей.</p>
      <p className="text-muted-foreground mt-1 text-sm">Поставь первую цель!</p>
      <Button asChild className="mt-6">
        <Link href="/challenges/new">
          <Plus />
          Создать челлендж
        </Link>
      </Button>
    </div>
  );
}

function EmptyTabState({ message, withCta = false }: { message: string; withCta?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed py-12 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
      {withCta ? (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/challenges/new">Создать челлендж</Link>
        </Button>
      ) : null}
    </div>
  );
}
