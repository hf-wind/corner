CREATE TABLE "visitor_events" (
  "id" UUID NOT NULL,
  "visitor_id_hash" VARCHAR(64) NOT NULL,
  "user_id" UUID,
  "session_id" VARCHAR(64),
  "identity" VARCHAR(20) NOT NULL DEFAULT 'anonymous',
  "action" VARCHAR(40) NOT NULL,
  "path" TEXT,
  "content_type" VARCHAR(40),
  "source_id" VARCHAR(180),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visitor_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "visitor_events_visitor_id_hash_created_at_idx" ON "visitor_events"("visitor_id_hash", "created_at");
CREATE INDEX "visitor_events_user_id_created_at_idx" ON "visitor_events"("user_id", "created_at");
CREATE INDEX "visitor_events_action_created_at_idx" ON "visitor_events"("action", "created_at");
CREATE INDEX "visitor_events_content_type_created_at_idx" ON "visitor_events"("content_type", "created_at");
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
