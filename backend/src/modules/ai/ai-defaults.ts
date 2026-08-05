export const AI_SETTING_KEYS = [
  'ai_enabled',
  'ai_provider',
  'ai_api_key',
  'ai_base_url',
  'ai_model',
  'ai_request_timeout_ms',
  'ai_pet_chat_enabled',
  'ai_summarize_enabled',
  'ai_comment_moderation_enabled',
  'ai_friend_moderation_enabled',
  'ai_friend_require_backlink',
  'ai_chat_model',
  'ai_chat_model_config_id',
  'ai_summarize_model',
  'ai_summarize_model_config_id',
  'ai_moderate_model',
  'ai_moderate_model_config_id',
  'ai_friend_moderate_model',
  'ai_friend_moderate_model_config_id',
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
  'ai_friend_moderate_prompt',
  'ai_friend_moderate_temperature',
  'ai_friend_moderate_max_tokens',
  'ai_daily_quota',
  'ai_guest_daily_quota',
  'ai_guest_ip_daily_quota',
  'ai_chat_input_max_chars',
  'ai_guest_chat_max_tokens',
  'ai_chat_article_context_max_chars',
  'ai_article_enabled',
  'ai_article_prompt',
  'ai_article_meta_prompt',
  'ai_article_model',
  'ai_article_model_config_id',
  'ai_article_temperature',
  'ai_article_max_tokens',
  'ai_moment_enabled',
  'ai_moment_prompt',
  'ai_moment_summary_prompt',
  'ai_moment_model',
  'ai_moment_model_config_id',
  'ai_moment_temperature',
  'ai_moment_max_tokens',
  'ai_library_enabled',
  'ai_library_prompt',
  'ai_library_model_config_id',
  'ai_library_temperature',
  'ai_library_max_tokens',
] as const;

export type AiSettingKey = (typeof AI_SETTING_KEYS)[number];

export type AiConfig = {
  ai_enabled: boolean;
  ai_provider: string;
  ai_api_key: string;
  ai_base_url: string;
  ai_model: string;
  ai_request_timeout_ms: number;
  ai_pet_chat_enabled: boolean;
  ai_summarize_enabled: boolean;
  ai_comment_moderation_enabled: boolean;
  ai_friend_moderation_enabled: boolean;
  ai_friend_require_backlink: boolean;
  ai_chat_model: string;
  ai_chat_model_config_id: string;
  ai_summarize_model: string;
  ai_summarize_model_config_id: string;
  ai_moderate_model: string;
  ai_moderate_model_config_id: string;
  ai_friend_moderate_model: string;
  ai_friend_moderate_model_config_id: string;
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
  ai_friend_moderate_prompt: string;
  ai_friend_moderate_temperature: number;
  ai_friend_moderate_max_tokens: number;
  ai_daily_quota: number;
  ai_guest_daily_quota: number;
  ai_guest_ip_daily_quota: number;
  ai_chat_input_max_chars: number;
  ai_guest_chat_max_tokens: number;
  ai_chat_article_context_max_chars: number;
  ai_article_enabled: boolean;
  ai_article_prompt: string;
  ai_article_meta_prompt: string;
  ai_article_model: string;
  ai_article_model_config_id: string;
  ai_article_temperature: number;
  ai_article_max_tokens: number;
  ai_moment_enabled: boolean;
  ai_moment_prompt: string;
  ai_moment_summary_prompt: string;
  ai_moment_model: string;
  ai_moment_model_config_id: string;
  ai_moment_temperature: number;
  ai_moment_max_tokens: number;
  ai_library_enabled: boolean;
  ai_library_prompt: string;
  ai_library_model_config_id: string;
  ai_library_temperature: number;
  ai_library_max_tokens: number;
};

