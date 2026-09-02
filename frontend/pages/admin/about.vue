<template>
  <div class="about-editor admin-page-shell">
    <header class="editor-heading admin-page-head">
      <div>
        <span class="eyebrow">CONTENT / PROFILE</span>
        <h1>关于我</h1>
        <p>维护前台个人介绍、经历、技能与社交资料。</p>
      </div>
      <a-space>
        <a-button href="/about" target="_blank"><Icon name="ph:arrow-square-out-bold" /> 查看页面</a-button>
        <a-button type="primary" :loading="saving" @click="save"><Icon name="ph:floppy-disk-bold" /> 保存配置</a-button>
      </a-space>
    </header>

    <a-spin :spinning="loading">
      <a-collapse v-model:activeKey="activeCollapse" :bordered="false" class="about-collapse">
        <!-- 个人名片 -->
        <a-collapse-panel key="profile" header="个人名片">
          <div class="identity-grid">
            <div class="avatar-editor">
              <div class="avatar-preview"><img :src="avatarPreview" alt="头像预览"></div>
              <a-button size="small" @click="chooseAvatar"><Icon name="ph:image-bold" /> 选择头像</a-button>
              <a-button v-if="profile.avatarUrl" type="link" size="small" danger @click="profile.avatarUrl = ''"><Icon name="ph:arrow-counter-clockwise-bold" /> 恢复默认</a-button>
            </div>
            <a-form layout="vertical" class="identity-form">
              <div class="two-cols">
                <a-form-item label="名字"><a-input v-model:value="profile.name" :maxlength="40" /></a-form-item>
                <a-form-item label="身份描述"><a-input v-model:value="profile.role" :maxlength="80" /></a-form-item>
              </div>
              <a-form-item label="名片标签"><a-input v-model:value="profile.badge" :maxlength="20" placeholder="例如：开发者" /></a-form-item>
              <a-form-item label="一句话"><a-input v-model:value="profile.motto" :maxlength="120" show-count /></a-form-item>
              <div class="two-cols">
                <a-form-item label="所在地"><a-input v-model:value="profile.location" :maxlength="50" /></a-form-item>
                <a-form-item label="当前状态"><a-input v-model:value="profile.availability" :maxlength="50" /></a-form-item>
              </div>
            </a-form>
          </div>
        </a-collapse-panel>

        <!-- Hero 标签 -->
        <a-collapse-panel key="heroTags" header="Hero 标签">
          <p class="field-help">这些标签会在头像周围自由浮动展示，不会跟随轨道旋转。每行一个，建议 4-12 个。</p>
          <div class="token-editor">
            <span v-for="(tag, index) in profile.heroTags" :key="`${tag}-${index}`" class="token-chip">{{ tag }}<button type="button" title="删除标签" @click="profile.heroTags.splice(index, 1)"><Icon name="ph:x-bold" /></button></span>
            <input v-model="heroTagDraft" maxlength="24" placeholder="输入后回车添加" @keydown.enter.prevent="addHeroTag" />
          </div>
        </a-collapse-panel>

        <a-collapse-panel key="sectionTitles" header="区块标题">
          <p class="field-help">前台每个区块的中文标题都可以独立调整，英文小标识用于保持版式节奏。</p>
          <div class="two-cols title-fields">
            <a-form-item label="小记标题"><a-input v-model:value="profile.sectionTitles.introduction" :maxlength="30" /></a-form-item>
            <a-form-item label="札记标题"><a-input v-model:value="profile.sectionTitles.notes" :maxlength="30" /></a-form-item>
            <a-form-item label="兴趣标题"><a-input v-model:value="profile.sectionTitles.activity" :maxlength="30" /></a-form-item>
            <a-form-item label="项目标题"><a-input v-model:value="profile.sectionTitles.skills" :maxlength="30" /></a-form-item>
            <a-form-item label="档案标题"><a-input v-model:value="profile.sectionTitles.facts" :maxlength="30" /></a-form-item>
            <a-form-item label="经历标题"><a-input v-model:value="profile.sectionTitles.timeline" :maxlength="30" /></a-form-item>
            <a-form-item label="价值观标题"><a-input v-model:value="profile.sectionTitles.values" :maxlength="30" /></a-form-item>
          </div>
        </a-collapse-panel>

        <!-- 文言小传 -->
        <a-collapse-panel key="introduction" header="文言小传">
          <p class="field-help">只写来处、性情与自省；技能、兴趣和站点缘起请放在下方札记，避免把简介写成简历。</p>
          <a-textarea v-model:value="profile.introduction" :rows="8" :maxlength="2400" show-count />
        </a-collapse-panel>

        <!-- 内容札记 -->
        <a-collapse-panel key="notes" header="内容札记">
          <template #extra><a-button size="small" @click.stop="addNote"><Icon name="ph:plus-bold" /> 添加</a-button></template>
          <div class="repeat-list">
            <div v-for="(note, index) in profile.notes" :key="index" class="note-editor-row">
              <span class="row-index">{{ padIndex(index + 1) }}</span>
              <div class="note-fields">
                <div class="note-head-fields">
                  <a-input v-model:value="note.title" placeholder="标题" :maxlength="40" />
                  <a-input v-model:value="note.subtitle" placeholder="英文小标题" :maxlength="50" />
                  <a-input v-model:value="note.icon" placeholder="图标，如 ph:leaf-bold" :maxlength="60" />
                </div>
                <a-textarea v-model:value="note.content" placeholder="内容" :rows="3" :maxlength="600" show-count />
              </div>
              <div class="row-actions">
                <a-button type="text" size="small" :disabled="index === 0" title="上移" @click="move(profile.notes, index, -1)"><Icon name="ph:arrow-up-bold" /></a-button>
                <a-button type="text" size="small" :disabled="index === profile.notes.length - 1" title="下移" @click="move(profile.notes, index, 1)"><Icon name="ph:arrow-down-bold" /></a-button>
                <a-button type="text" size="small" danger title="删除" @click="profile.notes.splice(index, 1)"><Icon name="ph:trash-bold" /></a-button>
              </div>
            </div>
          </div>
        </a-collapse-panel>

        <!-- 项目作品 -->
        <a-collapse-panel key="skills" header="项目作品">
          <template #extra><a-button size="small" @click.stop="addSkill"><Icon name="ph:plus-bold" /> 添加</a-button></template>
          <div class="repeat-list">
            <div v-for="(skill, index) in profile.skills" :key="index" class="skill-editor-row">
              <a-input v-model:value="skill.name" placeholder="项目名称" :maxlength="40" />
              <a-input v-model:value="skill.description" placeholder="项目描述" :maxlength="120" />
              <a-input v-model:value="skill.url" placeholder="项目链接（可选）" :maxlength="300" />
              <a-button type="text" danger title="删除" @click="profile.skills.splice(index, 1)"><Icon name="ph:x-bold" /></a-button>
            </div>
          </div>
        </a-collapse-panel>

        <!-- 小档案 -->
        <a-collapse-panel key="facts" header="小档案">
          <template #extra><a-button size="small" @click.stop="addFact"><Icon name="ph:plus-bold" /> 添加</a-button></template>
          <div class="repeat-list">
            <div v-for="(fact, index) in profile.facts" :key="index" class="fact-editor-row">
              <a-input v-model:value="fact.label" placeholder="标签" :maxlength="30" />
              <a-input v-model:value="fact.value" placeholder="内容" :maxlength="60" />
              <a-button type="text" danger title="删除" @click="profile.facts.splice(index, 1)"><Icon name="ph:x-bold" /></a-button>
            </div>
          </div>
        </a-collapse-panel>

        <!-- 时间线 -->
        <a-collapse-panel key="timeline" header="时间线">
          <template #extra><a-button size="small" @click.stop="addTimeline"><Icon name="ph:plus-bold" /> 添加</a-button></template>
          <div class="repeat-list">
            <div v-for="(item, index) in profile.timeline" :key="index" class="timeline-editor-row">
              <span class="row-index">{{ padIndex(index + 1) }}</span>
              <a-input v-model:value="item.year" placeholder="年份" class="year-input" :maxlength="12" />
              <div class="grow-fields">
                <a-input v-model:value="item.title" placeholder="事件标题" :maxlength="80" />
                <a-textarea v-model:value="item.description" placeholder="简短说明" :rows="2" :maxlength="240" />
              </div>
              <div class="row-actions">
                <a-button type="text" size="small" :disabled="index === 0" title="上移" @click="move(profile.timeline, index, -1)"><Icon name="ph:arrow-up-bold" /></a-button>
                <a-button type="text" size="small" :disabled="index === profile.timeline.length - 1" title="下移" @click="move(profile.timeline, index, 1)"><Icon name="ph:arrow-down-bold" /></a-button>
                <a-button type="text" size="small" danger title="删除" @click="profile.timeline.splice(index, 1)"><Icon name="ph:trash-bold" /></a-button>
              </div>
            </div>
          </div>
        </a-collapse-panel>

        <!-- 价值观 -->
        <a-collapse-panel key="values" header="价值观">
          <p class="field-help">这里展示你的人生观和价值观，会独立成一个区块。</p>
          <a-textarea v-model:value="profile.values" :rows="8" :maxlength="2000" show-count />
        </a-collapse-panel>

        <!-- 社交链接 -->
        <a-collapse-panel key="social" header="社交链接">
          <template #extra><a-button size="small" @click.stop="addSocial"><Icon name="ph:plus-bold" /> 添加</a-button></template>
          <div class="repeat-list">
            <div v-for="(link, index) in profile.socialLinks" :key="index" class="social-editor-row">
              <div class="social-row-head">
                <a-select v-model:value="link.icon" class="icon-select">
                  <a-select-option v-for="icon in socialIcons" :key="icon.value" :value="icon.value"><Icon :name="icon.value" /> {{ icon.label }}</a-select-option>
                </a-select>
                <a-input v-model:value="link.label" placeholder="名称" :maxlength="30" />
                <a-button type="text" danger title="删除" @click="profile.socialLinks.splice(index, 1)"><Icon name="ph:x-bold" /></a-button>
              </div>
              <a-input v-model:value="link.url" placeholder="https:// 或 mailto:" :maxlength="300" />
            </div>
          </div>
        </a-collapse-panel>

        <!-- 工具标签 -->
        <a-collapse-panel key="tools" header="兴趣与工具">
          <p class="field-help">每行一个词，用于补充你的日常兴趣与工作工具。</p>
          <div class="token-editor">
            <span v-for="(tool, index) in profile.tools" :key="`${tool}-${index}`" class="token-chip token-chip-soft">{{ tool }}<button type="button" title="删除兴趣" @click="profile.tools.splice(index, 1)"><Icon name="ph:x-bold" /></button></span>
            <input v-model="toolDraft" maxlength="24" placeholder="输入后回车添加" @keydown.enter.prevent="addTool" />
          </div>
        </a-collapse-panel>
      </a-collapse>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { Empty } from 'ant-design-vue'
