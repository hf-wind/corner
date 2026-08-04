ALTER TABLE "posts" ADD COLUMN "scheduled_at" TIMESTAMP(3);
CREATE INDEX "posts_scheduled_at_idx" ON "posts"("scheduled_at");

ALTER TABLE "albums"
  ADD COLUMN "needs_publish" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "published_snapshot" JSONB;

ALTER TABLE "library_items"
  ADD COLUMN "needs_publish" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "published_snapshot" JSONB;

UPDATE "albums" SET "needs_publish" = false WHERE "status" = 'published';
UPDATE "library_items" SET "needs_publish" = false WHERE "publish_status" = 'published';

UPDATE "library_items"
SET
  "start_date" = CASE WHEN "start_date" < DATE '2026-01-14' THEN DATE '2026-01-14' ELSE "start_date" END,
  "finish_date" = CASE WHEN "finish_date" < DATE '2026-01-14' THEN DATE '2026-01-14' ELSE "finish_date" END
WHERE "start_date" < DATE '2026-01-14' OR "finish_date" < DATE '2026-01-14';
