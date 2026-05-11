import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EditChallengeForm } from "@/components/features/EditChallengeForm";
import { requireSession } from "@/lib/auth/session";
import { getChallenge } from "@/lib/services/challenges";

interface EditChallengePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChallengePage({ params }: EditChallengePageProps) {
  const session = await requireSession();
  const { id } = await params;

  const challenge = await getChallenge(session.user.id, id);
  if (!challenge) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <Link
          href={`/challenges/${challenge.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />К челленджу
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Редактирование челленджа</h1>
          <p className="text-muted-foreground text-sm">
            Можно изменить описание, дату окончания, оформление и статус.
          </p>
        </div>
      </header>
      <EditChallengeForm challenge={challenge} />
    </main>
  );
}
