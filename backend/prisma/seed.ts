import 'dotenv/config';
import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { AI_DEFAULTS } from '../src/modules/ai/ai-defaults';
import { qqItems, twemojiItems } from './seed-emoji-data';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL 未配置，已拒绝执行初始化');

const adminUsername = String(process.env.SEED_ADMIN_USERNAME || 'huifeng').trim();
const adminEmail = String(process.env.SEED_ADMIN_EMAIL || '1833079849@qq.com').trim().toLowerCase();
const adminPassword = String(process.env.SEED_ADMIN_PASSWORD || '');
if (!adminPassword) throw new Error('SEED_ADMIN_PASSWORD 未配置，已拒绝创建管理员');
if (adminPassword.length < 12) throw new Error('SEED_ADMIN_PASSWORD 至少需要 12 位');

const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 15000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const uploadsRoot = join(process.cwd(), 'uploads');
const seedAssetsRoot = join(process.cwd(), 'prisma', 'seed-assets');

const publishedAt = new Date('2026-07-29T00:00:00+08:00');

const aboutProfile = {
  name: 'huifeng',
  role: '青海人 · 写代码 · 骑车闲游',
  motto: '听风于隅，漫写人间',
  introduction: '余籍青海，少习计算机之术，科班出身。癸卯年入某市电信实习，从软件开发之事；甲辰七月转正，遂以此为业。迄今所作，横跨掌中 App、小程序与案头 PC 三端，亦曾铺陈驾驶舱数据大屏。又参与数字孪生项目，司 UE 与前端相联，使虚景能应实数。技未敢言精，不过逢题拆题，遇坑填坑，日拱一卒而已。\n\n大学之时，曾为青协志愿者干事，写策划数篇，张罗活动若干。所为皆寻常，却由此略知：一事之成，多赖众人彼此搭手。今二十五，狮子座，A 型血；若问 SBti，则曰“吗喽”，聊以自嘲。烟不沾，酒少饮，偶遇米酒果酒，亦浅尝而止。\n\n工作之外，好骑车，也爱四处闲游。去处未必远，风景未必盛；只消有路可走、有风可听，便觉一日不算虚度。此间名“风隅随笔”，存技术所得，记书影所感，也收日常微末。自知不过普通人，无宏图可陈，惟愿少些喧哗，多些诚实；听风于隅，漫写人间。',
  avatarUrl: '',
  location: '中国 · 青海',
  availability: '普通人，慢慢写，认真过日子',
  facts: [
    { label: '年岁', value: '25' },
    { label: '星座', value: '狮子座' },
    { label: '血型', value: 'A 型' },
    { label: 'SBti', value: '吗喽' },
    { label: '烟酒', value: '不烟不酒，偶饮米酒果酒' },
    { label: '闲时', value: '骑行 / 到处溜达' },
  ],
  skills: [
    { name: '三端应用', description: '手机 App、小程序与 PC 端，都真正做过。' },
    { name: '数据驾驶舱', description: '把散落的指标收拢成能被看懂的大屏。' },
    { name: '数字孪生', description: '负责 UE 与前端联动，让场景和数据对上话。' },
    { name: '软件开发', description: '从需求到交付，在具体问题里一点点学会做事。' },
  ],
  tools: ['写代码', '骑车', '看书', '看电影', '数据大屏', 'UE 联动', '到处溜达'],
  timeline: [
    { year: '大学', title: '与人同做一件事', description: '在青协写策划、张罗活动，慢慢懂得彼此搭手的分量。' },
    { year: '2023', title: '代码走进真实世界', description: '进入某市电信公司实习，第一次把所学交给具体的人和事。' },
    { year: '2024.07', title: '留下来，继续做开发', description: '正式入职，做产品，也做交付，把手上的事一件件做完。' },
    { year: '至今', title: '仍在边做边学', description: '往来于三端、大屏与数字孪生之间，见得越多，越知所学尚浅。' },
  ],
  socialLinks: [
    { url: 'mailto:hello@corner.ink', icon: 'ph:envelope-simple-bold', label: 'Email' },
    { url: '/rss.xml', icon: 'ph:rss-bold', label: 'RSS' },
  ],
};

