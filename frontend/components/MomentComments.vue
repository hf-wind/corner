<template>
  <section class="moment-comments">
    <CommonCommentList
      :comments="comments"
      :total="total"
      :sort-desc="sortDesc"
      :has-more="hasMore"
      :loading="loading"
      :loading-replies="loadingReplies"
      :reply-submitting="replySubmitting"
      :reply-target="replyTarget"
      :editor-submitting="isSubmitting"
      :show-reply-button="true"
      @update:sortDesc="sortDesc = $event"
      @submit="handleSubmit"
      @load-more="handleLoadMore"
      @like="handleLike"
      @reply="handleReply"
      @submit-reply="handleSubmitReply"
      @cancel-reply="cancelReply"
    />
  </section>
</template>

<script setup lang="ts">
import { useComments } from '~/composables/useComments'

const props = defineProps<{
  momentId: string
}>()

const emit = defineEmits<{
  submitted: [delta: number]
}>()

const contentId = computed(() => props.momentId)

const commentCtrl = useComments({
  apiBase: '/moment-comments',
  contentId,
  pageSize: 3,
  replyPageSize: 2,
})

const {
  comments,
  total,
  sortDesc,
  loading,
  loadingReplies,
  hasMore,
  replyTarget,
  replySubmitting,
  page,
  loadComments,
  submitComment,
  submitReply,
  toggleLike,
  cancelReply,
} = commentCtrl

let initialTotal = 0

const isSubmitting = ref(false)

watch(contentId, (id) => {
  if (id) void loadComments(1)
}, { immediate: true })

async function handleSubmit(content: string) {
  isSubmitting.value = true
  const prev = total.value
  await submitComment(content)
  isSubmitting.value = false
  const delta = total.value - prev
  if (delta !== 0) emit('submitted', delta)
}

function handleLoadMore() {
  if (!hasMore.value) return
  void loadComments(page.value + 1, true)
}

function handleLike(comment: any) {
  void toggleLike(comment)
}

function handleReply(target: { commentId: string; parentId: string; name: string }) {
  replyTarget.value = target
}

async function handleSubmitReply(payload: { content: string; comment: any; parentId: string; replyToName: string }) {
  const prev = total.value
  await submitReply(payload.content, payload.comment, payload.parentId, payload.replyToName)
  cancelReply()
  const delta = total.value - prev
  if (delta !== 0) emit('submitted', delta)
}

onUnmounted(() => {
  cancelReply()
})
</script>

<style scoped>
.moment-comments { display: grid; gap: 10px; }
</style>
