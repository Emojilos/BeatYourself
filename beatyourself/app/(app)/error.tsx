"use client";

import * as React from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function AppError({ error, unstable_retry }: ErrorProps) {
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="container mx-auto max-w-2xl p-4 sm:p-6">
      <EmptyState
        icon={AlertTriangle}
        title="Что-то пошло не так."
        description={
          <>
            Не удалось загрузить раздел. Попробуй ещё раз — если ошибка повторится,
            возвращайся позже.
            {error.digest ? (
              <span className="text-muted-foreground/80 mt-2 block font-mono text-xs">
                ID: {error.digest}
              </span>
            ) : null}
          </>
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => unstable_retry()}>
              <RefreshCw />
              Попробовать снова
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <Home />
                На главную
              </Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
