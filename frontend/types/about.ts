export interface AboutSocialLink {
  label: string
  url: string
  icon: string
}

export interface AboutSkill {
  name: string
  level: number
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
    name: '清欢小筑',
    role: '开发者 · 记录者 · 长期主义者',
    motto: '把好奇心写进代码，也写进每一个普通的日子。',
    avatarUrl: '',
    location: '中国 · 线上',
    availability: '欢迎交流与合作',
    introduction: '我是一个热爱技术与生活的开发者。白天写代码，晚上写文字。这个站点是一座持续生长的数字花园，收藏技术探索、生活感悟和那些值得被记住的片刻。\n\n我相信好作品来自耐心，好的交流始于真诚。如果你也在认真做事、认真生活，欢迎留下你的来信。',
    socialLinks: [
      { label: 'GitHub', url: 'https://github.com', icon: 'ph:github-logo-bold' },
      { label: 'Email', url: 'mailto:hello@corner.ink', icon: 'ph:envelope-simple-bold' },
      { label: 'RSS', url: '/rss.xml', icon: 'ph:rss-bold' },
    ],
    skills: [
      { name: 'Vue / Nuxt', level: 90 },
      { name: 'TypeScript', level: 88 },
      { name: 'Node.js', level: 82 },
      { name: 'Rust', level: 75 },
    ],
    timeline: [
      { year: '2025', title: '博客 v3.0 上线', description: '用 Nuxt 3 与 NestJS 重新搭建这座数字花园。' },
      { year: '2024', title: '学习 Rust', description: '从 Web 开发走向更宽阔的工程世界。' },
      { year: '2023', title: '博客 v2.0', description: '从 Hexo 迁移到 Vue 自建系统。' },
      { year: '2022', title: '开始写博客', description: '用第一篇文章，为长期记录按下开始。' },
    ],
    facts: [
      { label: '建站时间', value: '2022' },
      { label: '当前状态', value: '持续更新' },
      { label: '偏爱', value: '代码 / 书 / 电影' },
    ],
    tools: ['Nuxt 3', 'NestJS', 'PostgreSQL', 'Docker'],
  }
}

export function normalizeAboutProfile(value: unknown): AboutProfile {
  const defaults = createAboutProfile()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const source = value as Partial<AboutProfile>

  return {
    ...defaults,
    ...source,
    socialLinks: Array.isArray(source.socialLinks) ? source.socialLinks.filter(isSocialLink) : defaults.socialLinks,
    skills: Array.isArray(source.skills) ? source.skills.filter(isSkill).map((item) => ({ ...item, level: clampLevel(item.level) })) : defaults.skills,
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

function isSkill(value: unknown): value is AboutSkill {
  return isRecord(value) && typeof value.name === 'string' && typeof value.level === 'number'
}

function isTimelineItem(value: unknown): value is AboutTimelineItem {
  return isRecord(value) && typeof value.year === 'string' && typeof value.title === 'string' && typeof value.description === 'string'
}

function isFact(value: unknown): value is AboutFact {
  return isRecord(value) && typeof value.label === 'string' && typeof value.value === 'string'
}

function clampLevel(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
