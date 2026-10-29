-- #5: private weekly reflections and CooL meeting notes.
-- Additive; no changes to existing rows or identity/goal tables.

CREATE TABLE "weekly_reflection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "wentWell" VARCHAR(1500) NOT NULL DEFAULT '',
  "difficult" VARCHAR(1500) NOT NULL DEFAULT '',
  "nextStep" VARCHAR(1500) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_reflection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "weekly_reflection_nonempty" CHECK (
    LENGTH(BTRIM("wentWell")) + LENGTH(BTRIM("difficult")) + LENGTH(BTRIM("nextStep")) > 0
  ),
  CONSTRAINT "weekly_reflection_monday" CHECK (EXTRACT(ISODOW FROM "weekStart") = 1)
);
CREATE UNIQUE INDEX "weekly_reflection_userId_weekStart_key" ON "weekly_reflection"("userId", "weekStart");
CREATE INDEX "weekly_reflection_userId_weekStart_idx" ON "weekly_reflection"("userId", "weekStart" DESC);
ALTER TABLE "weekly_reflection" ADD CONSTRAINT "weekly_reflection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "meeting_note" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "meetingDate" DATE NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "notes" VARCHAR(4000) NOT NULL,
  "actionPoints" VARCHAR(2000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meeting_note_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meeting_note_nonempty_title" CHECK (LENGTH(BTRIM("title")) > 0),
  CONSTRAINT "meeting_note_nonempty_notes" CHECK (LENGTH(BTRIM("notes")) > 0)
);
CREATE INDEX "meeting_note_userId_meetingDate_idx" ON "meeting_note"("userId", "meetingDate" DESC);
ALTER TABLE "meeting_note" ADD CONSTRAINT "meeting_note_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
