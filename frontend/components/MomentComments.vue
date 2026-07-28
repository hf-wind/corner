<template>
  <section class="moment-comments">
    <header class="comments-head">
      <div><Icon name="ph:chat-circle-dots" /><strong>回应</strong><span>{{ total }}</span></div>
      <small>按时间排序</small>
    </header>

    <div v-if="isLoggedIn" class="comment-composer">
      <div class="composer-avatar">
        <img v-if="user?.avatar" :src="mediaUrl(user.avatar)" alt="">
        <Icon v-else name="ph:user-circle-fill" />
      </div>
      <input v-model="draft" type="text" placeholder="写下一句回应…" @keydown.enter.prevent="submitComment">
      <div class="picker-wrap">
        <button type="button" class="icon-button" title="插入表情" :class="{ active: pickerFor === 'main' }" @click="togglePicker('main')"><Icon name="ph:smiley" /></button>
        <EmojiPalette :open="pickerFor === 'main'" @select="insertEmoji('main', $event)" />
      </div>
      <button type="button" class="send-button" :disabled="!draft.trim() || submitting" title="发送" @click="submitComment">
        <Icon :name="submitting ? 'ph:spinner-gap' : 'ph:paper-plane-right-fill'" :class="{ spinning: submitting }" />
      </button>
    </div>
    <div v-else class="login-line"><span>登录后参与回应</span><NuxtLink to="/login">去登录</NuxtLink></div>

    <div v-if="loading && !comments.length" class="comment-skeletons"><span v-for="n in 3" :key="n" /></div>
    <div v-else-if="!comments.length" class="empty-comments"><Icon name="ph:chat-centered-dots" />还没有回应</div>
    <div v-else class="comment-list">
      <article v-for="comment in comments" :key="comment.id" class="comment-item">
        <div class="comment-avatar"><img v-if="comment.authorAvatar" :src="mediaUrl(comment.authorAvatar)" alt=""><Icon v-else name="ph:user-circle-fill" /></div>
        <div class="comment-main">
          <header>
            <div><strong>{{ comment.authorName || '匿名' }}</strong><span v-if="comment.status === 'pending'" class="status pending">审核中</span><span v-else-if="comment.status === 'rejected'" class="status rejected">未通过</span></div>
            <time>{{ formatTime(comment.createdAt) }}</time>
          </header>
          <div class="comment-content" v-html="renderContent(comment.content)" />
          <div class="comment-actions">
            <button type="button" :class="{ liked: comment.liked }" @click="toggleLike(comment)"><Icon :name="comment.liked ? 'ph:heart-fill' : 'ph:heart-straight'" />{{ comment.likesCount || '' }}</button>
            <button type="button" @click="openReply(comment.id, comment.id, comment.authorName || '匿名')"><Icon name="ph:arrow-bend-left-down" />回复</button>
          </div>

          <div v-if="comment.replies?.length" class="reply-list">
            <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <div class="reply-meta"><strong>{{ reply.authorName || '匿名' }}</strong><span v-if="reply.replyToName">回复 @{{ reply.replyToName }}</span><time>{{ formatTime(reply.createdAt) }}</time></div>
              <div class="reply-content" v-html="renderContent(reply.content)" />
              <button type="button" class="reply-link" title="回复" @click="openReply(reply.id, comment.id, reply.authorName || '匿名')"><Icon name="ph:arrow-bend-left-down" /></button>
            </div>
            <button v-if="(comment.replyCount || 0) > (comment.replies?.length || 0)" type="button" class="more-button" :disabled="loadingReplies[comment.id]" @click="loadMoreReplies(comment)">
              {{ replyMoreText(comment) }}
            </button>
          </div>

          <Transition name="reply-line">
            <div v-if="replyTarget && replyTarget.rootId === comment.id" class="inline-reply">
              <span>回复 @{{ replyTarget.name }}</span>
              <div class="reply-input-row">
                <input :id="'moment-reply-' + comment.id" v-model="replyDraft" type="text" :placeholder="replyPlaceholder()" @keydown.enter.prevent="submitReply">
                <div class="picker-wrap"><button type="button" class="icon-button" title="插入表情" :class="{ active: pickerFor === 'reply' }" @click="togglePicker('reply')"><Icon name="ph:smiley" /></button><EmojiPalette :open="pickerFor === 'reply'" @select="insertEmoji('reply', $event)" /></div>
                <button type="button" class="send-button" :disabled="!replyDraft.trim() || replySubmitting" title="发送回复" @click="submitReply"><Icon :name="replySubmitting ? 'ph:spinner-gap' : 'ph:arrow-bend-right-up-bold'" :class="{ spinning: replySubmitting }" /></button>
                <button type="button" class="cancel-button" title="取消" @click="cancelReply"><Icon name="ph:x" /></button>
              </div>
            </div>
          </Transition>
        </div>
      </article>
    </div>

    <button v-if="page < totalPages" type="button" class="more-button root-more" :disabled="loading" @click="loadMoreComments">{{ loading ? '加载中…' : '查看更多回应' }}</button>
  </section>
