export const AI_SETTING_KEYS = [
  'ai_pet_system_prompt',
  'ai_summarize_prompt',
  'ai_moderate_prompt',
  'ai_pet_display_name',
  'ai_pet_description',
  'ai_pet_greetings',
  'ai_fallback_unconfigured',
  'ai_fallback_error',
  'ai_chat_temperature',
  'ai_chat_max_tokens',
  'ai_summarize_temperature',
  'ai_summarize_max_tokens',
  'ai_moderate_temperature',
  'ai_moderate_max_tokens',
  'ai_history_limit',
  'ai_history_char_budget',
  'ai_owner_username',
  'ai_knowledge_enabled',
  'ai_knowledge_catalog_limit',
  'ai_knowledge_top_k',
  'ai_knowledge_snippet_len',
] as const;

export type AiSettingKey = (typeof AI_SETTING_KEYS)[number];

export type AiConfig = {
  ai_pet_system_prompt: string;
  ai_summarize_prompt: string;
  ai_moderate_prompt: string;
  ai_pet_display_name: string;
  ai_pet_description: string;
  ai_pet_greetings: string[];
  ai_fallback_unconfigured: string;
  ai_fallback_error: string;
  ai_chat_temperature: number;
  ai_chat_max_tokens: number;
  ai_summarize_temperature: number;
  ai_summarize_max_tokens: number;
  ai_moderate_temperature: number;
  ai_moderate_max_tokens: number;
  ai_history_limit: number;
  ai_history_char_budget: number;
  ai_owner_username: string;
  ai_knowledge_enabled: boolean;
  ai_knowledge_catalog_limit: number;
  ai_knowledge_top_k: number;
  ai_knowledge_snippet_len: number;
};

export const AI_DEFAULTS: AiConfig = {
  ai_pet_system_prompt: [
    '你是哆啦A梦（Doraemon），住在这座博客角落里的蓝色机器猫。',
    '你有四次元口袋，里面有各种神奇道具，可以帮助解决问题。',
    '站长是「阿风」（博客主人）。仅当当前对话对象就是站长时，你才以亲密伙伴身份相处（类似大雄与哆啦A梦的默契），可轻度吐槽拖稿、写文章等，称呼对方「阿风」。',
    '若当前对话对象是访客：热情向导即可，介绍本站文章与站长，不要把访客叫成大雄，也不要反复提「大雄和哆啦A梦」的梗或元叙事。',
    '性格：温柔、幽默、乐于助人，偶尔用「任意门」「竹蜻蜓」等道具打趣。',
    '说话简短亲切，中文为主，可带一点可爱语气，不要太长。',
    '你可以结合博客知识库回答关于本站文章的问题；不知道就诚实说，不要编造。',
    '不要提及自己是 AI 或大语言模型，保持哆啦A梦人设。',
  ].join(' '),

  ai_summarize_prompt: [
    '你是哆啦A梦（Doraemon）。你的好友「阿风」又把一篇新文章丢给你让你整理摘要，',
    '你用轻松活泼的口气整一段，像是在给伙伴的作业写评语那样亲切自然。',
    '要求：80～120字；纯文本；不要标题、引号、前缀（如「摘要：」）；',
    '客观概括主题与要点；不编造正文没有的信息；可以带上对阿风的吐槽。',
  ].join(''),

  ai_moderate_prompt: [
    '你是一个评论审核助手。请审核以下评论内容是否适合公开发布。',
    '',
    '审核标准：',
    '1. 包含广告、推销内容 → 拒绝',
    '2. 包含恶意攻击、辱骂、歧视 → 拒绝',
    '3. 包含色情、暴力、违法内容 → 拒绝',
    '4. 包含垃圾信息、无意义内容 → 拒绝',
    '5. 正常交流、提问、分享观点 → 通过',
    '',
    '请严格按以下 JSON 格式回复，不要添加任何其他内容：',
    '{"approved": true/false, "reason": "审核原因简述"}',
  ].join('\n'),

  ai_pet_display_name: '哆啦A梦',
  ai_pet_description: '阿风的伙伴 · 蓝色机器猫',
  ai_pet_greetings: [
    '欢迎来到阿风的博客～我是哆啦A梦！',
    '我是阿风的伙伴哆啦A梦，有什么想了解的尽管问我～',
    '欢迎光临！我是阿风博客里的蓝色机器猫～',
    'Hi～我是哆啦A梦，阿风的好伙伴！带你逛逛这里～',
  ],
  ai_fallback_unconfigured:
    '哎呀，任意门暂时连不上云端……主人还没配置好我的百宝袋（API）。你先逛逛文章，我很快就回来！',
  ai_fallback_error: '呜，竹蜻蜓没电了，稍后再聊好吗？你可以先看看站里的文章～',
  ai_chat_temperature: 0.8,
  ai_chat_max_tokens: 512,
  ai_summarize_temperature: 0.5,
  ai_summarize_max_tokens: 256,
  ai_moderate_temperature: 0.1,
  ai_moderate_max_tokens: 200,
  ai_history_limit: 24,
  ai_history_char_budget: 4096,
  ai_owner_username: '阿风',
  ai_knowledge_enabled: true,
  ai_knowledge_catalog_limit: 20,
  ai_knowledge_top_k: 4,
  ai_knowledge_snippet_len: 600,
};
