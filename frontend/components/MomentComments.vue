<template>
  <section class="moment-comments" id="moment-comment">
    <header class="section-head">
      <div>
        <p class="eyebrow">Replies & Echoes</p>
        <h2>评论区</h2>
      </div>
      <span class="total-pill">{{ total }} 条留言</span>
    </header>

    <div class="composer-card">
      <template v-if="isLoggedIn">
        <div class="composer-head">
          <div class="user-meta">
            <img v-if="user?.avatar" :src="mediaUrl(user.avatar)" alt="avatar">
            <Icon v-else name="ph:user-circle-fill" />
            <span>{{ user?.username || '我' }}</span>
          </div>
          <div class="mode-switch">
            <button type="button" :class="{ active: tab === 'write' }" @click="tab = 'write'">写点什么</button>
            <button type="button" :class="{ active: tab === 'preview' }" @click="tab = 'preview'">预览</button>
          </div>
        </div>

        <div v-if="tab === 'write'" class="composer-body">
          <textarea
            v-model="draft"
            class="draft-input"
            rows="4"
            placeholder="想法、碎碎念、表情，都可以留在这里。"
          />
          <div class="toolbar">
            <button
              type="button"
              class="tool-btn"
              :class="{ active: pickerFor === 'main' }"
              @click="togglePicker('main')"
            >
              <Icon name="ph:smiley-bold" />
              <span>表情</span>
            </button>
            <EmojiPalette :open="pickerFor === 'main'" @select="insertEmoji('main', $event)" />
          </div>
        </div>

        <div v-else class="preview-box" v-html="renderContent(draft)" />

        <div class="composer-actions">
          <span class="hint">图片表情会按评论区同款弹窗插入。</span>
          <button
            type="button"
            class="submit-btn"
            :disabled="!draft.trim() || submitting"
            @click="submitComment"
          >
            <Icon
              :name="submitting ? 'ph:spinner-gap-bold' : 'ph:paper-plane-right-fill'"
              :class="{ spinning: submitting }"
            />
            <span>{{ submitting ? '发送中...' : '发表留言' }}</span>
          </button>
        </div>
      </template>

      <div v-else class="login-prompt">
        <Icon name="ph:chat-circle-dots-bold" />
        <p>登录后就可以给这条瞬间留个脚印了。</p>
        <div class="login-actions">
          <NuxtLink to="/login">去登录</NuxtLink>
          <NuxtLink to="/register">注册</NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="loading && !comments.length" class="skeleton-list">
      <div v-for="n in 3" :key="n" class="skeleton-item" />
    </div>

    <div v-else-if="!comments.length" class="empty-state">
      <Icon name="ph:shooting-star-bold" />
      <strong>这里还安安静静的</strong>
      <span>你可以当第一个留下脚印的人。</span>
    </div>

    <div v-else class="comment-list">
      <article v-for="comment in comments" :key="comment.id" class="comment-card">
        <div class="comment-head">
          <div class="author-meta">
            <img v-if="comment.authorAvatar" :src="mediaUrl(comment.authorAvatar)" alt="">
            <Icon v-else name="ph:user-circle-fill" />
            <strong>{{ comment.authorName || '匿名' }}</strong>
            <span v-if="comment.status === 'pending'" class="status-tag pending">审核中</span>
            <span v-else-if="comment.status === 'rejected'" class="status-tag rejected">未通过</span>
          </div>
          <time>{{ formatTime(comment.createdAt) }}</time>
        </div>

        <div class="comment-content" v-html="renderContent(comment.content)" />

        <div class="comment-actions">
          <button type="button" @click="toggleLike(comment)">
            <Icon :name="comment.liked ? 'ph:heart-fill' : 'ph:heart-straight-bold'" />
            <span>{{ comment.likesCount || '' }}</span>
          </button>
          <button type="button" @click="toggleReply(comment.id, comment.authorName || '匿名')">
            <Icon name="ph:arrow-bend-left-down-bold" />
            <span>回复</span>
          </button>
        </div>

        <div v-if="replyTargetId === comment.id" class="reply-box">
          <textarea
            v-model="replyDraft"
            rows="3"
            class="reply-input"
            :placeholder="`回复 @${replyTargetName || comment.authorName || '匿名'}...`"
          />
          <div class="toolbar toolbar-reply">
            <button
              type="button"
              class="tool-btn"
              :class="{ active: pickerFor === `reply:${comment.id}` }"
              @click="togglePicker(`reply:${comment.id}`)"
            >
              <Icon name="ph:smiley-bold" />
              <span>表情</span>
            </button>
            <EmojiPalette
              :open="pickerFor === `reply:${comment.id}`"
              @select="insertEmoji(`reply:${comment.id}`, $event)"
            />
          </div>
          <div class="reply-actions">
            <button type="button" class="text-btn" @click="cancelReply">取消</button>
            <button
              type="button"
              class="submit-btn submit-btn-small"
              :disabled="!replyDraft.trim() || replySubmitting"
              @click="submitReply(comment.id)"
            >
              <Icon
                :name="replySubmitting ? 'ph:spinner-gap-bold' : 'ph:arrow-bend-right-up-bold'"
                :class="{ spinning: replySubmitting }"
              />
              <span>{{ replySubmitting ? '发送中...' : '回复' }}</span>
            </button>
          </div>
        </div>

        <div v-if="comment.replies?.length" class="reply-list">
          <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
            <div class="reply-head">
              <div>
                <strong>{{ reply.authorName || '匿名' }}</strong>
                <span v-if="reply.replyToName" class="reply-to">回复 @{{ reply.replyToName }}</span>
              </div>
              <time>{{ formatTime(reply.createdAt) }}</time>
            </div>
            <div class="reply-content" v-html="renderContent(reply.content)" />
          </div>
          <button
            v-if="(comment.replyCount || 0) > (comment.replies?.length || 0)"
            type="button"
            class="more-btn"
            :disabled="loadingReplies[comment.id]"
            @click="loadMoreReplies(comment)"
          >
            {{ loadingReplies[comment.id] ? '加载中...' : '查看更多回复' }}
          </button>
        </div>
      </article>
    </div>

    <div v-if="page < totalPages" class="more-wrap">
      <button type="button" class="more-btn" :disabled="loading" @click="loadMoreComments">
        {{ loading ? '加载中...' : '查看更多留言' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
type CommentReply = {
  id: string
  authorName?: string
  authorAvatar?: string | null
  content: string
  replyToName?: string | null
  createdAt: string
}

type CommentItem = {
  id: string
  authorName?: string
  authorAvatar?: string | null
  content: string
  status?: 'pending' | 'approved' | 'rejected'
  createdAt: string
  likesCount: number
  liked?: boolean
  replyCount?: number
  replies?: CommentReply[]
}

const props = defineProps<{
  momentId: string
}>()

const api = useApi()
const { mediaUrl } = useMediaUrl()
const { user, isLoggedIn } = useAuth()

const comments = ref<CommentItem[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const loadingReplies = ref<Record<string, boolean>>({})
const draft = ref('')
const replyDraft = ref('')
const replyTargetId = ref('')
const replyTargetName = ref('')
const replySubmitting = ref(false)
const submitting = ref(false)
const tab = ref<'write' | 'preview'>('write')
const pickerFor = ref('')

watch(
  () => props.momentId,
  () => {
    page.value = 1
    comments.value = []
    total.value = 0
    totalPages.value = 1
    if (props.momentId) void loadComments(1)
  },
  { immediate: true },
)

function togglePicker(key: string) {
  pickerFor.value = pickerFor.value === key ? '' : key
}

function appendEmoji(target: 'main' | 'reply', payload: { char?: string; imageUrl?: string; label?: string }) {
  const source = target === 'main' ? draft : replyDraft
  if (payload.imageUrl) {
    source.value += `[[emoji:${payload.imageUrl}|${payload.label || '表情'}]]`
  } else if (payload.char) {
    source.value += payload.char
  }
  pickerFor.value = ''
}

function insertEmoji(key: string, payload: { char?: string; imageUrl?: string; label?: string }) {
  appendEmoji(key === 'main' ? 'main' : 'reply', payload)
}

function renderContent(text: string) {
  const tokens: string[] = []
  let rendered = String(text || '').replace(/\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, url) => {
    tokens.push(url)
    return `__EMOJI_${tokens.length - 1}__`
  })

  rendered = rendered
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/https?:\/\/[^\s<]+/g, (url) => {
      if (/\.(png|gif|jpg|jpeg|webp|svg|apng|avif)(\?[^\s<]*)?$/i.test(url)) {
        return `<img src="${mediaUrl(url)}" alt="image" class="inline-emoji" />`
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    })
    .replace(/__EMOJI_(\d+)__/g, (_, index) => {
      return `<img src="${mediaUrl(tokens[Number(index)])}" alt="emoji" class="inline-emoji" />`
    })

  return rendered
}

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  return value.slice(0, 10)
}

function normalizeComment(item: any): CommentItem {
  return {
    id: item.id,
    authorName: item.authorName,
    authorAvatar: item.authorAvatar,
    content: item.content,
    status: item.status,
    createdAt: item.createdAt,
    likesCount: item.likesCount ?? 0,
    liked: !!item.liked,
    replyCount: item.replyCount ?? 0,
    replies: (item.replies || []).map((reply: any) => ({
      id: reply.id,
      authorName: reply.authorName,
      authorAvatar: reply.authorAvatar,
      content: reply.content,
      replyToName: reply.replyToName,
      createdAt: reply.createdAt,
    })),
  }
}

async function loadComments(targetPage = 1, append = false) {
  if (!props.momentId) return
  loading.value = true
  try {
    const data = await api.get<any>(`/moment-comments/moment/${props.momentId}`, {
      page: targetPage,
      limit: 10,
      replyLimit: 3,
    })
    const nextItems = (data.items || []).map(normalizeComment)
    if (append) {
      const existingIds = new Set(comments.value.map((item) => item.id))
      comments.value.push(...nextItems.filter((item) => !existingIds.has(item.id)))
    } else {
      comments.value = nextItems
    }
    total.value = data.total || 0
    totalPages.value = data.totalPages || 1
    page.value = targetPage
  } finally {
    loading.value = false
  }
}

async function loadMoreComments() {
  const nextPage = page.value + 1
  if (loading.value || nextPage > totalPages.value) return
  await loadComments(nextPage, true)
}

async function loadMoreReplies(comment: CommentItem) {
  if (loadingReplies.value[comment.id]) return
  loadingReplies.value = { ...loadingReplies.value, [comment.id]: true }
  try {
    const loaded = comment.replies?.length || 0
    const nextPage = Math.floor(loaded / 3) + 2
    const data = await api.get<any>(`/moment-comments/${comment.id}/replies`, {
      page: nextPage,
      limit: 3,
    })
    const nextReplies = (data.items || []).map((reply: any) => ({
      id: reply.id,
      authorName: reply.authorName,
      authorAvatar: reply.authorAvatar,
      content: reply.content,
      replyToName: reply.replyToName,
      createdAt: reply.createdAt,
    }))
    const existingIds = new Set((comment.replies || []).map((item) => item.id))
    comment.replies = [...(comment.replies || []), ...nextReplies.filter((item: CommentReply) => !existingIds.has(item.id))]
    comment.replyCount = data.total || comment.replyCount || 0
  } finally {
    loadingReplies.value = { ...loadingReplies.value, [comment.id]: false }
  }
}

async function submitComment() {
  if (!draft.value.trim()) return
  if (!isLoggedIn.value) return navigateTo('/login')
  submitting.value = true
  const toast = useToast()
  try {
    await api.post('/moment-comments', {
      momentId: props.momentId,
      content: draft.value.trim(),
    })
    draft.value = ''
    tab.value = 'write'
    toast.success('留言已提交，稍后会出现在这里。')
    await loadComments(1)
  } catch (error: any) {
    toast.error(`留言失败：${error?.message || ''}`)
  } finally {
    submitting.value = false
  }
}

function toggleReply(commentId: string, authorName: string) {
  if (replyTargetId.value === commentId) {
    cancelReply()
    return
  }
  replyTargetId.value = commentId
  replyTargetName.value = authorName
  replyDraft.value = ''
}

function cancelReply() {
  replyTargetId.value = ''
  replyTargetName.value = ''
  replyDraft.value = ''
  pickerFor.value = ''
}

async function submitReply(parentId: string) {
  if (!replyDraft.value.trim()) return
  if (!isLoggedIn.value) return navigateTo('/login')
  replySubmitting.value = true
  const toast = useToast()
  try {
    await api.post('/moment-comments', {
      momentId: props.momentId,
      content: replyDraft.value.trim(),
      parentId,
    })
    toast.success('回复已提交。')
    cancelReply()
    await loadComments(1)
  } catch (error: any) {
    toast.error(`回复失败：${error?.message || ''}`)
  } finally {
    replySubmitting.value = false
  }
}

async function toggleLike(comment: CommentItem) {
  if (!isLoggedIn.value) return navigateTo('/login')
  try {
    const result = await api.post<any>(`/moment-comments/${comment.id}/like`)
    comment.liked = !!result.liked
    comment.likesCount = result.likesCount ?? comment.likesCount
  } catch {
    useToast().error('操作失败')
  }
}
</script>

<style scoped>
.moment-comments {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--c-text-3);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.section-head h2 {
  margin: 0;
  color: var(--c-text);
  font-size: 1.35rem;
}

.total-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
  color: var(--c-primary);
  font-size: 0.78rem;
}

