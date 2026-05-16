# Deploy: Render + Neon + UptimeRobot

End-to-end production deploy for **BeatYourself**. The Next.js app lives in
`beatyourself/` — Render's `rootDir` setting handles that.

| Component          | Provider                               | Free tier? |
| ------------------ | -------------------------------------- | ---------- |
| Postgres           | [Neon](https://neon.tech)              | yes        |
| Web service        | [Render](https://render.com)           | yes        |
| Cron jobs (×2)     | Render Cron Jobs                       | paid only  |
| Uptime / pinging   | [UptimeRobot](https://uptimerobot.com) | yes        |

> Render's Free plan does **not** include Cron Jobs. If you must stay free,
> either skip the cron services and call `/api/cron/*` manually, or use an
> external scheduler (e.g. GitHub Actions, cron-job.org) to POST the two
> endpoints — see [§ 5b. Cron alternative](#5b-cron-alternative-github-actions).

---

## 1. Create the Neon project

1. Sign in at <https://console.neon.tech> and create a new project.
2. Pick the region closest to your Render region (matters for latency — the
   web service round-trips Neon on every page load).
3. Copy two connection strings from **Connection Details**:
   - **Pooled** (port `6543` or labelled "Pooler") → `DATABASE_URL`
     (used by the app's runtime via `@prisma/adapter-pg`).
   - **Direct** (port `5432`) → `DATABASE_URL_DIRECT`
     (used only by `prisma migrate` — see `beatyourself/prisma.config.ts`).
4. From your laptop, apply migrations against the new database:

   ```bash
   cd beatyourself
   DATABASE_URL="<direct-url>" npx prisma migrate deploy
   ```

---

## 2. Create the Render Web Service

### Option A — Blueprint (`render.yaml`)

The repo ships a [`render.yaml`](./render.yaml) at the root. In Render:

1. **New** → **Blueprint** → connect this Git repo.
2. Render reads `render.yaml` and offers to create:
   - `beatyourself-web` (Web Service)
   - `beatyourself-check-deadlines` (Cron Job, daily)
   - `beatyourself-strava-sync` (Cron Job, hourly)
3. Click **Apply**, then fill in the environment variables Render flagged
   as `sync: false` (see § 3).

### Option B — Manual

1. **New** → **Web Service** → pick this repo.
2. Settings:
   - **Root Directory**: `beatyourself`
   - **Runtime**: Node
   - **Build Command**: `npm ci && npx prisma generate && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
3. Add environment variables (§ 3).
4. **Create Web Service**.

---

## 3. Environment variables

Set these on the web service (and copy `CRON_SECRET` + `APP_URL` to the
cron services if you use them).

| Variable               | Required | Notes                                                                                              |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | Neon **pooled** URL (port 6543).                                                                   |
| `NEXTAUTH_SECRET`      | yes      | `openssl rand -base64 32`.                                                                         |
| `NEXTAUTH_URL`         | yes      | Public URL Render assigns, e.g. `https://beatyourself.onrender.com`.                               |
| `GOOGLE_CLIENT_ID`     | yes      | From Google Cloud Console → OAuth 2.0 Client.                                                      |
| `GOOGLE_CLIENT_SECRET` | yes      | Same OAuth client.                                                                                 |
| `ALLOWED_EMAIL`        | optional | Whitelisted Google account; the app is single-user.                                                |
| `STRAVA_CLIENT_ID`     | optional | Required only if Strava integration is enabled.                                                    |
| `STRAVA_CLIENT_SECRET` | optional | Same.                                                                                              |
| `STRAVA_REDIRECT_URI`  | optional | `https://<your-domain>/api/strava/callback`.                                                       |
| `ENCRYPTION_KEY`       | optional | 32 bytes for Strava token cipher: `openssl rand -hex 32`. Required if Strava is configured.        |
| `CRON_SECRET`          | yes      | Bearer token enforced by `/api/cron/*`: `openssl rand -hex 32`.                                    |
| `SENTRY_DSN`           | optional | Wired by TASK-039.                                                                                 |

After saving env vars on an existing Render service, trigger a manual
**Deploy** so the new values are picked up.

### Google OAuth redirect URI

In Google Cloud Console → your OAuth client → **Authorized redirect URIs**,
add `https://<your-render-domain>/api/auth/callback/google` **before** the
first sign-in attempt.

---

## 4. UptimeRobot ping

1. Create an account at <https://uptimerobot.com> (free tier = 50 monitors,
   5-minute interval).
2. **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `beatyourself /api/health`
   - **URL**: `https://<your-render-domain>/api/health`
   - **Monitoring Interval**: `5 minutes`
3. (Optional) Configure an alert contact — email/SMS/Telegram — under
   **My Settings** → **Alert Contacts**, then attach it to the monitor.

The endpoint returns:

- `200 { "status": "ok", "db": "ok", "timestamp": "..." }` when the app
  reaches Postgres.
- `503 { "status": "error", "db": "error", "timestamp": "..." }` if the
  DB ping (`SELECT 1`) throws.

UptimeRobot also keeps a free Render Web Service warm — without external
traffic, Render free-tier instances spin down after ~15 minutes of idle.

---

## 5. Cron jobs

The app exposes two cron endpoints — both POST, both gated by
`Authorization: Bearer $CRON_SECRET`:

| Endpoint                    | Cadence                 | What it does                                                                                                       |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/api/cron/check-deadlines` | Daily, e.g. `0 3 * * *` | Marks `active` challenges past their `end_date` whose `current_value < target_value` as `failed`.                  |
| `/api/cron/strava-sync`     | Hourly, `0 * * * *`     | Pulls recent Strava activities for every connected user.                                                           |

### 5a. Render Cron Jobs (recommended)

`render.yaml` provisions both as `type: cron` services that shell out via
`curl`. Cross-service env access is not automatic on Render — paste the
public web URL into each cron's `APP_URL` env var (Render dashboard →
the cron service → Environment).

Schedules are UTC. `0 3 * * *` ("03:00 UTC daily") for `check-deadlines`
runs before most users wake up. `0 * * * *` ("top of every hour") for
`strava-sync` matches Strava's ~hourly activity-creation cadence.

### 5b. Cron alternative: GitHub Actions

If you cannot use Render Cron (free plan), commit a workflow at
`.github/workflows/cron.yml`:

```yaml
name: cron
on:
  schedule:
    - cron: "0 3 * * *"   # check-deadlines
    - cron: "0 * * * *"   # strava-sync
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: check-deadlines
        if: github.event.schedule == '0 3 * * *'
        run: |
          curl -fsS -X POST "${{ secrets.APP_URL }}/api/cron/check-deadlines" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      - name: strava-sync
        if: github.event.schedule == '0 * * * *'
        run: |
          curl -fsS -X POST "${{ secrets.APP_URL }}/api/cron/strava-sync" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `APP_URL` and `CRON_SECRET` under **Repo settings → Secrets and
variables → Actions**. GitHub-hosted cron has best-effort timing and can
skew by several minutes — acceptable for hourly/daily jobs.

---

## 6. First deploy checklist

- [ ] Neon project created, migrations applied, both URLs copied.
- [ ] Web service builds green (Render logs).
- [ ] `https://<domain>/api/health` returns `200 {"status":"ok"}`.
- [ ] Google OAuth redirect URI registered with the public URL.
- [ ] Sign in with `ALLOWED_EMAIL` lands on `/dashboard`.
- [ ] Manual curl of `/api/cron/check-deadlines` with the bearer token
      returns `200` (anything else means `CRON_SECRET` is wrong/missing).
- [ ] UptimeRobot monitor shows green.
- [ ] (If Strava is wired) `/profile` → Connect → returns to
      `?strava=connected`.

---

## Troubleshooting

- **`/api/health` returns 503**: Render web service can't reach Neon. Check
  `DATABASE_URL` (must be the **pooled** URL), Neon project status, and
  that Render's egress IPs are not blocked. Render dashboard → Logs will
  print `[health] db ping failed <err>`.
- **`Invalid environment variables`** at boot: `beatyourself/config/env.ts`
  throws on first import if any required var is missing. The exact field
  is logged just above the throw.
- **`Unauthorized` from `/api/cron/*`**: Bearer token mismatch — compare
  the cron service's `CRON_SECRET` to the web service's.
- **Strava 401 / `reconnect_required`**: refresh token expired or was
  invalidated. The user re-connects from `/profile`; no operator action.
- **Free-tier cold starts**: first request after idle takes 30–60 s.
  UptimeRobot's 5-minute ping keeps the dyno warm during expected use
  windows.
