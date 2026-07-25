<template>
  <div class="ai-admin">
    <a-tabs v-model:activeKey="tab" size="small">
      <a-tab-pane key="settings" tab="AI 配置" />
      <a-tab-pane key="chats" tab="会话管理" />
    </a-tabs>

    <div v-show="tab === 'settings'" class="tab-body">
      <a-spin :spinning="cfgLoading">
        <a-space direction="vertical" :size="16" style="width:100%">
          <a-alert
            :type="apiConfigured ? 'success' : 'warning'"
            show-icon
            :message="apiConfigured ? 'DeepSeek API 已配置（Key 仅存环境变量）' : '未检测到 DEEPSEEK_API_KEY，聊天将使用兜底文案'"
          />

          <a-card size="small" title="人设与关系" :bordered="false" class="section-card">
            <a-form layout="vertical" size="middle">
              <a-form-item label="展示名称">
                <a-input v-model:value="form.ai_pet_display_name" />
              </a-form-item>
              <a-form-item label="简介">
                <a-input v-model:value="form.ai_pet_description" />
              </a-form-item>
              <a-form-item label="站长用户名（用于伙伴口吻识别）">
                <a-input v-model:value="form.ai_owner_username" placeholder="如：阿风" />
              </a-form-item>
              <a-form-item label="System Prompt（人设）">
                <a-textarea v-model:value="form.ai_pet_system_prompt" :rows="8" />
              </a-form-item>
            </a-form>
          </a-card>

          <a-card size="small" title="摘要 Prompt" :bordered="false" class="section-card">
            <a-textarea v-model:value="form.ai_summarize_prompt" :rows="5" />
          </a-card>

          <a-card size="small" title="评论审核" :bordered="false" class="section-card">
            <a-form layout="vertical" size="middle">
              <a-form-item label="审核 Prompt">
                <a-textarea v-model:value="form.ai_moderate_prompt" :rows="8" placeholder="定义 AI 审核评论的标准和输出格式" />
              </a-form-item>
              <a-row :gutter="16">
                <a-col :xs="24" :sm="12">
                  <a-form-item label="审核 temperature">
                    <a-input-number v-model:value="form.ai_moderate_temperature" :min="0" :max="2" :step="0.1" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item label="审核 maxTokens">
                    <a-input-number v-model:value="form.ai_moderate_max_tokens" :min="64" :max="1024" style="width:100%" />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </a-card>

          <a-card size="small" title="欢迎语 / 兜底回复" :bordered="false" class="section-card">
            <a-form layout="vertical" size="middle">
              <a-form-item label="欢迎语（每行一条）">
                <a-textarea v-model:value="greetingsText" :rows="4" placeholder="每行一条欢迎语" />
              </a-form-item>
              <a-form-item label="未配置 API 时回复">
                <a-textarea v-model:value="form.ai_fallback_unconfigured" :rows="2" />
              </a-form-item>
              <a-form-item label="请求失败时回复">
                <a-textarea v-model:value="form.ai_fallback_error" :rows="2" />
              </a-form-item>
            </a-form>
          </a-card>

          <a-card size="small" title="模型参数" :bordered="false" class="section-card">
            <a-row :gutter="16">
              <a-col :xs="24" :sm="12" :md="8">
                <a-form-item label="聊天 temperature">
                  <a-input-number v-model:value="form.ai_chat_temperature" :min="0" :max="2" :step="0.1" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8">
                <a-form-item label="聊天 maxTokens">
                  <a-input-number v-model:value="form.ai_chat_max_tokens" :min="64" :max="4096" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8">
                <a-form-item label="摘要 temperature">
                  <a-input-number v-model:value="form.ai_summarize_temperature" :min="0" :max="2" :step="0.1" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8">
                <a-form-item label="摘要 maxTokens">
                  <a-input-number v-model:value="form.ai_summarize_max_tokens" :min="64" :max="1024" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8">
                <a-form-item label="历史消息条数">
                  <a-input-number v-model:value="form.ai_history_limit" :min="4" :max="60" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8">
                <a-form-item label="历史字符预算">
                  <a-input-number v-model:value="form.ai_history_char_budget" :min="500" :max="20000" style="width:100%" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-card>

          <a-card size="small" title="知识库" :bordered="false" class="section-card">
            <a-form layout="vertical" size="middle">
              <a-form-item label="启用知识库">
                <a-switch v-model:checked="form.ai_knowledge_enabled" />
              </a-form-item>
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="目录条数">
                    <a-input-number v-model:value="form.ai_knowledge_catalog_limit" :min="1" :max="50" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="相关文章 Top-K">
                    <a-input-number v-model:value="form.ai_knowledge_top_k" :min="1" :max="10" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="片段字数">
                    <a-input-number v-model:value="form.ai_knowledge_snippet_len" :min="100" :max="2000" style="width:100%" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="预览检索">
                <a-input-search
                  v-model:value="previewQuery"
                  placeholder="输入问题，预览将注入的知识上下文"
                  enter-button="预览"
                  :loading="previewLoading"
                  @search="runPreview"
                />
              </a-form-item>
              <pre v-if="previewText" class="preview-box">{{ previewText }}</pre>
            </a-form>
          </a-card>

          <div class="actions">
            <a-button type="primary" :loading="saving" @click="saveConfig">保存配置</a-button>
            <a-button @click="resetDefaults">恢复默认</a-button>
          </div>
        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'chats'" class="tab-body chats-layout">
      <a-card size="small" :bordered="false" class="section-card conv-list">
        <template #title>会话用户</template>
        <template #extra>
          <a-input-search
            v-model:value="convQuery"
            size="small"
            placeholder="用户名/邮箱"
            style="width:160px"
            allow-clear
            @search="loadConversations"
          />
        </template>
        <a-spin :spinning="convLoading">
          <a-empty v-if="!conversations.length" description="暂无对话" />
          <div
            v-for="c in conversations"
            :key="c.userId"
            class="conv-item"
            :class="{ active: selectedUserId === c.userId }"
            @click="selectConversation(c.userId)"
          >
            <div class="conv-top">
              <strong>{{ c.username }}</strong>
              <span class="muted">{{ c.messageCount }} 条</span>
            </div>
            <div class="conv-preview">{{ c.lastMessage?.content || '—' }}</div>
            <div class="muted tiny">{{ formatTime(c.lastMessage?.createdAt) }}</div>
          </div>
        </a-spin>
      </a-card>

      <a-card size="small" :bordered="false" class="section-card conv-detail">
        <template #title>
          <span v-if="detail?.user">{{ detail.user.username }} · {{ detail.total }} 条消息</span>
          <span v-else>选择左侧用户查看对话</span>
        </template>
        <template #extra>
          <a-space>
            <a-button size="small" :disabled="!selectedUserId" :loading="detailLoading" @click="loadDetail">刷新</a-button>
            <a-popconfirm title="确认清空该用户全部对话？" ok-text="清空" cancel-text="取消" @confirm="clearConversation">
              <a-button size="small" danger :disabled="!selectedUserId">清空</a-button>
            </a-popconfirm>
          </a-space>
        </template>
        <a-spin :spinning="detailLoading">
          <div v-if="detail?.messages?.length" class="msg-list">
            <div v-for="m in detail.messages" :key="m.id" class="msg-row" :class="m.role">
              <div class="msg-meta">
                <span>{{ m.role === 'user' ? '用户' : '哆啦A梦' }}</span>
                <span class="muted">{{ formatTime(m.createdAt) }}</span>
              </div>
              <div class="msg-bubble">{{ m.content }}</div>
            </div>
          </div>
          <a-empty v-else-if="selectedUserId" description="暂无消息" />
          <a-empty v-else description="从左侧选择会话" />
        </a-spin>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const tab = ref((route.query.tab as string) === 'chats' ? 'chats' : 'settings')
