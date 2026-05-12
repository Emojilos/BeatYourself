"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";

export function ProfileSignOutButton() {
  return (
    <form action={signOutAction}>
      <SignOutSubmit />
    </form>
  );
}

function SignOutSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <LogOut />
      {pending ? "Выходим…" : "Выйти"}
    </Button>
  );
}