.composer-card,
.comment-card,
.empty-state,
.skeleton-item {
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  background: var(--ld-bg-card);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 24%, transparent);
}

.composer-card {
  padding: 18px;
}

.composer-head,
.composer-actions,
.comment-head,
.comment-actions,
.reply-head,
.reply-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.user-meta,
.author-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-meta img,
.author-meta img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
}

.mode-switch {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: var(--c-bg-2);
}

.mode-switch button,
.tool-btn,
.comment-actions button,
.text-btn,
.more-btn {
  border: 0;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
}

.mode-switch button {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.76rem;
}

.mode-switch button.active {
  background: var(--ld-bg-card);
  color: var(--c-primary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--ld-shadow) 20%, transparent);
}

.composer-body,
.reply-box {
  position: relative;
  margin-top: 14px;
}

.draft-input,
.reply-input,
.preview-box {
  width: 100%;
  min-height: 104px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--c-bg) 82%, transparent);
  color: var(--c-text);
  font: inherit;
  line-height: 1.8;
  resize: vertical;
}

.reply-input {
  min-height: 88px;
}

.toolbar {
  position: relative;
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--c-bg-2);
  font-size: 0.76rem;
}

.tool-btn.active,
.tool-btn:hover,
.comment-actions button:hover,
.text-btn:hover,
.more-btn:hover {
  color: var(--c-primary);
}