</template>

<script setup lang="ts">
type CommentReply = { id:string; authorName?:string; authorAvatar?:string|null; content:string; replyToName?:string|null; status?:'pending'|'approved'|'rejected'; createdAt:string }
type CommentItem = { id:string; authorName?:string; authorAvatar?:string|null; content:string; status?:'pending'|'approved'|'rejected'; createdAt:string; likesCount:number; liked?:boolean; replyCount?:number; replies?:CommentReply[] }

const props = defineProps<{ momentId:string }>()
const emit = defineEmits<{ submitted:[] }>()
const ROOT_PAGE_SIZE = 3
const REPLY_PAGE_SIZE = 2
const api = useApi()
const { mediaUrl } = useMediaUrl()
const { user, isLoggedIn } = useAuth()
const comments = ref<CommentItem[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const loadingReplies = ref<Record<string,boolean>>({})
const draft = ref('')
const submitting = ref(false)
const pickerFor = ref('')
const replyDraft = ref('')
const replySubmitting = ref(false)
const replyTarget = ref<{ id:string; rootId:string; name:string } | null>(null)

watch(() => props.momentId, () => { comments.value=[]; page.value=1; total.value=0; totalPages.value=1; if (props.momentId) void loadComments(1) }, { immediate:true })

function togglePicker(key:string) { pickerFor.value = pickerFor.value === key ? '' : key }
function insertEmoji(target:'main'|'reply', payload:{ char?:string; imageUrl?:string; label?:string }) {
  const token = payload.imageUrl ? `[[emoji:${payload.imageUrl}|${payload.label || '表情'}]]` : payload.char || ''
  if (target === 'main') draft.value += token
  else replyDraft.value += token
  pickerFor.value = ''
}

function renderContent(text:string) {
  const tokens:string[] = []
  return String(text || '').replace(/\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_,url) => { tokens.push(url); return `__EMOJI_${tokens.length-1}__` })
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>')
    .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
    .replace(/__EMOJI_(\d+)__/g, (_,index) => `<img src="${escapeAttribute(mediaUrl(tokens[Number(index)]))}" alt="emoji" class="inline-emoji" />`)
}

