CREATE TABLE "ai_model_configs" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "api_key" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "model" VARCHAR(150) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_model_configs_provider_name_key"
ON "ai_model_configs"("provider", "name");

CREATE INDEX "ai_model_configs_enabled_is_default_sort_idx"
ON "ai_model_configs"("enabled", "is_default", "sort");

INSERT INTO "ai_model_configs" (
  "id", "name", "provider", "api_key", "base_url", "model",
  "enabled", "is_default", "sort", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  'DeepSeek Flash',
  COALESCE((SELECT "value" #>> '{}' FROM "settings" WHERE "key" = 'ai_provider'), 'deepseek'),
  COALESCE((SELECT "value" #>> '{}' FROM "settings" WHERE "key" = 'ai_api_key'), ''),
  COALESCE((SELECT "value" #>> '{}' FROM "settings" WHERE "key" = 'ai_base_url'), 'https://api.deepseek.com'),
  COALESCE((SELECT "value" #>> '{}' FROM "settings" WHERE "key" = 'ai_model'), 'deepseek-v4-flash'),
  true,
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_model_configs");
