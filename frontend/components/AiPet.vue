<template>
  <div class="ai-pet" :class="{ open: chatOpen, 'is-article': isArticleMode }">
    <Transition name="pet-panel">
      <div v-if="chatOpen" class="pet-chat" role="dialog" aria-label="和哆啦A梦聊天">
        <header class="pet-chat-head">
          <div class="pet-chat-title">
            <span class="pet-chat-avatar" aria-hidden="true">
              <Icon name="ph:sparkle-fill" />
            </span>
            <div>
              <div class="pet-name-row">
                <strong>{{ displayName }}</strong>
                <span class="pet-online">在线</span>
              </div>
              <p>{{ description }}</p>
              <span v-if="isArticleMode" class="pet-context-label">正在陪你读这篇文章</span>
            </div>
          </div>
          <button type="button" class="pet-icon-btn" aria-label="关闭" @click="closeChat">
            <Icon name="ph:x-bold" />
          </button>
        </header>

        <div ref="listRef" class="pet-chat-list">
          <div v-for="(m, i) in messages" :key="i" class="pet-msg" :class="m.role">
            <template v-if="m.role === 'assistant'">
              <div v-if="m.streaming && m.renderedHtml" class="pet-bubble pet-markdown pet-streaming" v-html="m.renderedHtml" />
              <div v-else-if="!m.streaming" class="pet-bubble pet-markdown" v-html="renderMarkdown(m.content)" />
            </template>
            <div v-else class="pet-bubble">{{ m.content }}</div>
          </div>
          <div v-if="sending && !streamStarted" class="pet-msg assistant">
            <div class="pet-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        </div>

        <div class="pet-suggestions">
          <button v-for="action in quickActions" :key="action.label" type="button"
            :disabled="sending" @click="runQuickAction(action)">
            <Icon :name="action.icon" />
            <span>{{ action.label }}</span>
          </button>
        </div>

        <form class="pet-chat-form" @submit.prevent="send">
          <input v-model="input" class="pet-input" type="text" maxlength="500" :placeholder="inputPlaceholder"
            :disabled="sending" />
          <button type="submit" class="pet-send" :disabled="sending || !input.trim()" aria-label="发送">
            <Icon name="ph:paper-plane-right-fill" />
          </button>
        </form>
      </div>
    </Transition>

    <Transition name="pet-actions">
      <div v-if="actionsVisible" class="pet-actions" aria-label="AI 快捷功能">
        <button v-for="action in quickActions.slice(0, 3)" :key="action.label" type="button"
          @click="runQuickAction(action)">
          <Icon :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </Transition>

    <button type="button" class="pet-fab" :class="{ 'is-music': musicPlaying }" :title="chatOpen ? '收起' : '和哆啦A梦聊天'" @click="toggleChat">
      <span class="pet-sprite-wrap" :style="wrapStyle">
        <span class="pet-sprite-img" :key="animKey" :style="spriteStyle" />
      </span>
      <span v-if="showHint" class="pet-hint">{{ hintText }}</span>
      <span v-if="showLoginBubble" class="pet-hint pet-hint-login">登录后就能和我聊天啦～</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import petMeta from '~/assets/dram/pet.json'
const spriteUrl = '/dram/spritesheet.webp'

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
})

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen ? defaultLinkOpen(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
}

function renderMarkdown(content: string) {
  return markdown.render(content || '')
}

type Role = 'user' | 'assistant'
interface Msg { role: Role; content: string; streaming?: boolean; renderedHtml?: string }
type QuickAction = { label: string; icon: string; prompt: string; kind?: 'summary' }
type ArticleContext = { title?: string; content?: string; slug?: string }

const props = withDefaults(defineProps<{
  mode?: 'home' | 'article'
  article?: ArticleContext
}>(), {
  mode: 'home',
})

type AnimClip = { row: number; frames: number; fps: number }

const meta = petMeta as {
  displayName: string
  description: string
  frameWidth: number
  frameHeight: number
  displayWidth: number
  displayHeight: number
  cols: number
  rows: number
  idle: AnimClip
  play?: AnimClip
  greetings: string[]
}

