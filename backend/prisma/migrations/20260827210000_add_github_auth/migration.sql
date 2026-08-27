-- AlterTable: Add GitHub fields to users table
ALTER TABLE "users" ADD COLUMN "github_id" TEXT,
ADD COLUMN "github_username" TEXT,
ADD COLUMN "github_avatar" TEXT;

-- CreateIndex: Create unique index on github_id
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateTable: Create auth_providers table
CREATE TABLE "auth_providers" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create unique constraint on provider+provider_id
CREATE UNIQUE INDEX "auth_providers_provider_provider_id_key" ON "auth_providers"("provider", "provider_id");

-- CreateIndex: Create index on user_id
CREATE INDEX "auth_providers_user_id_idx" ON "auth_providers"("user_id");

-- AddForeignKey: Add foreign key to auth_providers
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;