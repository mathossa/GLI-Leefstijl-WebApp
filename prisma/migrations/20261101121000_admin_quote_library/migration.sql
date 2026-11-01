-- Online-compatible library update; existing 30 starter quotes retained.
ALTER TABLE "motivation_quote" ADD COLUMN "normalizedText" VARCHAR(300);
UPDATE "motivation_quote"
  SET "normalizedText" = lower(regexp_replace(btrim("text"), '[[:space:]]+', ' ', 'g'));
ALTER TABLE "motivation_quote" ALTER COLUMN "normalizedText" SET NOT NULL;
CREATE UNIQUE INDEX "motivation_quote_normalizedText_key"
  ON "motivation_quote"("normalizedText");
ALTER TABLE "motivation_quote" ADD COLUMN "deletedAt" TIMESTAMP(3);
-- Who, what and when for quote management; never audit private user-defined text.
ALTER TABLE "admin_audit" ADD COLUMN "targetId" VARCHAR(128);
