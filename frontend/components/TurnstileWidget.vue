<template>
  <div class="turnstile-slot" :class="{ unavailable: unavailable }">
    <div ref="container"></div>
    <span v-if="unavailable">人机验证暂不可用</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const container = ref<HTMLElement | null>(null)
const unavailable = ref(false)
let widgetId: string | undefined

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
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
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script failed to load'))
    document.head.appendChild(script)
  })
  return window.__cornerTurnstileScript
}

async function renderWidget() {
  if (!import.meta.env.PROD) {
    emit('update:modelValue', 'local-development-bypass')
    return
  }
  const sitekey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
  if (!sitekey || !container.value) {
    unavailable.value = true
    return
  }
  try {
    await loadScript()
    if (!window.turnstile || !container.value) throw new Error('Turnstile API unavailable')
    widgetId = window.turnstile.render(container.value, {
      sitekey,
      theme: 'auto',
      language: 'zh-CN',
      callback: (token: string) => emit('update:modelValue', token),
      'expired-callback': () => emit('update:modelValue', ''),
      'error-callback': () => {
        emit('update:modelValue', '')
        unavailable.value = true
      },
    })
  } catch {
    unavailable.value = true
  }
}

function reset() {
  emit('update:modelValue', '')
  unavailable.value = false
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
  else void renderWidget()
}

onMounted(() => void renderWidget())
onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

defineExpose({ reset })
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