.composer-actions {
  margin-top: 14px;
}

.hint {
  color: var(--c-text-3);
  font-size: 0.75rem;
}

.submit-btn,
.login-actions a,
.submit-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c-primary) 84%, white 16%), color-mix(in srgb, var(--c-primary) 72%, #111827 8%));
  color: #fff;
  cursor: pointer;
  font: inherit;
  box-shadow: 0 12px 28px color-mix(in srgb, var(--c-primary) 24%, transparent);
}

.submit-btn {
  padding: 11px 18px;
}

.submit-btn-small {
  padding: 9px 14px;
}

.submit-btn:disabled,
.submit-btn-small:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-prompt,
.empty-state {
  display: grid;
  place-items: center;
  justify-items: center;
  gap: 10px;
  padding: 30px 18px;
  color: var(--c-text-3);
}

.login-actions {
  display: flex;
  gap: 10px;
}

.login-actions a {
  padding: 9px 16px;
  text-decoration: none;
}

.comment-list {
  display: grid;
  gap: 14px;
}

.comment-card {
  padding: 18px;
}

.comment-head time,
.reply-head time {
  color: var(--c-text-3);
  font-size: 0.74rem;
}

.status-tag {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
}

.status-tag.pending {
  background: rgb(245 158 11 / 12%);
  color: #c78312;
}