const api = useApi()
const { isLoggedIn } = useAuth()
const { playing: musicPlaying } = useMusicPlayerState()
const chatOpen = ref(false)
const sending = ref(false)
const streamStarted = ref(false)
const input = ref('')
const messages = ref<Msg[]>([])
const listRef = ref<HTMLElement | null>(null)
const showHint = ref(true)
const showLoginBubble = ref(false)
const historyLoaded = ref(false)
const suppressActions = ref(false)
let streamController: AbortController | null = null
let scrollFrame: number | null = null
let typingBuffer = ''
let typingHtml = ''
let typingText = ''
let typingVisibleCount = 0
let typingTimer: ReturnType<typeof setTimeout> | null = null
let typingMessageIndex = -1
let typingDrainResolvers: Array<() => void> = []

const displayName = ref(meta.displayName || '哆啦A梦')
const description = ref(meta.description || '阿风的伙伴 · 蓝色机器猫')
const greetings = ref<string[]>([...(meta.greetings || [])])

const isArticleMode = computed(() => props.mode === 'article')
const hintText = computed(() => isArticleMode.value ? '要我帮你读懂这篇吗？' : (greetings.value[0] || '你好呀～'))
const inputPlaceholder = computed(() => isArticleMode.value ? '问问这篇文章…' : '问我文章推荐或本站内容…')
const actionsVisible = computed(() => isLoggedIn.value && !chatOpen.value && !suppressActions.value && !showHint.value && !showLoginBubble.value)
const quickActions = computed<QuickAction[]>(() => isArticleMode.value
  ? [
      { label: '三句话总结', icon: 'ph:magic-wand-bold', prompt: '请用三句话总结当前文章。', kind: 'summary' },
      { label: '提炼核心要点', icon: 'ph:list-checks-bold', prompt: '请结合当前文章，提炼 4 到 6 个核心要点，表达简洁。' },
      { label: '这篇适合谁', icon: 'ph:users-three-bold', prompt: '请说明这篇文章适合哪些读者，以及读完能获得什么。' },
      { label: '解释难点', icon: 'ph:lightbulb-filament-bold', prompt: '请找出当前文章里最难理解的部分，并用通俗方式解释。' },
    ]
  : [
      { label: '推荐一篇文章', icon: 'ph:sparkle-bold', prompt: '请根据本站最近发布的内容，推荐一篇值得先读的文章，并简要说明理由。' },
      { label: '本站有什么内容', icon: 'ph:books-bold', prompt: '请简洁介绍这个博客主要有哪些内容方向，并各推荐一篇文章。' },
      { label: '帮我发现内容', icon: 'ph:compass-bold', prompt: '我还没想好读什么，请用三个简短问题了解兴趣，再为我推荐本站文章。' },
    ])

async function loadPetMeta() {
  try {
    const res = await api.get<{
      displayName?: string
      description?: string
      greetings?: string[]
    }>('/ai/pet/meta')
    if (res?.displayName) displayName.value = res.displayName
    if (res?.description) description.value = res.description
    if (Array.isArray(res?.greetings) && res.greetings.length) {
      greetings.value = res.greetings
    }
  } catch {
    // keep local pet.json defaults
  }
}

const dw = meta.displayWidth || 96
const dh = meta.displayHeight || 104
const bgCols = meta.cols || 8
const bgRows = meta.rows || 9

const idleClip: AnimClip = {
  row: meta.idle?.row ?? 0,
  frames: meta.idle?.frames ?? 6,
  fps: meta.idle?.fps ?? 6,
}
const playClip: AnimClip = {
  row: meta.play?.row ?? 2,
  frames: meta.play?.frames ?? 8,
  fps: meta.play?.fps ?? 8,
}

const activeClip = computed(() => (musicPlaying.value ? playClip : idleClip))
const animKey = computed(() => `${activeClip.value.row}-${activeClip.value.frames}-${activeClip.value.fps}`)

const wrapStyle = { width: `${dw}px`, height: `${dh}px` }

