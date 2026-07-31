ALTER TABLE "posts"
ADD COLUMN "occurred_at" TIMESTAMP(3),
ADD COLUMN "place_id" UUID,
ADD COLUMN "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
ADD COLUMN "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
ADD COLUMN "location_source" VARCHAR(20),
ADD COLUMN "location_exact_confirmed_at" TIMESTAMP(3);

ALTER TABLE "library_items"
ADD COLUMN "place_id" UUID,
ADD COLUMN "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
ADD COLUMN "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
ADD COLUMN "location_source" VARCHAR(20),
ADD COLUMN "location_exact_confirmed_at" TIMESTAMP(3);

CREATE INDEX "posts_place_id_occurred_at_idx" ON "posts"("place_id", "occurred_at");
CREATE INDEX "posts_occurred_at_idx" ON "posts"("occurred_at");
CREATE INDEX "library_items_place_id_finish_date_idx" ON "library_items"("place_id", "finish_date");

ALTER TABLE "posts"
ADD CONSTRAINT "posts_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "library_items"
ADD CONSTRAINT "library_items_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
