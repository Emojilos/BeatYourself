import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";

export async function getSession() {
  return auth();
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}
