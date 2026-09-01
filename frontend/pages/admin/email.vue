<template>
  <div class="email-logs-page admin-page-shell">
    <header class="admin-page-head"><div><span>COMMUNICATION</span><h1>邮件功能</h1><p>管理投递记录、订阅周报和邮件模板。</p></div><AdminRefreshButton :loading="tab === 'templates' ? templatesLoading : loading" @click="tab === 'templates' ? loadTemplates() : tab === 'newsletter' ? newsletterRef?.loadAll() : loadLogs()" /></header>
    <a-tabs v-model:activeKey="tab" size="small">
      <a-tab-pane key="logs" tab="发送记录" />
      <a-tab-pane key="newsletter" tab="订阅周报" />
      <a-tab-pane key="templates" tab="邮件模板" />
    </a-tabs>

    <section v-if="tab === 'newsletter'" class="newsletter-tab">
      <NewsletterAdmin ref="newsletterRef" :embedded="true" />
    </section>

    <section v-show="tab === 'templates'" class="template-workspace">
      <aside class="template-list">
        <button v-for="item in templates" :key="item.key" type="button" :class="{ active: selected?.key === item.key }" @click="selectTemplate(item)">
          <span><Icon :name="templateIcon(item.key)" /></span><div><strong>{{ item.name }}</strong><small>{{ item.description }}</small></div><a-tag :color="item.custom ? 'orange' : 'default'">{{ item.custom ? '自定义' : '系统默认' }}</a-tag>
        </button>
      </aside>
      <a-spin :spinning="templatesLoading" class="template-editor-spin">
        <div v-if="selected" class="template-editor">
          <header class="editor-header"><div><h2>{{ selected.name }}</h2><p>{{ selected.description }}</p></div><div class="editor-header-actions"><a-tag :color="editor.custom ? 'blue' : 'default'">{{ editor.custom ? '自定义模板' : '系统默认' }}</a-tag><a-button v-if="!editor.custom" size="small" @click="startEditing"><Icon name="ph:pencil-simple-bold" /> 编辑</a-button><a-button size="small" @click="previewTemplate"><Icon name="ph:eye-bold" /> 预览</a-button><a-button v-if="editor.custom && selected.custom" size="small" danger @click="restoreDefault"><Icon name="ph:arrow-counter-clockwise-bold" /> 恢复默认</a-button><a-button v-if="editor.custom" type="primary" size="small" :loading="templateSaving" @click="saveTemplate"><Icon name="ph:floppy-disk-bold" /> 保存</a-button></div></header>
          <label><span>邮件主题</span><a-input v-model:value="editor.subject" :disabled="!editor.custom" /></label>
          <section class="html-template-section"><header><span>HTML 模板</span><a-button type="text" size="small" @click="editor.htmlExpanded = !editor.htmlExpanded"><Icon :name="editor.htmlExpanded ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" />{{ editor.htmlExpanded ? '收起模板' : '展开模板' }}</a-button></header><div v-if="!editor.htmlExpanded" class="html-template-collapsed"><Icon name="ph:code-bold" /><span>模板代码已折叠，点击展开后编辑</span><small>{{ editor.html.length }} 字符</small></div><a-textarea v-else v-model:value="editor.html" :rows="28" :disabled="!editor.custom" class="html-editor" /></section>
          <div class="variables"><span>预设变量</span><p>在主题或 HTML 中插入变量，发送时系统会替换为当前通知的实际内容。</p><button v-for="variable in selected.variables" :key="variable" type="button" :disabled="!editor.custom" @click="insertVariable(variable)"><code v-text="formatVariable(variable)" /><small>{{ variableDescription(variable) }}</small></button><em>富文本正文使用 <code v-text="formatVariable('contentHtml', true)" />，其余变量均自动转义。</em></div>
        </div>
        <a-empty v-else description="请选择邮件模板" />
      </a-spin>
    </section>

    <div v-show="tab === 'logs'">
    <div class="admin-table-shell">
        <div class="card-header table-toolbar">
          <strong>邮件记录</strong>
          <div class="filter-bar">
            <a-select v-model:value="filterType" placeholder="邮件类型" allowClear class="type-filter">
              <a-select-option value="verification">验证码</a-select-option>
              <a-select-option value="comment_notification">评论通知</a-select-option>
              <a-select-option value="reply_notification">回复通知</a-select-option>
              <a-select-option value="like_notification">点赞通知</a-select-option>
            </a-select>
            <a-select v-model:value="filterStatus" placeholder="发送状态" allowClear class="status-filter">
              <a-select-option value="pending">待发送</a-select-option>
              <a-select-option value="sending">发送中</a-select-option>
              <a-select-option value="sent">已发送</a-select-option>
              <a-select-option value="failed">失败</a-select-option>
            </a-select>
            <a-button type="primary" @click="applyLogFilters"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
            <a-button @click="resetLogFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
          </div>
        </div>

      <a-spin :spinning="loading">
        <a-table :dataSource="logs" :columns="columns" :pagination="false" :scroll="{ x: 1420 }" rowKey="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="getTypeColor(record.type)">{{ getTypeLabel(record.type) }}</a-tag>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">{{ getStatusLabel(record.status) }}</a-tag>
            </template>
            <template v-if="column.key === 'content'">
              <span v-if="record.content" class="content-text">{{ truncate(stripHtml(record.content), 50) }}</span>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'subject'">
              <a-tooltip :title="record.subject"><span class="subject-text">{{ record.subject }}</span></a-tooltip>
            </template>
            <template v-if="column.key === 'createdAt'">
              {{ formatDate(record.createdAt) }}
            </template>
            <template v-if="column.key === 'sentAt'">
              {{ record.sentAt ? formatDate(record.sentAt) : '-' }}
            </template>
            <template v-if="column.key === 'error'">
              <a-tooltip v-if="record.error" :title="record.error">
                <span class="error-text">{{ truncate(record.error, 30) }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'actions'">
              <div class="admin-row-actions"><a-button type="link" size="small" @click="openDetail(record)"><Icon name="ph:eye-bold" />详情</a-button></div>
            </template>
          </template>
        </a-table>
      </a-spin>
      <AdminPagination v-model:current="pagination.current" v-model:page-size="pagination.pageSize" :total="pagination.total" @change="handlePagination" />
    </div>
    </div>

    <a-modal v-model:open="detail.open" title="邮件详情" width="640px" :footer="null" @cancel="detail.open = false">
      <div v-if="detail.item" class="detail-wrap">
        <div class="detail-row">
          <span class="detail-label">收件人</span>
          <span class="detail-value">{{ detail.item.to }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">主题</span>
          <span class="detail-value">{{ detail.item.subject }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">类型</span>
          <a-tag :color="getTypeColor(detail.item.type)">{{ getTypeLabel(detail.item.type) }}</a-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">状态</span>
          <a-tag :color="getStatusColor(detail.item.status)">{{ getStatusLabel(detail.item.status) }}</a-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">{{ formatDate(detail.item.createdAt) }}</span>
        </div>
        <div class="detail-row" v-if="detail.item.sentAt">
          <span class="detail-label">发送时间</span>
          <span class="detail-value">{{ formatDate(detail.item.sentAt) }}</span>
        </div>
        <div class="detail-section" v-if="detail.item.content">
          <div class="detail-section-title">邮件内容</div>
          <div class="detail-content" v-html="detail.item.content"></div>
        </div>
        <div class="detail-section" v-if="detail.item.error">
          <div class="detail-section-title">错误信息</div>
          <div class="detail-error">{{ detail.item.error }}</div>
        </div>
      </div>
    </a-modal>
    <a-modal v-model:open="preview.open" :title="preview.subject || '邮件预览'" width="900px" :footer="null" wrap-class-name="email-preview-modal">
      <div class="email-preview-stage">
        <div v-if="preview.loading" class="email-preview-loading"><Icon name="ph:circle-notch-bold" class="spinning" />正在生成预览…</div>
        <iframe v-else ref="previewFrame" class="email-preview" sandbox="allow-same-origin" :srcdoc="preview.html" :style="{ height: `${previewHeight}px` }" @load="syncPreviewHeight" title="邮件模板预览" />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import { defineAsyncComponent } from 'vue'

const api = useApi()
const toast = useToast()
const route = useRoute()
const NewsletterAdmin = defineAsyncComponent(() => import('./newsletter.vue'))
const newsletterRef = ref<{ loadAll: () => void } | null>(null)
const allowedTabs = ['logs', 'newsletter', 'templates']
const requestedTab = String(route.query.tab || '')
const tab = ref(allowedTabs.includes(requestedTab) ? requestedTab : 'logs')
const loading = ref(false)
const logs = ref<any[]>([])
const filterType = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const detail = reactive({ open: false, item: null as any })
const templatesLoading = ref(false)
const templateSaving = ref(false)
const templates = ref<any[]>([])
const selected = ref<any>(null)
const editor = reactive({ custom: false, subject: '', html: '', htmlExpanded: false })
const preview = reactive({ open: false, subject: '', html: '', loading: false })
const previewFrame = ref<HTMLIFrameElement | null>(null)
const previewHeight = ref(680)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '收件人', dataIndex: 'to', key: 'to', width: 180 },
  { title: '主题', dataIndex: 'subject', key: 'subject', width: 300 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 150 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '内容', dataIndex: 'content', key: 'content', width: 300 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
  { title: '发送时间', dataIndex: 'sentAt', key: 'sentAt', width: 150 },
  { title: '错误信息', dataIndex: 'error', key: 'error', width: 180 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' as const },
]

onMounted(() => {
  loadLogs()
  loadTemplates()
})

async function loadTemplates() {
  templatesLoading.value = true
  try {
    templates.value = await api.get<any[]>('/email/templates')
    const next = templates.value.find(item => item.key === selected.value?.key) || templates.value[0]
    if (next) selectTemplate(next)
  } catch (error: any) {
    toast.error(error?.message || '邮件模板加载失败')
  } finally { templatesLoading.value = false }
}

function selectTemplate(item: any) {
  selected.value = item
  Object.assign(editor, { custom: Boolean(item.custom), subject: item.subject, html: item.html, htmlExpanded: false })
}

function startEditing() {
  editor.custom = true
  editor.htmlExpanded = true
}

function insertVariable(variable: string) {
  if (!editor.custom) return
  editor.html += `{{${variable}}}`
}

function formatVariable(variable: string, raw = false) {
  return raw ? `{` + `{{${variable}}}` + `}` : `{{${variable}}}`
}

function variableDescription(variable: string) {
  return ({ username: '收件人的显示名称', siteName: '当前站点名称', siteUrl: '站点公开地址', link: '通知关联页面链接', detailUrl: '通知详情完整链接', content: '通知纯文本正文', contentHtml: '允许富文本的通知正文', code: '验证码或一次性口令', subject: '通知主题', authorName: '评论或回复作者名称', postTitle: '关联文章标题' } as Record<string, string>)[variable] || '发送时由系统填充的模板内容'
}

function restoreDefault() {
  if (!selected.value) return
  Modal.confirm({
    title: '恢复系统默认模板',
    content: `「${selected.value.name}」将恢复为系统预设内容，当前自定义主题和 HTML 会被覆盖。`,
    okText: '恢复默认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      templateSaving.value = true
      try {
        const result = await api.put<any>(`/email/templates/${selected.value.key}`, { custom: false, subject: editor.subject, html: editor.html })
        const index = templates.value.findIndex(item => item.key === result.key)
        if (index >= 0) templates.value[index] = result
        selectTemplate(result)
        toast.success('已恢复系统默认模板')
      } catch (error: any) { toast.error(error?.message || '恢复默认模板失败') }
      finally { templateSaving.value = false }
    },
  })
}

async function saveTemplate() {
  if (!editor.subject.trim() || !editor.html.trim()) { toast.warning('主题和 HTML 不能为空'); return }
  templateSaving.value = true
  try {
    const result = await api.put<any>(`/email/templates/${selected.value.key}`, { custom: editor.custom, subject: editor.subject, html: editor.html })
    const index = templates.value.findIndex(item => item.key === result.key)
    if (index >= 0) templates.value[index] = result
    selectTemplate(result)
    toast.success(editor.custom ? '自定义邮件模板已保存' : '已恢复系统默认模板')
  } catch (error: any) { toast.error(error?.message || '模板保存失败') }
  finally { templateSaving.value = false }
}

async function previewTemplate() {
  if (!editor.subject.trim() || !editor.html.trim()) { toast.warning('主题和 HTML 不能为空，无法预览'); return }
  preview.loading = true
  preview.open = true
  try {
    const result = await api.post<any>(`/email/templates/${selected.value.key}/preview`, { subject: editor.subject, html: editor.html })
    if (!result?.html || !String(result.html).trim()) throw new Error('预览内容为空')
    Object.assign(preview, { subject: result.subject, html: result.html })
  } catch (error: any) {
    preview.open = false
    toast.error(error?.message || '模板预览失败')
  } finally {
    preview.loading = false
  }
}

function syncPreviewHeight() {
  const document = previewFrame.value?.contentDocument
  const body = document?.body
  const root = document?.documentElement
  if (!body || !root) return
  previewHeight.value = Math.max(560, Math.ceil(Math.max(body.scrollHeight, body.offsetHeight, root.scrollHeight, root.offsetHeight) + 16))
}

function templateIcon(key: string) {
  return ({ verification: 'ph:key-bold', comment_notification: 'ph:chat-circle-bold', reply_notification: 'ph:arrow-bend-up-left-bold', comment_moderation_notification: 'ph:shield-check-bold', like_notification: 'ph:heart-bold', test: 'ph:paper-plane-tilt-bold' } as Record<string, string>)[key] || 'ph:envelope-bold'
}

async function loadLogs() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      limit: pagination.pageSize,
    }
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value

    const res = await api.get<any>('/email/logs', params)
    logs.value = res.items || []
    pagination.total = res.total || 0
  } catch (e: any) {
    console.error('加载邮件记录失败:', e)
  } finally {
    loading.value = false
  }
}

