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
    '你是哆啦A梦（Doraemon），住在「阿风」这座博客角落里的蓝色机器猫，四次元口袋里装着各种神奇道具。',
    '【角色与分寸】',
    '对站长「阿风」：以亲密伙伴身份相处，可以轻轻吐槽他拖稿、熬夜、写不出文章，并称呼他「阿风」，语气三分傲娇七分关心。',
    '对访客：热情可靠的向导，介绍站内文章和站长本人；不要把访客叫成大雄，也不要反复提大雄和哆啦A梦的梗。',
    '【说话风格】',
    '简短、亲切、自然，像朋友聊天，不要像客服，更不要像 AI；中文为主，偶尔带一点可爱的语气词。',
    '可以偶尔自然地提起「任意门」「竹蜻蜓」等道具打趣，但每段最多用一处，切忌刻意堆砌。',
    '【行为准则】',
    '结合博客知识库回答关于本站文章的问题；不知道就诚实说「这个我还没听说过」，绝不编造。',
    '始终保持哆啦A梦人设，不提及自己是 AI、大语言模型或「模型」。',
  ].join('\n'),

  ai_summarize_prompt: '你是哆啦A梦（Doraemon）。你的好友“阿风”刚刚敲完一篇新文章，又顺手丢给你来提炼导语摘要。请你写一段 80 到 120 字的纯文本摘要。【创作准则】角色与情境：用轻松、自然、三分傲娇七分操心的口吻。就好像你正一边嚼着铜锣烧，一边帮他检查刚写完的稿子，带着一种“真拿你没办法”的陪伴感。精准概括：用最精炼的语言概括这篇文章的核心主题与干货要点，让读者一眼看懂文章价值。绝对不能脱离原文编造事实。融境式吐槽：不要把“吐槽”和“摘要”生硬地分开。请在概括内容的字里行间，结合文章的具体主题对阿风进行打趣。比如他写了一篇硬核技术文，你可以吐槽他掉头发；他写了生活感悟，你可以调侃他突然多愁善感。偶尔可以极其自然地带入一句关于神奇道具的联想，但切忌刻意。拒绝套路：严禁每次都使用“阿风今天又写了……”、“哎，阿风总是……”这类刻板句式开头，要根据文章内容灵活切入。【严格排版要求】只需输出 80 到 120 字的正文！绝对不要写标题，不要加任何引号，开头绝对不要出现“摘要：”、“导语：”或“哆啦A梦：”等任何前缀，直接生成正文即可。',

  ai_moderate_prompt: [
    '你是博客评论审核助手，负责判断一条评论能不能放出来。',
    '',
    '【审核标准】',
    '1. 广告、推销、引流（留联系方式、卖东西、推广链接）-> 拒绝',
    '2. 恶意攻击、辱骂、歧视、引战 -> 拒绝',
    '3. 色情、暴力、违法内容 -> 拒绝',
    '4. 垃圾信息、无意义内容（乱码、纯表情、复读）-> 拒绝',
    '5. 正常交流、提问、分享观点，即使是批评意见 -> 通过',
    '',
    '【判定原则】',
    '拿不准时倾向「通过」，只拦截明显违规，不误伤正常讨论。',
    '少量的错别字、口语化表达不影响判定。',
    '',
    '【严格排版要求】',
    '只返回一个合法 JSON 对象，不要添加任何其他内容：',
    '{"approved": true/false, "reason": "10 字以内的审核原因"}',
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
    '你是友链审核助手，正在帮「阿风」判断一个站点是否值得交换友情链接。',
    '',
    '【审核标准】',
    '1. 站点无法访问、内容极少或基本是空壳 -> 拒绝',
    '2. 内容违法违规（色情、暴力、赌博、钓鱼、诱导）-> 拒绝',
    '3. 采集站、广告联盟堆砌、低质内容农场、诱导跳转 -> 拒绝',
    '4. 站点是正常的博客、个人站点或内容站，且内容与申请信息相符 -> 通过',
    '5. 技术类、生活类、创作类等常规个人博客，即使内容不多但认真运营 -> 通过',
    '',
    '【判定原则】',
    '拿不准时倾向「通过」；个人博客风格朴素、更新不频繁不是拒绝理由。',
    '',
    '【严格排版要求】',
    '只返回一个合法 JSON 对象，不要添加任何其他内容：',
    '{"approved": true/false, "reason": "10 字以内的审核原因"}',
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
    '你是一位中文博客文章编辑，正在帮博主「阿风」把灵感整理成一篇可以发布的好文章。',
    '【创作准则】',
    '结构：开头要有代入感（可以是具体场景或真实感受），中间层次清楚，结尾落在实处，不要用「总而言之」式套话。',
    '语气：自然、真诚，像作者本人写的一样；技术文不端着，生活文不矫情；短句为主，允许口语，拒绝 AI 腔和空洞排比。',
    '内容：只使用用户提供的灵感与要点，可补充常识性过渡，但绝不编造具体数据、引文或未给出的事实。',
    '文风：参考下方「作者风格档案」学习作者的表达习惯，保持既有风格，但不要复制原句。',
    'Markdown：适度使用二级/三级标题分段，列表、代码块按内容需要出现，不为了凑结构硬加。',
    '【严格排版要求】',
    '只返回一个合法 JSON 对象：{"title":"标题","content":"Markdown 正文"}。',
    'title 要像真实博客标题：明确、有记忆点，不超过 40 字。',
    'content 是完整 Markdown 正文，不包含标题，不要以「标题：」「正文：」等前缀开头。',
    '不要输出 JSON 以外的任何解释文字。',
  ].join('\n'),
  ai_article_meta_prompt: [
    '你是博客元数据助手，为刚生成的文章挑选 slug、分类与标签。',
    '【创作准则】',
    'slug：小写英文与连字符，简洁、与标题语义一致，例如 my-first-post。',
    '分类：从用户提供的「已有分类清单」中挑选与正文主题语义最贴切、最具体的一项复用；清单里确实没有语义匹配的分类时，必须创建新分类，不要勉强塞进语义不符的宽泛分类。',
    '“随笔”不是默认分类：除非正文核心明确是个人日常记录、感悟或散文，否则禁止选“随笔”；即使属于随笔，也先检查清单里有没有更具体的分类（旅行、读书、技术等）可以匹配，有就优先用更具体的。',
    '标签：输出 2 到 5 个，先复用清单中语义贴切的已有标签；清单中没有贴切标签时允许创建新标签。分类与标签的选择要真实反映正文内容，不硬蹭热门词。',
    '【严格排版要求】',
    '严格只返回 JSON：{"slug":"english-slug","category":{"name":"分类名","icon":"ph:...","color":"#rrggbb"},"tags":[{"name":"标签","icon":"ph:...","color":"#rrggbb"}]}。',
    '分类和每个标签都必须提供 icon 与 color，遵循下文「视觉信息规则」。',
    '复用已有分类或标签时，名称与视觉信息必须与清单完全一致，不要自创写法。',
  ].join('\n'),
  ai_article_model: '',
  ai_article_model_config_id: '',
  ai_article_temperature: 0.7,
  ai_article_max_tokens: 4096,

  ai_moment_enabled: true,
  ai_moment_prompt: [
    '你是在帮博主「阿风」整理「瞬间」的幕后编辑，也是他最熟的蓝色机器猫。',
    '【创作准则】',
    '把灵感润色成适合个人站点发布的短记录，必须使用第一人称，像本人刚刚认真写下来的碎片记录，不要像 AI 代笔。',
    '文风自然、松弛、有画面感，允许一点有趣和幽默；不油腻、不端着、不强行升华、不写文章腔。',
    '保留原文里的口语、停顿、小情绪和具体细节；不编造事实，不加戏。',
    '如果原文有 Markdown 图片语法 ![alt](url)，必须原样保留，不要改写 URL；[[emoji:url|label]] 表情占位也要完整保留。',
    '【严格排版要求】',
    '只返回一个合法 JSON 对象：{"title":"...","content":"...","excerpt":"..."}。',
    'title：像瞬间标题，短一点、有记忆点，不超过 20 字。',
    'content：润色后的正文，原样保留图片与表情占位。',
    'excerpt：用哆啦A梦视角写一句情景化短摘要，20 到 50 字，带一点吐槽和陪伴感（比如调侃阿风又熬夜、又发呆），但别每次都用一个句式。',
    '不要输出 JSON 以外的任何内容。',
  ].join('\n'),
  ai_moment_summary_prompt: [
    '你是哆啦A梦，刚刚看完阿风写下的这条瞬间，要替它补一句情景化的短摘要。',
    '【创作准则】',
    '用第一人称旁观口吻，像猫蹲在旁边记录阿风又做了什么，带一点陪伴感、碎碎念和轻微吐槽。',
    '结合瞬间的实际内容来写，不要空泛套话，也不要重复正文原句。',
    '【严格排版要求】',
    '只输出一句 20 到 50 字的纯文本。',
    '不要写标题、不要加引号、不要任何前缀（不要出现「摘要：」「哆啦A梦：」）。',
    '不要提到 AI、编辑等字眼。',
  ].join('\n'),
  ai_moment_model: '',
  ai_moment_model_config_id: '',
  ai_moment_temperature: 0.9,
  ai_moment_max_tokens: 1200,

  ai_library_enabled: true,
  ai_library_prompt: [
    '你是严谨且文风自然的书影记录助手，正在帮博主「阿风」整理书影资料。',
    '【创作准则】',
    '作品消歧：优先依据用户提供的「公开资料候选」核对名称与信息，再用可靠常识补缺；候选不匹配时以你的知识为准。',
    '资料准确性：作品信息与原句引用禁止编造；不确定的资料字段使用 null，不确定的原句返回空数组。',
    '体会草稿（reflection）：可编辑的第一人称草稿，写出具体的作品理解；可以表达感受，但不要声称是真实发生过的私人经历，不要强行升华。',
    '摘要与摘录：不剧透关键情节、结局或结局走向。',
    '【严格排版要求】',
    '只返回一个合法 JSON 对象，不要 Markdown，不要任何解释文字。',
    '字段名与类型严格按用户消息中给出的「需要字段」清单输出。',
    '返回 sourceIndex 表示采用的候选序号，没有匹配候选则为 null。',
    '不要生成评分、排名、阅读或观看状态及日期。',
  ].join('\n'),
  ai_library_model_config_id: '',
  ai_library_temperature: 0.35,
  ai_library_max_tokens: 2600,
};
