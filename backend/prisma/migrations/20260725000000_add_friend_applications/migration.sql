-- CreateTable
CREATE TABLE "friend_applications" (
    "id" UUID NOT NULL,
    "site_name" VARCHAR(100) NOT NULL,
    "site_url" TEXT NOT NULL,
    "site_avatar" TEXT,
    "site_description" TEXT,
    "site_rss_url" TEXT,
    "contact_email" VARCHAR(255) NOT NULL,
    "friend_page_url" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "ai_review" TEXT,
    "ai_review_result" VARCHAR(20),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_applications_pkey" PRIMARY KEY ("id")
);
