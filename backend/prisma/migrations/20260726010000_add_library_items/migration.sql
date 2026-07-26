-- CreateTable
CREATE TABLE "library_items" (
    "id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "original_title" VARCHAR(255),
    "slug" VARCHAR(255) NOT NULL,
    "cover_image" TEXT,
    "creator" VARCHAR(255),
    "summary" TEXT,
    "reflection" TEXT,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "quotes" JSONB NOT NULL DEFAULT '[]',
    "genres" JSONB NOT NULL DEFAULT '[]',
    "cast" JSONB NOT NULL DEFAULT '[]',
    "publish_status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "progress_status" VARCHAR(30),
    "rating" DOUBLE PRECISION,
    "rank" INTEGER,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE,
    "finish_date" DATE,
    "release_year" INTEGER,
    "country" VARCHAR(100),
    "language" VARCHAR(100),
    "publisher" VARCHAR(255),
    "isbn" VARCHAR(30),
    "total_pages" INTEGER,
    "director" VARCHAR(255),
    "runtime_minutes" INTEGER,
    "episode_count" INTEGER,
    "platform" VARCHAR(100),
    "source_url" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "library_items_slug_key" ON "library_items"("slug");
CREATE INDEX "library_items_type_publish_status_idx" ON "library_items"("type", "publish_status");
CREATE INDEX "library_items_recommended_published_at_idx" ON "library_items"("recommended", "published_at");