import avatarFallback from '@/assets/images/avatar.jpg'
import type { AboutFact, AboutNote, AboutProfile, AboutSkill, AboutSocialLink, AboutTimelineItem } from '@/types/about'
import { createAboutProfile, normalizeAboutProfile } from '@/types/about'

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const { open } = useMediaLibrary()
const loading = ref(true)
const saving = ref(false)
const profile = reactive<AboutProfile>(createAboutProfile())
const heroTagDraft = ref('')
const toolDraft = ref('')
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const activeCollapse = ref(['profile', 'introduction'])

const socialIcons = [
  { label: 'GitHub', value: 'ph:github-logo-bold' },
  { label: '邮箱', value: 'ph:envelope-simple-bold' },
  { label: '微博', value: 'ph:weibo-logo-bold' },
  { label: 'Twitter', value: 'ph:twitter-logo-bold' },
  { label: 'RSS', value: 'ph:rss-bold' },
  { label: '网站', value: 'ph:globe-bold' },
  { label: '其他', value: 'ph:link-bold' },
]

const avatarPreview = computed(() => profile.avatarUrl ? mediaUrl(profile.avatarUrl) : avatarFallback)

async function load() {
  loading.value = true
  try {
    const value = await api.get('/settings/about_profile')
    Object.assign(profile, normalizeAboutProfile(value))
  } catch {
    toast.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!profile.name.trim()) {
    toast.warning('请填写名字')
    return
  }
  saving.value = true
  try {
    profile.tools = profile.tools.map((item) => item.trim()).filter(Boolean)
    profile.heroTags = profile.heroTags.map((item) => item.trim()).filter(Boolean).slice(0, 16)
    const value = normalizeAboutProfile(JSON.parse(JSON.stringify(profile)))
    await api.put('/settings', { key: 'about_profile', value })
    Object.assign(profile, value)
    toast.success('关于我页面已更新')
  } catch (error: any) {
    toast.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function addHeroTag() {
  const value = heroTagDraft.value.trim()
  if (value && !profile.heroTags.includes(value) && profile.heroTags.length < 16) profile.heroTags.push(value)
  heroTagDraft.value = ''
}

function addTool() {
  const value = toolDraft.value.trim()
  if (value && !profile.tools.includes(value)) profile.tools.push(value)
  toolDraft.value = ''
}

async function chooseAvatar() {
  const urls = await open({ folder: 'about' })
  if (urls[0]) profile.avatarUrl = urls[0]
}

function addTimeline() {
  profile.timeline.push({ year: String(new Date().getFullYear()), title: '', description: '' } satisfies AboutTimelineItem)
}

function addNote() {
  profile.notes.push({ title: '', subtitle: '', content: '', icon: 'ph:leaf-bold' } satisfies AboutNote)
}

function addSkill() {
  profile.skills.push({ name: '', description: '', url: '' } satisfies AboutSkill)
}

function addSocial() {
  profile.socialLinks.push({ label: '', url: '', icon: 'ph:link-bold' } satisfies AboutSocialLink)
}

function addFact() {
  profile.facts.push({ label: '', value: '' } satisfies AboutFact)
}

function move<T>(list: T[], index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
}

function padIndex(index: number) {
  return String(index).padStart(2, '0')
}

onMounted(load)
useHead({ title: '关于我管理' })
</script>

<style scoped>
.about-editor {
  width: min(1040px, 100%);
  margin: 0 auto;
  padding-bottom: 40px;
}

.editor-heading {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: -8px -8px 24px;
  padding: 18px 8px 16px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--c-bg) 92%, transparent);
  backdrop-filter: blur(18px);
}

