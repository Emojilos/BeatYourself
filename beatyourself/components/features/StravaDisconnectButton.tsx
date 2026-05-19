"use client";

import { useFormStatus } from "react-dom";
import { Unlink } from "lucide-react";

import { disconnectStravaAction } from "@/actions/strava";
import { Button } from "@/components/ui/button";

export function StravaDisconnectButton() {
  return (
    <form action={disconnectStravaAction}>
      <DisconnectSubmit />
    </form>
  );
}

function DisconnectSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <Unlink />
      {pending ? "Отключаем…" : "Отключить Strava"}
    </Button>
  );
}