const articleContent = `# 你好，风隅随笔

终于可以认真地说一声：你好，风隅随笔。

这个名字不是为了把生活写得多么诗意，而是提醒我，在忙碌、变化和偶尔的疲惫里，仍然要给自己留下一小块安静的地方。可以写代码，也可以写一顿饭、一场雨、一本读到一半的书，或者某个不值得发朋友圈，却很想记住的傍晚。

## 为什么还要做一个自己的站点

互联网上已经有很多方便的平台，但我还是喜欢“自己的站点”这件事。这里没有必须追赶的热点，也不用把每一句话变成结论。我可以慢一点，把真正想说的内容写完整；也可以只留下一条瞬间，承认有些感受本来就没有答案。

这个站点会继续收录技术实践。那些踩过的坑、终于想明白的原理、值得反复使用的工具，都应该被整理下来。它也会收录生活。因为写代码的人并不只活在编辑器里，我们同样会被一本书安慰，被一部电影打动，也会因为湖边的一阵风而觉得今天没有白过。

## 我希望这里是什么样子

我希望风隅随笔是诚实的。

不知道的事情就说不知道，仍在学习的内容就保留过程；不为了显得厉害而堆砌术语，也不为了所谓的“氛围感”忽略真实。每一篇文章都尽量对得起阅读它的人，每一次交流也尽量带着耐心。

我也希望它是长久的。页面会改变，技术栈会升级，过去的想法也可能被新的认识修正，但记录本身会留下来。几年以后回头看，能够知道自己当时在关心什么、为什么出发，又是怎样一步一步走到现在。

## 写在开始之后

严格来说，这不是第一次开始。建站、改版、迁移、重写，已经发生过很多次。可每一次重新整理，都让我更确定：我想保留的不是一个完美的网站，而是一段持续生活、持续学习的证据。

所以，欢迎来到风隅随笔。

愿这里有认真写下的技术，也有不慌不忙的日常；有解决问题的清醒，也有允许自己停一停的从容。愿每一位偶然路过的人，都能在某一段文字里找到一点有用的信息，或者一点真诚的共鸣。

你好，风隅随笔。往后的日子，请慢慢生长。
`;

