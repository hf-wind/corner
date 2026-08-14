<template>
  <div v-if="enabled" class="turnstile-slot" :class="{ unavailable: unavailable }">
    <div ref="container"></div>
    <span v-if="unavailable">人机验证暂不可用</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const container = ref<HTMLElement | null>(null)
const unavailable = ref(false)
const challengePending = ref(false)
const rendering = ref(false)
let widgetId: string | undefined
const bypassToken = 'local-development-bypass'
const enabled = computed(() => {
  const configured = String(import.meta.env.VITE_TURNSTILE_ENABLED || '').trim().toLowerCase()
  if (configured) return !['0', 'false', 'off', 'no'].includes(configured)
  return import.meta.env.PROD
})

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  getResponse?: (widgetId?: string) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi; __cornerTurnstileScript?: Promise<void> }
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (window.__cornerTurnstileScript) return window.__cornerTurnstileScript
  window.__cornerTurnstileScript = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.dataset.cornerTurnstile = 'true'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    const timeout = window.setTimeout(() => reject(new Error('Turnstile script timed out')), 12_000)
    script.onload = () => { window.clearTimeout(timeout); resolve() }
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error('Turnstile script failed to load')) }
    document.head.appendChild(script)
  }).catch((error) => {
    document.querySelector('script[data-corner-turnstile="true"]')?.remove()
    window.__cornerTurnstileScript = undefined
    throw error
  })
  return window.__cornerTurnstileScript
}

async function renderWidget() {
  if (!enabled.value) {
    emit('update:modelValue', bypassToken)
    return
  }
  const sitekey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
  if (!sitekey || !container.value) {
    unavailable.value = true
    return
  }
  if (rendering.value) return
  rendering.value = true
  unavailable.value = false
  try {
    await loadScript()
    if (!window.turnstile || !container.value) throw new Error('Turnstile API unavailable')
    widgetId = window.turnstile.render(container.value, {
      sitekey,
      theme: 'auto',
      language: 'zh-CN',
      callback: (token: string) => {
        challengePending.value = false
        emit('update:modelValue', token)
      },
      'before-interactive-callback': () => { challengePending.value = true },
      'after-interactive-callback': () => { challengePending.value = !props.modelValue },
      'expired-callback': () => {
        challengePending.value = false
        emit('update:modelValue', '')
      },
      'error-callback': () => {
        challengePending.value = false
        emit('update:modelValue', '')
        unavailable.value = true
      },
    })
  } catch {
    unavailable.value = true
  } finally {
    rendering.value = false
  }
}

async function waitForToken(timeoutMs = 3500) {
  if (!enabled.value) return bypassToken
  if (!widgetId && !rendering.value) void renderWidget()
  const graceDeadline = Date.now() + 650
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const token = props.modelValue || (widgetId && window.turnstile?.getResponse?.(widgetId)) || ''
    if (token) return token
    if (unavailable.value) return ''
    if (Date.now() >= graceDeadline && widgetId && !challengePending.value) return ''
    await new Promise(resolve => window.setTimeout(resolve, 80))
  }
  return ''
}

function reset() {
  if (!enabled.value) {
    emit('update:modelValue', bypassToken)
    return
  }
  emit('update:modelValue', '')
  challengePending.value = false
  unavailable.value = false
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
  else void renderWidget()
}

onMounted(() => {
  void renderWidget()
})
onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

defineExpose({ reset, waitForToken })
</script>

<style scoped>
.turnstile-slot {
  width: 100%;
  min-height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.turnstile-slot.unavailable {
  border: 1px solid #ef4444;
  border-radius: 6px;
  color: #ef4444;
  font-size: 0.78rem;
}
</style>
