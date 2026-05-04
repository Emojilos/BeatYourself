"use server";

import type { Challenge } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { requireSession } from "@/lib/auth/session";
import { createChallenge, deleteChallenge, updateChallenge } from "@/lib/services/challenges";
import { createChallengeSchema, updateChallengeSchema } from "@/lib/validation/challenge";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function revalidateChallengeViews(id?: string): void {
  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  if (id) {
    revalidatePath(`/challenges/${id}`);
  }
}

export async function createChallengeAction(input: unknown): Promise<ActionResult<Challenge>> {
  const session = await requireSession();

  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let challenge: Challenge;
  try {
    challenge = await createChallenge(session.user.id, parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create challenge",
    };
  }

  revalidateChallengeViews(challenge.id);
  return { success: true, data: challenge };
}

export async function updateChallengeAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Challenge>> {
  const session = await requireSession();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Challenge id is required" };
  }

  const parsed = updateChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let challenge: Challenge | null;
  try {
    challenge = await updateChallenge(session.user.id, id, parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update challenge",
    };
  }

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  revalidateChallengeViews(challenge.id);
  return { success: true, data: challenge };
}

export async function deleteChallengeAction(id: string): Promise<ActionResult<Challenge>> {
  const session = await requireSession();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Challenge id is required" };
  }

  let challenge: Challenge | null;
  try {
    challenge = await deleteChallenge(session.user.id, id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete challenge",
    };
  }

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  revalidateChallengeViews();
  return { success: true, data: challenge };
}
