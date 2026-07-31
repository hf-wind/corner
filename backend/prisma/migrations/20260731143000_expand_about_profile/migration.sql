-- Expand profiles that still contain either of the two built-in introductions.
UPDATE "settings"
SET
  "value" = "value"::jsonb || jsonb_build_object(
    'badge', '一介写代码的人',
    'role', '生于青海，现居绍兴',
    'availability', '所学尚浅，仍在慢慢做事',
    'introduction', '余籍青海，少习计算机之术，科班出身。癸卯年入某市电信实习，从软件开发之事；甲辰七月转正，遂以此为业。技未敢言精，不过逢题拆题，遇坑填坑，日拱一卒而已。

性喜安静，亦不拒热闹。知世间能者甚众，故不敢以所会自矜；偶有所成，多赖前人之路、同伴之助。所愿不过把手边之事做稳，把不懂之处弄明白，得闲时留几行真话。',
    'notes', '[{"title":"平日所习","subtitle":"ABOUT THE WORK","icon":"ph:code-bold","content":"前端、后端与部署运维都略有涉猎，也在学习如何让 AI 成为可靠的协作者。做过 App、小程序、PC 端、数据驾驶舱及数字孪生联动。它们不是履历墙，只是我用来解决问题的一只工具箱。"},{"title":"闲时所好","subtitle":"OFF THE CLOCK","icon":"ph:bicycle-bold","content":"喜欢骑车、看书、看电影，也爱没有目的地四处走走。与生活对线时胜率一般，幸好一顿好吃的、一阵晚风，或一次不爆红的部署，通常都能让血条慢慢回来。"},{"title":"此间缘起","subtitle":"WHY THIS CORNER","icon":"ph:wind-bold","content":"“风隅随笔”不是作品陈列柜，更像一张靠窗的旧书桌。这里收技术所得、书影所感与日常微末；不追赶喧哗，也不急着下结论。若偶然能给来客一点用处或片刻共鸣，便已足够。"}]'::jsonb,
    'skills', '[{"name":"界面与交互","description":"把页面、状态与细节慢慢收拾妥当，希望功能不止能用，也能让人用得舒服。"},{"name":"服务与数据","description":"写接口、理数据、补边界；能力有限，便多做验证，让服务尽量清楚可靠。"},{"name":"部署与照看","description":"接触 Linux、Docker、反向代理与 CI/CD，也愿意对上线后的运行负责。"},{"name":"AI 与自动化","description":"尝试模型接入和工作流，但不把判断交出去，结果仍需人工检查与承担。"},{"name":"跨端与大屏","description":"做过 App、小程序、PC 端与数据驾驶舱，在不同屏幕上解决具体问题。"},{"name":"场景与孪生","description":"参与 UE 与前端联动，让虚拟场景听懂真实数据；仍有许多地方要继续学。"}]'::jsonb,
    'facts', '[{"label":"生年","value":"世纪之交后一年"},{"label":"星座","value":"狮子座"},{"label":"血型","value":"A 型"},{"label":"SBti","value":"吗喽，自嘲而已"},{"label":"烟酒","value":"不烟不酒，偶饮米酒果酒"},{"label":"闲时","value":"骑行 / 到处溜达"}]'::jsonb
  ),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'about_profile'
  AND jsonb_typeof("value"::jsonb) = 'object'
  AND (
    "value"->>'introduction' LIKE '余籍青海，少习计算机之术%'
    OR "value"->>'introduction' LIKE '我来自青海，现在生活和工作在绍兴%'
  );
