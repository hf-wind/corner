<template>
  <section class="z-comment" id="comment">
    <h3 class="comment-title">
      <Icon name="ph:chat-circle-text-bold" />
      <span>评论区</span>
    </h3>

    <CommonCommentEditor :submitting="editorSubmitting" @submit="handleSubmit" />

    <div class="comment-stats">
      <span class="comment-count-badge">
        <Icon name="ph:chat-circle-dots-bold" />
        {{ total }} 条评论
      </span>
      <span class="comment-sort" @click="$emit('update:sortDesc', !sortDesc)">
        <Icon :name="sortDesc ? 'ph:arrow-down-bold' : 'ph:arrow-up-bold'" />
        {{ sortDesc ? '最新优先' : '最早优先' }}
      </span>
    </div>

    <div v-if="comments.length === 0 && !loading" class="comment-empty">
      <Icon name="ph:chat-centered-dots-bold" class="empty-icon" />
      <p>暂无评论，快来抢沙发吧~</p>
    </div>

    <transition-group name="comment-fade" tag="div" class="comment-list">
      <CommonCommentItem
        v-for="c in sortedComments"
        :key="c.id"
        :comment="c"
        :loading-replies="loadingReplies[c.id]"
        :reply-submitting="replySubmitting"
        :current-reply="replyTarget"
        :show-reply-button="showReplyButton"
        @like="(comment) => $emit('like', comment)"
        @reply="(target) => $emit('reply', target)"
        @load-more="(comment) => $emit('load-more', comment)"
        @submit-reply="(payload) => $emit('submit-reply', payload)"
        @cancel-reply="$emit('cancel-reply')"
      />
    </transition-group>

    <div v-if="hasMore" class="comment-more" aria-live="polite">
      <button type="button" class="load-more-btn" :disabled="loading" @click="$emit('load-more')">
        <Icon :name="loading ? 'ph:spinner-gap-bold' : 'ph:chat-circle-dots-bold'" :class="{ spinning: loading }" />
        <span>{{ loading ? '正在加载评论' : '查看更多评论' }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Comment } from '~/types/article'

const props = defineProps<{
  comments: Comment[]
  total: number
  sortDesc: boolean
  hasMore: boolean
  loading?: boolean
  loadingReplies?: Record<string, boolean>
  replySubmitting?: boolean
  replyTarget?: { commentId: string; parentId: string; name: string } | null
  showReplyButton?: boolean
  editorSubmitting?: boolean
}>()

const emit = defineEmits<{
  submit: [content: string]
  'load-more': []
  like: [comment: Comment]
  reply: [target: { commentId: string; parentId: string; name: string }]
  'load-more-replies': [comment: Comment]
  'submit-reply': [payload: { content: string; comment: Comment; parentId: string; replyToName: string }]
  'cancel-reply': []
  'update:sortDesc': [value: boolean]
}>()

const sortedComments = computed(() => {
  const list = [...props.comments]
  const timestamp = (comment: Comment) => new Date(comment.createdAt || 0).getTime()
  return props.sortDesc
    ? list.sort((a, b) => timestamp(b) - timestamp(a))
    : list.sort((a, b) => timestamp(a) - timestamp(b))
})

function handleSubmit(content: string) {
  emit('submit', content)
}
</script>

<style scoped>
.z-comment { margin: 32px 0 24px; }
.comment-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 6px;
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
.comment-count-badge :deep(.icon) { color: var(--c-primary); }
.comment-sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  cursor: pointer;
  transition: color 0.15s;
}
.comment-sort:hover { color: var(--c-primary); }
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
.comment-empty p { font-size: 0.82rem; }
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comment-more {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
  gap: 7px;
  margin-top: 14px;
  color: var(--c-text-3);
  font-size: 0.75rem;
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
.load-more-btn:hover { color: var(--c-primary); box-shadow: 0 8px 18px color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow)); }
.load-more-btn:disabled { cursor: wait; opacity: 0.62; }
.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.comment-fade-enter-active, .comment-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.comment-fade-enter-from { opacity: 0; transform: translateY(10px); }
.comment-fade-leave-to { opacity: 0; transform: translateX(20px); }
@media (max-width: 640px) {
  .z-comment { margin: 24px 0 18px; }
  .comment-time { width: 100%; margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .comment-fade-enter-active, .comment-fade-leave-active { animation: none; }
}
</style>
