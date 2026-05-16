import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

interface HealthPayload {
  status: "ok" | "error";
  db: "ok" | "error";
  timestamp: string;
}

export async function GET(): Promise<Response> {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
  } catch (err) {
    console.error("[health] db ping failed", err);
    const body: HealthPayload = { status: "error", db: "error", timestamp };
    return Response.json(body, { status: 503 });
  }

  const body: HealthPayload = { status: "ok", db: "ok", timestamp };
  return Response.json(body, { status: 200 });
}