.status-tag.rejected {
  background: rgb(239 68 68 / 10%);
  color: #dc2626;
}

.comment-content,
.reply-content,
.preview-box {
  color: var(--c-text-2);
  line-height: 1.85;
}

.comment-content {
  margin-top: 12px;
}

.comment-content :deep(.inline-emoji),
.reply-content :deep(.inline-emoji),
.preview-box :deep(.inline-emoji) {
  display: inline-block;
  width: 2em;
  height: 2em;
  vertical-align: -0.42em;
}

.comment-content :deep(a),
.reply-content :deep(a),
.preview-box :deep(a) {
  color: var(--c-primary);
  text-decoration: none;
}

.comment-actions {
  justify-content: flex-start;
  margin-top: 12px;
}

.comment-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--c-bg-2);
  font-size: 0.76rem;
}

.reply-box {
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--c-primary) 6%, transparent);
}

.reply-actions {
  margin-top: 12px;
  justify-content: flex-end;
}

.text-btn {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--c-bg-2);
  font-size: 0.74rem;
}

.reply-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed color-mix(in srgb, var(--border) 78%, transparent);
}

.reply-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--c-bg) 78%, transparent);
}

.reply-head {
  gap: 12px;
}

.reply-head strong {
  color: var(--c-text);
}

.reply-to {
  margin-left: 8px;
  color: var(--c-primary);
  font-size: 0.74rem;
}

.more-wrap {
  display: flex;
  justify-content: center;
}

.more-btn {
  padding: 9px 14px;
  border-radius: 999px;
  background: var(--c-bg-2);
  font-size: 0.76rem;
}

.skeleton-list {
  display: grid;
  gap: 12px;
}

.skeleton-item {
  height: 132px;
  background: linear-gradient(90deg, var(--c-bg-2), color-mix(in srgb, var(--ld-bg-card) 72%, white 28%), var(--c-bg-2));
  background-size: 220% 100%;
  animation: skeleton-wave 1.2s linear infinite;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes skeleton-wave {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

@media (max-width: 640px) {
  .section-head,
  .composer-head,
  .composer-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .comment-card,
  .composer-card {
    padding: 16px;
  }
}
</style>
