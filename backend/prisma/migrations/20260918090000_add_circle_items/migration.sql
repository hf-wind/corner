-- 风讯角条目入库：RSS 抓取后持久化，支持时间与来源维度筛选
CREATE TABLE "circle_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_key" VARCHAR(120) NOT NULL,
    "source_title" VARCHAR(120) NOT NULL,
    "guid_hash" VARCHAR(64) NOT NULL,
    "link" VARCHAR(600) NOT NULL,
    "title" VARCHAR(400) NOT NULL,
    "summary" TEXT,
    "author" VARCHAR(120),
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circle_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "circle_items_source_key_guid_hash_key" ON "circle_items"("source_key", "guid_hash");
CREATE INDEX "circle_items_published_at_idx" ON "circle_items"("published_at");
CREATE INDEX "circle_items_source_key_published_at_idx" ON "circle_items"("source_key", "published_at");
