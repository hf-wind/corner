export interface AboutSocialLink {
  label: string
  url: string
  icon: string
}

export interface AboutSkill {
  name: string
  description: string
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

export interface AboutProfile {
  name: string
  badge: string
  role: string
  motto: string
  avatarUrl: string
  location: string
  availability: string
  introduction: string
  socialLinks: AboutSocialLink[]
  skills: AboutSkill[]
  timeline: AboutTimelineItem[]
  facts: AboutFact[]
  tools: string[]
}

export function createAboutProfile(): AboutProfile {
  return {
    name: 'huifeng',
    badge: '开发者',
    role: '绍兴 · 写代码 · 骑车闲游',
    motto: '听风于隅，漫写人间',
    avatarUrl: '',
    location: '中国 · 绍兴',
    availability: '持续写作，也持续学习',
    introduction: '余籍青海，少习计算机之术，科班出身。癸卯年入某市电信实习，从软件开发之事；甲辰七月转正，遂以此为业。迄今所作，横跨掌中 App、小程序与案头 PC 三端，亦曾铺陈驾驶舱数据大屏。又参与数字孪生项目，司 UE 与前端相联，使虚景能应实数。技未敢言精，不过逢题拆题，遇坑填坑，日拱一卒而已。\n\n大学之时，曾为青协志愿者干事，写策划数篇，张罗活动若干。所为皆寻常，却由此略知：一事之成，多赖众人彼此搭手。今二十五，狮子座，A 型血；若问 SBti，则曰“吗喽”，聊以自嘲。烟不沾，酒少饮，偶遇米酒果酒，亦浅尝而止。\n\n工作之外，好骑车，也爱四处闲游。去处未必远，风景未必盛；只消有路可走、有风可听，便觉一日不算虚度。此间名“风隅随笔”，存技术所得，记书影所感，也收日常微末。自知不过普通人，无宏图可陈，惟愿少些喧哗，多些诚实；听风于隅，漫写人间。',
    socialLinks: [
      { label: 'Email', url: 'mailto:hello@corner.ink', icon: 'ph:envelope-simple-bold' },
      { label: 'RSS', url: '/rss.xml', icon: 'ph:rss-bold' },
    ],
    skills: [
      { name: '三端应用', description: '手机 App、小程序与 PC 端，都真正做过。' },
      { name: '数据驾驶舱', description: '把散落的指标收拢成能被看懂的大屏。' },
      { name: '数字孪生', description: '负责 UE 与前端联动，让场景和数据对上话。' },
      { name: '软件开发', description: '从需求到交付，在具体问题里一点点学会做事。' },
    ],
    timeline: [
      { year: '大学', title: '与人同做一件事', description: '在青协写策划、张罗活动，慢慢懂得彼此搭手的分量。' },
      { year: '2023', title: '代码走进真实世界', description: '进入某市电信公司实习，第一次把所学交给具体的人和事。' },
      { year: '2024.07', title: '留下来，继续做开发', description: '正式入职，做产品，也做交付，把手上的事一件件做完。' },
      { year: '至今', title: '仍在边做边学', description: '往来于三端、大屏与数字孪生之间，见得越多，越知所学尚浅。' },
    ],
    facts: [
      { label: '年岁', value: '25' },
      { label: '星座', value: '狮子座' },
      { label: '血型', value: 'A 型' },
      { label: 'SBti', value: '吗喽' },
      { label: '烟酒', value: '不烟不酒，偶饮米酒果酒' },
      { label: '闲时', value: '骑行 / 到处溜达' },
    ],
    tools: ['写代码', '骑车', '看书', '看电影', '数据大屏', 'UE 联动', '到处溜达'],
  }
}

export function normalizeAboutProfile(value: unknown): AboutProfile {
  const defaults = createAboutProfile()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const source = value as Partial<AboutProfile>
  const role = source.role === '青海人 · 写代码 · 骑车闲游' ? defaults.role : source.role
  const location = source.location === '中国 · 青海' ? defaults.location : source.location
  const availability = source.availability === '普通人，慢慢写，认真过日子' ? defaults.availability : source.availability

  return {
    ...defaults,
    ...source,
    badge: typeof source.badge === 'string' && source.badge.trim() ? source.badge.trim() : defaults.badge,
    role: typeof role === 'string' ? role : defaults.role,
    location: typeof location === 'string' ? location : defaults.location,
    availability: typeof availability === 'string' ? availability : defaults.availability,
    socialLinks: Array.isArray(source.socialLinks) ? source.socialLinks.filter(isSocialLink) : defaults.socialLinks,
    skills: Array.isArray(source.skills) ? source.skills.filter(isSkill).map((item) => ({
      name: item.name,
      description: typeof item.description === 'string' ? item.description : '',
    })) : defaults.skills,
    timeline: Array.isArray(source.timeline) ? source.timeline.filter(isTimelineItem) : defaults.timeline,
    facts: Array.isArray(source.facts) ? source.facts.filter(isFact) : defaults.facts,
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
