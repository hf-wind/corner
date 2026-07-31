<template>
  <div class="about-editor">
    <header class="editor-heading">
      <div>
        <p class="eyebrow">CONTENT / PROFILE</p>
        <h1>关于我</h1>
      </div>
      <a-space>
        <a-button href="/about" target="_blank"><Icon name="ph:arrow-square-out-bold" /> 查看页面</a-button>
        <a-button type="primary" :loading="saving" @click="save"><Icon name="ph:floppy-disk-bold" /> 保存配置</a-button>
      </a-space>
    </header>

    <a-spin :spinning="loading">
      <div class="editor-grid">
        <div class="editor-main">
          <a-card :bordered="false" class="editor-section" title="个人名片">
            <div class="identity-grid">
              <div class="avatar-editor">
                <div class="avatar-preview"><img :src="avatarPreview" alt="头像预览"></div>
                <a-button size="small" @click="chooseAvatar"><Icon name="ph:image-bold" /> 选择头像</a-button>
                <a-button v-if="profile.avatarUrl" type="link" size="small" danger @click="profile.avatarUrl = ''">恢复默认</a-button>
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
          </a-card>

          <a-card :bordered="false" class="editor-section" title="文言小传">
            <p class="field-help">只写来处、性情与自省；技能、兴趣和站点缘起请放在下方札记，避免把简介写成简历。</p>
            <a-textarea v-model:value="profile.introduction" :rows="8" :maxlength="2400" show-count />
          </a-card>

          <a-card :bordered="false" class="editor-section">
            <template #title><span>内容札记</span></template>
            <template #extra><a-button size="small" @click="addNote"><Icon name="ph:plus-bold" /> 添加</a-button></template>
            <div class="repeat-list">
              <div v-for="(note, index) in profile.notes" :key="index" class="note-editor-row">
                <span class="row-index">{{ padIndex(index + 1) }}</span>
                <div class="note-fields">
                  <div class="note-head-fields">
                    <a-input v-model:value="note.title" placeholder="标题，如：闲时所好" :maxlength="40" />
                    <a-input v-model:value="note.subtitle" placeholder="英文小标题" :maxlength="50" />
                    <a-input v-model:value="note.icon" placeholder="ph:leaf-bold" :maxlength="60" />
                  </div>
                  <a-textarea v-model:value="note.content" placeholder="独立讲清这一面的内容" :rows="3" :maxlength="600" show-count />
                </div>
                <div class="row-actions">
                  <a-button type="text" size="small" :disabled="index === 0" title="上移" @click="move(profile.notes, index, -1)"><Icon name="ph:arrow-up-bold" /></a-button>
                  <a-button type="text" size="small" :disabled="index === profile.notes.length - 1" title="下移" @click="move(profile.notes, index, 1)"><Icon name="ph:arrow-down-bold" /></a-button>
                  <a-button type="text" size="small" danger title="删除" @click="profile.notes.splice(index, 1)"><Icon name="ph:trash-bold" /></a-button>
                </div>
              </div>
            </div>
          </a-card>

          <a-card :bordered="false" class="editor-section">
            <template #title><span>个人经历</span></template>
            <template #extra><a-button size="small" @click="addTimeline"><Icon name="ph:plus-bold" /> 添加</a-button></template>
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
              <a-empty v-if="!profile.timeline.length" :image="simpleImage" description="暂无经历" />
            </div>
          </a-card>
        </div>

        <aside class="editor-side">
          <a-card :bordered="false" class="editor-section compact-section">
            <template #title><span>做过这些</span></template>
            <template #extra><a-button type="link" size="small" @click="addSkill"><Icon name="ph:plus-bold" /> 添加</a-button></template>
            <div class="compact-list">
              <div v-for="(skill, index) in profile.skills" :key="index" class="skill-editor-row">
                <a-input v-model:value="skill.name" placeholder="项目或经验" :maxlength="40" />
                <a-input v-model:value="skill.description" placeholder="用一句话说明" :maxlength="120" />
                <a-button type="text" danger title="删除" @click="profile.skills.splice(index, 1)"><Icon name="ph:x-bold" /></a-button>
              </div>
            </div>
          </a-card>

          <a-card :bordered="false" class="editor-section compact-section">
            <template #title><span>社交链接</span></template>
            <template #extra><a-button type="link" size="small" @click="addSocial"><Icon name="ph:plus-bold" /> 添加</a-button></template>
            <div class="stack-list">
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
          </a-card>

          <a-card :bordered="false" class="editor-section compact-section">
            <template #title><span>个人标签</span></template>
            <template #extra><a-button type="link" size="small" @click="addFact"><Icon name="ph:plus-bold" /> 添加</a-button></template>
            <div class="compact-list">
              <div v-for="(fact, index) in profile.facts" :key="index" class="fact-editor-row">
                <a-input v-model:value="fact.label" placeholder="名称" :maxlength="30" />
                <a-input v-model:value="fact.value" placeholder="内容" :maxlength="60" />
                <a-button type="text" danger title="删除" @click="profile.facts.splice(index, 1)"><Icon name="ph:x-bold" /></a-button>
              </div>
            </div>
          </a-card>

          <a-card :bordered="false" class="editor-section compact-section" title="生活与工具">
            <a-textarea v-model:value="toolsText" :rows="6" placeholder="每行一个词，会在关于页轮换展示" />
          </a-card>
        </aside>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { Empty } from 'ant-design-vue'
