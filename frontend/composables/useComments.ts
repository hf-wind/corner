import type { Comment, Reply } from '~/types/article'
import { renderCommentContent } from '~/utils/commentContent'
import { useNotifications } from '~/composables/useNotifications'

export interface UseCommentsOptions {
  apiBase: '/comments' | '/moment-comments'
  contentId: Ref<string | number | null | undefined>
  pageSize?: number
  replyPageSize?: number
}

export function useComments(opts: UseCommentsOptions) {
  const api = useApi()
  const { mediaUrl } = useMediaUrl()
  const { user, isLoggedIn } = useAuth()
  const { latestItems, connectRealtime } = useNotifications()

  const PAGE_SIZE = opts.pageSize ?? 10
  const REPLY_PAGE_SIZE = opts.replyPageSize ?? 3

  const comments = ref<Comment[]>([])
  const total = ref(0)
  const page = ref(1)
  const totalPages = ref(1)
  const loading = ref(false)
  const loadingReplies = ref<Record<string, boolean>>({})
  const sortDesc = ref(true)
  const replyTarget = ref<{ commentId: string; parentId: string; name: string } | null>(null)
  const replySubmitting = ref(false)
  const loadedReplyPages = new Map<string, number>()
  const pendingReviewIds = new Set<string>()
  const reviewTimers = new Map<string, ReturnType<typeof setTimeout>>()

  const hasMore = computed(() => page.value < totalPages.value)

  const sortedComments = computed(() => {
    const list = [...comments.value]
    const timestamp = (comment: Comment) => new Date(comment.createdAt || 0).getTime()
    return sortDesc.value ? list.sort((a, b) => timestamp(b) - timestamp(a)) : list.sort((a, b) => timestamp(a) - timestamp(b))
  })

  function renderContent(text: string) {
    return renderCommentContent(text, mediaUrl)
  }

  function formatTime(iso?: string): string {
    if (!iso) return ''
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
    return iso.slice(0, 10)
  }

  function replyEndpoint(path: string) {
    return `${opts.apiBase}${path}`
  }

  function normalizeReply(item: any, parentCommentId?: string): Reply {
    return {
      id: item.id,
      userId: item.userId,
      name: item.authorName || user.value?.username || '匿名',
      avatar: item.authorAvatar ?? item.user?.avatar ?? user.value?.avatar ?? '',
      time: formatTime(item.createdAt),
      content: item.content,
      replyTo: item.replyToName ?? item.parent?.authorName ?? undefined,
      replyToId: item.parentId ?? parentCommentId,
      status: item.status,
      createdAt: item.createdAt,
    }
  }

  function normalizeComment(item: any): Comment {
    const replies = (item.replies || []).map((r: any) => normalizeReply(r, item.id))
    return {
      id: item.id,
      userId: item.userId,
      name: item.authorName || user.value?.username || '匿名',
      avatar: item.authorAvatar ?? item.user?.avatar ?? user.value?.avatar ?? '',
      time: formatTime(item.createdAt),
      content: item.content,
      createdAt: item.createdAt,
      status: item.status,
      hot: !!item.hot,
      author: !!item.author,
      liked: !!item.liked,
      likes: item.likesCount ?? item.likes ?? 0,
      replies,
      localReplies: [],
      replyCount: item.replyCount ?? item._count?.replies ?? 0,
    }
  }

  async function loadComments(targetPage = 1, append = false) {
    const id = unref(opts.contentId)
    if (!id) return
    loading.value = true
    try {
      const momentPath = opts.apiBase === '/moment-comments'
      const data = await api.get<any>(
        momentPath ? `${opts.apiBase}/moment/${id}` : `${opts.apiBase}/post/${id}`,
        { page: targetPage, limit: PAGE_SIZE, replyLimit: REPLY_PAGE_SIZE },
      )
      const next = (data.items || []).map(normalizeComment)
      next.forEach((comment: Comment) => loadedReplyPages.set(comment.id, 1))
      if (append) {
        const ids = new Set(comments.value.map(c => c.id))
        comments.value.push(...next.filter((c: Comment) => !ids.has(c.id)))
      } else {
        comments.value = next
      }
      total.value = data.total ?? 0
      totalPages.value = data.totalPages ?? 1
      page.value = targetPage
    } finally {
      loading.value = false
    }
  }

  async function loadMoreReplies(comment: Comment) {
    if (loadingReplies.value[comment.id]) return
    loadingReplies.value = { ...loadingReplies.value, [comment.id]: true }
    try {
      const nextPage = (loadedReplyPages.get(comment.id) || 1) + 1
      const data = await api.get<any>(replyEndpoint(`/${comment.id}/replies`), { page: nextPage, limit: REPLY_PAGE_SIZE })
      const next = (data.items || []).map((item: any) => normalizeReply(item, comment.id))
      const ids = new Set([...(comment.replies || []), ...(comment.localReplies || [])].map(r => r.id))
      comment.replies = [...(comment.replies || []), ...next.filter((r: Reply) => !ids.has(r.id))]
      comment.replyCount = data.total ?? comment.replyCount ?? 0
      loadedReplyPages.set(comment.id, data.page ?? nextPage)
    } finally {
      loadingReplies.value = { ...loadingReplies.value, [comment.id]: false }
    }
  }

  async function submitComment(content: string): Promise<boolean> {
    const id = unref(opts.contentId)
    if (!content.trim() || !id) return false
    const toast = useToast()
    try {
      const created = await api.post<any>(replyEndpoint(''), {
        [opts.apiBase === '/moment-comments' ? 'momentId' : 'postId']: id,
        content: content.trim(),
      })
      const newComment = normalizeComment(created)
      comments.value.unshift(newComment)
      total.value += 1
      totalPages.value = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
      toast.success('评论已提交，正在审核')
      watchReviewStatus(created.id)
      return true
    } catch (e: any) {
      toast.error(`评论失败：${e?.message || ''}`)
      return false
    }
  }

  async function submitReply(content: string, parentComment: Comment, parentId: string, replyToName?: string): Promise<boolean> {
    const id = unref(opts.contentId)
    if (!content.trim() || !id) return false
    replySubmitting.value = true
    const toast = useToast()
    try {
      const created = await api.post<any>(replyEndpoint(''), {
        [opts.apiBase === '/moment-comments' ? 'momentId' : 'postId']: id,
        content: content.trim(),
        parentId,
      })
      const newReply = normalizeReply(created, parentComment.id)
      if (replyToName) newReply.replyTo = replyToName
      newReply.replyToId = parentId
      if (!parentComment.localReplies) parentComment.localReplies = []
      parentComment.localReplies.push(newReply)
      parentComment.replyCount = (parentComment.replyCount || 0) + 1
      toast.success('回复已提交，正在审核')
      watchReviewStatus(created.id)
      return true
    } catch (e: any) {
      toast.error(`回复失败：${e?.message || ''}`)
      return false
    } finally {
      replySubmitting.value = false
    }
  }

  async function toggleLike(comment: Comment) {
    if (!isLoggedIn.value) return
    const isOwnComment = comment.userId
      ? comment.userId === user.value?.id
      : comment.name === user.value?.username
    if (isOwnComment) return
    try {
      const result = await api.post<any>(replyEndpoint(`/${comment.id}/like`))
      comment.liked = !!result.liked
      comment.likes = result.likesCount ?? result.likes ?? comment.likes
    } catch {
      useToast().error('操作失败')
    }
  }

  function applyStatus(commentId: string, status: 'approved' | 'rejected') {
    for (const comment of comments.value) {
      if (comment.id === commentId) {
        if (status === 'rejected') {
          const idx = comments.value.indexOf(comment)
          if (idx >= 0) comments.value.splice(idx, 1)
          total.value = Math.max(0, total.value - 1)
          totalPages.value = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
        } else {
          comment.status = status
        }
        return
      }
      const inReplies = comment.localReplies?.findIndex(r => r.id === commentId) ?? -1
      if (inReplies >= 0) {
        if (status === 'rejected') {
          comment.localReplies!.splice(inReplies, 1)
          comment.replyCount = Math.max(0, (comment.replyCount || 0) - 1)
        } else {
          comment.localReplies![inReplies].status = status
        }
        return
      }
      const inLoadedReplies = comment.replies?.findIndex(r => r.id === commentId) ?? -1
      if (inLoadedReplies >= 0 && comment.replies) {
        if (status === 'rejected') {
          comment.replies.splice(inLoadedReplies, 1)
          comment.replyCount = Math.max(0, (comment.replyCount || 0) - 1)
        } else {
          comment.replies[inLoadedReplies].status = status
        }
        return
      }
    }
  }

  function applyReviewNotification(notification: { link?: string | null }) {
    if (!notification.link) return
    try {
      const url = new URL(notification.link, window.location.origin)
      const commentId = url.searchParams.get('reviewComment') || ''
      const status = url.searchParams.get('review')
      if (!commentId || !pendingReviewIds.has(commentId) || !['approved', 'rejected'].includes(status || '')) return
      pendingReviewIds.delete(commentId)
      const timer = reviewTimers.get(commentId)
      if (timer) clearTimeout(timer)
      reviewTimers.delete(commentId)
      applyStatus(commentId, status as 'approved' | 'rejected')
      if (status === 'approved') useToast().success('你的评论已通过审核')
      else useToast().error('你的评论未通过审核')
    } catch { /* malformed notification links are ignored */ }
  }

  watch(latestItems, (items) => items.forEach(applyReviewNotification), { deep: true })

  function watchReviewStatus(commentId: string) {
    pendingReviewIds.add(commentId)
    connectRealtime()
    const timer = setTimeout(() => void fallbackReviewCheck(commentId, 0), 15000)
    reviewTimers.set(commentId, timer)
    latestItems.value.forEach(applyReviewNotification)
  }

  async function fallbackReviewCheck(commentId: string, attempts: number) {
    if (!pendingReviewIds.has(commentId) || attempts >= 4) return
    try {
      const result = await api.get<any>(replyEndpoint(`/${commentId}/status`))
      if (result && result.status !== 'pending') {
        pendingReviewIds.delete(commentId)
        applyStatus(commentId, result.status)
        if (result.status === 'approved') useToast().success('你的评论已通过审核')
        else useToast().error('你的评论未通过审核')
        return
      }
    } catch { /* SSE remains the primary path */ }
    const timer = setTimeout(() => void fallbackReviewCheck(commentId, attempts + 1), 10000)
    reviewTimers.set(commentId, timer)
  }

  onUnmounted(() => {
    reviewTimers.forEach(timer => clearTimeout(timer))
    reviewTimers.clear()
    pendingReviewIds.clear()
  })

  function cancelReply() {
    replyTarget.value = null
  }

  return {
    comments,
    total,
    page,
    totalPages,
    loading,
    loadingReplies,
    sortDesc,
    hasMore,
    replyTarget,
    replySubmitting,
    sortedComments,
    user,
    isLoggedIn,
    renderContent,
    formatTime,
    loadComments,
    loadMoreReplies,
    submitComment,
    submitReply,
    toggleLike,
    pollStatus: watchReviewStatus,
    cancelReply,
  }
}
