<template>
  <div>
    <a-spin :spinning="loading" class="table-spin">
      <a-card :bordered="false" class="list-card" size="small">
        <a-table :dataSource="comments" :columns="columns" rowKey="id" size="small" :pagination="false" :locale="{ emptyText: '暂无评论' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'authorName'">
              <span class="comment-author">{{ record.authorName || '匿名' }}</span>
            </template>
            <template v-if="column.key === 'content'">
              <span style="white-space:pre-wrap">{{ record.content }}</span>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
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
      </a-card>
    </a-spin>

    <a-modal v-model:open="detail.open" title="评论详情" width="520px" :footer="null" @cancel="detail.open = false">
      <a-descriptions v-if="detail.item" column="1" size="small" bordered>
        <a-descriptions-item label="评论作者">{{ detail.item.authorName || '匿名' }}</a-descriptions-item>
        <a-descriptions-item label="邮箱">{{ detail.item.authorEmail || '-' }}</a-descriptions-item>
        <a-descriptions-item label="评论内容">{{ detail.item.content }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor(detail.item.status)">{{ statusText(detail.item.status) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="所属文章">
          <NuxtLink :to="`/posts/${detail.item.post?.slug}`" target="_blank">
            {{ detail.item.post?.title || detail.item.postId }}
          </NuxtLink>
        </a-descriptions-item>
        <a-descriptions-item label="评论时间">{{ detail.item.createdAt?.slice(0, 16) || '-' }}</a-descriptions-item>
        <a-descriptions-item v-if="detail.item.parentId" label="回复对象">#{{ detail.item.parentId?.slice(0, 8) }}</a-descriptions-item>
        <a-descriptions-item v-if="detail.item.status === 'rejected' && detail.item.rejectReason" label="驳回理由">{{ detail.item.rejectReason }}</a-descriptions-item>
      </a-descriptions>
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
import { message } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const loading = ref(true)
const comments = ref<any[]>([])
const rejectDialog = reactive({ open: false, comment: null as any, reason: '', customReason: '' })
const detail = reactive({ open: false, item: null as any })

const columns = [
  { title: '作者', dataIndex: 'authorName', key: 'authorName', width: 90 },
  { title: '内容', dataIndex: 'content', key: 'content', minWidth: 280 },
  { title: '状态', key: 'status', width: 80 },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' as const },
]

function statusColor(s: string) { return s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'default' }
function statusText(s: string) { return s === 'approved' ? '已审核' : s === 'rejected' ? '审核未通过' : '待审核' }

onMounted(async () => {
  try {
    const res = await api.get<any>('/comments')
    comments.value = res?.items ?? []
  } catch { comments.value = [] }
  loading.value = false
})

async function handleApprove(c: any) {
  try { await api.post(`/comments/${c.id}/approve`); c.status = 'approved'; message.success('已通过') }
  catch { message.error('操作失败') }
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
    if (!reason) { message.warning('请输入驳回理由'); return }
  } else if (!reason) {
    message.warning('请选择驳回理由'); return
  }
  try {
    await api.post(`/comments/${rejectDialog.comment.id}/reject`, { reason })
    rejectDialog.comment.status = 'rejected'
    message.success('已驳回')
    rejectDialog.open = false; rejectDialog.reason = ''; rejectDialog.customReason = ''
  } catch { message.error('操作失败') }
}
</script>

<style scoped>
.list-card { border-radius:8px; }
.comment-author { font-weight:500; font-size:0.82rem; }
</style>