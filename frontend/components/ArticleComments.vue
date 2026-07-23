<template>
  <section class="z-comment" id="comment">
    <h3 class="comment-title">
      <Icon name="ph:chat-circle-text-bold" />
      <span>评论区</span>
    </h3>

    <div class="comment-form-card">
      <div class="comment-form-header">
        <div class="comment-form-avatar">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" alt="avatar" />
        </div>
        <div class="comment-form-tabs">
          <button type="button" :class="{ active: commentTab === 'write' }" @click="commentTab = 'write'">
            <Icon name="ph:pencil-bold" />
            撰写
          </button>
          <button type="button" :class="{ active: commentTab === 'preview' }" @click="commentTab = 'preview'">
            <Icon name="ph:eye-bold" />
            预览
          </button>
        </div>
      </div>

      <div v-show="commentTab === 'write'" class="comment-form-body">
        <textarea
          v-model="newComment.content"
          class="comment-textarea"
          placeholder="写下你的评论..."
          rows="4"
          @input="autoResize"
        />
      </div>
      <div v-show="commentTab === 'preview'" class="comment-preview" v-html="renderedPreview" />

      <div class="comment-form-actions">
        <div class="comment-form-fields">
          <div class="field-row">
            <span class="field-icon"><Icon name="ph:user-bold" /></span>
            <input v-model="newComment.name" class="comment-input" placeholder="昵称 *" maxlength="20">
          </div>
          <div class="field-row">
            <span class="field-icon"><Icon name="ph:envelope-bold" /></span>
            <input v-model="newComment.email" class="comment-input" placeholder="邮箱">
          </div>
          <div class="field-row">
            <span class="field-icon"><Icon name="ph:link-bold" /></span>
            <input v-model="newComment.website" class="comment-input" placeholder="网站">
          </div>
        </div>
        <div class="form-bottom">
          <label class="comment-remember">
            <input type="checkbox" v-model="rememberMe">
            <span>记住我</span>
          </label>
          <button type="button" class="comment-submit" :disabled="!canSubmit || submitting" @click="submitComment">
            <Icon name="ph:paper-plane-right-fill" />
            <span>{{ submitting ? '提交中...' : '发表评论' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="comment-stats">
      <span class="comment-count-badge">
        <Icon name="ph:chat-circle-dots-bold" />
        {{ comments.length }} 条评论
      </span>
      <span class="comment-sort" @click="sortDesc = !sortDesc">
        <Icon :name="sortDesc ? 'ph:arrow-down-bold' : 'ph:arrow-up-bold'" />
        {{ sortDesc ? '最新优先' : '最早优先' }}
      </span>
    </div>

    <div v-if="comments.length === 0" class="comment-empty">
      <Icon name="ph:chat-centered-dots-bold" class="empty-icon" />
      <p>暂无评论，快来抢沙发吧~</p>
    </div>

    <transition-group name="comment-fade" tag="div" class="comment-list">
      <div v-for="(c, i) in sortedComments" :key="c.id || i" class="comment-item" :class="{ 'comment-hot': c.hot }">
        <img class="comment-avatar" :src="c.avatar" :alt="c.name">
        <div class="comment-body">
          <div class="comment-meta-row">
            <span class="comment-author">{{ c.name }}</span>
            <span v-if="c.hot" class="comment-badge hot"><Icon name="ph:fire-bold" /> 热评</span>
            <span v-if="c.author" class="comment-badge author">博主</span>
            <span class="comment-time">
              <Icon name="ph:clock-bold" />
              {{ c.time }}
            </span>
          </div>
          <div class="comment-text">{{ c.content }}</div>
          <div class="comment-actions">
            <button type="button" class="comment-action-btn" @click="likeComment(c)">
              <Icon :name="c.liked ? 'ph:thumbs-up-fill' : 'ph:thumbs-up-bold'" />
              <span>{{ c.likes || '' }}</span>
            </button>
            <button type="button" class="comment-action-btn" @click="replyTo(c.id)">
              <Icon name="ph:arrow-bend-left-down-bold" />
              <span>回复</span>
            </button>
            <button type="button" class="comment-action-btn" @click="reportComment">
              <Icon name="ph:flag-bold" />
              <span>举报</span>
            </button>
          </div>
          <div v-if="c.replies?.length" class="comment-replies">
            <div v-for="(r, ri) in c.replies" :key="ri" class="reply-item">
              <img class="reply-avatar" :src="r.avatar" :alt="r.name">
              <div class="reply-body">
                <span class="reply-author">{{ r.name }}</span>
                <span class="reply-time">{{ r.time }}</span>
                <div class="reply-text">{{ r.content }}</div>
              </div>
            </div>
          </div>
          <div v-if="replyTarget === c.id" class="comment-reply-form">
            <input v-model="replyContent" class="reply-input" placeholder="写下你的回复..." @keyup.enter="submitReply(c)">
            <button type="button" class="reply-submit" @click="submitReply(c)">
              <Icon name="ph:arrow-bend-right-up-bold" />
            </button>
          </div>
        </div>
      </div>
    </transition-group>

    <div v-if="comments.length >= 5" class="comment-more">
      <button type="button" class="load-more-btn" @click="emit('load-more')">
        <Icon name="ph:arrow-circle-down-bold" />
        加载更多评论
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Comment } from '~/types/article'

export type { Comment }

const props = defineProps<{
  postId?: string | number
  comments: Comment[]
}>()

const emit = defineEmits<{
  'update:comments': [comments: Comment[]]
  'load-more': []
}>()

const api = useApi()
const commentTab = ref<'write' | 'preview'>('write')
const submitting = ref(false)
const rememberMe = ref(true)
const sortDesc = ref(true)
const replyTarget = ref<string | null>(null)
const replyContent = ref('')
const newComment = ref({ name: '游客', email: '', website: '', content: '' })

const sortedComments = computed(() => {
  const list = [...props.comments]
  return sortDesc.value ? list.reverse() : list
})

const canSubmit = computed(() =>
  newComment.value.content.trim().length > 0 && newComment.value.name.trim().length > 0,
)

const renderedPreview = computed(() => {
  const text = newComment.value.content
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/https?:\/\/[^\s<]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>')
})

function autoResize(e: Event) {
  const ta = e.target as HTMLTextAreaElement
  ta.style.height = 'auto'
  ta.style.height = `${ta.scrollHeight}px`
}

async function submitComment() {
  if (!canSubmit.value || !props.postId) return
  submitting.value = true
  try {
    const c = await api.post<any>('/comments', {
      postId: props.postId,
      authorName: newComment.value.name,
      authorEmail: newComment.value.email || undefined,
      content: newComment.value.content,
    })
    emit('update:comments', [
      ...props.comments,
      {
        id: c.id,
        name: c.authorName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`,
        time: '刚刚',
        content: c.content,
        likes: 0,
        liked: false,
        replies: [],
      },
    ])
    newComment.value = {
      name: rememberMe.value ? newComment.value.name : '游客',
      email: rememberMe.value ? newComment.value.email : '',
      website: rememberMe.value ? newComment.value.website : '',
      content: '',
    }
  } catch { /* ignore */ }
  submitting.value = false
}

function likeComment(c: Comment) {
  c.liked = !c.liked
  c.likes = (c.likes || 0) + (c.liked ? 1 : -1)
}

function replyTo(id: string) {
  replyTarget.value = replyTarget.value === id ? null : id
}

async function submitReply(target: Comment) {
  if (!replyContent.value.trim() || !props.postId) return
  try {
    const r = await api.post<any>('/comments', {
      postId: props.postId,
      authorName: newComment.value.name || '游客',
      content: replyContent.value,
      parentId: target.id,
    })
    if (!target.replies) target.replies = []
    target.replies.push({
      name: r.authorName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}`,
      time: '刚刚',
      content: r.content,
    })
  } catch { /* ignore */ }
  replyContent.value = ''
  replyTarget.value = null
}

function reportComment() {
  alert('已举报该评论，我们将尽快处理。')
}
</script>

<style scoped>
.comment-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.z-comment {
  margin: 32px 0 24px;
}

.comment-form-card {
  background: var(--ld-bg-card);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px var(--ld-shadow);
}

.comment-form-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.comment-form-avatar img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-form-tabs {
  display: flex;
  gap: 2px;
  background: var(--c-bg-2);
  border-radius: 8px;
  padding: 2px;
}

.comment-form-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s;
}

.comment-form-tabs button.active {
  background: var(--c-bg-1);
  color: var(--c-primary);
  box-shadow: 0 1px 3px var(--ld-shadow);
}

.comment-form-body {
  margin-bottom: 12px;
}

.comment-textarea {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.82rem;
  outline: none;
  resize: none;
  line-height: 1.6;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.2s;
}

.comment-textarea:focus {
  box-shadow: inset 0 0 0 1.5px var(--c-primary);
}

.comment-textarea::placeholder {
  color: var(--c-text-3);
}

.comment-preview {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--c-bg-1);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--c-text);
  min-height: 80px;
  margin-bottom: 12px;
}

