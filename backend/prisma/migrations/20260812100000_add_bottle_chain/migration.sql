ALTER TABLE "visitor_messages" ADD COLUMN "chain_id" UUID;
ALTER TABLE "visitor_messages" ADD COLUMN "parent_id" UUID;
CREATE INDEX "visitor_messages_chain_id_created_at_idx" ON "visitor_messages"("chain_id", "created_at");
