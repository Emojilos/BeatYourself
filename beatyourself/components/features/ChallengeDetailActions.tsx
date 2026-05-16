"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Challenge } from "@prisma/client";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteChallengeAction, updateChallengeAction } from "@/actions/challenges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChallengeDetailActionsProps {
  challenge: Challenge;
}

export function ChallengeDetailActions({ challenge }: ChallengeDetailActionsProps) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const isArchived = challenge.status === "archived";

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const result = await updateChallengeAction(challenge.id, { status: "archived" });
      if (result.success) {
        toast.success("Челлендж отправлен в архив");
        setArchiveOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteChallengeAction(challenge.id);
      if (result.success) {
        toast.success("Челлендж удалён");
        router.push("/challenges");
        router.refresh();
      } else {
        toast.error(result.error);
        setDeleting(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить челлендж");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href={`/challenges/${challenge.id}/edit`}>
            <Pencil className="size-4" />
            Редактировать
          </Link>
        </Button>
        {isArchived ? null : (
          <Button variant="outline" onClick={() => setArchiveOpen(true)}>
            <Archive className="size-4" />
            Архивировать
          </Button>
        )}
        <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="sm:ml-auto">
          <Trash2 className="size-4" />
          Удалить
        </Button>
      </div>

      <Dialog
        open={archiveOpen}
        onOpenChange={(open) => {
          if (!archiving) setArchiveOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отправить в архив?</DialogTitle>
            <DialogDescription>
              «{challenge.title}» переедет в архив и больше не будет учитываться в активных
              челленджах. Связанные активности останутся.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={archiving}>
              Отмена
            </Button>
            <Button onClick={handleArchive} disabled={archiving}>
              {archiving ? "Архивируем…" : "В архив"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить челлендж?</DialogTitle>
            <DialogDescription>
              «{challenge.title}» будет удалён. Связанные активности останутся в истории.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Удаляем…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
