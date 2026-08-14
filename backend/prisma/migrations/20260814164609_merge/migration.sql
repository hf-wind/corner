-- AddForeignKey
ALTER TABLE "visitor_messages" ADD CONSTRAINT "visitor_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
