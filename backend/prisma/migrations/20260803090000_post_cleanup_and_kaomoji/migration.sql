ALTER TABLE "visit_stats" DROP CONSTRAINT IF EXISTS "visit_stats_post_id_fkey";
ALTER TABLE "visit_stats" ADD CONSTRAINT "visit_stats_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH inserted_pack AS (
  INSERT INTO "emoji_packs" ("id", "name", "type", "sort", "enabled", "compress_animated", "created_at", "updated_at")
  SELECT gen_random_uuid(), '颜文字', 'static', 3, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM "emoji_packs" WHERE "name" = '颜文字')
  RETURNING "id"
), target_pack AS (
  SELECT "id" FROM inserted_pack
  UNION ALL
  SELECT "id" FROM "emoji_packs" WHERE "name" = '颜文字'
  LIMIT 1
), new_items("label", "char", "sort") AS (
  VALUES
    ('开心', '(＾▽＾)', 1), ('大笑', '(≧▽≦)', 2), ('灿烂', '(⌒▽⌒)☆', 3),
    ('欢呼', 'ヽ(・∀・)ﾉ', 4), ('眨眼', '(｡•̀ᴗ-)✧', 5), ('加油', '(๑•̀ㅂ•́)و✧', 6),
    ('抱抱', '(づ｡◕‿‿◕｡)づ', 7), ('满足', '(っ˘ω˘ς )', 8), ('招手', '(￣▽￣)ノ', 9),
    ('轻松', '(´▽｀)', 10), ('害羞', '(〃▽〃)', 11), ('脸红', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', 12),
    ('震惊', '(⊙_⊙)', 13), ('尴尬', '(・_・;)', 14), ('惊讶', '(；￣Д￣)', 15),
    ('不服', '(￣ヘ￣)', 16), ('斜眼', '(¬_¬)', 17), ('流泪', '(╥﹏╥)', 18),
    ('难过', '(ノ_<。)', 19), ('委屈', '(｡•́︿•̀｡)', 20), ('力量', 'ᕦ(ò_óˇ)ᕤ', 21),
    ('庆祝', '٩(◕‿◕｡)۶', 22), ('扶桌', '┬─┬ノ( º _ ºノ)', 23), ('掀桌', '(ノಠ益ಠ)ノ彡┻━┻', 24)
)
INSERT INTO "emoji_items" ("id", "pack_id", "label", "char", "image_url", "sort")
SELECT gen_random_uuid(), target_pack."id", new_items."label", new_items."char", NULL, new_items."sort"
FROM target_pack CROSS JOIN new_items
WHERE NOT EXISTS (
  SELECT 1 FROM "emoji_items"
  WHERE "pack_id" = target_pack."id" AND "char" = new_items."char"
);
