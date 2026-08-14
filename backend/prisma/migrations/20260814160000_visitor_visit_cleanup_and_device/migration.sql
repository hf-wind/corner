-- 访客足迹精简：删除页面维度字段，新增设备类型，清理"无名旅人"标记
ALTER TABLE "visitor_visits" DROP COLUMN "pageType";
ALTER TABLE "visitor_visits" DROP COLUMN "target_title";
ALTER TABLE "visitor_visits" DROP COLUMN "target_href";
DROP INDEX "visitor_visits_pageType_created_at_idx";

ALTER TABLE "visitor_visits" ADD COLUMN "device" VARCHAR(20);

UPDATE "visitor_profiles" SET "nickname" = '' WHERE "nickname" = '无名旅人';
