CREATE TABLE "albums" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "cover_media_id" UUID,
  "author_id" UUID NOT NULL,
  "happened_at" TIMESTAMP(3),
  "place_id" UUID,
  "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
  "location_exact_confirmed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "album_items" (
  "id" UUID NOT NULL,
  "album_id" UUID NOT NULL,
  "media_id" UUID NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  "happened_at" TIMESTAMP(3),
  "place_id" UUID,
  "moment_id" UUID,
  "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
  "location_source" VARCHAR(20),
  "location_exact_confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "album_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_metadata" (
  "id" UUID NOT NULL,
  "media_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "raw_exif" JSONB,
  "captured_at" TIMESTAMP(3),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "width" INTEGER,
  "height" INTEGER,
  "camera_make" VARCHAR(120),
  "camera_model" VARCHAR(160),
  "lens_model" VARCHAR(200),
  "confirmed_captured_at" TIMESTAMP(3),
  "confirmed_place_id" UUID,
  "error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "albums_slug_key" ON "albums"("slug");
CREATE INDEX "albums_status_published_at_idx" ON "albums"("status", "published_at");
CREATE INDEX "albums_place_id_happened_at_idx" ON "albums"("place_id", "happened_at");
CREATE UNIQUE INDEX "album_items_album_id_media_id_key" ON "album_items"("album_id", "media_id");
CREATE UNIQUE INDEX "album_items_album_id_sort_key" ON "album_items"("album_id", "sort");
CREATE INDEX "album_items_place_id_happened_at_idx" ON "album_items"("place_id", "happened_at");
CREATE INDEX "album_items_moment_id_idx" ON "album_items"("moment_id");
CREATE UNIQUE INDEX "media_metadata_media_id_key" ON "media_metadata"("media_id");
CREATE INDEX "media_metadata_status_processed_at_idx" ON "media_metadata"("status", "processed_at");
CREATE INDEX "media_metadata_confirmed_place_id_idx" ON "media_metadata"("confirmed_place_id");

ALTER TABLE "albums" ADD CONSTRAINT "albums_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "albums" ADD CONSTRAINT "albums_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "albums" ADD CONSTRAINT "albums_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_moment_id_fkey" FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_metadata" ADD CONSTRAINT "media_metadata_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_metadata" ADD CONSTRAINT "media_metadata_confirmed_place_id_fkey" FOREIGN KEY ("confirmed_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