function escapeAttribute(value:string) { return String(value || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

function formatTime(value?:string) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff/60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff/3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff/86400)} 天前`
  return value.slice(0,10)
}

function replyMoreText(comment:CommentItem) {
  if (loadingReplies.value[comment.id]) return '加载中…'
  return `查看余下 ${Math.max(0,(comment.replyCount || 0) - (comment.replies?.length || 0))} 条回复`
}
function replyPlaceholder() { return replyTarget.value ? `回复 @${replyTarget.value.name}…` : '写下回复…' }

function normalizeReply(item:any):CommentReply { return { id:item.id, authorName:item.authorName || user.value?.username, authorAvatar:item.authorAvatar ?? item.user?.avatar ?? user.value?.avatar ?? null, content:item.content, replyToName:item.replyToName ?? item.parent?.authorName ?? null, status:item.status, createdAt:item.createdAt || new Date().toISOString() } }
function normalizeComment(item:any):CommentItem { return { id:item.id, authorName:item.authorName || user.value?.username, authorAvatar:item.authorAvatar ?? item.user?.avatar ?? user.value?.avatar ?? null, content:item.content, status:item.status, createdAt:item.createdAt || new Date().toISOString(), likesCount:item.likesCount ?? 0, liked:!!item.liked, replyCount:item.replyCount ?? item._count?.replies ?? 0, replies:(item.replies || []).map(normalizeReply) } }

async function loadComments(targetPage=1, append=false) {
  if (!props.momentId) return
  loading.value = true
  try {
    const data = await api.get<any>(`/moment-comments/moment/${props.momentId}`, { page:targetPage, limit:ROOT_PAGE_SIZE, replyLimit:REPLY_PAGE_SIZE })
    const next = (data.items || []).map(normalizeComment)
    if (append) { const ids = new Set(comments.value.map(item => item.id)); comments.value.push(...next.filter((item:CommentItem) => !ids.has(item.id))) }
    else comments.value = next
    total.value = data.total || 0; totalPages.value = data.totalPages || 1; page.value = targetPage
  } finally { loading.value = false }
}

async function loadMoreComments() { if (!loading.value && page.value < totalPages.value) await loadComments(page.value + 1, true) }

async function loadMoreReplies(comment:CommentItem) {
  if (loadingReplies.value[comment.id]) return
  loadingReplies.value = { ...loadingReplies.value, [comment.id]:true }
  try {
    const loaded = comment.replies?.length || 0
    const nextPage = Math.ceil(loaded / REPLY_PAGE_SIZE) + 1
    const data = await api.get<any>(`/moment-comments/${comment.id}/replies`, { page:nextPage, limit:REPLY_PAGE_SIZE })
    const next = (data.items || []).map(normalizeReply)
    const ids = new Set((comment.replies || []).map(item => item.id))
    comment.replies = [...(comment.replies || []), ...next.filter((item:CommentReply) => !ids.has(item.id))]
    comment.replyCount = data.total || comment.replyCount || 0
  } finally { loadingReplies.value = { ...loadingReplies.value, [comment.id]:false } }
}

async function submitComment() {
  if (!draft.value.trim()) return
  if (!isLoggedIn.value) return navigateTo('/login')
  submitting.value = true
  try {
    const created = await api.post<any>('/moment-comments', { momentId:props.momentId, content:draft.value.trim() })
    comments.value.unshift(normalizeComment(created)); draft.value=''; total.value += 1; totalPages.value = Math.max(1,Math.ceil(total.value/ROOT_PAGE_SIZE)); emit('submitted'); useToast().success('评论已提交，正在审核')
  } catch (error:any) { useToast().error(`评论失败：${error?.message || ''}`) }
  finally { submitting.value = false }
}

function openReply(id:string, rootId:string, name:string) {
  replyTarget.value={ id,rootId,name }; replyDraft.value=''; pickerFor.value=''
  nextTick(() => document.getElementById(`moment-reply-${rootId}`)?.focus())
}
function cancelReply() { replyTarget.value=null; replyDraft.value=''; pickerFor.value='' }

async function submitReply() {
  if (!replyTarget.value || !replyDraft.value.trim()) return
  if (!isLoggedIn.value) return navigateTo('/login')
  replySubmitting.value = true
  try {
    const target = replyTarget.value
    const created = await api.post<any>('/moment-comments', { momentId:props.momentId, content:replyDraft.value.trim(), parentId:target.id })
    const root = comments.value.find(item => item.id === target.rootId)
    if (root) { root.replies=[...(root.replies || []),normalizeReply(created)]; root.replyCount=(root.replyCount || 0)+1 }
    cancelReply(); emit('submitted'); useToast().success('回复已提交，正在审核')
  } catch (error:any) { useToast().error(`回复失败：${error?.message || ''}`) }
  finally { replySubmitting.value = false }
}

async function toggleLike(comment:CommentItem) {
  if (!isLoggedIn.value) return navigateTo('/login')
  try { const result=await api.post<any>(`/moment-comments/${comment.id}/like`); comment.liked=!!result.liked; comment.likesCount=result.likesCount ?? comment.likesCount }
  catch { useToast().error('操作失败') }
}
</script>

<style scoped>
.moment-comments { display:grid; gap:10px; }
.comments-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.comments-head > div { display:flex; align-items:center; gap:6px; color:var(--c-text-2); }
.comments-head strong { font-size:.76rem; }.comments-head span { color:var(--c-text-3); font-size:.65rem; }.comments-head small { color:var(--c-text-3); font-size:.62rem; }
.comment-composer,.reply-input-row { position:relative; display:flex; height:38px; align-items:center; gap:5px; padding:3px 4px 3px 5px; border:1px solid var(--border); border-radius:10px; background:var(--c-bg); }
.composer-avatar { display:grid; width:27px; height:27px; flex:0 0 27px; place-items:center; overflow:hidden; border-radius:50%; color:var(--c-text-3); font-size:1.35rem; }.composer-avatar img { width:100%; height:100%; object-fit:cover; }
.comment-composer input,.reply-input-row input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--c-text); font:inherit; font-size:.74rem; }
.comment-composer input::placeholder,.reply-input-row input::placeholder { color:var(--c-text-3); }
.picker-wrap { position:relative; flex:0 0 auto; }
.icon-button,.send-button,.cancel-button { display:grid; width:29px; height:29px; place-items:center; border:0; border-radius:7px; background:transparent; color:var(--c-text-3); cursor:pointer; }
.icon-button:hover,.icon-button.active,.cancel-button:hover { background:var(--c-bg-2); color:var(--c-primary); }
.send-button { background:var(--c-primary); color:#fff; }.send-button:disabled { background:var(--c-bg-2); color:var(--c-text-3); cursor:not-allowed; }
.login-line { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border:1px solid var(--border); border-radius:9px; color:var(--c-text-3); font-size:.72rem; }.login-line a { color:var(--c-primary); }
.comment-list { max-height:380px; overflow-y:auto; overscroll-behavior:contain; }.comment-item { display:grid; grid-template-columns:28px minmax(0,1fr); gap:9px; padding:11px 1px; border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent); }.comment-item:first-child { padding-top:3px; }
.comment-avatar img,.comment-avatar :deep(svg) { width:28px; height:28px; border-radius:50%; object-fit:cover; color:var(--c-text-3); }
.comment-main { min-width:0; }.comment-main header { display:flex; align-items:center; justify-content:space-between; gap:8px; }.comment-main header > div { display:flex; align-items:center; gap:5px; }.comment-main strong { color:var(--c-text); font-size:.72rem; }.comment-main time,.reply-meta time { color:var(--c-text-3); font-size:.6rem; }
.comment-content,.reply-content { margin-top:4px; color:var(--c-text-2); font-size:.75rem; line-height:1.65; word-break:break-word; }.comment-content :deep(.inline-emoji),.reply-content :deep(.inline-emoji) { display:inline-block; width:1.7em; height:1.7em; vertical-align:-.32em; }.comment-content :deep(a),.reply-content :deep(a) { color:var(--c-primary); }
.comment-actions { display:flex; gap:2px; margin-top:4px; }.comment-actions button,.reply-link { display:inline-flex; align-items:center; gap:3px; padding:3px 5px; border:0; border-radius:5px; background:transparent; color:var(--c-text-3); cursor:pointer; font:inherit; font-size:.62rem; }.comment-actions button:hover,.comment-actions button.liked,.reply-link:hover { background:var(--c-primary-soft); color:var(--c-primary); }
.reply-list { display:grid; gap:5px; margin-top:7px; padding:7px 9px; border-radius:8px; background:var(--c-bg-1); }.reply-item { position:relative; padding-right:22px; }.reply-item + .reply-item { padding-top:5px; border-top:1px solid color-mix(in srgb,var(--border) 65%,transparent); }.reply-meta { display:flex; flex-wrap:wrap; align-items:center; gap:5px; }.reply-meta strong { font-size:.68rem; }.reply-meta span { color:var(--c-primary); font-size:.6rem; }.reply-content { margin-top:2px; font-size:.7rem; }.reply-link { position:absolute; top:0; right:0; padding:4px; }
.inline-reply { margin-top:8px; padding:8px; border-radius:9px; background:var(--c-bg-1); }.inline-reply > span { display:block; margin:0 0 5px 2px; color:var(--c-primary); font-size:.62rem; }.reply-input-row { height:35px; padding-left:9px; background:var(--ld-bg-card); }
.status { padding:1px 4px; border-radius:4px; font-size:.56rem; }.status.pending { background:rgb(245 158 11 / 12%); color:#b77908; }.status.rejected { background:rgb(239 68 68 / 10%); color:#dc2626; }
.more-button { justify-self:start; padding:4px 7px; border:0; border-radius:6px; background:var(--c-bg-2); color:var(--c-text-3); cursor:pointer; font:inherit; font-size:.62rem; }.more-button:hover { color:var(--c-primary); }.root-more { justify-self:center; }
.empty-comments { display:flex; align-items:center; justify-content:center; gap:6px; padding:15px; color:var(--c-text-3); font-size:.7rem; }.comment-skeletons { display:grid; gap:6px; }.comment-skeletons span { height:48px; border-radius:8px; background:var(--c-bg-2); }
.reply-line-enter-active,.reply-line-leave-active { transition:opacity .16s ease,transform .16s ease; }.reply-line-enter-from,.reply-line-leave-to { opacity:0; transform:translateY(-4px); }
.spinning { animation:spin .8s linear infinite; }@keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:560px) { .comment-list { max-height:330px; }.comments-head small { display:none; } }
</style>
