CREATE TABLE "constellation_knowledge_selections" (
  "id" UUID NOT NULL,
  "visitor_id_hash" VARCHAR(64) NOT NULL,
  "user_id" UUID,
  "planet_id" VARCHAR(40) NOT NULL,
  "knowledge_index" INTEGER NOT NULL,
  "knowledge_text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "constellation_knowledge_selections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "constellation_knowledge_selections_visitor_id_hash_planet_id_key"
  ON "constellation_knowledge_selections"("visitor_id_hash", "planet_id");
CREATE INDEX "constellation_knowledge_selections_planet_id_knowledge_index_idx"
  ON "constellation_knowledge_selections"("planet_id", "knowledge_index");
CREATE INDEX "constellation_knowledge_selections_user_id_created_at_idx"
  ON "constellation_knowledge_selections"("user_id", "created_at");
CREATE INDEX "constellation_knowledge_selections_created_at_idx"
  ON "constellation_knowledge_selections"("created_at");
