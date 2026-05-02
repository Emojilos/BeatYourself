import { timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request): Promise<Response> {
  if (!env.CRON_SECRET) {
    return Response.json({ error: "Cron not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !isValidBearer(authHeader, env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await prisma.$executeRaw(Prisma.sql`
    UPDATE challenges
    SET status = 'failed'
    WHERE status = 'active'
      AND end_date < CURRENT_DATE
      AND current_value < target_value
  `);

  return Response.json({ processed });
}

function isValidBearer(header: string, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  const actualBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
