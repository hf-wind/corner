-- Refresh only the original seeded profile. Any administrator-edited profile is preserved.
UPDATE "settings"
SET
  "value" = jsonb_set(
    jsonb_set(
      jsonb_set(
        "value"::jsonb,
        '{introduction}',
        to_jsonb('我来自青海，现在生活和工作在绍兴。科班学的是计算机，后来很自然地做了软件开发。一路做过手机 App、小程序、PC 端和数据驾驶舱，也参与过数字孪生，让 UE 场景和前端数据互相听得懂。前端、后端、部署运维都碰，AI 也在认真学着用；谈不上样样精通，只是遇到问题愿意多看一眼，再把它拆小一点。

我不太想把“会用什么”写成一排闪亮的标签。技术于我，更像是把想法安稳落地的工具：页面要让人用着舒服，接口要经得住折腾，服务上线后也得有人照看。偶尔借 AI 多一双眼睛，但最后的判断、验证和责任仍然要自己接住。会的东西有限，好在还愿意继续学，也不介意承认“这个我得先查查”。

工作之外喜欢骑车、看书、看电影，也爱没有目的地到处溜达。与生活对线时胜率一般，幸好还能靠一顿好吃的、一阵晚风和一次不爆红的部署回血。这个站点不准备证明我有多厉害，只想安静保存技术所得、书影所感和普通日子。若这些记录偶尔能帮到谁，已经很好。'::text),
        true
      ),
      '{skills}',
      '[{"name":"前端与交互","description":"把界面、状态和细节收拾妥当，让功能不只“能用”。"},{"name":"后端与数据","description":"写接口、理数据、补边界，尽量让服务清楚而可靠。"},{"name":"运维与交付","description":"Linux、Docker、反向代理与 CI/CD，负责把代码平稳送到线上。"},{"name":"AI 协作","description":"接入模型与自动化工作流，也坚持人工判断、测试和复核。"},{"name":"跨端应用","description":"做过 App、小程序和 PC 端，在不同屏幕间解决同一件事。"},{"name":"可视化与孪生","description":"做数据驾驶舱，也参与 UE 与前端联动，让场景和数据对上话。"}]'::jsonb,
      true
    ),
    '{tools}',
    '["前端页面","后端接口","Docker","CI/CD","AI 协作","数据可视化","UE 联动","骑车","看书","发呆"]'::jsonb,
    true
  ),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'about_profile'
  AND jsonb_typeof("value"::jsonb) = 'object'
  AND "value"->>'introduction' LIKE '余籍青海，少习计算机之术%';
