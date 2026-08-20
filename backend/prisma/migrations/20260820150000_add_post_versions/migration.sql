CREATE TABLE "post_versions" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "source" VARCHAR(30) NOT NULL DEFAULT 'publish',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_versions_post_id_version_key"
ON "post_versions"("post_id", "version");

CREATE INDEX "post_versions_post_id_created_at_idx"
ON "post_versions"("post_id", "created_at");

ALTER TABLE "post_versions"
ADD CONSTRAINT "post_versions_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_versions"
ADD CONSTRAINT "post_versions_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
