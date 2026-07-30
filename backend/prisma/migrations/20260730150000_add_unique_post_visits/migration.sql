ALTER TABLE "visit_stats"
ADD COLUMN "visit_key" VARCHAR(64);

CREATE UNIQUE INDEX "visit_stats_visit_key_key"
ON "visit_stats"("visit_key");
