# BeatYourself

Personal fitness challenges tracker. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma, NextAuth and Strava integration.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui (planned)
- **Database**: PostgreSQL (Neon / Supabase) + Prisma ORM
- **Auth**: NextAuth v5 (Auth.js) with Google OAuth + email whitelist
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: lucide-react
- **Deploy**: Render + UptimeRobot
- **Monitoring**: Sentry

## Folder structure

```
app/
  (auth)/login          public login page
  (app)/                authenticated app routes (dashboard, challenges, water, weight, profile)
  api/                  route handlers (OAuth callbacks, webhooks, cron only)
lib/
  db/                   Prisma client singleton
  auth/                 NextAuth config + session helpers
  services/             domain services (challenges, activities, streaks, water, weight)
  strava/               Strava API client + token cipher
  crypto/               AES-GCM wrapper
  validation/           shared zod schemas
  utils/                date/format helpers
actions/                server actions (thin wrappers over services)
components/
  ui/                   shadcn primitives
  features/             feature components
  layout/               navigation + layouts
prisma/                 schema.prisma, migrations, seed.ts
config/                 env.ts (zod-validated), constants
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp ../.env.example ../.env.local

# 3. Run dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Next.js dev server             |
| `npm run build`        | Production build                         |
| `npm run start`        | Start the production server              |
| `npm run lint`         | Run ESLint                               |
| `npm run format`       | Format the codebase with Prettier        |
| `npm run format:check` | Check formatting without writing changes |
| `npm run typecheck`    | Run the TypeScript compiler in noEmit    |

## Environment

See `.env.example` at the repository root for the list of required environment variables. Local values go in `.env.local` (gitignored).

## Conventions

- Server actions are the primary path for mutations. `/api/*` is reserved for Strava callbacks, webhooks and cron endpoints.
- Service layer talks to Prisma directly — no repositories.
- Streak / heatmap / progress logic lives as pure functions in `lib/services/*` for testability.
- Email whitelist is enforced in the NextAuth `signIn` callback (fail closed).
