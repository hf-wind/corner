<template>
  <section class="z-comment" id="comment">
    <h3 class="comment-title">
      <Icon name="ph:chat-circle-text-bold" />
      <span>评论区</span>
    </h3>

    <div class="comment-form-card">
      <template v-if="isLoggedIn">
        <div class="comment-form-header">
          <div class="comment-form-avatar">
            <img :src="mediaUrl(authUser?.avatar) || userAvatarFallback" alt="avatar" />
          </div>
          <span class="comment-form-username">{{ authUser?.username || '用户' }}</span>
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

        <div v-show="commentTab === 'write'" class="comment-form-body" ref="editorWrapRef">
          <div ref="editorRef" contenteditable="true" class="comment-editor" data-placeholder="写下你的评论..."
            @paste="onEditorPaste" @input="onEditorInput"></div>
          <div class="comment-toolbar">
            <button type="button" class="emoji-btn" :class="{ active: emojiOpen }" @click="emojiOpen = !emojiOpen"
              title="插入表情">
              <Icon name="ph:smiley-bold" />
            </button>
            <transition name="emoji-panel-fade">
              <div v-if="emojiOpen" class="emoji-picker">
                <div v-if="!emojiPacks.length" class="emoji-loading">加载中...</div>
                <template v-else>
                  <div class="emoji-sidebar">
                    <button v-for="(p, pi) in emojiPacks" :key="p.id" type="button"
                      :class="{ active: emojiPackIdx === pi }" @click="emojiPackIdx = pi" :title="p.name">{{
                        p.name.replace(/[·.·\s]/g, '') }}</button>
                  </div>
                  <div class="emoji-grid-wrap">
                    <div class="emoji-grid">
                      <template v-if="emojiPacks[emojiPackIdx]?.type === 'animated'">
                        <button v-for="a in emojiPacks[emojiPackIdx].items" :key="a.id" type="button"
                          class="emoji-item emoji-img-item" @click="insertEmoji(a.char || '😊', a.imageUrl)"
                          :title="a.label || a.char" @mouseenter="onEmojiHover($event, a.imageUrl)"
                          @mousemove="onEmojiMove($event)" @mouseleave="onEmojiLeave">
                          <img :src="mediaUrl(a.imageUrl)" :alt="a.label" loading="lazy" :data-fallback="a.char || '😊'" @error="onEmojiError" />
                        </button>
                      </template>
                      <template v-else>
                        <button v-for="e in emojiPacks[emojiPackIdx].items" :key="e.id" type="button"
                          class="emoji-item" @click="insertEmoji(e.char || '😊')" :title="e.label || e.char">{{ e.char
                          }}</button>
                      </template>
                    </div>
                  </div>
                </template>
              </div>
            </transition>
            <div v-show="previewEmojiUrl" class="emoji-hover-preview" :style="previewEmojiStyle">
              <img :src="mediaUrl(previewEmojiUrl)" alt="" />
            </div>
          </div>
        </div>
        <div v-show="commentTab === 'preview'" class="comment-preview" v-html="renderContent(previewContent)" />

        <div class="comment-form-actions">
          <button type="button" class="comment-submit" :disabled="!hasContent || submitting" @click="submitComment">
            <Icon name="ph:paper-plane-right-fill" />
            <span>{{ submitting ? '提交中...' : '发表评论' }}</span>
          </button>
        </div>
      </template>

      <div v-else class="comment-login-prompt">
        <Icon name="ph:chat-centered-dots-bold" class="prompt-icon" />
        <p class="prompt-text">请登录后发表评论</p>
        <div class="prompt-actions">
          <NuxtLink to="/login" class="prompt-btn prompt-btn-primary">去登录</NuxtLink>
          <NuxtLink to="/register" class="prompt-btn prompt-btn-secondary">注册</NuxtLink>
        </div>
      </div>
    </div>

    <div class="comment-stats">
      <span class="comment-count-badge">
        <Icon name="ph:chat-circle-dots-bold" />
        {{ commentTotal }} 条评论
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
        <img class="comment-avatar" :src="mediaUrl(c.avatar)" :alt="c.name">
        <div class="comment-body">
          <div class="comment-meta-row">
            <span class="comment-author">{{ c.name }}</span>
            <span v-if="c.hot" class="comment-badge hot">
              <Icon name="ph:fire-bold" /> 热评
            </span>
            <span v-if="c.author" class="comment-badge author">博主</span>
            <span v-if="c.status === 'pending'" class="comment-badge pending">
              <Icon name="ph:spinner-gap-bold" class="spinning" /> 审核中
            </span>
            <span v-if="c.status === 'rejected'" class="comment-badge rejected">审核未通过</span>
            <span class="comment-time">
              <Icon name="ph:clock-bold" />
              {{ c.time }}
            </span>
          </div>
          <div class="comment-text" v-html="renderContent(c.content)"></div>
          <div class="comment-actions">
            <button type="button" class="comment-action-btn" @click="likeComment(c)">
              <Icon :name="c.liked ? 'ph:thumbs-up-fill' : 'ph:thumbs-up-bold'" />
              <span>{{ c.likes || '' }}</span>
            </button>
            <button type="button" class="comment-action-btn" @click="replyTo(c.id, c.name)">
              <Icon name="ph:arrow-bend-left-down-bold" />
              <span>回复</span>
            </button>
          </div>
          <div v-if="c.replies?.length" class="comment-replies">
            <div v-for="(r, ri) in c.replies" :key="r.id || ri" class="reply-item">
              <img class="reply-avatar" :src="mediaUrl(r.avatar)" :alt="r.name">
              <div class="reply-body">
                <div class="reply-meta-row">
                  <span class="reply-author">{{ r.name }}</span>
                  <span v-if="r.replyTo" class="reply-to-badge">回复 @{{ r.replyTo }}</span>
                  <span class="reply-time">{{ r.time }}</span>
                </div>
                <div class="reply-text" v-html="renderContent(r.content)"></div>
              </div>
              <button type="button" class="reply-action-btn" @click="replyTo(c.id, r.name)" title="回复">
                <Icon name="ph:arrow-bend-left-down-bold" />
              </button>
            </div>
            <div v-if="c.replyCount && c.replyCount > c.replies.length" class="load-more-replies-wrap">
              <button type="button" class="load-more-replies-btn" :disabled="loadingReplies[c.id]"
                @click="loadMoreReplies(c)">
                <Icon v-if="!loadingReplies[c.id]" name="ph:arrow-circle-down-bold" />
                <Icon v-else name="ph:spinner-gap-bold" class="spinning" />
                <template v-if="!loadingReplies[c.id]">加载更多回复 ({{ c.replies.length }}/{{ c.replyCount }})</template>
                <template v-else>加载中...</template>
              </button>
            </div>
          </div>
          <div v-if="replyTargetId === c.id" class="comment-reply-form">
            <span v-if="replyToUser" class="reply-to-label">回复 @{{ replyToUser }}</span>
            <div class="reply-form-row">
              <button type="button" class="reply-emoji-btn" :class="{ active: replyEmojiOpen }"
                @click="replyEmojiOpen = !replyEmojiOpen" title="插入表情">
                <Icon name="ph:smiley-bold" />
              </button>
              <div ref="replyEditorRef" contenteditable="true" class="reply-editor"
                :data-placeholder="replyToUser ? `回复 @${replyToUser}...` : '写下你的回复...'"
                @keydown.enter.prevent="submitReply(c)" @paste="onReplyPaste"></div>
              <button type="button" class="reply-submit" :disabled="replySubmitting" @click="submitReply(c)">
                <Icon v-if="!replySubmitting" name="ph:arrow-bend-right-up-bold" />
                <Icon v-else name="ph:spinner-gap-bold" class="spinning" />
              </button>
              <button type="button" class="reply-cancel" @click="cancelReply">
                <Icon name="ph:x-bold" />
              </button>
            </div>
            <transition name="emoji-panel-fade">
              <div v-if="replyEmojiOpen" class="emoji-picker">
                <div v-if="!emojiPacks.length" class="emoji-loading">加载中...</div>
                <template v-else>
                  <div class="emoji-sidebar">
                    <button v-for="(p, pi) in emojiPacks" :key="p.id" type="button"
                      :class="{ active: replyEmojiPackIdx === pi }" @click="replyEmojiPackIdx = pi" :title="p.name">{{
                        p.name.replace(/[·.·\s]/g, '') }}</button>
                  </div>
                  <div class="emoji-grid-wrap">
                    <div class="emoji-grid">
                      <template v-if="emojiPacks[replyEmojiPackIdx]?.type === 'animated'">
                        <button v-for="a in emojiPacks[replyEmojiPackIdx].items" :key="a.id" type="button"
                          class="emoji-item emoji-img-item" @click="insertReplyEmoji(a.char || '😊', a.imageUrl)"
                          :title="a.label || a.char" @mouseenter="onEmojiHover($event, a.imageUrl)"
                          @mousemove="onEmojiMove($event)" @mouseleave="onEmojiLeave">
                          <img :src="mediaUrl(a.imageUrl)" :alt="a.label" loading="lazy" :data-fallback="a.char || '😊'" @error="onEmojiError" />
                        </button>
                      </template>
                      <template v-else>
                        <button v-for="e in emojiPacks[replyEmojiPackIdx].items" :key="e.id" type="button"
                          class="emoji-item" @click="insertReplyEmoji(e.char || '😊')" :title="e.label || e.char">{{
                            e.char }}</button>
                      </template>
                    </div>
                  </div>
                </template>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </transition-group>

    <div v-if="commentTotalPages > 1" class="comment-more">
      <button type="button" class="load-more-btn" :disabled="commentPage >= commentTotalPages"
        @click="goToPage(commentPage + 1)">
        <Icon name="ph:arrow-circle-down-bold" />
        {{ commentPage >= commentTotalPages ? '没有更多了' : '加载更多评论' }}
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
  commentTotal: number
  commentPage: number
  commentTotalPages: number
}>()