watch(tab, (v) => {
  router.replace({ query: v === 'settings' ? {} : { tab: v } })
  if (v === 'chats' && !conversations.value.length) loadConversations()
})

const cfgLoading = ref(true)
const saving = ref(false)
const apiConfigured = ref(false)
const defaults = ref<Record<string, any>>({})
const form = reactive<Record<string, any>>({})
const greetingsText = ref('')
const previewQuery = ref('')
const previewLoading = ref(false)
const previewText = ref('')

const convLoading = ref(false)
const conversations = ref<any[]>([])
const convQuery = ref('')
const selectedUserId = ref('')
const detailLoading = ref(false)
const detail = ref<any>(null)

onMounted(async () => {
  await loadConfig()
  if (tab.value === 'chats') await loadConversations()
})

function applyConfig(cfg: Record<string, any>) {
  Object.keys(cfg).forEach((k) => {
    form[k] = cfg[k]
  })
  greetingsText.value = Array.isArray(cfg.ai_pet_greetings)
    ? cfg.ai_pet_greetings.join('\n')
    : String(cfg.ai_pet_greetings || '')
}

async function loadConfig() {
  cfgLoading.value = true
  try {
    const res = await api.get<any>('/ai/admin/config')
    defaults.value = res.defaults || {}
    apiConfigured.value = !!res.apiConfigured
    applyConfig(res.config || {})
  } catch {
    toast.error('加载 AI 配置失败')
  } finally {
    cfgLoading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const payload = {
      ...form,
      ai_pet_greetings: greetingsText.value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    const res = await api.put<any>('/ai/admin/config', { config: payload })
    applyConfig(res.config || payload)
    apiConfigured.value = !!res.apiConfigured
    toast.success('已保存')
  } catch {
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}

function resetDefaults() {
  if (!defaults.value || !Object.keys(defaults.value).length) return
  applyConfig(defaults.value)
  toast.info('已填入默认值，请点击保存生效')
}

async function runPreview() {
  previewLoading.value = true
  try {
    // save knowledge-related fields first so preview matches form
    await api.put('/ai/admin/config', {
      config: {
        ai_knowledge_enabled: form.ai_knowledge_enabled,
        ai_knowledge_catalog_limit: form.ai_knowledge_catalog_limit,
        ai_knowledge_top_k: form.ai_knowledge_top_k,
        ai_knowledge_snippet_len: form.ai_knowledge_snippet_len,
      },
    })
    const res = await api.post<any>('/ai/admin/knowledge/preview', { query: previewQuery.value })
    previewText.value = res.context || ''
  } catch {
    toast.error('预览失败')
  } finally {
    previewLoading.value = false
  }
}

async function loadConversations() {
  convLoading.value = true
  try {
    conversations.value = await api.get<any[]>('/ai/admin/conversations', {
      q: convQuery.value || undefined,
    })
  } catch {
    toast.error('加载会话失败')
  } finally {
    convLoading.value = false
  }
}

async function selectConversation(userId: string) {
  selectedUserId.value = userId
  await loadDetail()
}

async function loadDetail() {
  if (!selectedUserId.value) return
  detailLoading.value = true
  try {
    detail.value = await api.get(`/ai/admin/conversations/${selectedUserId.value}`, {
      page: 1,
      pageSize: 200,
    })
  } catch {
    toast.error('加载对话失败')
  } finally {
    detailLoading.value = false
  }
}

async function clearConversation() {
  if (!selectedUserId.value) return
  try {
    await api.delete(`/ai/admin/conversations/${selectedUserId.value}`)
    toast.success('已清空')
    detail.value = null
    selectedUserId.value = ''
    await loadConversations()
  } catch {
    toast.error('清空失败')
  }
}

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.ai-admin { max-width: 1100px; }
.tab-body { margin-top: 4px; }
.section-card { border-radius: 8px; }
.actions { display: flex; gap: 10px; }
.preview-box {
  margin: 0;
  padding: 12px;
  max-height: 320px;
  overflow: auto;
  border-radius: 8px;
  background: var(--c-bg-1);
  border: 1px solid var(--border);
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.chats-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) 1fr;
  gap: 12px;
  min-height: 520px;
}
.conv-list :deep(.ant-card-body) {
  max-height: 640px;
  overflow-y: auto;
  padding: 8px;
}
.conv-item {
  padding: 10px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 4px;
}
.conv-item:hover { background: var(--c-bg-1); }
.conv-item.active {
  background: var(--c-primary-soft);
  border-color: color-mix(in srgb, var(--c-primary) 30%, transparent);
}
.conv-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.conv-preview {
  font-size: 0.78rem;
  color: var(--c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted { color: var(--c-text-3); font-size: 0.75rem; }
.tiny { font-size: 0.7rem; margin-top: 2px; }
.conv-detail :deep(.ant-card-body) {
  max-height: 640px;
  overflow-y: auto;
}
.msg-list { display: flex; flex-direction: column; gap: 12px; }
.msg-row { display: flex; flex-direction: column; gap: 4px; max-width: 88%; }
.msg-row.user { align-self: flex-end; align-items: flex-end; }
.msg-row.assistant { align-self: flex-start; align-items: flex-start; }
.msg-meta { display: flex; gap: 8px; font-size: 0.7rem; color: var(--c-text-3); }
.msg-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.84rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-row.user .msg-bubble {
  background: var(--c-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg-row.assistant .msg-bubble {
  background: var(--c-bg-1);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}
@media (max-width: 800px) {
  .chats-layout { grid-template-columns: 1fr; }
}
</style>
