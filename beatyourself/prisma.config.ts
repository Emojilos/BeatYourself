import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { defineConfig, env } from "prisma/config";

// `.env.local` lives at the repo root (../), not inside beatyourself/.
// Load it so DIRECT_URL is available to the schema engine for migrations.
loadEnvConfig(path.resolve(__dirname, ".."));

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Schema engine uses a direct, non-pooled connection for migrations.
    // Runtime queries use the pooled URL via the driver adapter (TASK-005).
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
