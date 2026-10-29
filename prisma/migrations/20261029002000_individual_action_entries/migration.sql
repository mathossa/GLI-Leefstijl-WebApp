-- Add individual completion entries without modifying or dropping existing weekly counts.
-- Older aggregate registrations keep their counts; they are not backfilled with invented timestamps.
CREATE UNIQUE INDEX "habit_week_progress_id_userId_key" ON "habit_week_progress"("id", "userId");

CREATE TABLE "habit_week_entry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rating" VARCHAR(12),
  "note" VARCHAR(500),
  CONSTRAINT "habit_week_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "habit_week_entry_rating_check" CHECK ("rating" IS NULL OR "rating" IN ('GOED','REDELIJK','LASTIG'))
);
CREATE INDEX "habit_week_entry_userId_weekId_createdAt_idx"
  ON "habit_week_entry"("userId", "weekId", "createdAt");
ALTER TABLE "habit_week_entry" ADD CONSTRAINT "habit_week_entry_weekId_userId_fkey"
  FOREIGN KEY ("weekId", "userId") REFERENCES "habit_week_progress"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