const libraryItems = [
  {
    type: 'book', title: '穆斯林的葬礼', originalTitle: null, slug: 'book-ms1cv85v',
    coverImage: '/uploads/cover/768a470c-21da-46a5-ab7f-22eb33f84d8d.webp', creator: '霍达',
    summary: '小说以北京玉器世家梁家三代人的命运为主线，跨越六十余年时空，交织着穆斯林文化与华夏传统的碰撞。故事从民国初年玉器匠人梁亦清为完成郑和航海图玉雕耗尽心血而亡开始，其徒弟韩子奇为报恩入赘梁家，重振玉器行。韩子奇与梁家姐妹君璧、冰玉之间的情感纠葛，以及女儿韩新月在新时代下的成长与爱情悲剧，共同构成了一幅民族、宗教、艺术与人性交织的画卷。作品通过玉与月的意象，展现了在历史变迁中个体对信仰、理想与情感的坚守与牺牲，深刻探讨了文化认同与生命意义。',
    reflection: '读《穆斯林的葬礼》，我首先被玉的意象吸引。韩子奇一生痴迷于玉，视其为生命与艺术的寄托，但玉的温润与坚硬也映照出他内心的矛盾——在传统与变革、信仰与世俗之间，他始终无法找到平衡。梁冰玉的出走与韩新月的早逝，让我感到一种宿命般的沉重。霍达的笔触细腻而克制，没有刻意煽情，而是让故事本身说话。最触动我的是韩新月与楚雁潮的师生之恋，那份纯净的相互理解，在时代的洪流中显得脆弱而珍贵。书中对穆斯林葬礼仪式的描写，不仅是文化细节的呈现，更是一种对生命终结的沉思。读完这部作品，我理解了葬礼不仅是肉体的消逝，也是旧时代、旧观念的终结。',
    highlights: ['玉是君子之德，也是匠人之魂，韩子奇用一生诠释了这份执着。', '梁冰玉的出走，是对传统女性命运的无声反抗，却也是另一种囚笼。', '韩新月与楚雁潮的对话，充满了对文学与理想的纯粹向往。', '葬礼仪式中，生者的哀悼与死者的安宁，构成一种庄严的平衡。', '玉器行的兴衰，暗喻着传统手艺在时代变革中的挣扎与坚守。'],
    quotes: ['人，最可怕的不是疾病，而是丧失了意志和信念。', '爱情，是生命中的一道光，但有时也会灼伤自己。', '玉，是活的，它有生命，有灵魂。', '死亡，不是生命的终结，而是另一种开始。', '我们每个人，都在自己的葬礼上，扮演着主角。'],
    genres: ['小说', '当代文学', '家族史诗'], cast: [], publishStatus: 'published', progressStatus: 'finished',
    rating: 9, recommended: true, startDate: new Date('2018-08-01'), country: '中国', language: '中文',
    publishedAt,
  },
  {
    type: 'film', title: '漫长的季节', originalTitle: 'The Long Season', slug: 'film-ms1dari6',
    coverImage: '/uploads/cover/a2366a1c-8f1f-4f20-8b61-cc537d7b3278.webp', creator: null,
    summary: '出租车司机王响（范伟 饰）与妹夫龚彪（秦昊 饰）、退休刑警马德胜（陈明昊 饰）因一桩旧案重逢。十八年前，桦林钢铁厂工人王响的儿子王阳意外溺亡，妻子随后去世，案件悬而未决。如今，一具无名尸骨的出现让三人重新踏上追寻真相之路。故事在1997年与2016年两条时间线中交错展开，揭开一段被时代洪流裹挟的往事。剧集以东北工业小城为背景，用悬疑外壳包裹对命运、亲情与时代变迁的深刻探讨，节奏沉稳，细节丰满。',
    reflection: '看完《漫长的季节》，我久久沉浸在那片灰蒙蒙的东北天空下。这部剧最打动我的不是悬疑本身，而是它如何用时间做手术刀，剖开普通人的一生。王响在1997年是个意气风发的火车司机，到了2016年却成了佝偻着背、执着于过去的老头。辛爽导演用两段时空的交叉剪辑，让我真切感受到时间对人的改变——不是突然的，而是像铁轨上的锈迹，一点点侵蚀。范伟的表演让我忘记了他曾是喜剧演员，他眼里的光从明亮到熄灭再到重新燃起，每一个阶段都真实得令人心碎。秦昊演的龚彪是个小人物，满嘴跑火车却藏着善良，他的存在给沉重的故事添了些暖色。剧中的悬疑不是那种一惊一乍的吓人，而是像剥洋葱，每剥一层都让人流泪。我尤其喜欢那些看似闲笔的日常：王响在厨房做饭、龚彪在出租车上唠嗑、马德胜在公园下棋——这些片段让角色活了起来。最后几集，当所有线索汇聚，我没有感到解谜的快感，反而有种说不出的怅然。这部剧让我明白，有些季节虽然漫长，但终究会过去，而人总要学会与过去和解。',
    highlights: ['王响在废弃的工厂里独自开着火车，汽笛声在空旷的厂房中回荡，仿佛在呼唤逝去的时光', '龚彪在出租车上对乘客讲冷笑话，后视镜里映出他疲惫却故作轻松的脸', '马德胜在公园下棋时突然想起关键线索，棋子从手中滑落，眼神骤然锐利', '王阳在雨中奔跑，镜头拉远，整个桦林笼罩在灰暗的雨幕中，像一幅褪色的油画', '三个主角在深夜的烧烤摊喝酒，沉默中彼此眼神交汇，无需言语却道尽半生沧桑'],
    quotes: ['这个季节怎么这么长啊，像过不完似的。', '往前看，别回头。', '人这一辈子，有些事是绕不过去的。', '我这一辈子，就活在这几个秋天里了。'],
    genres: ['悬疑', '剧情', '犯罪', '家庭'], cast: ['范伟', '秦昊', '陈明昊', '李庚希', '刘奕铁', '刘琳', '史彭元', '王佳佳'],
    publishStatus: 'published', progressStatus: 'watched', rating: 10, rank: 1, recommended: true,
    startDate: new Date('2025-12-01'), releaseYear: 2023, country: '中国大陆', language: '汉语普通话',
    director: '辛爽', runtimeMinutes: 60, episodeCount: 12, platform: '优酷', publishedAt,
  },
] satisfies Prisma.LibraryItemCreateInput[];

const seedMedia = [
  { relative: 'avatar/6e92f48a-b316-40ba-b136-e851f7bdadae.webp', path: '/uploads/avatar/6e92f48a-b316-40ba-b136-e851f7bdadae.webp', folder: 'avatar', originalName: 'huifeng-avatar.webp' },
  { relative: 'cover/01fdecfa-f838-42f4-8492-577ca8cc7a77.webp', path: '/uploads/cover/01fdecfa-f838-42f4-8492-577ca8cc7a77.webp', folder: 'cover', originalName: 'qinghuan-cover.webp' },
  { relative: 'cover/768a470c-21da-46a5-ab7f-22eb33f84d8d.webp', path: '/uploads/cover/768a470c-21da-46a5-ab7f-22eb33f84d8d.webp', folder: 'cover', originalName: '穆斯林的葬礼.webp' },
  { relative: 'cover/a2366a1c-8f1f-4f20-8b61-cc537d7b3278.webp', path: '/uploads/cover/a2366a1c-8f1f-4f20-8b61-cc537d7b3278.webp', folder: 'cover', originalName: '漫长的季节.webp' },
  { relative: 'moment/8e9f92a2-0770-42c6-828c-989eebef2804.webp', path: '/uploads/moment/8e9f92a2-0770-42c6-828c-989eebef2804.webp', folder: 'moment', originalName: '鉴湖傍晚.webp' },
];

