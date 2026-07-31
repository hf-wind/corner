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
    notes: [
      { title: '平日所习', subtitle: 'ABOUT THE WORK', icon: 'ph:code-bold', content: '前端、后端与部署运维都略有涉猎，也在学习如何让 AI 成为可靠的协作者。做过 App、小程序、PC 端、数据驾驶舱及数字孪生联动。它们不是履历墙，只是我用来解决问题的一只工具箱。' },
      { title: '闲时所好', subtitle: 'OFF THE CLOCK', icon: 'ph:bicycle-bold', content: '喜欢骑车、看书、看电影，也爱没有目的地四处走走。与生活对线时胜率一般，幸好一顿好吃的、一阵晚风，或一次不爆红的部署，通常都能让血条慢慢回来。' },
      { title: '此间缘起', subtitle: 'WHY THIS CORNER', icon: 'ph:wind-bold', content: '“风隅随笔”不是作品陈列柜，更像一张靠窗的旧书桌。这里收技术所得、书影所感与日常微末；不追赶喧哗，也不急着下结论。若偶然能给来客一点用处或片刻共鸣，便已足够。' },
    ],
    socialLinks: [
      { label: 'Email', url: 'mailto:hello@corner.ink', icon: 'ph:envelope-simple-bold' },
      { label: 'RSS', url: '/rss.xml', icon: 'ph:rss-bold' },
    ],
    skills: [
      { name: '界面与交互', description: '把页面、状态与细节慢慢收拾妥当，希望功能不止能用，也能让人用得舒服。' },
      { name: '服务与数据', description: '写接口、理数据、补边界；能力有限，便多做验证，让服务尽量清楚可靠。' },
      { name: '部署与照看', description: '接触 Linux、Docker、反向代理与 CI/CD，也愿意对上线后的运行负责。' },
      { name: 'AI 与自动化', description: '尝试模型接入和工作流，但不把判断交出去，结果仍需人工检查与承担。' },
      { name: '跨端与大屏', description: '做过 App、小程序、PC 端与数据驾驶舱，在不同屏幕上解决具体问题。' },
      { name: '场景与孪生', description: '参与 UE 与前端联动，让虚拟场景听懂真实数据；仍有许多地方要继续学。' },
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

  return {
    ...defaults,
    ...source,
    badge: typeof source.badge === 'string' && source.badge.trim() ? source.badge.trim() : defaults.badge,
    role: typeof role === 'string' ? role : defaults.role,
    location: typeof location === 'string' ? location : defaults.location,
    availability: typeof availability === 'string' ? availability : defaults.availability,
    socialLinks: Array.isArray(source.socialLinks) ? source.socialLinks.filter(isSocialLink) : defaults.socialLinks,
    notes: Array.isArray(source.notes) ? source.notes.filter(isNote) : defaults.notes,
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

function isNote(value: unknown): value is AboutNote {
  return isRecord(value) && typeof value.title === 'string' && typeof value.subtitle === 'string'
    && typeof value.content === 'string' && typeof value.icon === 'string'
}
