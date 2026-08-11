-- AlterTable
ALTER TABLE "chat_daily_quota" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "visitor_profiles" (
    "id" UUID NOT NULL,
    "visitor_id_hash" VARCHAR(64) NOT NULL,
    "nickname" VARCHAR(20) NOT NULL,
    "ip_hash" VARCHAR(64),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_messages" (
    "id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "content" VARCHAR(200) NOT NULL,
    "nickname" VARCHAR(20) NOT NULL,
    "visitor_id_hash" VARCHAR(64),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "ai_review" TEXT,
    "ai_review_result" VARCHAR(20),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_visits" (
    "id" UUID NOT NULL,
    "visitor_id_hash" VARCHAR(64) NOT NULL,
    "pageType" VARCHAR(30) NOT NULL,
    "target_title" VARCHAR(255),
    "target_href" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_achievements" (
    "id" UUID NOT NULL,
    "visitor_id_hash" VARCHAR(64) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visitor_profiles_visitor_id_hash_key" ON "visitor_profiles"("visitor_id_hash");

-- CreateIndex
CREATE INDEX "visitor_profiles_is_banned_last_seen_at_idx" ON "visitor_profiles"("is_banned", "last_seen_at");

-- CreateIndex
CREATE INDEX "visitor_messages_status_created_at_idx" ON "visitor_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "visitor_messages_type_status_created_at_idx" ON "visitor_messages"("type", "status", "created_at");

-- CreateIndex
CREATE INDEX "visitor_visits_visitor_id_hash_created_at_idx" ON "visitor_visits"("visitor_id_hash", "created_at");

-- CreateIndex
CREATE INDEX "visitor_visits_pageType_created_at_idx" ON "visitor_visits"("pageType", "created_at");

-- CreateIndex
CREATE INDEX "visitor_achievements_code_idx" ON "visitor_achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_achievements_visitor_id_hash_code_key" ON "visitor_achievements"("visitor_id_hash", "code");

-- CreateIndex
CREATE INDEX "posts_status_published_at_idx" ON "posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "posts_published_at_idx" ON "posts"("published_at");

-- AddForeignKey
ALTER TABLE "chat_daily_quota" ADD CONSTRAINT "chat_daily_quota_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
