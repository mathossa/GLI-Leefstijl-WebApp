-- Nullable extensions for guided goals and actions (#20).
ALTER TABLE "goal" ADD COLUMN "progressIndicator" VARCHAR(500);
ALTER TABLE "habit_action"
  ADD COLUMN "whenContext" VARCHAR(250),
  ADD COLUMN "confidenceScore" INTEGER,
  ADD COLUMN "existingStrength" VARCHAR(500),
  ADD COLUMN "confidenceBooster" VARCHAR(500),
  ADD COLUMN "obstacle" VARCHAR(500),
  ADD COLUMN "fallbackPlan" VARCHAR(500);
ALTER TABLE "habit_action" ADD CONSTRAINT "habit_action_confidence_score_range"
  CHECK ("confidenceScore" IS NULL OR "confidenceScore" BETWEEN 1 AND 10);