const emit = defineEmits<{
  'update:comments': [comments: Comment[]]
  'update:commentPage': [page: number]
}>()

const api = useApi()
const { mediaUrl } = useMediaUrl()
const { user: authUser, isLoggedIn } = useAuth()
const userAvatarFallback = computed(() => authUser.value?.avatar ?? '')
const commentTab = ref<'write' | 'preview'>('write')
const submitting = ref(false)
const sortDesc = ref(false)
const replySubmitting = ref(false)
const replyTargetId = ref<string | null>(null)
const replyToUser = ref<string>('')
const replyContent = ref('')
const replyEmojiOpen = ref(false)
const replyEmojiPackIdx = ref(0)
const loadingReplies = ref<Record<string, boolean>>({})
const emojiOpen = ref(false)

const editorRef = ref<HTMLDivElement | null>(null)
const editorWrapRef = ref<HTMLElement | null>(null)
const replyEditorRef = ref<HTMLDivElement | null>(null)
const emojiPacks = ref<any[]>([])
const emojiPackIdx = ref(0)

const previewEmojiUrl = ref('')
const previewEmojiStyle = ref({})
const previewContent = ref('')
const hasContent = ref(false)

function onEmojiHover(e: MouseEvent, url: string) {
  if (!emojiOpen.value && !replyEmojiOpen.value) return
  if (!url.startsWith('/uploads')) return
  previewEmojiUrl.value = url
  onEmojiMove(e)
}

