import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  async function loginWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">BeatYourself</h1>
          <p className="text-muted-foreground text-sm">Войдите, чтобы продолжить.</p>
        </div>
        <form action={loginWithGoogle}>
          <Button type="submit" className="w-full">
            Войти через Google
          </Button>
        </form>
      </div>
    </main>
  );
}
