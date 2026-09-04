CREATE TABLE "changelog_translations" (
  "id" UUID NOT NULL,
  "repository" VARCHAR(220) NOT NULL,
  "branch" VARCHAR(180) NOT NULL,
  "commit_sha" VARCHAR(40) NOT NULL,
  "original_message" TEXT NOT NULL,
  "translated_message" TEXT,
  "language" VARCHAR(20) NOT NULL,
  "translation_service" VARCHAR(20),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "author" VARCHAR(100) NOT NULL,
  "commit_url" TEXT NOT NULL,
  "committed_at" TIMESTAMP(3) NOT NULL,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "changelog_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "changelog_translations_repository_commit_sha_key"
  ON "changelog_translations"("repository", "commit_sha");
CREATE INDEX "changelog_translations_repository_branch_committed_at_idx"
  ON "changelog_translations"("repository", "branch", "committed_at");
CREATE INDEX "changelog_translations_status_updated_at_idx"
  ON "changelog_translations"("status", "updated_at");

CREATE TABLE "changelog_sync_states" (
  "id" UUID NOT NULL,
  "repository" VARCHAR(220) NOT NULL,
  "branch" VARCHAR(180) NOT NULL,
  "fetched_at" TIMESTAMP(3) NOT NULL,
  "source_status" VARCHAR(20) NOT NULL,
  "source_label" VARCHAR(100) NOT NULL,
  "last_error" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "changelog_sync_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "changelog_sync_states_repository_branch_key"
  ON "changelog_sync_states"("repository", "branch");
