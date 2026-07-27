ALTER TABLE "posts"
ADD COLUMN IF NOT EXISTS "needs_publish" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "posts"
ADD COLUMN IF NOT EXISTS "published_snapshot" JSONB;

UPDATE "posts" AS p
SET
  "needs_publish" = false,
  "published_snapshot" = jsonb_build_object(
    'title',
    p."title",
    'slug',
    p."slug",
    'content',
    p."content",
    'excerpt',
    p."excerpt",
    'coverImage',
    p."cover_image",
    'featured',
    p."featured",
    'category',
    CASE
      WHEN c."id" IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id',
        c."id",
        'name',
        c."name",
        'slug',
        c."slug"
      )
    END,
    'tags',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',
            t."id",
            'name',
            t."name",
            'slug',
            t."slug"
          )
          ORDER BY t."slug"
        )
        FROM "post_tags" pt
        JOIN "tags" t ON t."id" = pt."tag_id"
        WHERE pt."post_id" = p."id"
      ),
      '[]'::jsonb
    )
  )
FROM "categories" c
WHERE p."category_id" = c."id"
  AND p."status" = 'published'
  AND (p."published_snapshot" IS NULL OR p."needs_publish" = true);

UPDATE "posts"
SET "needs_publish" = false
WHERE "status" = 'published' AND "published_snapshot" IS NULL;

CREATE TABLE "moments" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "author_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "needs_publish" BOOLEAN NOT NULL DEFAULT true,
  "published_snapshot" JSONB,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "moments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "moments_slug_key" ON "moments"("slug");
CREATE INDEX "moments_status_published_at_idx" ON "moments"("status", "published_at");
CREATE INDEX "moments_published_at_idx" ON "moments"("published_at");

ALTER TABLE "moments"
ADD CONSTRAINT "moments_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "moment_comments" (
  "id" UUID NOT NULL,
  "moment_id" UUID NOT NULL,
  "user_id" UUID,
  "author_name" VARCHAR(100),
  "author_email" VARCHAR(255),
  "content" TEXT NOT NULL,
  "parent_id" UUID,
  "reply_to_name" VARCHAR(100),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "reject_reason" TEXT,
  "ai_review" TEXT,
  "ai_review_result" VARCHAR(20),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moment_comments_moment_id_created_at_idx" ON "moment_comments"("moment_id", "created_at");

ALTER TABLE "moment_comments"
ADD CONSTRAINT "moment_comments_moment_id_fkey"
FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moment_comments"
ADD CONSTRAINT "moment_comments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moment_comments"
ADD CONSTRAINT "moment_comments_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "moment_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "moment_comment_likes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "comment_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_comment_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "moment_comment_likes_user_id_comment_id_key" ON "moment_comment_likes"("user_id", "comment_id");

ALTER TABLE "moment_comment_likes"
ADD CONSTRAINT "moment_comment_likes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "moment_comment_likes"
ADD CONSTRAINT "moment_comment_likes_comment_id_fkey"
FOREIGN KEY ("comment_id") REFERENCES "moment_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "moment_likes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "moment_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "moment_likes_user_id_moment_id_key" ON "moment_likes"("user_id", "moment_id");

ALTER TABLE "moment_likes"
ADD CONSTRAINT "moment_likes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "moment_likes"
ADD CONSTRAINT "moment_likes_moment_id_fkey"
FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