function onEmojiMove(e: MouseEvent) {
  let x = e.clientX + 12
  let y = e.clientY - 40
  const w = 84
  const h = 84
  if (x + w > window.innerWidth - 8) x = e.clientX - 12 - w
  if (y + h > window.innerHeight - 8) y = window.innerHeight - 8 - h
  if (y < 8) y = 8
  previewEmojiStyle.value = { left: x + 'px', top: y + 'px' }
}

function onEmojiLeave() {
  previewEmojiUrl.value = ''
  previewEmojiStyle.value = {}
}

const sortedComments = computed(() => {
  const list = [...props.comments]
  return sortDesc.value ? list.reverse() : list
})

function renderContent(text: string) {
  const tokens: string[] = []
  let r = text.replace(/◆emoji:([^◆]+)◆/g, (_, url) => {
    tokens.push(url)
    return `◆EMJ${tokens.length - 1}◆`
  })
  r = r.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  r = r.replace(/\n/g, '<br>')
  r = r.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, '<span class="ip-placeholder">$1</span>')
  r = r.replace(/https?:\/\/[^\s<]+/g, (url) => {
    if (/\.(png|gif|jpg|jpeg|webp|svg|apng|avif)(\?[^\s<]*)?$/i.test(url) || url.includes('cdn.jsdelivr.net/gh/twitter/twemoji')) {
      return `<img src="${mediaUrl(url)}" alt="emoji" class="inline-emoji" />`
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  })
  r = r.replace(/@(\S+)/g, '<span class="reply-mention">@$1</span>')
  r = r.replace(/◆EMJ(\d+)◆/g, (_, idx) => `<img src="${mediaUrl(tokens[parseInt(idx)])}" alt="emoji" class="inline-emoji" />`)
  return r
}