.comment-form-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-form-fields {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 120px;
  background: var(--c-bg-1);
  border-radius: 10px;
  padding: 0 8px;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.2s;
}

.field-row:focus-within {
  box-shadow: inset 0 0 0 1.5px var(--c-primary);
}

.field-icon {
  color: var(--c-text-3);
  font-size: 0.8rem;
  display: flex;
}

.comment-input {
  flex: 1;
  padding: 7px 4px;
  border: none;
  background: transparent;
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.78rem;
  outline: none;
}

.comment-input::placeholder {
  color: var(--c-text-3);
}

.form-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comment-remember {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  cursor: pointer;
}

.comment-remember input {
  accent-color: var(--c-primary);
}

.comment-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 28%, transparent);
}

.comment-submit:hover {
  opacity: 0.92;
}

.comment-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.comment-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--c-text-1);
  font-weight: 600;
}

.comment-count-badge :deep(.icon) {
  color: var(--c-primary);
}

.comment-sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  cursor: pointer;
  transition: color 0.15s;
}

.comment-sort:hover {
  color: var(--c-primary);
}

.comment-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--c-text-3);
}

.comment-empty .empty-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

.comment-empty p {
  font-size: 0.82rem;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--ld-bg-card);
  border-radius: 14px;
  box-shadow: 0 6px 18px var(--ld-shadow);
  transition: transform 0.2s, box-shadow 0.2s;
}

