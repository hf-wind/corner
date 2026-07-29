<template>
  <div class="comment-item" :class="{ 'comment-hot': comment.hot }">
    <img class="comment-avatar" :src="mediaUrl(comment.avatar)" :alt="comment.name">
    <div class="comment-body">
      <div class="comment-meta-row">
        <span class="comment-author">{{ comment.name }}</span>
        <span v-if="comment.hot" class="comment-badge hot">
          <Icon name="ph:fire-bold" /> 热评
        </span>
        <span v-if="comment.author" class="comment-badge author">博主</span>
        <span v-if="comment.status === 'pending'" class="comment-badge pending" aria-live="polite">
          <Icon name="ph:spinner-gap-bold" class="spinning" /> 正在审核
        </span>
        <span v-if="comment.status === 'rejected'" class="comment-badge rejected">审核未通过</span>
        <span class="comment-time">
          <Icon name="ph:clock-bold" />{{ comment.time }}
        </span>
      </div>
      <div class="comment-text" v-html="renderContent(comment.content)" />
      <div class="comment-actions">
        <button
          type="button"
          class="comment-action-btn"
          :class="{ liked: comment.liked }"
          :disabled="!canLikeComment"
          :title="likeButtonTitle"
          @click="$emit('like', comment)"
        >
          <Icon :name="comment.liked ? 'ph:thumbs-up-fill' : 'ph:thumbs-up-bold'" />
          <span>{{ comment.likes || '' }}</span>
        </button>
        <button
          v-if="canReplyToComment"
          type="button"
          class="comment-action-btn"
          @click="$emit('reply', { commentId: comment.id, parentId: comment.id, name: comment.name })"
        >
          <Icon name="ph:arrow-bend-left-down-bold" />
          <span>回复</span>
        </button>
      </div>

      <CommonReplyForm
        v-if="isReplyTarget && currentReply?.parentId === comment.id"
        :reply-to-name="replyToName"
        :submitting="replySubmitting"
        @submit="(content) => $emit('submit-reply', { content, comment, parentId: replyParentId, replyToName: replyToName })"
        @cancel="$emit('cancel-reply')"
      />

      <div v-if="hasVisibleReplies" class="comment-replies">
        <template v-for="r in displayReplies" :key="r.id">
          <div class="reply-item" :class="{ 'pending-local': r.status === 'pending' }">
            <img class="reply-avatar" :src="mediaUrl(r.avatar)" :alt="r.name">
            <div class="reply-body">
              <div class="reply-meta-row">
                <span class="reply-author">{{ r.name }}</span>
                <span v-if="r.replyTo" class="reply-to-badge">回复 @{{ r.replyTo }}</span>
                <span v-if="r.status === 'pending'" class="comment-badge pending" aria-live="polite">
                  <Icon name="ph:spinner-gap-bold" class="spinning" /> 正在审核
                </span>
                <span v-if="r.status === 'rejected'" class="comment-badge rejected">审核未通过</span>
                <span class="reply-time">{{ r.time }}</span>
              </div>
              <div class="reply-text" v-html="renderContent(r.content)" />
            </div>
            <button v-if="canReplyTo(r)" type="button" class="reply-action-btn" title="回复" @click="$emit('reply', { commentId: comment.id, parentId: r.id, name: r.name })">
              <Icon name="ph:arrow-bend-left-down-bold" />
            </button>
          </div>
          <CommonReplyForm
            v-if="currentReply?.parentId === r.id"
            :reply-to-name="replyToName"
            :submitting="replySubmitting"
            @submit="(content) => $emit('submit-reply', { content, comment, parentId: replyParentId, replyToName: replyToName })"
            @cancel="$emit('cancel-reply')"
          />
        </template>

        <div v-if="loadMoreCount > 0" class="load-more-replies-wrap">
          <button type="button" class="load-more-replies-btn" :disabled="loadingReplies" @click="$emit('load-more', comment)">
            <Icon :name="loadingReplies ? 'ph:spinner-gap-bold' : 'ph:chats-circle-bold'" :class="{ spinning: loadingReplies }" />
            <span>{{ loadingReplies ? '正在加载' : `查看更多回复（${loadMoreCount} 条）` }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Comment, Reply } from '~/types/article'