watch(commentTab, (tab) => {
  if (tab === 'preview') {
    previewContent.value = serializeEditor()
  }
})

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function autoResize(target?: HTMLElement) {
  const el = target || editorRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function serializeEditor(): string {
  const editor = editorRef.value
  if (!editor) return ''
  const parts: string[] = []
  const walk = (nodes: NodeListOf<ChildNode>) => {
    for (const node of Array.from(nodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || '')
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.tagName === 'IMG') {
          const src = (el as HTMLImageElement).dataset.emojiSrc || ''
          if (src) parts.push(`◆emoji:${src}◆`)
        } else if (el.tagName === 'BR') {
          parts.push('\n')
        } else if (el.tagName === 'DIV') {
          walk(el.childNodes)
          parts.push('\n')
        } else {
          walk(el.childNodes)
        }
      }
    }
  }
  walk(editor.childNodes)
  return parts.join('')
}

function serializeReplyEditor(): string {
  const editor = replyEditorRef.value
  const ed = Array.isArray(editor) ? editor[0] : editor
  if (!ed) return ''
  const parts: string[] = []
  const walk = (nodes: NodeListOf<ChildNode>) => {
    for (const node of Array.from(nodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || '')
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.tagName === 'IMG') {
          const src = (el as HTMLImageElement).dataset.emojiSrc || ''
          if (src) parts.push(`◆emoji:${src}◆`)
        } else if (el.tagName === 'BR') {
          parts.push('\n')
        } else if (el.tagName === 'DIV') {
          walk(el.childNodes)
          parts.push('\n')
        } else {
          walk(el.childNodes)
        }
      }
    }
  }
  walk(ed.childNodes)
  return parts.join('')
}

function onEditorInput() {
  autoResize()
  const editor = editorRef.value
  hasContent.value = editor ? editor.textContent?.trim().length > 0 : false
}

function onReplyPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  range.insertNode(document.createTextNode(text))
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

function onEditorPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  range.insertNode(document.createTextNode(text))
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
  autoResize()
}

function insertEmoji(emoji: string, imgSrc?: string) {
  previewEmojiUrl.value = ''
  const editor = editorRef.value
  if (!editor) return
  editor.focus()
  const sel = window.getSelection()
  let range: Range
  if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0)
    range.deleteContents()
  } else {
    range = document.createRange()
    range.setStart(editor, editor.childNodes.length || 0)
    range.collapse(false)
  }
  if (imgSrc) {
    const img = document.createElement('img')
    img.src = mediaUrl(imgSrc)
    img.alt = 'emoji'
    img.className = 'inline-emoji'
    img.dataset.emojiSrc = imgSrc
    range.insertNode(img)
  } else {
    range.insertNode(document.createTextNode(emoji))
  }
  range.collapse(false)
  if (sel) { sel.removeAllRanges(); sel.addRange(range) }
  editor.focus()
  autoResize()
  hasContent.value = true
  emojiOpen.value = false
}

async function submitComment() {
  const content = serializeEditor()
  if (!content.trim() || !props.postId) return
  submitting.value = true
  try {
    const c = await api.post<any>('/comments', {
      postId: props.postId,
      content,
    })
    const userName = authUser.value?.username || '用户'
    const newComment = {
      id: c.id,
      name: userName,
      avatar: authUser.value?.avatar,
      time: '刚刚',
      content: c.content,
      status: 'pending',
      likes: 0,
      liked: false,
      replies: [],
      replyCount: 0,
    }
    const updated = [newComment, ...props.comments]
    emit('update:comments', updated)
    if (editorRef.value) editorRef.value.innerHTML = ''
    if (props.commentPage > 1) {
      emit('update:commentPage', 1)
    }
    pollCommentStatus(c.id)
  } catch { /* ignore */ }
  submitting.value = false
}

