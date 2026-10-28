-- Issue #4: persistent goals, recurring actions and weekly snapshots.
-- No existing user/session data is modified.

CREATE TYPE "GoalArea" AS ENUM ('BEWEGING', 'VOEDING', 'SLAAP', 'ONTSPANNING', 'SOCIAAL', 'ANDERS');
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "goal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "motivation" VARCHAR(1000) NOT NULL,
  "area" "GoalArea" NOT NULL,
  "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" DATE,
  "endDate" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "goal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "goal_valid_dates" CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate")
);

CREATE UNIQUE INDEX "goal_id_userId_key" ON "goal"("id", "userId");
CREATE INDEX "goal_userId_status_idx" ON "goal"("userId", "status");
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "habit_action" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "targetPerWeek" INTEGER NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "habit_action_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "habit_action_frequency_range" CHECK ("targetPerWeek" BETWEEN 1 AND 7)
);

CREATE UNIQUE INDEX "habit_action_id_userId_key" ON "habit_action"("id", "userId");
CREATE INDEX "habit_action_userId_goalId_idx" ON "habit_action"("userId", "goalId");
ALTER TABLE "habit_action" ADD CONSTRAINT "habit_action_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit_action" ADD CONSTRAINT "habit_action_goalId_userId_fkey"
  FOREIGN KEY ("goalId", "userId") REFERENCES "goal"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "habit_week_progress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "targetCount" INTEGER NOT NULL,
  "completedCount" INTEGER NOT NULL DEFAULT 0,
  "note" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "habit_week_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "habit_week_target_range" CHECK ("targetCount" BETWEEN 1 AND 7),
  CONSTRAINT "habit_week_completed_range" CHECK ("completedCount" >= 0 AND "completedCount" <= "targetCount")
);

CREATE UNIQUE INDEX "habit_week_progress_actionId_weekStart_key"
  ON "habit_week_progress"("actionId", "weekStart");
CREATE INDEX "habit_week_progress_userId_weekStart_idx"
  ON "habit_week_progress"("userId", "weekStart");
ALTER TABLE "habit_week_progress" ADD CONSTRAINT "habit_week_progress_actionId_userId_fkey"
  FOREIGN KEY ("actionId", "userId") REFERENCES "habit_action"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