const spriteStyle = computed(() => {
  const clip = activeClip.value
  const frames = Math.max(1, clip.frames)
  const fps = Math.max(1, clip.fps)
  const row = Math.max(0, clip.row)
  return {
    '--pet-frame-shift': `${-frames * dw}px`,
    '--pet-duration': `${frames / fps}s`,
    '--pet-steps': String(frames),
    backgroundImage: `url(${spriteUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '0 0',
    backgroundSize: `${bgCols * dw}px ${bgRows * dh}px`,
    width: `${bgCols * dw}px`,
    height: `${bgRows * dh}px`,
    top: `${-row * dh}px`,
  }
})

let hintTimer: ReturnType<typeof setTimeout> | null = null
let loginBubbleTimer: ReturnType<typeof setTimeout> | null = null
let actionRevealTimer: ReturnType<typeof setTimeout> | null = null

function openChat() {
  if (actionRevealTimer) clearTimeout(actionRevealTimer)
  suppressActions.value = true
  chatOpen.value = true
}

function closeChat() {
  chatOpen.value = false
  if (actionRevealTimer) clearTimeout(actionRevealTimer)
  actionRevealTimer = setTimeout(() => {
    suppressActions.value = false
  }, 160)
}

async function toggleChat() {
  showHint.value = false
  if (!isLoggedIn.value) {
    showLoginNotice()
    return
  }
  if (chatOpen.value) {
    closeChat()
    return
  }
  openChat()
  await prepareChat()
}

function showLoginNotice() {
  showLoginBubble.value = true
  if (loginBubbleTimer) clearTimeout(loginBubbleTimer)
  loginBubbleTimer = setTimeout(() => { showLoginBubble.value = false }, 3000)
}

async function prepareChat() {
  if (!historyLoaded.value) {
    await loadHistory()
    historyLoaded.value = true
  }
  if (messages.value.length === 0) {
    const list = greetings.value.length ? greetings.value : ['你好，我是哆啦A梦！']
    const fallback = isArticleMode.value ? '我已经准备好陪你读这篇文章啦！' : list[Math.floor(Math.random() * list.length)]
    messages.value.push({ role: 'assistant', content: fallback })
  }
  await nextTick(scrollBottom)
}

async function loadHistory() {
  try {
    const history = await api.get<{ role: string; content: string }[]>('/ai/chat/history')
    messages.value = (history || []).map((m) => ({
      role: m.role as Role,
      content: m.content,
    }))
  } catch {
    // not logged in or network error — keep messages empty
  }
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  input.value = ''
  await sendMessage(text)
}

async function sendMessage(text: string) {
  if (!text.trim() || sending.value) return
  messages.value.push({ role: 'user', content: text })
  sending.value = true
  streamStarted.value = false
  await nextTick(scrollBottom)

  const assistantIndex = messages.value.length
  messages.value.push({ role: 'assistant', content: '', streaming: true })
  resetTypingBuffer(assistantIndex)
  streamController?.abort()
  streamController = new AbortController()

  try {
    let responseMarkdown = ''
    const article = isArticleMode.value ? {
      title: props.article?.title || '',
      content: String(props.article?.content || '').slice(0, 10000),
      slug: props.article?.slug || '',
    } : undefined
    await api.postStream('/ai/chat/stream', { message: text, article }, ({ event, data }) => {
      if (event === 'token' && typeof data === 'string') {
        responseMarkdown += data
      }
      if (event === 'error') throw new Error(data?.message || 'Stream failed')
    }, streamController.signal)
    enqueueTyping(responseMarkdown || '……', assistantIndex)
    await waitForTypingDrain()
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      enqueueTyping('呜，任意门开小差了。稍后再试，或者先逛逛文章吧～', assistantIndex)
      await waitForTypingDrain()
    }
  } finally {
    if (messages.value[assistantIndex]) messages.value[assistantIndex].streaming = false
    sending.value = false
    streamStarted.value = false
    streamController = null
    await nextTick(scrollBottom)
  }
}

async function summarizeArticle() {
  if (sending.value) return
  const title = props.article?.title || ''
  const content = props.article?.content || ''
  messages.value.push({ role: 'user', content: '请帮我快速总结这篇文章。' })
  sending.value = true
  await nextTick(scrollBottom)
  try {
    const res = await api.post<{ excerpt: string }>('/ai/summarize', { title, content })
    messages.value.push({
      role: 'assistant',
      content: res.excerpt ? `文章小结：${res.excerpt}` : '这篇文章暂时没有可提取的正文内容。',
    })
  } catch {
    messages.value.push({ role: 'assistant', content: '总结工具暂时开小差了，你可以直接问我文章里的具体问题。' })
  } finally {
    sending.value = false
    await nextTick(scrollBottom)
  }
}

async function runQuickAction(action: QuickAction) {
  showHint.value = false
  if (!isLoggedIn.value) {
    showLoginNotice()
    return
  }
  openChat()
  await prepareChat()
  if (action.kind === 'summary' && isArticleMode.value) await summarizeArticle()
  else await sendMessage(action.prompt)
}

function scrollBottom() {
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function queueScrollBottom() {
  if (scrollFrame !== null) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null
    scrollBottom()
  })
}

function resolveTypingDrain() {
  const resolvers = typingDrainResolvers
  typingDrainResolvers = []
  resolvers.forEach(resolve => resolve())
}

function resetTypingBuffer(messageIndex: number) {
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = null
  typingBuffer = ''
  typingHtml = ''
  typingText = ''
  typingVisibleCount = 0
  typingMessageIndex = messageIndex
  resolveTypingDrain()
}

function enqueueTyping(text: string, messageIndex: number) {
  if (!text) return
  if (typingMessageIndex !== messageIndex) resetTypingBuffer(messageIndex)
  typingBuffer = text
  typingHtml = renderMarkdown(text)
  const container = document.createElement('div')
  container.innerHTML = typingHtml
  typingText = container.textContent || ''
  typingVisibleCount = 0
  const message = messages.value[messageIndex]
  if (message) {
    message.content = text
    message.renderedHtml = ''
  }
  streamStarted.value = true
  if (!typingTimer) typeNextCharacter()
}

function renderHtmlPrefix(html: string, visibleCount: number) {
  const source = document.createElement('template')
  source.innerHTML = html
  let remaining = visibleCount

  const clonePrefix = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= 0) return null
      const characters = Array.from(node.textContent || '')
      const value = characters.slice(0, remaining).join('')
      remaining -= Math.min(remaining, characters.length)
      return value ? document.createTextNode(value) : null
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const element = node as HTMLElement
    const clone = element.cloneNode(false) as HTMLElement
    for (const child of Array.from(element.childNodes)) {
      const childClone = clonePrefix(child)
      if (childClone) clone.appendChild(childClone)
      if (remaining <= 0) break
    }
    if (clone.childNodes.length || ['BR', 'HR'].includes(clone.tagName)) return clone
    return null
  }

  const output = document.createElement('div')
  for (const child of Array.from(source.content.childNodes)) {
    const clone = clonePrefix(child)
    if (clone) output.appendChild(clone)
    if (remaining <= 0) break
  }
  return output.innerHTML
}

function typeNextCharacter() {
  if (!typingBuffer || typingMessageIndex < 0) {
    typingTimer = null
    resolveTypingDrain()
    return
  }

  const characters = Array.from(typingText)
  const character = characters[typingVisibleCount] || ''
  typingVisibleCount += 1
  const message = messages.value[typingMessageIndex]
  if (message) message.renderedHtml = renderHtmlPrefix(typingHtml, typingVisibleCount)
  queueScrollBottom()

  if (typingVisibleCount >= characters.length) {
    typingBuffer = ''
    typingTimer = null
    resolveTypingDrain()
    return
  }

  const delay = /[。！？.!?\n]/u.test(character)
    ? 96
    : /[，、；：,;:]/u.test(character)
      ? 58
      : 34
  typingTimer = setTimeout(typeNextCharacter, delay)
}

function waitForTypingDrain() {
  if (!typingBuffer && !typingTimer) return Promise.resolve()
  return new Promise<void>((resolve) => typingDrainResolvers.push(resolve))
}

onMounted(() => {
  loadPetMeta()
  hintTimer = setTimeout(() => { showHint.value = false }, isArticleMode.value ? 4200 : 6000)
})

onUnmounted(() => {
  if (hintTimer) clearTimeout(hintTimer)
  if (loginBubbleTimer) clearTimeout(loginBubbleTimer)
  if (actionRevealTimer) clearTimeout(actionRevealTimer)
  streamController?.abort()
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = null
  typingBuffer = ''
  resolveTypingDrain()
})
</script>

<style scoped>
.ai-pet {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}

.ai-pet > * {
  pointer-events: auto;
}

.ai-pet.is-article {
  bottom: 78px;
}

.pet-fab {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
  animation: pet-bob 2.8s ease-in-out infinite;
  will-change: transform;
}

.pet-fab::after {
  content: '';
  position: absolute;
  z-index: -1;
  left: 22%;
  right: 22%;
  bottom: 3px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary) 18%, transparent);
  box-shadow: 0 4px 10px color-mix(in srgb, var(--c-primary) 16%, transparent);
}

.pet-fab:hover {
  transform: translateY(-4px) scale(1.04);
  animation-play-state: paused;
}

.pet-sprite-wrap {
  display: block;
  position: relative;
  border-radius: 28px;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
  contain: strict;
}

.pet-sprite-img {
  display: block;
  position: absolute;
  left: 0;
  will-change: transform;
  animation: pet-frames var(--pet-duration) steps(var(--pet-steps)) infinite;
}

.pet-hint {
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  max-width: 220px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--ld-bg-card);
  color: var(--c-text-1);
  font-size: 0.75rem;
  box-shadow: 0 8px 22px var(--ld-shadow);
  animation: hint-in 0.35s ease;
}

.pet-hint::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  width: 10px;
  height: 10px;
  background: var(--ld-bg-card);
  transform: translateY(-50%) rotate(45deg);
}

.pet-chat {
  width: min(326px, calc(100vw - 32px));
  height: min(430px, calc(100dvh - 150px));
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, var(--c-primary-soft));
  box-shadow: 0 18px 46px color-mix(in srgb, #000 20%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 60%, transparent) inset;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
}

.pet-chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 14px 11px;
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--c-primary) 16%, transparent), transparent 48%),
    linear-gradient(135deg, var(--c-primary-soft), transparent 72%);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
}

.pet-chat-title {
  display: flex;
  gap: 10px;
  min-width: 0;
}

.pet-chat-avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(145deg, color-mix(in srgb, var(--c-primary) 78%, #fff), var(--c-primary));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--c-primary) 28%, transparent);
  flex-shrink: 0;
}

.pet-chat-avatar :deep(.icon) {
  font-size: 1rem;
}

.pet-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pet-online {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #22a06b;
  font-size: 0.6rem;
  font-weight: 600;
}

.pet-online::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgb(34 197 94 / 12%);
}

.pet-chat-title strong {
  display: block;
  font-size: 0.92rem;
  color: var(--c-text);
}

.pet-chat-title p {
  margin: 2px 0 0;
  font-size: 0.68rem;
  color: var(--c-text-3);
  line-height: 1.4;
}

.pet-context-label {
  display: inline-flex;
  align-items: center;
  margin-top: 5px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.62rem;
  line-height: 1.5;
}

.pet-icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.pet-icon-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.pet-chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 13px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--c-primary) 7%, transparent), transparent 35%),
    color-mix(in srgb, var(--c-bg-1) 74%, transparent);
}

.pet-msg {
  display: flex;
}

.pet-msg.user {
  justify-content: flex-end;
}

.pet-bubble {
  max-width: 88%;
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 0.81rem;
  line-height: 1.65;
  word-break: break-word;
}

.pet-msg.assistant .pet-bubble {
  background: var(--ld-bg-card);
  color: var(--c-text-1);
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
  border-bottom-left-radius: 5px;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--ld-shadow) 80%, transparent);
}

.pet-msg.user .pet-bubble {
  background: var(--c-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.pet-markdown {
  max-width: 94%;
}

.pet-streaming {
  white-space: normal;
}

.pet-markdown :deep(> :first-child) {
  margin-top: 0;
}

.pet-markdown :deep(> :last-child) {
  margin-bottom: 0;
}

.pet-markdown :deep(p) {
  margin: 0 0 0.62em;
}

.pet-markdown :deep(ol),
.pet-markdown :deep(ul) {
  margin: 0.5em 0 0.65em;
  padding-left: 1.55em;
}

.pet-markdown :deep(li) {
  padding-left: 0.15em;
}

.pet-markdown :deep(li + li) {
  margin-top: 0.42em;
}

.pet-markdown :deep(li::marker) {
  color: var(--c-primary);
  font-weight: 700;
}

.pet-markdown :deep(strong) {
  color: var(--c-text);
  font-weight: 750;
}

.pet-markdown :deep(a) {
  color: var(--c-primary);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--c-primary) 35%, transparent);
  text-underline-offset: 2px;
}

.pet-markdown :deep(code) {
  padding: 0.12em 0.38em;
  border-radius: 5px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  font-size: 0.9em;
}

.pet-markdown :deep(pre) {
  max-width: 100%;
  margin: 0.65em 0;
  padding: 10px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--code-bg);
}

.pet-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
  color: var(--c-text-1);
}

.pet-markdown :deep(blockquote) {
  margin: 0.6em 0;
  padding: 0.35em 0.75em;
  border-left: 3px solid var(--c-primary);
  border-radius: 0 7px 7px 0;
  background: var(--c-primary-soft);
  color: var(--c-text-2);
}

.pet-bubble.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: 48px;
  justify-content: center;
}

.pet-bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-text-3);
  animation: typing 1.1s infinite ease-in-out;
}

.pet-bubble.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.pet-bubble.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.pet-suggestions {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  background: var(--ld-bg-card);
}

.pet-suggestions button,
.pet-actions button {
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft));
  color: var(--c-text-1);
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.pet-suggestions button {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.66rem;
  white-space: nowrap;
}

.pet-suggestions button:hover,
.pet-actions button:hover {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 48%, var(--border));
  box-shadow: 0 7px 18px color-mix(in srgb, var(--c-primary) 12%, var(--ld-shadow));
  transform: translateY(-1px);
}

.pet-suggestions button:disabled {
  opacity: 0.5;
  cursor: wait;
  transform: none;
}

.pet-suggestions :deep(.icon),
.pet-actions :deep(.icon) {
  flex: 0 0 auto;
  font-size: 0.82rem;
  color: var(--c-primary);
}

.pet-actions {
  position: absolute;
  right: calc(100% + 8px);
  bottom: 18px;
  width: max-content;
  max-width: min(230px, calc(100vw - 140px));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7px;
}

.pet-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  max-width: 100%;
  padding: 7px 11px;
  border-radius: 12px 12px 4px 12px;
  box-shadow: 0 7px 18px var(--ld-shadow);
  font-size: 0.7rem;
  white-space: nowrap;
}

.pet-chat-form {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background: var(--ld-bg-card);
}

.pet-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: none;
  border-radius: 12px;
  padding: 0 12px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.8rem;
  outline: none;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.15s;
}

.pet-input:focus {
  box-shadow: inset 0 0 0 1.5px var(--c-primary);
}

.pet-send {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 12px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pet-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pet-bob {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes pet-frames {
  to {
    transform: translate3d(var(--pet-frame-shift), 0, 0);
  }
}

@keyframes hint-in {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.pet-panel-enter-active,
.pet-panel-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.pet-panel-enter-from,
.pet-panel-leave-to {
  opacity: 0;
  transform: translateY(7px);
}

.pet-actions-enter-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.pet-actions-leave-active {
  transition: none;
}

.pet-actions-enter-from,
.pet-actions-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

@media (max-width: 640px) {
  .ai-pet {
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
  }

  .ai-pet.is-article {
    right: max(8px, env(safe-area-inset-right));
    bottom: max(64px, calc(env(safe-area-inset-bottom) + 56px));
  }

  .pet-hint:not(.pet-hint-login) {
    display: none;
  }

  .pet-hint-login {
    right: calc(100% + 6px);
    display: block;
    width: max-content;
    max-width: min(210px, calc(100vw - 92px));
    white-space: normal;
    line-height: 1.45;
    text-align: left;
  }

  .pet-fab {
    scale: 0.78;
    transform-origin: right bottom;
  }

  .pet-chat {
    width: min(326px, calc(100vw - 20px));
    height: min(420px, calc(62dvh - env(safe-area-inset-bottom)));
    border-radius: 16px;
  }

  .pet-actions {
    right: 0;
    bottom: 82px;
    max-width: calc(100vw - 24px);
    gap: 5px;
  }

  .pet-actions button {
    min-height: 31px;
    padding: 6px 9px;
    border-radius: 11px;
    font-size: 0.66rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-fab,
  .pet-sprite-img,
  .pet-bubble.typing span {
    animation: none !important;
  }

  .pet-panel-enter-active,
  .pet-panel-leave-active,
  .pet-actions-enter-active,
  .pet-actions-leave-active {
    transition: none;
  }
}
</style>