function pollCommentStatus(commentId: string, maxAttempts = 30) {
  let attempts = 0
  const interval = setInterval(async () => {
    attempts++
    if (attempts > maxAttempts) {
      clearInterval(interval)
      return
    }
    try {
      const data = await api.get<any>(`/comments/post/${props.postId}`, { page: 1, limit: 10, replyLimit: 3 })
      const found = data.items?.find((c: any) => c.id === commentId)
      if (found && found.status !== 'pending') {
        clearInterval(interval)
        const updated = props.comments.map((c) => {
          if (c.id === commentId) {
            return { ...c, status: found.status }
          }
          return c
        })
        emit('update:comments', updated)
      }
    } catch { /* ignore */ }
  }, 2000)
}

async function likeComment(c: Comment) {
  if (!isLoggedIn.value) {
    const router = useRouter()
    router.push('/login')
    return
  }
  try {
    const res = await api.post<any>(`/comments/${c.id}/like`)
    c.liked = res.liked
    c.likes = res.likesCount
  } catch { /* ignore */ }
}

function replyTo(id: string, userName: string) {
  if (userName === authUser.value?.username) return
  if (replyTargetId.value === id) {
    cancelReply()
  } else {
    replyTargetId.value = id
    replyToUser.value = userName
    replyContent.value = ''
  }
}

function cancelReply() {
  replyTargetId.value = null
  replyToUser.value = ''
  replyContent.value = ''
  replyEmojiOpen.value = false
  const re = replyEditorRef.value; const reEl = Array.isArray(re) ? re[0] : re; if (reEl) reEl.innerHTML = ''
}

function insertReplyEmoji(emoji: string, imgSrc?: string) {
  previewEmojiUrl.value = ''
  const editor = replyEditorRef.value
  const ed = Array.isArray(editor) ? editor[0] : editor
  if (!ed) {
    replyContent.value += imgSrc ? `◆emoji:${imgSrc}◆` : emoji
    replyEmojiOpen.value = false
    return
  }
  ed.focus()
  const sel = window.getSelection()
  let range: Range
  if (sel && sel.rangeCount > 0 && ed.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0)
    range.deleteContents()
  } else {
    range = document.createRange()
    range.setStart(ed, ed.childNodes.length || 0)
    range.collapse(false)
  }
  if (imgSrc) {
    const img = document.createElement('img')
    img.src = mediaUrl(imgSrc)
    img.alt = 'emoji'
    img.className = 'inline-emoji'
    img.dataset.emojiSrc = imgSrc
    range.insertNode(img)
  } else {
    range.insertNode(document.createTextNode(emoji))
  }
  range.collapse(false)
  if (sel) { sel.removeAllRanges(); sel.addRange(range) }
  ed.focus()
  replyEmojiOpen.value = false
}

async function loadMoreReplies(comment: Comment) {
  if (loadingReplies.value[comment.id]) return
  loadingReplies.value = { ...loadingReplies.value, [comment.id]: true }
  try {
    const currentPage = Math.ceil((comment.replies?.length || 0) / 3) + 1
    const data = await api.get<any>(`/comments/${comment.id}/replies`, { page: currentPage, limit: 3 })
    const newReplies = data.items.map((r: any) => ({
      id: r.id,
      name: r.authorName ?? '匿名',
      avatar: r.authorAvatar,
      time: formatTime(r.createdAt),
      content: r.content,
      replyTo: r.parent?.authorName ?? undefined,
    }))
    if (!comment.replies) comment.replies = []
    comment.replies.push(...newReplies)
    comment.replyCount = data.total
  } catch { /* ignore */ }
  loadingReplies.value = { ...loadingReplies.value, [comment.id]: false }
}

function goToPage(page: number) {
  if (page < 1 || page > props.commentTotalPages) return
  emit('update:commentPage', page)
}