.eyebrow {
  margin-bottom: 5px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .14em;
}

.editor-heading h1 {
  margin: 0;
  color: var(--c-text);
  font-size: 1.6rem;
  letter-spacing: .01em;
}

.about-collapse {
  background: transparent;
  border: none;
}

.about-collapse :deep(.ant-collapse-item) {
  margin-bottom: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 8px !important;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft));
  box-shadow: 0 12px 32px color-mix(in srgb, var(--c-text) 4%, transparent);
  overflow: hidden;
}

.about-collapse :deep(.ant-collapse-header) {
  padding: 18px 22px !important;
  font-weight: 600;
  color: var(--c-text);
  letter-spacing: .01em;
}

.about-collapse :deep(.ant-collapse-content-box) {
  padding: 4px 22px 24px;
}

.field-help {
  margin: 0 0 13px;
  color: var(--c-text-3);
  font-size: .68rem;
  line-height: 1.65;
}

.token-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}

.token-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 10px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary-soft) 70%, var(--c-bg));
  color: var(--c-text-1);
  font-size: .72rem;
}

.token-chip-soft { border-color: var(--border); background: var(--c-bg-2); }
.token-chip button { display: grid; width: 18px; height: 18px; padding: 0; border: 0; background: none; color: var(--c-text-3); place-items: center; cursor: pointer; }
.token-editor input { flex: 1 1 150px; min-width: 140px; border: 0; outline: 0; background: transparent; color: var(--c-text); font: inherit; }

