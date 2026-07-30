CREATE TABLE "places" (
  "id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "address" TEXT,
  "city" VARCHAR(100),
  "province" VARCHAR(100),
  "country" VARCHAR(100),
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'poi',
  "cover_media_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");
CREATE INDEX "places_name_idx" ON "places"("name");
CREATE INDEX "places_city_name_idx" ON "places"("city", "name");
CREATE INDEX "places_latitude_longitude_idx" ON "places"("latitude", "longitude");

ALTER TABLE "places"
ADD CONSTRAINT "places_cover_media_id_fkey"
FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moments"
ADD COLUMN "place_id" UUID,
ADD COLUMN "happened_at" TIMESTAMP(3),
ADD COLUMN "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
ADD COLUMN "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
ADD COLUMN "location_source" VARCHAR(20),
ADD COLUMN "location_exact_confirmed_at" TIMESTAMP(3);

CREATE INDEX "moments_place_id_happened_at_idx" ON "moments"("place_id", "happened_at");
CREATE INDEX "moments_happened_at_idx" ON "moments"("happened_at");

ALTER TABLE "moments"
ADD CONSTRAINT "moments_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