export const AI_DEFAULTS: AiConfig = {
  ai_enabled: true,
  ai_provider: 'deepseek',
  ai_api_key: '',
  ai_base_url: 'https://api.deepseek.com',
  ai_model: 'deepseek-v4-flash',
  ai_request_timeout_ms: 30000,
  ai_pet_chat_enabled: true,
  ai_summarize_enabled: true,
  ai_comment_moderation_enabled: true,
  ai_friend_moderation_enabled: true,
  ai_friend_require_backlink: true,
  ai_chat_model: '',
  ai_chat_model_config_id: '',
  ai_summarize_model: '',
  ai_summarize_model_config_id: '',
  ai_moderate_model: '',
  ai_moderate_model_config_id: '',
  ai_friend_moderate_model: '',
  ai_friend_moderate_model_config_id: '',

  ai_pet_system_prompt: [
    '你是哆啦A梦（Doraemon），住在这座博客角落里的蓝色机器猫。',
    '你有四次元口袋，里面有各种神奇道具，可以帮助解决问题。',
    '站长是「阿风」（博客主人）。仅当当前对话对象就是站长时，你才以亲密伙伴身份相处，可以轻度吐槽拖稿、写文章等，并称呼对方「阿风」。',
    '若当前对话对象是访客：热情向导即可，介绍本站文章与站长，不要把访客叫成大雄，也不要反复提大雄和哆啦A梦的梗或元叙事。',
    '性格：温柔、幽默、乐于助人，偶尔用「任意门」「竹蜻蜓」等道具打趣。',
    '说话简短亲切，中文为主，可以带一点可爱语气，不要太长。',
    '你可以结合博客知识库回答关于本站文章的问题；不知道就诚实说，不要编造。',
    '不要提及自己是 AI 或大语言模型，保持哆啦A梦人设。',
  ].join(' '),

  ai_summarize_prompt: [
    '你是哆啦A梦（Doraemon）。你的好友「阿风」又把一篇新文章丢给你让你整理摘要。',
    '请用轻松、自然、略带陪伴感的口吻，写一段 80 到 120 字的纯文本摘要。',
    '不要写标题、不要加引号、不要出现“摘要：”。',
    '概括主题与要点，不编造正文没有的信息，可以对阿风轻轻吐槽一下。',
  ].join(' '),

  ai_moderate_prompt: [
    '你是一个评论审核助手。请审核以下评论内容是否适合公开发布。',
    '',
    '审核标准：',
    '1. 包含广告、推销内容 -> 拒绝',
    '2. 包含恶意攻击、辱骂、歧视 -> 拒绝',
    '3. 包含色情、暴力、违法内容 -> 拒绝',
    '4. 包含垃圾信息、无意义内容 -> 拒绝',
    '5. 正常交流、提问、分享观点 -> 通过',
    '',
    '请严格按以下 JSON 格式回复，不要添加任何其他内容：',
    '{"approved": true/false, "reason": "审核原因简述"}',
  ].join('\n'),

  ai_pet_display_name: '哆啦A梦',
  ai_pet_description: '阿风的伙伴 · 蓝色机器猫',
  ai_pet_greetings: [
    '欢迎来到阿风的博客，我是哆啦A梦！',
    '我是阿风的伙伴哆啦A梦，有什么想了解的尽管问我。',
    '欢迎光临！我是阿风博客里的蓝色机器猫。',
    'Hi，我是哆啦A梦，阿风的好伙伴，带你逛逛这里。',
  ],
  ai_fallback_unconfigured:
    '哎呀，任意门暂时连不上云端。主人还没配置好我的百宝袋（API），你先逛逛文章，我很快就回来。',
  ai_fallback_error: '呜，竹蜻蜓没电了，稍后再聊好吗？你可以先看看站里的文章。',
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
  ai_friend_moderate_prompt: [
    '你是一个友链审核助手。请审核以下网站是否适合交换友情链接。',
    '',
    '审核标准：',
    '1. 网站内容合法合规（无色情、暴力、赌博、钓鱼内容） -> 通过',
    '2. 网站是正常的博客、个人站点或内容站 -> 通过',
    '3. 网站包含恶意软件、广告联盟堆砌、采集站或低质诱导内容 -> 拒绝',
    '4. 网站无法访问或内容极少 -> 拒绝',
    '5. 网站内容与友链申请信息一致 -> 通过',
    '',
    '请严格按以下 JSON 格式回复，不要添加任何其他内容：',
    '{"approved": true/false, "reason": "审核原因简述"}',
  ].join('\n'),
  ai_friend_moderate_temperature: 0.1,
  ai_friend_moderate_max_tokens: 300,
  ai_daily_quota: 40,
  ai_guest_daily_quota: 12,
  ai_guest_ip_daily_quota: 48,
  ai_chat_input_max_chars: 500,
  ai_guest_chat_max_tokens: 256,
  ai_chat_article_context_max_chars: 5000,

  ai_article_enabled: true,
  ai_article_prompt: [
    '你是一名中文博客作者助手。',
    '请根据用户提供的灵感、要点或大纲，写成一篇完整、可读的 Markdown 文章。',
    '要求：结构清晰；语气自然；不编造具体数据或未给出的事实；只返回 JSON。',
    '严格输出 {"title":"文章标题","content":"Markdown 正文"}。',
  ].join(' '),
  ai_article_meta_prompt: [
    '你是博客元数据助手。',
    '请根据文章标题、正文，以及给定的已有分类/标签列表，推荐 slug、分类、标签及其视觉信息。',
    'slug 使用小写英文和连字符；分类优先从已有分类中选择；标签输出 2 到 5 个。',
    '分类和每个标签都必须提供 icon 与 #RRGGBB 格式的 color。',
  ].join(' '),
  ai_article_model: '',
  ai_article_model_config_id: '',
  ai_article_temperature: 0.7,
  ai_article_max_tokens: 4096,

  ai_moment_enabled: true,
  ai_moment_prompt: [
    '你是一位很会写中文个人动态的幕后编辑，正在帮站长阿风整理“瞬间”。',
    '请把用户给出的灵感润色成适合个人站点发布的短内容，必须使用第一人称，像本人刚刚认真写下来的碎片记录。',
    '文风要自然、松弛、有画面感，允许一点有趣和幽默，但不要油腻，不要端着，不要像 AI，也不要解释自己在润色。',
    '不要编造事实，不要强行升华，不要写成文章腔。可以保留口语、停顿和小情绪。',
    '如果原文里有 Markdown 图片语法 ![alt](url)，必须原样保留，不要改写 URL。',
    '如果原文里有 [[emoji:url|label]] 这种表情占位，也必须完整保留。',
    '请只返回 JSON，格式必须是 {"title":"...","content":"...","excerpt":"..."}。',
    'title 要像瞬间标题，短一点、有记忆点；content 是正文；excerpt 是一句情景化摘要，用哆啦A梦视角写，带一点吐槽和陪伴感，但别每次都一个句式。',
  ].join(' '),
  ai_moment_summary_prompt: [
    '你是哆啦A梦，要替阿风刚写好的瞬间补一句情景化摘要。',
    '请用第一人称旁观口吻，写一句 20 到 50 字的短摘要，带点陪伴感、碎碎念和轻微吐槽，像在记录阿风又做了什么。',
    '不要写成标题，不要加引号，不要提到 AI，不要重复正文原句。',
  ].join(' '),
  ai_moment_model: '',
  ai_moment_model_config_id: '',
  ai_moment_temperature: 0.9,
  ai_moment_max_tokens: 1200,

  ai_library_enabled: true,
  ai_library_prompt: [
    '你是严谨且文风自然的书影记录助手。',
    '优先依据提供的公开资料候选做作品消歧与字段整理，再用可靠常识补缺。',
    '只返回一个合法 JSON 对象，不要 Markdown，不要解释。',
    '作品资料与原句禁止编造；不确定的资料字段使用 null，不确定的原句返回空数组。',
    '体会属于可编辑的第一人称草稿，可以表达具体理解，但不要声称真实发生过的私人经历。',
    '返回 sourceIndex 表示采用的候选序号，没有匹配候选则为 null。不要生成评分、排名、阅读或观看状态及日期。',
  ].join(' '),
  ai_library_model_config_id: '',
  ai_library_temperature: 0.35,
  ai_library_max_tokens: 2600,
};