.identity-grid {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 24px;
}

.avatar-editor {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
}

.avatar-preview {
  width: 124px;
  aspect-ratio: 4 / 5;
  margin-bottom: 4px;
  padding: 5px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--c-primary) 10%, transparent);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity-form :deep(.ant-form-item) {
  margin-bottom: 15px;
}

.two-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.title-fields :deep(.ant-form-item) { margin-bottom: 4px; }

.repeat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-editor-row {
  display: grid;
  grid-template-columns: 28px 80px minmax(0, 1fr) 32px;
  align-items: start;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}

.note-editor-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 32px;
  align-items: start;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-bg-1) 88%, var(--c-primary-soft));
  transition: transform .2s ease, box-shadow .2s ease;
}

.note-editor-row:focus-within,
.timeline-editor-row:focus-within,
.social-editor-row:focus-within {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--c-primary) 10%, transparent);
}

.note-fields {
  display: grid;
  gap: 8px;
}

.note-head-fields {
  display: grid;
  grid-template-columns: minmax(120px, .8fr) minmax(140px, 1fr) minmax(130px, .8fr);
  gap: 8px;
}

.row-index {
  padding-top: 8px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .62rem;
}

.grow-fields,
.row-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-actions {
  gap: 1px;
}

.skill-editor-row,
.fact-editor-row {
  display: grid;
  grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr) 32px;
  gap: 7px;
  padding: 10px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}

.skill-editor-row { grid-template-columns: minmax(0, .7fr) minmax(0, 1.2fr) minmax(0, 1fr) 32px; }

.fact-editor-row {
  grid-template-columns: minmax(0, .75fr) minmax(0, 1fr) 32px;
}

.social-editor-row {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border);
}

.social-editor-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.social-row-head {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) 32px;
  gap: 7px;
}

.icon-select {
  width: 108px;
}

@media (max-width: 680px) {
  .editor-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .identity-grid,
  .two-cols,
  .note-head-fields {
    grid-template-columns: 1fr;
  }

  .avatar-editor {
    align-items: flex-start;
  }

  .timeline-editor-row {
    grid-template-columns: 24px minmax(0, 1fr) 32px;
  }

  .timeline-editor-row .year-input {
    grid-column: 2;
    width: 100%;
  }

  .timeline-editor-row .grow-fields {
    grid-column: 2;
  }

  .timeline-editor-row .row-actions {
    grid-column: 3;
    grid-row: 1 / span 3;
  }

  .skill-editor-row,
  .fact-editor-row {
    grid-template-columns: 1fr;
  }

  .social-row-head {
    grid-template-columns: 1fr;
  }

  .icon-select {
    width: 100%;
  }
}
</style>