async function submitReply(target: Comment) {
  const content = serializeReplyEditor()
  if (!content.trim() || !props.postId || replySubmitting.value) return
  replySubmitting.value = true
  try {
    await api.post<any>('/comments', {
      postId: props.postId,
      content,
      parentId: target.id,
    })
    const data = await api.get<any>(`/comments/${target.id}/replies`, { page: 1, limit: 100 })
    target.replies = (data.items || []).map((item: any) => ({
      id: item.id,
      name: item.authorName ?? '匿名',
      avatar: item.authorAvatar,
      time: formatTime(item.createdAt),
      content: item.content,
      replyTo: item.parent?.authorName ?? undefined,
    }))
    target.replyCount = data.total
    replyContent.value = ''
    const re = replyEditorRef.value; const reEl = Array.isArray(re) ? re[0] : re; if (reEl) reEl.innerHTML = ''
  } catch { /* ignore */ }
  replySubmitting.value = false
  cancelReply()
}

function onEmojiError(e: Event) {
  const img = e.target as HTMLImageElement
  const fallback = img.getAttribute('data-fallback')
  if (fallback) {
    const span = document.createElement('span')
    span.className = 'emoji-char-fallback'
    span.textContent = fallback
    img.parentNode?.replaceChild(span, img)
  } else {
    img.style.display = 'none'
  }
}

async function loadEmojiPacks() {
  try {
    const data = await api.get<any[]>('/emoji-packs')
    emojiPacks.value = data.filter((p: any) => p.enabled)
    emojiPackIdx.value = 0
  } catch {
    emojiPacks.value = []
  }
}

watch(emojiOpen, (v) => { if (!v) onEmojiLeave() })
watch(replyEmojiOpen, (v) => { if (!v) { onEmojiLeave(); replyEmojiPackIdx.value = 0 } })

onMounted(() => {
  loadEmojiPacks()

  function closeEmojiPicker(e: MouseEvent) {
    const wrap = editorWrapRef.value
    if (wrap && !wrap.contains(e.target as Node)) {
      emojiOpen.value = false
    }
    // close reply emoji picker if click outside any reply form
    const replyForms = document.querySelectorAll('.comment-reply-form')
    let inReply = false
    replyForms.forEach((el) => {
      if (el.contains(e.target as Node)) inReply = true
    })
    if (!inReply) replyEmojiOpen.value = false
  }
  document.addEventListener('click', closeEmojiPicker)
  onUnmounted(() => document.removeEventListener('click', closeEmojiPicker))
})
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

.comment-form-username {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
  margin-right: auto;
}

.comment-login-prompt {
  text-align: center;
  padding: 32px 16px;
}

.prompt-icon {
  font-size: 2.2rem;
  color: var(--c-text-3);
  opacity: 0.5;
  margin-bottom: 8px;
  display: block;
}

.prompt-text {
  font-size: 0.85rem;
  color: var(--c-text-2);
  margin-bottom: 16px;
}

.prompt-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
}

.prompt-btn-primary {
  background: var(--c-primary);
  color: #fff;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 28%, transparent);
}

.prompt-btn-primary:hover {
  opacity: 0.92;
}

.prompt-btn-secondary {
  background: var(--c-bg-2);
  color: var(--c-text-2);
}

.prompt-btn-secondary:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
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
  position: relative;
}

.comment-editor {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.82rem;
  outline: none;
  line-height: 1.6;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.2s;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
}

.comment-editor:focus {
  box-shadow: inset 0 0 0 1.5px var(--c-primary);
}

.comment-editor:empty:before {
  content: attr(data-placeholder);
  color: var(--c-text-3);
  pointer-events: none;
}

.reply-editor {
  flex: 1;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.75rem;
  outline: none;
  line-height: 1.5;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.2s;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
  min-height: 30px;
  max-height: 80px;
  overflow-y: auto;
}

.reply-editor:focus {
  box-shadow: inset 0 0 0 1.5px var(--c-primary);
}

.reply-editor:empty:before {
  content: attr(data-placeholder);
  color: var(--c-text-3);
  pointer-events: none;
}

.comment-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 4px 0;
  gap: 6px;
}

.emoji-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}

.emoji-btn:hover,
.emoji-btn.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.emoji-picker {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  width: 420px;
  height: 380px;
  background: var(--ld-bg-card);
  border-radius: 12px;
  box-shadow: 0 12px 36px var(--ld-shadow), 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent);
  overflow: hidden;
  display: flex;
}

