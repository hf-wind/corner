<template>
  <div class="ai-pet" :class="{ open: chatOpen }">
    <Transition name="pet-panel">
      <div v-if="chatOpen" class="pet-chat" role="dialog" aria-label="和哆啦A梦聊天">
        <header class="pet-chat-head">
          <div class="pet-chat-title">
            <span class="pet-dot" />
            <div>
              <strong>{{ displayName }}</strong>
              <p>{{ description }}</p>
            </div>
          </div>
          <button type="button" class="pet-icon-btn" aria-label="关闭" @click="chatOpen = false">
            <Icon name="ph:x-bold" />
          </button>
        </header>

        <div ref="listRef" class="pet-chat-list">
          <div v-for="(m, i) in messages" :key="i" class="pet-msg" :class="m.role">
            <div class="pet-bubble">{{ m.content }}</div>
          </div>
          <div v-if="sending" class="pet-msg assistant">
            <div class="pet-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        </div>

        <form class="pet-chat-form" @submit.prevent="send">
          <input v-model="input" class="pet-input" type="text" maxlength="500" placeholder="和阿风聊点什么…"
            :disabled="sending" />
          <button type="submit" class="pet-send" :disabled="sending || !input.trim()" aria-label="发送">
            <Icon name="ph:paper-plane-right-fill" />
          </button>
        </form>
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
import petMeta from '~/assets/dram/pet.json'
const spriteUrl = '/dram/spritesheet.webp'

type Role = 'user' | 'assistant'
interface Msg { role: Role; content: string }

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
const { playing: musicPlaying } = useMusicPlayerState()
const chatOpen = ref(false)
const sending = ref(false)
const input = ref('')
const messages = ref<Msg[]>([])
const listRef = ref<HTMLElement | null>(null)
const showHint = ref(true)
const showLoginBubble = ref(false)

const displayName = ref(meta.displayName || '哆啦A梦')
const description = ref(meta.description || '阿风的伙伴 · 蓝色机器猫')
const greetings = ref<string[]>([...(meta.greetings || [])])

const isLoggedIn = computed(() => import.meta.client && !!localStorage.getItem('token'))
const hintText = computed(() => greetings.value[0] || '你好呀～')

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

async function toggleChat() {
  showHint.value = false
  if (!isLoggedIn.value) {
    showLoginBubble.value = true
    if (loginBubbleTimer) clearTimeout(loginBubbleTimer)
    loginBubbleTimer = setTimeout(() => { showLoginBubble.value = false }, 3000)
    return
  }
  chatOpen.value = !chatOpen.value
  if (chatOpen.value) {
    await loadHistory()
    if (messages.value.length === 0) {
      const list = greetings.value.length ? greetings.value : ['你好，我是哆啦A梦！']
      const g = list[Math.floor(Math.random() * list.length)]
      messages.value.push({ role: 'assistant', content: g })
    }
    await nextTick(scrollBottom)
  }
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
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  sending.value = true
  await nextTick(scrollBottom)

  try {
    const res = await api.post<{ reply: string }>('/ai/chat', { message: text })
    messages.value.push({ role: 'assistant', content: res.reply || '……' })
  } catch {
    messages.value.push({
      role: 'assistant',
      content: '呜，任意门开小差了。稍后再试，或者先逛逛文章吧～',
    })
  } finally {
    sending.value = false
    await nextTick(scrollBottom)
  }
}

function scrollBottom() {
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

onMounted(() => {
  loadPetMeta()
  hintTimer = setTimeout(() => { showHint.value = false }, 8000)
})

onUnmounted(() => {
  if (hintTimer) clearTimeout(hintTimer)
  if (loginBubbleTimer) clearTimeout(loginBubbleTimer)
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
  width: min(300px, calc(100vw - 32px));
  height: min(380px, calc(100vh - 140px));
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: var(--ld-bg-card);
  box-shadow: 0 18px 48px color-mix(in srgb, #000 22%, var(--ld-shadow));
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.pet-chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 12px;
  background: linear-gradient(135deg, var(--c-primary-soft), transparent 70%);
}

.pet-chat-title {
  display: flex;
  gap: 10px;
  min-width: 0;
}

.pet-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 4px var(--c-primary-soft);
  flex-shrink: 0;
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
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: color-mix(in srgb, var(--c-bg-1) 70%, transparent);
}

.pet-msg {
  display: flex;
}

.pet-msg.user {
  justify-content: flex-end;
}

.pet-bubble {
  max-width: 86%;
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 0.8rem;
  line-height: 1.55;
  word-break: break-word;
}

.pet-msg.assistant .pet-bubble {
  background: var(--ld-bg-card);
  color: var(--c-text-1);
  border-bottom-left-radius: 4px;
  box-shadow: 0 4px 12px var(--ld-shadow);
}

.pet-msg.user .pet-bubble {
  background: var(--c-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
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
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.pet-panel-enter-from,
.pet-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 640px) {
  .ai-pet {
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
  }

  .pet-hint {
    display: none;
  }

  .pet-fab {
    scale: 0.86;
    transform-origin: right bottom;
  }

  .pet-chat {
    width: min(320px, calc(100vw - 24px));
    height: min(420px, calc(100dvh - 96px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-fab,
  .pet-sprite-img,
  .pet-bubble.typing span {
    animation: none !important;
  }

  .pet-panel-enter-active,
  .pet-panel-leave-active {
    transition: none;
  }
}
</style>
