import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ChallengeForm } from "@/components/features/ChallengeForm";

export default function NewChallengePage() {
  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <Link
          href="/challenges"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Все челленджи
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Новый челлендж</h1>
          <p className="text-muted-foreground text-sm">
            Опиши цель, выбери метрику и срок — и приступай.
          </p>
        </div>
      </header>
      <ChallengeForm />
    </main>
  );
}