async function setSetting(key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
}

async function installSeedMedia(adminId: string) {
  for (const item of seedMedia) {
    const source = join(seedAssetsRoot, item.relative);
    const target = join(uploadsRoot, item.relative);
    if (!existsSync(source)) throw new Error(`缺少初始化资源：${source}`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    const data = {
      filename: item.relative.split('/').pop()!, originalName: item.originalName,
      mimeType: 'image/webp', size: statSync(source).size, path: item.path,
      originalPath: null, folder: item.folder, uploadedBy: adminId,
    };
    const existing = await prisma.media.findFirst({ where: { path: item.path } });
    if (existing) await prisma.media.update({ where: { id: existing.id }, data });
    else await prisma.media.create({ data });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { username: adminUsername, passwordHash, role: 'admin', avatar: '/uploads/avatar/6e92f48a-b316-40ba-b136-e851f7bdadae.webp', bio: '听风于隅，漫写人间。' },
      })
    : await prisma.user.create({
        data: { username: adminUsername, email: adminEmail, passwordHash, role: 'admin', avatar: '/uploads/avatar/6e92f48a-b316-40ba-b136-e851f7bdadae.webp', bio: '听风于隅，漫写人间。' },
      });

  await installSeedMedia(admin.id);

  const deepseekApiKey = String(
    process.env.SEED_DEEPSEEK_API_KEY
    || process.env.DEEPSEEK_API_KEY
    || process.env.AI_API_KEY
    || '',
  ).trim();
  await prisma.aiModelConfig.updateMany({ data: { isDefault: false } });
  const deepseek = await prisma.aiModelConfig.upsert({
    where: { provider_name: { provider: 'deepseek', name: 'DeepSeek Flash' } },
    create: { name: 'DeepSeek Flash', provider: 'deepseek', apiKey: deepseekApiKey, baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', enabled: true, isDefault: true, sort: 0 },
    update: { ...(deepseekApiKey ? { apiKey: deepseekApiKey } : {}), baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', enabled: true, isDefault: true, sort: 0 },
  });

  for (const [key, value] of Object.entries(AI_DEFAULTS)) {
    if (key === 'ai_api_key') continue;
    await setSetting(key, value);
  }
  await setSetting('ai_api_key', deepseekApiKey);
  for (const key of ['ai_chat_model_config_id', 'ai_summarize_model_config_id', 'ai_moderate_model_config_id', 'ai_friend_moderate_model_config_id', 'ai_article_model_config_id', 'ai_moment_model_config_id', 'ai_library_model_config_id']) {
    await setSetting(key, deepseek.id);
  }

  const settings: Record<string, unknown> = {
    site_title: '风隅随笔', site_description: '听风于隅，漫写人间', site_url: 'https://corner.ink',
    site_keywords: ['风隅随笔', 'huifeng', '技术', '随笔', '书影', '生活'], media_naming: 'uuid',
    media_custom_folders: [], friends: [], about_profile: aboutProfile, theme_default: 'auto',
    my_site_info: { name: '风隅随笔', url: 'https://corner.ink/', avatar: '', rssUrl: 'https://corner.ink/rss.xml', description: '听风于隅，漫写人间' },
    email_from_name: '风隅随笔',
    music_enabled: true, music_autoplay: false, music_volume: 0.55,
    music_api: 'https://api.i-meto.com/meting/api', music_server: 'netease', music_type: 'playlist',
    music_id: '8043180114', music_cache_ttl: 21600,
    music_playlists: [
      { id: '8043180114', name: '默认歌单', type: 'playlist', server: 'netease' },
      { id: '3778678', name: '热歌榜', type: 'playlist', server: 'netease' },
    ],
  };
  for (const [key, value] of Object.entries(settings)) await setSetting(key, value);

  const category = await prisma.category.upsert({
    where: { slug: 'essay' },
    create: { name: '随笔', slug: 'essay', description: '生活感悟、随想', icon: 'FolderOutlined', color: '#f97316' },
    update: { name: '随笔', description: '生活感悟、随想' },
  });
  const tagSeeds = [
    { name: '风隅随笔', slug: 'corner-notes', color: '#10b981' },
    { name: '建站', slug: 'site-building', color: '#3b82f6' },
    { name: '生活', slug: 'life', color: '#f97316' },
  ];
  const tags: Array<{ id: string; name: string; slug: string }> = [];
  for (const tag of tagSeeds) {
    tags.push(await prisma.tag.upsert({
      where: { slug: tag.slug },
      create: { ...tag, icon: 'TagOutlined' },
      update: { name: tag.name, color: tag.color },
    }));
  }

  const postData = {
    title: '你好，风隅随笔', slug: 'hello-corner-notes', content: articleContent,
    excerpt: '这里会认真记录技术，也收藏书影与普通日子。你好，风隅随笔，愿往后的内容真诚、清醒，也足够长久。',
    coverImage: '/uploads/cover/01fdecfa-f838-42f4-8492-577ca8cc7a77.webp',
    authorId: admin.id, categoryId: category.id, status: 'published', featured: true,
    needsPublish: false, publishedAt,
  };
  const post = await prisma.post.upsert({
    where: { slug: postData.slug }, create: postData, update: postData,
  });
  await prisma.postTag.deleteMany({ where: { postId: post.id } });
  await prisma.postTag.createMany({ data: tags.map((tag) => ({ postId: post.id, tagId: tag.id })) });
  await prisma.post.update({
    where: { id: post.id },
    data: { publishedSnapshot: {
      title: postData.title, slug: postData.slug, content: postData.content, excerpt: postData.excerpt,
      coverImage: postData.coverImage, featured: true,
      category: { id: category.id, name: category.name, slug: category.slug },
      tags: tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug })),
    } },
  });

  const momentData = {
    title: '鉴湖傍晚的风', slug: 'p-ms3xhsj5-q4d6',
    content: '今天傍晚去鉴湖骑了一圈，风真是舒坦。湖面被夕阳染成暖橙色，偶尔有白鹭掠过，那一刻觉得日子也没那么匆忙。路边还有大爷在练太极拳，那架势，不慌不忙的，感觉比我们这些骑车的还从容。\n\n![瞬间图片 1](/uploads/moment/8e9f92a2-0770-42c6-828c-989eebef2804.webp)',
    excerpt: '阿风傍晚骑鉴湖，撞见大爷打太极，哆啦A梦觉得这画面比大雄的漫画还治愈。',
    authorId: admin.id, status: 'published', needsPublish: false, publishedAt,
  };
  await prisma.moment.upsert({
    where: { slug: momentData.slug },
    create: { ...momentData, publishedSnapshot: { title: momentData.title, slug: momentData.slug, content: momentData.content, excerpt: momentData.excerpt } },
    update: { ...momentData, publishedSnapshot: { title: momentData.title, slug: momentData.slug, content: momentData.content, excerpt: momentData.excerpt } },
  });

  for (const item of libraryItems) {
    await prisma.libraryItem.upsert({ where: { slug: item.slug }, create: item, update: item });
  }

  for (const packData of [
    { name: 'Twemoji', type: 'animated', sort: 1, items: twemojiItems },
    { name: 'QQ', type: 'animated', sort: 2, items: qqItems },
  ]) {
    let pack = await prisma.emojiPack.findFirst({ where: { name: packData.name } });
    pack = pack
      ? await prisma.emojiPack.update({ where: { id: pack.id }, data: { type: packData.type, sort: packData.sort, enabled: true, compressAnimated: false } })
      : await prisma.emojiPack.create({ data: { name: packData.name, type: packData.type, sort: packData.sort, enabled: true, compressAnimated: false } });
    await prisma.emojiItem.deleteMany({ where: { packId: pack.id } });
    await prisma.emojiItem.createMany({ data: packData.items.map((item) => ({ packId: pack!.id, label: item.label, char: 'char' in item ? String(item.char || '') || null : null, imageUrl: item.imageUrl, sort: item.sort })) });
  }

  console.log('正式环境初始化完成');
  console.log(`管理员: ${adminUsername} <${adminEmail}>`);
  console.log(`模型: DeepSeek Flash${deepseekApiKey ? '' : '（未写入密钥，请配置 DEEPSEEK_API_KEY）'}`);
  console.log(`文章 ${await prisma.post.count()} / 瞬间 ${await prisma.moment.count()} / 书影音 ${await prisma.libraryItem.count()} / 表情 ${await prisma.emojiItem.count()}`);
}

main()
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