.emoji-panel-fade-enter-active,
.emoji-panel-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.emoji-panel-fade-enter-from,
.emoji-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.emoji-sidebar {
  width: 68px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--c-bg-2);
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.emoji-sidebar::-webkit-scrollbar {
  width: 3px;
}

.emoji-sidebar button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.12s;
  letter-spacing: 0.04em;
  line-height: 1.1;
}

.emoji-sidebar button.active {
  color: var(--c-primary);
  font-weight: 700;
  background: var(--c-bg-1);
  box-shadow: inset 3px 0 0 var(--c-primary);
}

.emoji-sidebar button:hover:not(.active) {
  color: var(--c-text);
  background: var(--c-bg-1);
}

.emoji-grid-wrap {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
}

.emoji-grid-wrap::-webkit-scrollbar {
  width: 4px;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
}

.emoji-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 1.8rem;
  transition: background 0.1s;
  position: relative;
}

.emoji-item:hover {
  background: var(--c-bg-2);
}

.emoji-img-item img {
  width: 48px;
  height: 48px;
  display: block;
  pointer-events: none;
  border-radius: 6px;
}

.emoji-char-fallback {
  font-size: 1.8rem;
  line-height: 48px;
  text-align: center;
  display: block;
  pointer-events: none;
}

.emoji-hover-preview {
  position: fixed;
  z-index: 999;
  pointer-events: none;
  animation: emoji-preview-in 0.15s ease-out;
}

.emoji-hover-preview img {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: contain;
  border-radius: 10%;
}

@keyframes emoji-preview-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
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
  gap: 20px;
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 18px 16px;
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
  margin-bottom: 10px;
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

.comment-badge.pending {
  background: #f59e0b20;
  color: #f59e0b;
}

.comment-badge.rejected {
  background: #ef444420;
  color: #ef4444;
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
  line-height: 1.7;
  margin-bottom: 12px;
}

.comment-text :deep(.reply-mention) {
  color: var(--c-primary);
  font-weight: 600;
}

:deep(.inline-emoji) {
  display: inline;
  width: 6em;
  height: 6em;
  vertical-align: -0.35em;
  border-radius: 4px;
}

.comment-editor :deep(.inline-emoji),
.reply-editor :deep(.inline-emoji) {
  width: 1.8em;
  height: 1.8em;
  vertical-align: -0.35em;
  border-radius: 4px;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.comment-actions {
  display: flex;
  gap: 16px;
  margin-top: 2px;
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
  margin-top: 14px;
  padding: 14px 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--border) 80%, transparent);
}

.reply-item {
  display: flex;
  gap: 8px;
  margin: 6px 0;
  align-items: flex-start;
}

.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 1px;
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 8px 0 10px 0;
}

.reply-author {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--c-text);
}

.reply-to-badge {
  font-size: 0.65rem;
  color: var(--c-primary);
  font-weight: 600;
}

.reply-time {
  font-size: 0.6rem;
  color: var(--c-text-3);
  margin-left: auto;
}

.reply-text {
  font-size: 0.78rem;
  color: var(--c-text-1);
  line-height: 1.5;
  margin-top: 2px;
}

.reply-mention {
  color: var(--c-primary);
  font-weight: 600;
}

.reply-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font-size: 0.7rem;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s;
}

.reply-item:hover .reply-action-btn {
  opacity: 1;
}

.reply-action-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.reply-emoji-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font-size: 0.9rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.reply-emoji-btn:hover,
.reply-emoji-btn.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.load-more-replies-wrap {
  text-align: center;
  margin-top: 6px;
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

.load-more-replies-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.comment-reply-form {
  margin-top: 8px;
  position: relative;
}

.reply-to-label {
  font-size: 0.65rem;
  color: var(--c-primary);
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.reply-form-row {
  display: flex;
  gap: 6px;
  align-items: center;
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
  flex-shrink: 0;
}

.reply-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reply-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.7rem;
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

  .emoji-loading {
    padding: 24px;
    text-align: center;
    color: var(--c-text-3);
    font-size: 0.78rem;
  }

  .emoji-picker {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 40vh;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 32px var(--ld-shadow);
  }
}
</style>
