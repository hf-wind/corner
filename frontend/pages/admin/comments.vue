<template>
  <div>
    <a-spin :spinning="loading" class="table-spin">
      <a-card :bordered="false" class="list-card" size="small">
        <div class="comment-filter">
          <a-segmented v-model:value="source" :options="sourceOptions" @change="resetAndLoad" />
        </div>
        <a-table :dataSource="comments" :columns="columns" rowKey="id" size="small" :pagination="false" :locale="{ emptyText: '暂无评论' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'authorName'">
              <span class="comment-author">{{ record.authorName || '匿名' }}</span>
            </template>
            <template v-if="column.key === 'content'">
              <span class="moderation-content">{{ renderModerationContent(record.content) }}</span>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
            </template>
            <template v-if="column.key === 'aiReview'">
              <a-tag v-if="record.aiReviewResult === 'approved'" color="green">通过</a-tag>
              <a-tag v-else-if="record.aiReviewResult === 'rejected'" color="red">拒绝</a-tag>
              <a-tag v-else color="default">待审核</a-tag>
            </template>
            <template v-if="column.key === 'createdAt'">{{ record.createdAt?.slice(0, 16) || '' }}</template>
            <template v-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button v-if="record.status==='pending'" type="link" size="small" @click="handleApprove(record)">通过</a-button>
              <a-button v-if="record.status==='pending'" type="link" size="small" @click="openReject(record)">驳回</a-button>
              <a-button v-if="record.status==='rejected'" type="link" size="small" @click="handleApprove(record)">通过</a-button>
            </template>
          </template>
        </a-table>
        <div v-if="totalPages > 1" class="table-pagination">
          <a-pagination v-model:current="currentPage" :total="total" :pageSize="pageSize" size="small" @change="loadComments" />
        </div>
      </a-card>
    </a-spin>

    <a-modal v-model:open="detail.open" title="评论详情" width="640px" :footer="null" @cancel="detail.open = false">
      <div v-if="detail.item" class="detail-wrap">
        <div class="detail-header">
          <div class="detail-author">
            <img v-if="detail.item.user?.avatar" :src="mediaUrl(detail.item.user.avatar)" alt="" class="detail-avatar" />
            <div class="detail-author-info">
              <span class="detail-name">{{ detail.item.authorName || '匿名' }}</span>
              <span class="detail-email">{{ detail.item.user?.email || detail.item.authorEmail || '-' }}</span>
            </div>
          </div>
          <div class="detail-status-group">
            <a-tag :color="statusColor(detail.item.status)">{{ statusText(detail.item.status) }}</a-tag>
            <span class="detail-time">{{ detail.item.createdAt?.slice(0, 16) || '-' }}</span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">评论内容</div>
          <div class="detail-content moderation-content">{{ renderModerationContent(detail.item.content) }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">所属{{ source === 'article' ? '文章' : '瞬间' }}</span>
            <a :href="detail.item.sourceLink" target="_blank" class="detail-value detail-link">
              {{ detail.item.post?.title || detail.item.moment?.title || detail.item.postId || detail.item.momentId }}
            </a>
          </div>
          <div class="detail-row" v-if="detail.item.parent || detail.item.replyToName">
            <span class="detail-label">回复对象</span>
            <div class="detail-value">
              <span class="reply-mention">@{{ detail.item.replyToName || detail.item.parent?.authorName }}</span>
              <span class="detail-parent-preview">{{ detail.item.parent.content?.slice(0, 60) }}</span>
            </div>
          </div>
          <div class="detail-row" v-if="detail.item.rejectReason">
            <span class="detail-label">驳回理由</span>
            <span class="detail-value">{{ detail.item.rejectReason }}</span>
          </div>
          <div class="detail-row" v-if="detail.item.aiReview">
            <span class="detail-label">AI 审核</span>
            <div class="detail-value">
              <a-tag :color="detail.item.aiReviewResult === 'approved' ? 'green' : 'red'">
                {{ detail.item.aiReviewResult === 'approved' ? '通过' : '拒绝' }}
              </a-tag>
              <span class="detail-ai-review">{{ detail.item.aiReview }}</span>
            </div>
          </div>
        </div>

        <div class="detail-actions">
          <a-button v-if="detail.item.status==='pending'" type="primary" size="small" @click="handleApprove(detail.item)">通过</a-button>
          <a-button v-if="detail.item.status==='pending'" danger size="small" @click="openReject(detail.item)">驳回</a-button>
          <a-button v-if="detail.item.status==='rejected'" type="primary" size="small" @click="handleApprove(detail.item)">通过</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="rejectDialog.open" title="驳回评论" width="400px" @ok="confirmReject" @cancel="cancelReject">
      <a-radio-group v-model:value="rejectDialog.reason" style="display:flex;flex-direction:column;gap:8px">
        <a-radio value="广告推销">广告推销</a-radio>
        <a-radio value="恶意攻击">恶意攻击</a-radio>
        <a-radio value="无关内容">无关内容</a-radio>
        <a-radio value="重复评论">重复评论</a-radio>
        <a-radio value="__other__">其他</a-radio>
      </a-radio-group>
      <a-input v-if="rejectDialog.reason === '__other__'" v-model:value="rejectDialog.customReason" placeholder="请输入驳回理由" style="margin-top:8px" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const comments = ref<any[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const pageSize = 20
const source = ref<'article' | 'moment'>('article')
const sourceOptions = [{ label: '文章评论', value: 'article' }, { label: '瞬间评论', value: 'moment' }]
const rejectDialog = reactive({ open: false, comment: null as any, reason: '', customReason: '' })
const detail = reactive({ open: false, item: null as any })

function renderModerationContent(text: string) {
  return String(text || '')
    .replace(/◆emoji:[^◆]+◆/g, '【表情】')
    .replace(/\[\[emoji:[^\]|]+(?:\|([^\]]*))?\]\]/g, (_, label) => `【表情：${label || '表情'}】`)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '【图片】')
}

