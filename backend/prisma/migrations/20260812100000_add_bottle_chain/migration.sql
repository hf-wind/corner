ALTER TABLE "visitor_messages" ADD COLUMN "chain_id" UUID;
ALTER TABLE "visitor_messages" ADD COLUMN "parent_id" UUID;
-- 存量瓶子回填链根：老瓶子 chainId 为 NULL，用自身 id 作链根（spec：首瓶用自身 id 作链根）
UPDATE "visitor_messages" SET "chain_id" = "id" WHERE "chain_id" IS NULL AND "type" = 'bottle';
CREATE INDEX "visitor_messages_chain_id_created_at_idx" ON "visitor_messages"("chain_id", "created_at");
