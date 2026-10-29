-- Private CooL meeting photo metadata. Existing notes are preserved.
-- Allow a photo-only meeting without a compulsory text transcription.
ALTER TABLE "meeting_note" DROP CONSTRAINT IF EXISTS "meeting_note_nonempty_notes";
CREATE UNIQUE INDEX "meeting_note_id_userId_key" ON "meeting_note"("id", "userId");
CREATE TABLE "meeting_photo" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "fileName" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_photo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "meeting_photo_userId_meetingId_idx" ON "meeting_photo"("userId", "meetingId");
ALTER TABLE "meeting_photo" ADD CONSTRAINT "meeting_photo_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_photo" ADD CONSTRAINT "meeting_photo_meetingId_userId_fkey"
  FOREIGN KEY ("meetingId", "userId") REFERENCES "meeting_note"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
