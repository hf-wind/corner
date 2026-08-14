ALTER TABLE "visitor_messages"
ADD COLUMN "released_at" TIMESTAMP(3),
ADD COLUMN "origin_region" VARCHAR(100),
ADD COLUMN "current_region" VARCHAR(100),
ADD COLUMN "catch_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "visitor_bottle_catches" (
  "id" UUID NOT NULL,
  "bottle_id" UUID NOT NULL,
  "catcher_visitor_id_hash" VARCHAR(64),
  "catcher_user_id" UUID,
  "catcher_region" VARCHAR(100),
  "resolution" VARCHAR(20) NOT NULL DEFAULT 'holding',
  "caught_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_at" TIMESTAMP(3),
  CONSTRAINT "visitor_bottle_catches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "visitor_bottle_catches_bottle_id_fkey"
    FOREIGN KEY ("bottle_id") REFERENCES "visitor_messages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "visitor_bottle_catches_bottle_id_caught_at_idx"
ON "visitor_bottle_catches"("bottle_id", "caught_at");

CREATE INDEX "visitor_bottle_catches_catcher_visitor_id_hash_caught_at_idx"
ON "visitor_bottle_catches"("catcher_visitor_id_hash", "caught_at");

CREATE INDEX "visitor_bottle_catches_catcher_user_id_caught_at_idx"
ON "visitor_bottle_catches"("catcher_user_id", "caught_at");

INSERT INTO "visitor_bottle_catches" (
  "id", "bottle_id", "catcher_visitor_id_hash", "resolution", "caught_at", "released_at"
)
SELECT
  "id", "id", "caught_by_id_hash", 'returned', COALESCE("caught_at", "updated_at"), CURRENT_TIMESTAMP
FROM "visitor_messages"
WHERE "type" = 'bottle' AND "status" = 'caught' AND "caught_by_id_hash" IS NOT NULL;

UPDATE "visitor_messages"
SET "status" = 'approved', "released_at" = CURRENT_TIMESTAMP
WHERE "type" = 'bottle' AND "status" = 'caught';
