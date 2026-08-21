<template>
  <section v-if="loaded" class="comments-enter">
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
import { focusSearchHighlight } from '~/composables/useSearchHighlight'

const props = defineProps<{
  postId: string | number
  focusCommentId?: string
  focusParentId?: string
  highlightQuery?: string
}>()

const emit = defineEmits<{
  loaded: []
}>()

const contentId = computed(() => props.postId)

const commentCtrl = useComments({
  apiBase: '/comments',
  contentId,
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
  totalPages,
  loadComments,
  loadMoreReplies,
  submitComment,
  submitReply,
  toggleLike,
  cancelReply,
} = commentCtrl

const isSubmitting = ref(false)
const loaded = ref(false)

watch(contentId, (id) => {
  if (id) {
    loaded.value = false
    void loadComments(1).then(async () => {
      loaded.value = true
      emit('loaded')
      await focusComment()
    })
  }
}, { immediate: true })

watch(() => `${props.focusCommentId || ''}:${props.focusParentId || ''}`, () => {
  if (loaded.value) void focusComment()
})

async function focusComment() {
  const targetId = String(props.focusCommentId || '').trim()
  if (!targetId || typeof document === 'undefined') return
  const findTarget = () => document.getElementById(`comment-${targetId}`)
  const findParent = () => comments.value.find((comment) => comment.id === props.focusParentId)

  for (let targetPage = 1; targetPage <= totalPages.value; targetPage += 1) {
    if (targetPage > 1 && !findParent() && !findTarget()) {
      await loadComments(targetPage, true)
    }
    await nextTick()
    const parent = findParent()
    if (parent && !findTarget()) {
      let attempts = 0
      while (!findTarget() && (parent.replyCount || 0) > (parent.replies?.length || 0) && attempts < 20) {
        attempts += 1
        await loadMoreReplies(parent)
      }
      await nextTick()
    }
    const target = findTarget()
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (props.highlightQuery) focusSearchHighlight(props.highlightQuery, target)
      return
    }
  }
}

async function handleSubmit(content: string) {
  isSubmitting.value = true
  const ok = await submitComment(content)
  isSubmitting.value = false
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
  await submitReply(payload.content, payload.comment, payload.parentId, payload.replyToName)
  cancelReply()
}
</script>

<style scoped>
.comments-enter { animation: comments-in 0.3s ease; }
@keyframes comments-in { from { opacity: 0; transform: translateY(8px); } }
</style>
