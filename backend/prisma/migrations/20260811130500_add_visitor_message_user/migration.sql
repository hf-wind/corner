-- AlterTable
ALTER TABLE "visitor_messages" ADD COLUMN "user_id" UUID;

-- CreateIndex
CREATE INDEX "visitor_messages_user_id_created_at_idx" ON "visitor_messages"("user_id", "created_at");