import avatarFallback from '~/assets/images/avatar.jpg'
import type { AboutFact, AboutNote, AboutProfile, AboutSkill, AboutSocialLink, AboutTimelineItem } from '~/types/about'
import { createAboutProfile, normalizeAboutProfile } from '~/types/about'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const { open } = useMediaLibrary()
const loading = ref(true)
const saving = ref(false)
const profile = reactive<AboutProfile>(createAboutProfile())
const toolsText = ref(profile.tools.join('\n'))
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

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
    toolsText.value = profile.tools.join('\n')
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
    profile.tools = toolsText.value.split(/\r?\n|[,，]/).map((item) => item.trim()).filter(Boolean)
    const value = normalizeAboutProfile(JSON.parse(JSON.stringify(profile)))
    await api.put('/settings', { key: 'about_profile', value })
    Object.assign(profile, value)
    toolsText.value = profile.tools.join('\n')
    toast.success('关于我页面已更新')
  } catch (error: any) {
    toast.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
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
  profile.skills.push({ name: '', description: '' } satisfies AboutSkill)
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
  width: min(1260px, 100%);
  margin: 0 auto;
}

.editor-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
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
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(330px, .8fr);
  gap: 18px;
}

.editor-main,
.editor-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 18px;
}

.editor-section {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 8px;
  background: var(--ld-bg-card);
}

.field-help { margin: -3px 0 13px; color: var(--c-text-3); font-size: .68rem; line-height: 1.65; }

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
  width: 112px;
  aspect-ratio: 4 / 5;
  margin-bottom: 4px;
  padding: 5px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
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

.repeat-list,
.compact-list,
.stack-list {
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

.note-editor-row { display:grid; grid-template-columns:28px minmax(0,1fr) 32px; align-items:start; gap:9px; padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--c-bg-1); }
.note-fields { display:grid; gap:8px; }
.note-head-fields { display:grid; grid-template-columns:minmax(120px,.8fr) minmax(140px,1fr) minmax(130px,.8fr); gap:8px; }

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
}

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

@media (max-width: 1080px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .editor-side {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .identity-grid,.two-cols,.note-head-fields { grid-template-columns:1fr; }
  .avatar-editor { align-items:flex-start; }
  .timeline-editor-row { grid-template-columns:24px minmax(0,1fr) 32px; }
  .timeline-editor-row .year-input { grid-column:2; width:100%; }
  .timeline-editor-row .grow-fields { grid-column:2; }
  .timeline-editor-row .row-actions { grid-column:3; grid-row:1 / span 3; }
}

@media (max-width: 680px) {
  .editor-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .identity-grid,
  .editor-side {
    grid-template-columns: 1fr;
  }

  .two-cols {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .timeline-editor-row {
    grid-template-columns: 24px 68px minmax(0, 1fr);
  }

  .row-actions {
    grid-column: 2 / -1;
    flex-direction: row;
  }
}
</style>