function applyLogFilters() {
  pagination.current = 1
  void loadLogs()
}

function resetLogFilters() {
  filterType.value = undefined
  filterStatus.value = undefined
  applyLogFilters()
}

function handlePagination(page: number, pageSize: number) {
  pagination.current = page
  pagination.pageSize = pageSize
  void loadLogs()
}

function openDetail(record: any) {
  detail.item = record
  detail.open = true
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    verification: 'blue',
    comment_notification: 'green',
    reply_notification: 'purple',
    comment_moderation_notification: 'cyan',
    like_notification: 'red',
  }
  return colors[type] || 'default'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    verification: '验证码',
    comment_notification: '评论通知',
    reply_notification: '回复通知',
    comment_moderation_notification: '评论审核',
    like_notification: '点赞通知',
  }
  return labels[type] || type
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'orange',
    sending: 'blue',
    sent: 'green',
    failed: 'red',
  }
  return colors[status] || 'default'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: '待发送',
    sending: '发送中',
    sent: '已发送',
    failed: '失败',
  }
  return labels[status] || status
}

function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, length: number) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function stripHtml(html: string) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
</script>

<style scoped>
.email-logs-page {
  padding: 0;
}
.newsletter-tab{min-width:0}
.email-preview-modal :deep(.ant-modal-body) { overflow: hidden; padding: 0 20px 20px; }
.email-preview-stage { height: calc(100dvh - 190px); min-height: 480px; }
.template-workspace{display:grid;grid-template-columns:280px minmax(0,1fr);height:min(680px,calc(100dvh - 170px));min-height:420px;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.template-list{display:flex;min-height:0;flex-direction:column;gap:3px;overflow-y:auto;padding:8px;border-right:1px solid var(--border);background:var(--c-bg-1)}.template-list button{display:grid;grid-template-columns:32px minmax(0,1fr) 58px;align-items:center;gap:9px;padding:10px;border:0;border-radius:7px;background:transparent;color:var(--c-text);cursor:pointer;text-align:left;min-width:0}.template-list button:hover,.template-list button.active{background:var(--ld-bg-card)}.template-list button.active{box-shadow:0 1px 4px var(--ld-shadow)}.template-list button>span{display:grid;width:30px;height:30px;line-height:30px;border-radius:7px;background:var(--c-primary-soft);color:var(--c-primary);place-items:center}.template-list button>div{min-width:0}.template-list strong,.template-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.template-list strong{font-size:.64rem}.template-list small{margin-top:3px;color:var(--c-text-3);font-size:.5rem;line-height:1.4}.template-list :deep(.ant-tag){display:block;max-width:58px;width:58px;margin:0;padding-inline:4px;overflow:hidden;text-align:center;text-overflow:ellipsis;white-space:nowrap}.template-editor-spin{min-width:0;min-height:0;overflow:hidden}.template-editor{display:flex;min-width:0;height:100%;flex-direction:column;gap:14px;overflow-y:auto;padding:18px}.editor-header{position:sticky;z-index:4;top:-18px;margin:-18px -18px 0;padding:18px;border-bottom:1px solid var(--border);background:var(--ld-bg-card)}.editor-header,.editor-header-actions{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.editor-header-actions{align-items:center;justify-content:flex-end;flex-wrap:wrap}.template-editor h2{margin:0;font-size:.86rem}.template-editor header p{margin:4px 0 0;color:var(--c-text-3);font-size:.56rem}.template-editor>label>span,.html-template-section>header>span{display:block;margin-bottom:6px;color:var(--c-text-2);font-size:.62rem}.html-template-section>header{display:flex;align-items:center;justify-content:space-between}.html-template-section>header .ant-btn{padding-inline:4px;color:var(--c-primary);font-size:.6rem}.html-template-collapsed{display:flex;min-height:52px;align-items:center;gap:8px;padding:12px;border:1px dashed var(--border);border-radius:7px;background:var(--c-bg-1);color:var(--c-text-3);font-size:.6rem}.html-template-collapsed :deep(svg){color:var(--c-primary)}.html-template-collapsed small{margin-left:auto;color:var(--c-text-3);font-family:var(--font-mono);font-size:.52rem}.html-editor :deep(textarea){font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.variables{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:12px;border-radius:7px;background:var(--c-bg-1)}.variables>span,.variables>p,.variables>em{grid-column:1/-1}.variables>span{color:var(--c-text-2);font-size:.65rem;font-weight:700}.variables>p,.variables>em{margin:0;color:var(--c-text-3);font-size:.56rem;font-style:normal}.variables button{display:flex;min-width:0;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--ld-bg-card);color:var(--c-primary);cursor:pointer;text-align:left}.variables button:disabled{cursor:not-allowed;opacity:.55}.variables button code{flex:0 0 auto;font:10px/1.2 ui-monospace,monospace}.variables button small{min-width:0;color:var(--c-text-3);font-size:.52rem}.email-preview{display:block;width:100%;height:100%;border:1px solid var(--border);border-radius:8px;background:#fff}.email-preview-stage{display:flex;height:calc(84dvh - 120px);min-height:320px;flex-direction:column;overflow:hidden;border-radius:8px}.email-preview-loading{display:grid;min-height:280px;color:var(--c-text-3);font-size:.78rem;gap:10px;place-items:center}.email-preview-loading .spinning{animation:email-spin 1s linear infinite;font-size:1.4rem}@keyframes email-spin{to{transform:rotate(360deg)}}
.template-editor-spin,
.template-editor-spin :deep(.ant-spin-nested-loading),
.template-editor-spin :deep(.ant-spin-container) { min-height: 0; height: 100%; }
.template-editor-spin :deep(.ant-spin-container) { display: flex; flex-direction: column; }
.template-editor { flex: 1 1 auto; }
.html-template-section { min-width: 0; }
.html-editor,
.html-editor :deep(textarea),
.html-editor :deep(.ant-input) {
  display: block;
  box-sizing: border-box;
  width: 100%;
  font: 12px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace;
}
.html-editor {
  height: min(520px, calc(100dvh - 360px));
  min-height: 260px;
  max-height: none;
  overflow-y: auto !important;
  padding-bottom: 28px;
  resize: none;
  scroll-padding-bottom: 28px;
}
.html-editor :deep(textarea),
.html-editor :deep(.ant-input) {
  height: 100%;
  min-height: 0;
  max-height: none;
  overflow-y: auto !important;
  padding-bottom: 28px;
  resize: none;
  scroll-padding-bottom: 28px;
}

.section-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.email-logs-page .card-header { align-items: flex-start; flex-wrap: wrap; }
.filter-bar { display: flex; min-width: 0; flex: 1 1 520px; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.type-filter { width: 150px; min-width: 150px; flex: 0 1 150px; }
.status-filter { width: 120px; min-width: 120px; flex: 0 1 120px; }
.email-logs-page :deep(.ant-table-cell) { vertical-align: middle; }
.email-logs-page :deep(.ant-table-cell .ant-tag) { display: inline-flex; max-width: 100%; margin-inline-end: 0; white-space: nowrap; }
.subject-text { display: block; overflow: hidden; color: var(--c-text); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }

.error-text {
  color: #ef4444;
  font-size: 0.82rem;
}

.content-text {
  font-size: 0.82rem;
  color: var(--color-text-secondary, #666);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-label {
  font-weight: 500;
  color: var(--color-text-secondary, #666);
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  color: var(--color-text, #333);
  flex: 1;
}

.detail-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
  margin-top: 4px;
}

.detail-section-title {
  font-weight: 500;
  color: var(--color-text-secondary, #666);
  margin-bottom: 8px;
  font-size: 13px;
}

.detail-content {
  background: var(--c-bg-1);
  padding: 12px;
  border-radius: 6px;
  line-height: 1.6;
  font-size: 13px;
}

@media (max-width: 700px) {
  .card-header { align-items: stretch; flex-direction: column; gap: 10px; }
  .filter-bar, .type-filter, .status-filter { width: 100%; min-width: 0; flex-basis: 100%; }
  .template-workspace{grid-template-columns:1fr;height:min(760px,calc(100dvh - 150px));min-height:420px}.template-list{overflow-x:auto;flex-direction:row;border-right:0;border-bottom:1px solid var(--border)}.template-list button{min-width:230px}.template-editor{padding:12px}.editor-header{top:-12px;margin:-12px -12px 0;padding:12px}.email-preview-stage{height:calc(84dvh - 150px)}
}

@media (max-width: 480px) {
  .template-list button { min-width: 205px; }
  .template-editor > header { align-items: stretch; flex-direction: column; }
  .template-editor > footer { align-items: stretch; flex-direction: column; }
  .template-editor > footer :deep(.ant-btn) { width: 100%; }
  .variables { grid-template-columns: 1fr; }
}

.detail-content :deep(img) {
  max-width: 100%;
}

.detail-error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  padding: 12px;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
}

.email-preview-modal { overflow: auto !important; }
.email-preview-modal :deep(.ant-modal-body) { overflow: visible !important; }
.email-preview-stage { height: calc(100dvh - 190px); min-height: 480px; }

/* The editor owns source scrolling; the preview iframe grows to its document. */
.html-editor,
.html-editor :deep(textarea),
.html-editor :deep(.ant-input) {
  overflow-y: auto !important;
}
.template-editor-spin { overflow: hidden; }
.template-editor { min-height: 0; }
.email-preview-modal :deep(.ant-modal) { max-width: calc(100vw - 24px); }
.email-preview-modal :deep(.ant-modal-content) { max-height: none; overflow: visible; }
.email-preview-modal :deep(.ant-modal-body) { max-height: none; }
.email-preview-stage { height: auto; min-height: 560px; overflow: visible; }
.email-preview { height: auto; min-height: 560px; overflow: hidden; }

@media (max-width: 700px) {
  .email-preview-stage,
  .email-preview { min-height: 420px; }
}
</style>
