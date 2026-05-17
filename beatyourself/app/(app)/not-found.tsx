import Link from "next/link";
import { Compass, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AppNotFound() {
  return (
    <main className="container mx-auto max-w-2xl p-4 sm:p-6">
      <EmptyState
        icon={Compass}
        title="Страница не найдена."
        description="Возможно, ссылка устарела или раздел был удалён."
        action={
          <Button asChild>
            <Link href="/dashboard">
              <Home />
              На главную
            </Link>
          </Button>
        }
      />
    </main>
  );
}
