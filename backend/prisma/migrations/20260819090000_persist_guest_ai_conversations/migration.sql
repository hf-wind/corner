ALTER TABLE "chat_messages" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "chat_messages" ADD COLUMN "guest_id_hash" VARCHAR(64);

CREATE INDEX "chat_messages_guest_id_hash_created_at_idx"
ON "chat_messages"("guest_id_hash", "created_at");
