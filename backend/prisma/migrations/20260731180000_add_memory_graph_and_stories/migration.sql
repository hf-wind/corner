CREATE TABLE "memory_nodes" (
  "id" VARCHAR(180) NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "source_id" VARCHAR(100) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255),
  "excerpt" TEXT,
  "href" TEXT NOT NULL,
  "image" TEXT,
  "occurred_at" TIMESTAMP(3),
  "place_id" UUID,
  "coordinate_seed" INTEGER NOT NULL,
  "content_hash" VARCHAR(64) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memory_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memory_relations" (
  "id" VARCHAR(64) NOT NULL,
  "source_id" VARCHAR(180) NOT NULL,
  "target_id" VARCHAR(180) NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "origin" VARCHAR(20) NOT NULL DEFAULT 'automatic',
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memory_relations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journeys" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "cover_image" TEXT,
  "author_id" UUID NOT NULL,
  "happened_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journey_stops" (
  "id" UUID NOT NULL,
  "journey_id" UUID NOT NULL,
  "place_id" UUID,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "title" VARCHAR(255) NOT NULL,
  "narration" TEXT,
  "occurred_at" TIMESTAMP(3),
  "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
  "location_exact_confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journey_stops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_routes" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "share_token" VARCHAR(64) NOT NULL,
  "cover_image" TEXT,
  "journey_id" UUID,
  "author_id" UUID NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "story_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_steps" (
  "id" UUID NOT NULL,
  "route_id" UUID NOT NULL,
  "node_id" VARCHAR(180),
  "place_id" UUID,
  "photo_media_id" UUID,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "title" VARCHAR(255),
  "narration" TEXT,
  "music_url" TEXT,
  "music_start_sec" DOUBLE PRECISION,
  "music_end_sec" DOUBLE PRECISION,
  "duration_sec" INTEGER NOT NULL DEFAULT 8,
  "location_visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  "location_precision" VARCHAR(20) NOT NULL DEFAULT 'place',
  "location_exact_confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "story_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memory_nodes_type_source_id_key" ON "memory_nodes"("type", "source_id");
CREATE INDEX "memory_nodes_type_occurred_at_idx" ON "memory_nodes"("type", "occurred_at");
CREATE INDEX "memory_nodes_place_id_idx" ON "memory_nodes"("place_id");
CREATE UNIQUE INDEX "memory_relations_source_id_target_id_type_origin_key" ON "memory_relations"("source_id", "target_id", "type", "origin");
CREATE INDEX "memory_relations_source_id_hidden_status_idx" ON "memory_relations"("source_id", "hidden", "status");
CREATE INDEX "memory_relations_target_id_hidden_status_idx" ON "memory_relations"("target_id", "hidden", "status");
CREATE INDEX "memory_relations_origin_status_idx" ON "memory_relations"("origin", "status");
CREATE UNIQUE INDEX "journeys_slug_key" ON "journeys"("slug");
CREATE INDEX "journeys_status_published_at_idx" ON "journeys"("status", "published_at");
CREATE UNIQUE INDEX "journey_stops_journey_id_sort_key" ON "journey_stops"("journey_id", "sort");
CREATE INDEX "journey_stops_place_id_idx" ON "journey_stops"("place_id");
CREATE UNIQUE INDEX "story_routes_slug_key" ON "story_routes"("slug");
CREATE UNIQUE INDEX "story_routes_share_token_key" ON "story_routes"("share_token");
CREATE INDEX "story_routes_status_published_at_idx" ON "story_routes"("status", "published_at");
CREATE UNIQUE INDEX "story_steps_route_id_sort_key" ON "story_steps"("route_id", "sort");
CREATE INDEX "story_steps_node_id_idx" ON "story_steps"("node_id");

ALTER TABLE "memory_nodes" ADD CONSTRAINT "memory_nodes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "memory_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "memory_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journey_stops" ADD CONSTRAINT "journey_stops_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journey_stops" ADD CONSTRAINT "journey_stops_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "story_routes" ADD CONSTRAINT "story_routes_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "story_routes" ADD CONSTRAINT "story_routes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "story_steps" ADD CONSTRAINT "story_steps_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "story_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_steps" ADD CONSTRAINT "story_steps_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "memory_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "story_steps" ADD CONSTRAINT "story_steps_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "story_steps" ADD CONSTRAINT "story_steps_photo_media_id_fkey" FOREIGN KEY ("photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