.comment-item.comment-hot {
  box-shadow: 0 6px 18px var(--ld-shadow), inset 3px 0 0 #f59e0b;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.comment-author {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
}

.comment-badge {
  display: inline-block;
  font-size: 0.55rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.comment-badge.hot {
  background: #f59e0b20;
  color: #f59e0b;
}

.comment-badge.author {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

.comment-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: var(--c-text-3);
  margin-left: auto;
}

.comment-text {
  font-size: 0.82rem;
  color: var(--c-text-1);
  line-height: 1.6;
  margin-bottom: 8px;
}

.comment-actions {
  display: flex;
  gap: 12px;
}

.comment-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  border: none;
  background: none;
  color: var(--c-text-3);
  font-family: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: color 0.15s;
}

.comment-action-btn:hover {
  color: var(--c-primary);
}

.comment-replies {
  margin-top: 10px;
  padding: 10px 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--border) 80%, transparent);
}

.reply-item {
  display: flex;
  gap: 8px;
}

.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-author {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--c-text);
  margin-right: 6px;
}

.reply-time {
  font-size: 0.6rem;
  color: var(--c-text-3);
}

.reply-text {
  font-size: 0.78rem;
  color: var(--c-text-1);
  line-height: 1.5;
  margin-top: 2px;
}

.comment-reply-form {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  align-items: center;
}

.reply-input {
  flex: 1;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.75rem;
  outline: none;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.2s;
}

.reply-input:focus {
  box-shadow: inset 0 0 0 1.5px var(--c-primary);
}

.reply-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
}

.comment-more {
  text-align: center;
  margin-top: 14px;
}

.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--ld-shadow);
  transition: all 0.15s;
}

.load-more-btn:hover {
  color: var(--c-primary);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
}

.comment-fade-enter-active,
.comment-fade-leave-active {
  transition: all 0.3s ease;
}

.comment-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.comment-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (max-width: 640px) {
  .z-comment {
    margin: 24px 0 18px;
  }

  .comment-form-card {
    padding: 14px;
    border-radius: 13px;
  }

  .comment-form-fields {
    flex-direction: column;
  }

  .field-row {
    width: 100%;
    min-width: 0;
  }

  .comment-item {
    gap: 9px;
    padding: 12px 10px;
    border-radius: 12px;
  }

  .comment-avatar {
    width: 34px;
    height: 34px;
  }

  .comment-meta-row {
    gap: 5px;
  }

  .comment-time {
    width: 100%;
    margin-left: 0;
  }

  .comment-replies {
    padding-left: 6px;
  }
}
</style>
