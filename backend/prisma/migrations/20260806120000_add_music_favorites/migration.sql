CREATE TABLE "music_favorites" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "track_key" VARCHAR(128) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "artist" VARCHAR(255) NOT NULL,
  "source_url" TEXT NOT NULL,
  "pic_url" TEXT,
  "lrc" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "music_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "music_favorites_user_id_track_key_key" ON "music_favorites"("user_id", "track_key");
CREATE INDEX "music_favorites_user_id_created_at_idx" ON "music_favorites"("user_id", "created_at");
ALTER TABLE "music_favorites" ADD CONSTRAINT "music_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
