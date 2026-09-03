export interface AboutSocialLink {
  label: string
  url: string
  icon: string
}

export interface AboutSkill {
  name: string
  description: string
  url: string
}

export interface AboutSectionTitles {
  introduction: string
  notes: string
  activity: string
  skills: string
  facts: string
  timeline: string
  values: string
}

export interface AboutSectionDescriptions {
  introduction: string
  notes: string
  activity: string
  skills: string
  facts: string
  timeline: string
  values: string
}

export interface AboutTimelineItem {
  year: string
  title: string
  description: string
}

export interface AboutFact {
  label: string
  value: string
}

export interface AboutNote {
  title: string
  subtitle: string
  content: string
  icon: string
}

export interface AboutProfile {
  name: string
  badge: string
  role: string
  motto: string
  avatarUrl: string
  location: string
  availability: string
  introduction: string
  values: string
  heroTags: string[]
  sectionTitles: AboutSectionTitles
  sectionDescriptions: AboutSectionDescriptions
  notes: AboutNote[]
  socialLinks: AboutSocialLink[]
  skills: AboutSkill[]
  timeline: AboutTimelineItem[]
  facts: AboutFact[]
  tools: string[]
}

export function createAboutProfile(): AboutProfile {
  return {
    name: 'huifeng',
    badge: '一介写代码的人',
    role: '生于青海，现居绍兴',
    motto: '听风于隅，漫写人间',
    avatarUrl: '',
    location: '中国 · 绍兴',
    availability: '所学尚浅，仍在慢慢做事',
    introduction: '余籍青海，少习计算机之术，科班出身。癸卯年入某市电信实习，从软件开发之事；甲辰七月转正，遂以此为业。技未敢言精，不过逢题拆题，遇坑填坑，日拱一卒而已。\n\n性喜安静，亦不拒热闹。知世间能者甚众，故不敢以所会自矜；偶有所成，多赖前人之路、同伴之助。所愿不过把手边之事做稳，把不懂之处弄明白，得闲时留几行真话。',
    values: '我不太在意一个人世俗意义上的成功。钱很重要，它能让人生活得体面，也能换来选择的余地，但我不认为钱本身就是生活的意义。\n\n把手边的事做稳，把不懂的地方弄明白，保持诚实，也给生活留一点不被效率占满的空间。',
    heroTags: ['Vue', 'TypeScript', 'Docker', '骑行', '阅读', 'AI 协作'],
    sectionTitles: {
      introduction: '小记其人',
      notes: '几页闲话',
      activity: '此刻在做什么',
      skills: '平日所做',
      facts: '小档案',
      timeline: '来路拾记',
      values: '价值观',
    },
    sectionDescriptions: {
      introduction: '从哪里来，正在成为怎样的人，以及为什么在这里留下记录。',
      notes: '关于工作、生活和这个小站的几页闲话。',
      activity: '正在使用的工具，也是在持续练习的事情。',
      skills: '把做过的项目和愿意继续打磨的能力，整理成几行。',
      facts: '一些轻量、具体、不必过度解释的小档案。',
      timeline: '没有既定路线，只有下一件想做好的事。',
      values: '在效率之外，仍然愿意保留的判断与尺度。',
    },
    notes: [
      { title: '平日所习', subtitle: 'ABOUT THE WORK', icon: 'ph:code-bold', content: '前端、后端与部署运维都略有涉猎，也在学习如何让 AI 成为可靠的协作者。做过 App、小程序、PC 端、数据驾驶舱及数字孪生联动。它们不是履历墙，只是我用来解决问题的一只工具箱。' },
      { title: '闲时所好', subtitle: 'OFF THE CLOCK', icon: 'ph:bicycle-bold', content: '喜欢骑车、看书、看电影，也爱没有目的地四处走走。与生活对线时胜率一般，幸好一顿好吃的、一阵晚风，或一次不爆红的部署，通常都能让血条慢慢回来。' },
      { title: '此间缘起', subtitle: 'WHY THIS CORNER', icon: 'ph:wind-bold', content: '"风隅随笔"不是作品陈列柜，更像一张靠窗的旧书桌。这里收技术所得、书影所感与日常微末；不追赶喧哗，也不急着下结论。若偶然能给来客一点用处或片刻共鸣，便已足够。' },
    ],
    socialLinks: [
      { label: 'Email', url: 'mailto:hello@corner.ink', icon: 'ph:envelope-simple-bold' },
      { label: 'RSS', url: '/rss.xml', icon: 'ph:rss-bold' },
    ],
    skills: [
      { name: '界面与交互', description: '把页面、状态与细节慢慢收拾妥当，希望功能不止能用，也能让人用得舒服。', url: '' },
      { name: '服务与数据', description: '写接口、理数据、补边界；能力有限，便多做验证，让服务尽量清楚可靠。', url: '' },
      { name: '部署与照看', description: '接触 Linux、Docker、反向代理与 CI/CD，也愿意对上线后的运行负责。', url: '' },
      { name: 'AI 与自动化', description: '尝试模型接入和工作流，但不把判断交出去，结果仍需人工检查与承担。', url: '' },
      { name: '跨端与大屏', description: '做过 App、小程序、PC 端与数据驾驶舱，在不同屏幕上解决具体问题。', url: '' },
      { name: '场景与孪生', description: '参与 UE 与前端联动，让虚拟场景听懂真实数据；仍有许多地方要继续学。', url: '' },
    ],
    timeline: [
      { year: '大学', title: '与人同做一件事', description: '在青协写策划、张罗活动，慢慢懂得彼此搭手的分量。' },
      { year: '2023', title: '代码走进真实世界', description: '进入某市电信公司实习，第一次把所学交给具体的人和事。' },
      { year: '2024.07', title: '留下来，继续做开发', description: '正式入职，做产品，也做交付，把手上的事一件件做完。' },
      { year: '至今', title: '仍在边做边学', description: '往来于三端、大屏与数字孪生之间，见得越多，越知所学尚浅。' },
    ],
    facts: [
      { label: '生年', value: '世纪之交后一年' },
      { label: '星座', value: '狮子座' },
      { label: '血型', value: 'A 型' },
      { label: 'SBti', value: '吗喽，自嘲而已' },
      { label: '烟酒', value: '不烟不酒，偶饮米酒果酒' },
      { label: '闲时', value: '骑行 / 到处溜达' },
    ],
    tools: ['前端页面', '后端接口', 'Docker', 'CI/CD', 'AI 协作', '数据可视化', 'UE 联动', '骑车', '看书', '发呆'],
  }
}