import { renderCommentContent } from '~/utils/commentContent'

interface ReplyTarget {
  commentId: string
  parentId: string
  name: string
}

const props = defineProps<{
  comment: Comment
  loadingReplies?: boolean
  replySubmitting?: boolean
  currentReply?: ReplyTarget | null
  showReplyButton?: boolean
}>()

defineEmits<{
  like: [comment: Comment]
  reply: [target: ReplyTarget]
  'load-more': [comment: Comment]
  'submit-reply': [payload: { content: string; comment: Comment; parentId: string; replyToName: string }]
  'cancel-reply': []
}>()

const { mediaUrl } = useMediaUrl()
const { user, isLoggedIn } = useAuth()

function isOwnEntry(entry: Pick<Comment, 'userId' | 'name'> | Pick<Reply, 'userId' | 'name'>) {
  if (!user.value) return false
  return entry.userId ? entry.userId === user.value.id : entry.name === user.value.username
}

const isOwnComment = computed(() => isOwnEntry(props.comment))
const canLikeComment = computed(() => isLoggedIn.value && !isOwnComment.value)
const canReplyToComment = computed(() => {
  return Boolean(props.showReplyButton && isLoggedIn.value && !isOwnComment.value)
})
const commentLikeTitle = computed(() => props.comment.liked ? '取消点赞' : '点赞')
const likeButtonTitle = computed(() => {
  if (!isLoggedIn.value) return '登录后可点赞'
  if (isOwnComment.value) return '不能点赞自己的评论'
  return commentLikeTitle.value
})

function canReplyTo(reply: Reply) {
  return Boolean(props.showReplyButton && isLoggedIn.value && !isOwnEntry(reply))
}

function renderContent(text: string) {
  return renderCommentContent(text, mediaUrl)
}

const isReplyTarget = computed(() => {
  return props.currentReply?.commentId === props.comment.id
})

const replyToName = computed(() => {
  return props.currentReply?.name || ''
})

const replyParentId = computed(() => {
  return props.currentReply?.parentId || props.comment.id
})

const hasVisibleReplies = computed(() => {
  return displayReplies.value.length > 0
})

const displayReplies = computed(() => {
  const replies = [...(props.comment.replies || [])]
  const localReplies = (props.comment.localReplies || []).filter(local => !replies.some(reply => reply.id === local.id))
  const topLevelLocalReplies = localReplies.filter(reply => reply.replyToId === props.comment.id)
  const nestedLocalReplies = localReplies.filter(reply => reply.replyToId !== props.comment.id)
  replies.unshift(...topLevelLocalReplies)

  for (const localReply of nestedLocalReplies) {
    const targetIndex = replies.findIndex(reply => reply.id === localReply.replyToId)
    if (targetIndex < 0) {
      replies.push(localReply)
      continue
    }
    let insertIndex = targetIndex + 1
    while (insertIndex < replies.length && nestedLocalReplies.some(reply => reply.id === replies[insertIndex].id && reply.replyToId === localReply.replyToId)) {
      insertIndex += 1
    }
    replies.splice(insertIndex, 0, localReply)
  }
  return replies
})

const loadMoreCount = computed(() => {
  const visible = displayReplies.value.length
  return Math.max(0, (props.comment.replyCount || 0) - visible)
})
</script>

