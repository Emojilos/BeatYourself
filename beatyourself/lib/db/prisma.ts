import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";

// Prisma 7 requires a driver adapter. We use `@prisma/adapter-pg` against the pooled
// Neon URL (DATABASE_URL); migrations use the direct URL via prisma.config.ts.
//
// Singleton pattern: in development, Next.js HMR re-evaluates this module on every
// edit. Without caching, each reload would spawn a new PrismaClient (and a new pg
// connection pool) that the previous one never gets to release — Neon's free tier
// has a small connection ceiling and would throw "too many connections" within
// minutes. Stash the instance on globalThis so HMR reuses it.

declare global {
  var __beatyourselfPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(env.DATABASE_URL),
  });
}

export const prisma: PrismaClient = globalThis.__beatyourselfPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__beatyourselfPrisma = prisma;
}
