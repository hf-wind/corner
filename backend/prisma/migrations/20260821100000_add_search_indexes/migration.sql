CREATE INDEX IF NOT EXISTS "tags_name_idx" ON "tags"("name");
CREATE INDEX IF NOT EXISTS "post_tags_tag_id_idx" ON "post_tags"("tag_id");
