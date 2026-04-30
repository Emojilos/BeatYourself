-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('google', 'github');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('single_day', 'cumulative');

-- CreateEnum
CREATE TYPE "Metric" AS ENUM ('steps', 'distance_km', 'duration_min', 'runs_count', 'custom');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('active', 'completed', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('manual', 'strava');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('run', 'walk', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "provider" "AuthProvider" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "water_daily_goal_ml" INTEGER NOT NULL DEFAULT 2000,
    "water_default_portion_ml" INTEGER NOT NULL DEFAULT 250,
    "weight_target_kg" DOUBLE PRECISION,
    "weight_target_date" DATE,
    "theme" "Theme" NOT NULL DEFAULT 'light',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "type" "ChallengeType" NOT NULL,
    "metric" "Metric" NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'active',
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "color" VARCHAR(9),
    "icon" TEXT,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "ActivitySource" NOT NULL DEFAULT 'manual',
    "external_id" TEXT,
    "activity_type" "ActivityType" NOT NULL,
    "distance_km" DOUBLE PRECISION,
    "duration_min" DOUBLE PRECISION,
    "steps" INTEGER,
    "activity_date" DATE NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strava_data" JSONB,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "measured_at" DATE NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strava_integrations" (
    "user_id" UUID NOT NULL,
    "strava_athlete_id" BIGINT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_reconnect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "strava_integrations_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "users"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "challenges_user_id_status_idx" ON "challenges"("user_id", "status");

-- CreateIndex
CREATE INDEX "activities_user_id_activity_date_idx" ON "activities"("user_id", "activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "activities_external_id_source_key" ON "activities"("external_id", "source");

-- CreateIndex
CREATE INDEX "water_logs_user_id_logged_at_idx" ON "water_logs"("user_id", "logged_at");

-- CreateIndex
CREATE UNIQUE INDEX "weight_logs_user_id_measured_at_key" ON "weight_logs"("user_id", "measured_at");

-- CreateIndex
CREATE UNIQUE INDEX "strava_integrations_strava_athlete_id_key" ON "strava_integrations"("strava_athlete_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strava_integrations" ADD CONSTRAINT "strava_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
