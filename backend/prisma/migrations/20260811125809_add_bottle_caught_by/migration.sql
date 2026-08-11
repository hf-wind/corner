-- AlterTable
ALTER TABLE "visitor_messages" ADD COLUMN     "caught_at" TIMESTAMP(3),
ADD COLUMN     "caught_by_id_hash" VARCHAR(64);

-- CreateIndex
CREATE INDEX "visitor_messages_caught_by_id_hash_caught_at_idx" ON "visitor_messages"("caught_by_id_hash", "caught_at");
