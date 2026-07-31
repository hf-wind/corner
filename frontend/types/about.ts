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
    introduction: '我来自青海，现在生活和工作在绍兴。科班学的是计算机，后来很自然地做了软件开发。一路做过手机 App、小程序、PC 端和数据驾驶舱，也参与过数字孪生，让 UE 场景和前端数据互相听得懂。前端、后端、部署运维都碰，AI 也在认真学着用；谈不上样样精通，只是遇到问题愿意多看一眼，再把它拆小一点。\n\n我不太想把“会用什么”写成一排闪亮的标签。技术于我，更像是把想法安稳落地的工具：页面要让人用着舒服，接口要经得住折腾，服务上线后也得有人照看。偶尔借 AI 多一双眼睛，但最后的判断、验证和责任仍然要自己接住。会的东西有限，好在还愿意继续学，也不介意承认“这个我得先查查”。\n\n工作之外喜欢骑车、看书、看电影，也爱没有目的地到处溜达。与生活对线时胜率一般，幸好还能靠一顿好吃的、一阵晚风和一次不爆红的部署回血。这个站点不准备证明我有多厉害，只想安静保存技术所得、书影所感和普通日子。若这些记录偶尔能帮到谁，已经很好。',
    socialLinks: [
      { label: 'Email', url: 'mailto:hello@corner.ink', icon: 'ph:envelope-simple-bold' },
      { label: 'RSS', url: '/rss.xml', icon: 'ph:rss-bold' },
    ],
    skills: [
      { name: '前端与交互', description: '把界面、状态和细节收拾妥当，让功能不只“能用”。' },
      { name: '后端与数据', description: '写接口、理数据、补边界，尽量让服务清楚而可靠。' },
      { name: '运维与交付', description: 'Linux、Docker、反向代理与 CI/CD，负责把代码平稳送到线上。' },
      { name: 'AI 协作', description: '接入模型与自动化工作流，也坚持人工判断、测试和复核。' },
      { name: '跨端应用', description: '做过 App、小程序和 PC 端，在不同屏幕间解决同一件事。' },
      { name: '可视化与孪生', description: '做数据驾驶舱，也参与 UE 与前端联动，让场景和数据对上话。' },
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
