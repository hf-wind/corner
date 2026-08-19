INSERT INTO "settings" ("key", "value", "updated_at")
VALUES ('visitor_bottle_daily_limit', '3'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "settings" ("key", "value", "updated_at")
VALUES ('visitor_fish_daily_limit', '5'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "value" = '5'::jsonb, "updated_at" = CURRENT_TIMESTAMP
WHERE "settings"."value" = '8'::jsonb;