const columns = [
  { title: '作者', dataIndex: 'authorName', key: 'authorName', width: 90 },
  { title: '内容', dataIndex: 'content', key: 'content', minWidth: 220 },
  { title: 'AI审核', key: 'aiReview', width: 80 },
  { title: '状态', key: 'status', width: 80 },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' as const },
]

function statusColor(s: string) { return s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'default' }
function statusText(s: string) { return s === 'approved' ? '已发布' : s === 'rejected' ? '已拒绝' : '待审核' }

async function loadComments() {
  loading.value = true
  try {
    const isMoment = source.value === 'moment'
    const res = await api.get<any>(isMoment ? '/moment-comments' : '/comments', { page: currentPage.value, limit: pageSize })
    comments.value = (res?.items ?? []).map((item: any) => ({
      ...item,
      sourceLink: isMoment
        ? `/moments?focus=${encodeURIComponent(item.moment?.slug || item.momentId)}`
        : `/article/${item.post?.slug || item.postId}`,
    }))
    total.value = res?.total ?? 0
    totalPages.value = res?.totalPages ?? 1
  } catch { comments.value = [] }
  loading.value = false
}

function resetAndLoad() { currentPage.value = 1; void loadComments() }

onMounted(loadComments)

async function handleApprove(c: any) {
  try {
    const updated = await api.post<any>(`${source.value === 'moment' ? '/moment-comments' : '/comments'}/${c.id}/approve`)
    Object.assign(c, updated)
    toast.success('已通过并已通知评论作者')
  }
  catch { toast.error('操作失败') }
}

function openDetail(c: any) { detail.item = c; detail.open = true }

function openReject(c: any) {
  rejectDialog.comment = c; rejectDialog.reason = ''; rejectDialog.customReason = ''; rejectDialog.open = true
}

function cancelReject() {
  rejectDialog.open = false; rejectDialog.reason = ''; rejectDialog.customReason = ''
}

async function confirmReject() {
  if (!rejectDialog.comment) return
  let reason = rejectDialog.reason
  if (reason === '__other__') {
    reason = rejectDialog.customReason?.trim() || ''
    if (!reason) { toast.warning('请输入驳回理由'); return }
  } else if (!reason) {
    toast.warning('请选择驳回理由'); return
  }
  try {
    const updated = await api.post<any>(`${source.value === 'moment' ? '/moment-comments' : '/comments'}/${rejectDialog.comment.id}/reject`, { reason })
    Object.assign(rejectDialog.comment, updated)
    toast.success('已驳回并已通知评论作者')
    rejectDialog.open = false; rejectDialog.reason = ''; rejectDialog.customReason = ''
  } catch { toast.error('操作失败') }
}
</script>

<style scoped>
.list-card { border-radius:8px; }
.comment-filter { margin-bottom:12px; }
.table-pagination { display:flex; justify-content:center; padding:16px 0 4px; }
.comment-author { font-weight:500; font-size:0.82rem; }
.moderation-content { white-space:pre-wrap; word-break:break-word; }
.reply-mention { color:var(--c-primary); font-weight:600; }

.detail-wrap { display:flex; flex-direction:column; gap:16px; }
.detail-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.detail-author { display:flex; align-items:center; gap:10px; }
.detail-avatar { width:40px; height:40px; border-radius:50%; object-fit:cover; }
.detail-author-info { display:flex; flex-direction:column; gap:2px; }
.detail-name { font-weight:700; font-size:0.9rem; color:var(--c-text); }
.detail-email { font-size:0.72rem; color:var(--c-text-3); }
.detail-status-group { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
.detail-time { font-size:0.7rem; color:var(--c-text-3); white-space:nowrap; }

.detail-section { display:flex; flex-direction:column; gap:8px; }
.detail-section-title { font-size:0.75rem; font-weight:600; color:var(--c-text-2); text-transform:uppercase; letter-spacing:0.05em; }
.detail-content { padding:12px; background:var(--c-bg-2); border-radius:8px; font-size:0.85rem; line-height:1.7; color:var(--c-text); white-space:pre-wrap; }
.detail-row { display:flex; align-items:baseline; gap:10px; padding:6px 0; border-bottom:1px solid var(--border); }
.detail-row:last-child { border-bottom:none; }
.detail-label { font-size:0.75rem; font-weight:600; color:var(--c-text-2); min-width:72px; flex-shrink:0; }
.detail-value { font-size:0.82rem; color:var(--c-text); display:flex; align-items:center; gap:6px; }
.detail-link { color:var(--c-primary); text-decoration:none; }
.detail-link:hover { text-decoration:underline; }
.detail-parent-preview { font-size:0.72rem; color:var(--c-text-3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:300px; }
.detail-ai-review { font-size:0.78rem; color:var(--c-text-2); }
.detail-actions { display:flex; gap:8px; padding-top:8px; border-top:1px solid var(--border); }

@media (max-width: 640px) {
  .detail-header,
  .detail-row {
    align-items:flex-start;
    flex-direction:column;
    gap:6px;
  }
  .detail-status-group { align-items:flex-start; }
  .detail-parent-preview { max-width:100%; white-space:normal; }
}
</style>
