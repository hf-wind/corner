ALTER TABLE "visitor_profiles" ADD COLUMN "user_id" UUID;
ALTER TABLE "visitor_visits" ADD COLUMN "region" VARCHAR(100);

CREATE UNIQUE INDEX "visitor_profiles_user_id_key" ON "visitor_profiles"("user_id");

-- Backfill the latest known account for each visitor profile.
UPDATE "visitor_profiles" AS p
SET "user_id" = sub."user_id"
FROM (
  SELECT DISTINCT ON ("visitor_id_hash") "visitor_id_hash", "user_id"
  FROM "visitor_messages"
  WHERE "user_id" IS NOT NULL
  ORDER BY "visitor_id_hash", "created_at" DESC
) AS sub
WHERE p."visitor_id_hash" = sub."visitor_id_hash"
  AND p."user_id" IS NULL;