<style scoped>
.comment-item {
  display: flex;
  gap: 14px;
  padding: 17px 16px;
  background: var(--ld-bg-card);
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 16px;
  box-shadow: 0 5px 16px color-mix(in srgb, var(--ld-shadow) 48%, transparent);
}
.comment-item.comment-hot {
  border-left-color: #f59e0b;
  box-shadow: 0 5px 16px color-mix(in srgb, var(--ld-shadow) 48%, transparent), inset 3px 0 0 #f59e0b;
}
.comment-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
  background: var(--c-bg-2);
  box-shadow: 0 0 0 3px var(--c-bg-1);
}
.comment-body { flex: 1; min-width: 0; }
.comment-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 7px;
}
.comment-author { font-size: 0.84rem; font-weight: 700; color: var(--c-text); }
.comment-badge {
  display: inline-block;
  font-size: 0.55rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.comment-badge.hot { background: #f59e0b20; color: #f59e0b; }
.comment-badge.author { background: var(--c-primary-soft); color: var(--c-primary); }
.comment-badge.pending { background: #f59e0b20; color: #f59e0b; }
.comment-badge.rejected { background: #ef444420; color: #ef4444; }
.comment-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: var(--c-text-3);
  margin-left: auto;
}
.comment-text :deep(.inline-emoji),
.reply-text :deep(.inline-emoji) {
  display: inline;
  width: auto;
  height: 1.4em;
  vertical-align: -0.25em;
  object-fit: contain;
  border-radius: 3px;
}
.comment-text {
  font-size: 0.86rem;
  color: var(--c-text-1);
  line-height: 1.78;
  margin-bottom: 10px;
}
.comment-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}
.comment-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 27px;
  padding: 3px 9px;
  border: none;
  border-radius: 999px;
  background: var(--c-bg-1);
  color: var(--c-text-3);
  font-family: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: color 0.15s;
}
.comment-action-btn:hover { color: var(--c-primary); background: var(--c-primary-soft); }
.comment-action-btn.liked { color: var(--c-primary); background: var(--c-primary-soft); }
.comment-action-btn:disabled {
  cursor: default;
  opacity: 0.56;
}
.comment-action-btn:disabled:hover {
  color: var(--c-text-3);
  background: var(--c-bg-1);
}

.comment-replies {
  margin: 16px 0 0 8px;
  padding: 4px 0 2px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.reply-item {
  display: flex;
  gap: 9px;
  margin: 0;
  padding: 8px;
  align-items: flex-start;
  border-radius: 9px;
  animation: reply-enter 0.24s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.reply-item.pending-local {
  background: color-mix(in srgb, var(--c-primary-soft) 38%, transparent);
}
@keyframes reply-enter {
  from { opacity: 0; transform: translate3d(0, 6px, 0); }
}
.reply-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 1px;
}
.reply-body { flex: 1; min-width: 0; }
.reply-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 0 0 4px;
}
.reply-author { font-size: 0.75rem; font-weight: 700; color: var(--c-text); }
.reply-to-badge { font-size: 0.65rem; color: var(--c-primary); font-weight: 600; }
.reply-time { font-size: 0.6rem; color: var(--c-text-3); margin-left: auto; }
.reply-text {
  font-size: 0.8rem;
  color: var(--c-text-1);
  line-height: 1.68;
  margin-top: 0;
}
.reply-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font-size: 0.7rem;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.46;
  transition: opacity 0.15s, color 0.15s, background-color 0.15s;
}
.reply-item:hover .reply-action-btn { opacity: 1; }
.reply-action-btn:hover { color: var(--c-primary); background: var(--c-primary-soft); }

.load-more-replies-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 32px;
  gap: 5px;
  margin-top: 6px;
  color: var(--c-text-3);
  font-size: 0.68rem;
}
.load-more-replies-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  font-family: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: all 0.15s;
}
.load-more-replies-btn:hover { color: var(--c-primary); background: var(--c-primary-soft); }
.load-more-replies-btn:disabled { cursor: wait; opacity: 0.62; }
.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .comment-item {
    gap: 10px;
    padding: 14px 11px;
    border-radius: 12px;
  }
  .comment-avatar { width: 34px; height: 34px; }
  .comment-replies {
    margin: 12px 0 0;
    padding: 3px 0 2px 4px;
  }
  .reply-item { gap: 7px; padding: 7px 3px; }
  .reply-avatar { width: 26px; height: 26px; }
  .reply-time { width: 100%; margin-left: 0; }
}
</style>
