ALTER TABLE "visitor_profiles" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "visitor_visits" ADD COLUMN IF NOT EXISTS "region" VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS "visitor_profiles_user_id_key" ON "visitor_profiles"("user_id");

-- A user may have rotated visitor IDs. Keep only the latest one-to-one binding.
UPDATE "visitor_profiles" SET "user_id" = NULL WHERE "user_id" IS NOT NULL;

UPDATE "visitor_profiles" AS p
SET "user_id" = ranked."user_id"
FROM (
  SELECT "visitor_id_hash", "user_id"
  FROM (
    SELECT
      "visitor_id_hash",
      "user_id",
      ROW_NUMBER() OVER (
        PARTITION BY "user_id"
        ORDER BY MAX("created_at") DESC, "visitor_id_hash"
      ) AS user_rank,
      ROW_NUMBER() OVER (
        PARTITION BY "visitor_id_hash"
        ORDER BY MAX("created_at") DESC, "user_id"
      ) AS visitor_rank
    FROM "visitor_messages"
    WHERE "user_id" IS NOT NULL AND "visitor_id_hash" IS NOT NULL
    GROUP BY "visitor_id_hash", "user_id"
  ) AS candidates
  WHERE user_rank = 1 AND visitor_rank = 1
) AS ranked
WHERE p."visitor_id_hash" = ranked."visitor_id_hash"
  AND p."user_id" IS NULL;