export function normalizeAboutProfile(value: unknown): AboutProfile {
  const defaults = createAboutProfile()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const source = value as Partial<AboutProfile>
  const role = source.role === '青海人 · 写代码 · 骑车闲游' ? defaults.role : source.role
  const location = source.location === '中国 · 青海' ? defaults.location : source.location
  const availability = source.availability === '普通人，慢慢写，认真过日子' ? defaults.availability : source.availability

  const rawFacts = Array.isArray(source.facts) ? source.facts.filter(isFact) : defaults.facts
  const legacyValues = rawFacts.find((item) => item.label.trim() === '价值观')?.value || ''
  const normalizedValues = typeof source.values === 'string' && source.values.trim()
    ? source.values.trim()
    : legacyValues || defaults.values
  const normalizedHeroTags = Array.isArray(source.heroTags)
    ? source.heroTags.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()).slice(0, 16)
    : defaults.heroTags
  const sourceTitles = source.sectionTitles && typeof source.sectionTitles === 'object'
    ? source.sectionTitles as Partial<AboutSectionTitles>
    : {}
  const sectionTitles = Object.fromEntries(Object.entries(defaults.sectionTitles).map(([key, fallback]) => {
    const value = sourceTitles[key as keyof AboutSectionTitles]
    return [key, typeof value === 'string' && value.trim() ? value.trim().slice(0, 30) : fallback]
  })) as AboutSectionTitles
  const sourceDescriptions = source.sectionDescriptions && typeof source.sectionDescriptions === 'object'
    ? source.sectionDescriptions as Partial<AboutSectionDescriptions>
    : {}
  const sectionDescriptions = Object.fromEntries(Object.entries(defaults.sectionDescriptions).map(([key, fallback]) => {
    const value = sourceDescriptions[key as keyof AboutSectionDescriptions]
    return [key, typeof value === 'string' && value.trim() ? value.trim().slice(0, 180) : fallback]
  })) as AboutSectionDescriptions

  return {
    ...defaults,
    ...source,
    badge: typeof source.badge === 'string' && source.badge.trim() ? source.badge.trim() : defaults.badge,
    role: typeof role === 'string' ? role : defaults.role,
    location: typeof location === 'string' ? location : defaults.location,
    availability: typeof availability === 'string' ? availability : defaults.availability,
    values: normalizedValues,
    heroTags: normalizedHeroTags.length ? normalizedHeroTags : defaults.heroTags,
    sectionTitles,
    sectionDescriptions,
    socialLinks: Array.isArray(source.socialLinks) ? source.socialLinks.filter(isSocialLink) : defaults.socialLinks,
    notes: Array.isArray(source.notes) ? source.notes.filter(isNote) : defaults.notes,
    skills: Array.isArray(source.skills) ? source.skills.filter(isSkill).map((item) => ({
      name: item.name,
      description: typeof item.description === 'string' ? item.description : '',
      url: typeof item.url === 'string' ? item.url : '',
    })) : defaults.skills,
    timeline: Array.isArray(source.timeline) ? source.timeline.filter(isTimelineItem) : defaults.timeline,
    facts: rawFacts.filter((item) => item.label.trim() !== '价值观'),
    tools: Array.isArray(source.tools) ? source.tools.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : defaults.tools,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSocialLink(value: unknown): value is AboutSocialLink {
  return isRecord(value) && typeof value.label === 'string' && typeof value.url === 'string' && typeof value.icon === 'string'
}

function isSkill(value: unknown): value is AboutSkill & { level?: number } {
  return isRecord(value) && typeof value.name === 'string'
}

function isTimelineItem(value: unknown): value is AboutTimelineItem {
  return isRecord(value) && typeof value.year === 'string' && typeof value.title === 'string' && typeof value.description === 'string'
}

function isFact(value: unknown): value is AboutFact {
  return isRecord(value) && typeof value.label === 'string' && typeof value.value === 'string'
}

function isNote(value: unknown): value is AboutNote {
  return isRecord(value) && typeof value.title === 'string' && typeof value.subtitle === 'string'
    && typeof value.content === 'string' && typeof value.icon === 'string'
}
