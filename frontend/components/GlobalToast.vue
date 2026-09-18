<template>
  <Teleport to="body">
    <div class="toast-signal" :class="[`toast-signal-${signalType}`, { active: signalActive }]" aria-hidden="true" />
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast" tag="div" class="toast-stack">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="[`toast-${t.type}`, { 'toast-visible': t.visible }]"
        >
          <div class="toast-icon">
            <Icon v-if="t.type === 'success'" name="ph:check-circle" weight="fill" />
            <Icon v-else-if="t.type === 'error'" name="ph:x-circle" weight="fill" />
            <Icon v-else-if="t.type === 'warning'" name="ph:warning-circle" weight="fill" />
            <Icon v-else name="ph:info" weight="fill" />
          </div>
          <div class="toast-message">{{ t.message }}</div>
          <button class="toast-close" type="button" @click="dismiss(t.id)">
            <Icon name="ph:x" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts, dismiss } = useToast()

const signalActive = ref(false)
const signalType = ref<ToastItem['type']>('info')
let signalTimer: ReturnType<typeof setTimeout> | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

function clearPageFeedback() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove(
    'toast-feedback-success',
    'toast-feedback-error',
    'toast-feedback-warning',
    'toast-feedback-info',
  )
}

function pulsePageFeedback(type: ToastItem['type']) {
  if (typeof document === 'undefined') return
  clearPageFeedback()
  signalType.value = type
  document.documentElement.classList.add(`toast-feedback-${type}`)
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(clearPageFeedback, 900)
}

watch(() => toasts.value.map(t => t.id).join(','), () => {
  const latest = toasts.value[toasts.value.length - 1]
  if (latest) pulsePageFeedback(latest.type)
  signalActive.value = false
  requestAnimationFrame(() => {
    signalActive.value = true
    if (signalTimer) clearTimeout(signalTimer)
    signalTimer = setTimeout(() => { signalActive.value = false }, 900)
  })
})

onUnmounted(() => {
  if (signalTimer) clearTimeout(signalTimer)
  if (feedbackTimer) clearTimeout(feedbackTimer)
  clearPageFeedback()
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: max(78px, calc(env(safe-area-inset-bottom) + 72px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.toast-signal {
  position: fixed;
  inset: 8px;
  z-index: 9998;
  border: 1px solid color-mix(in srgb, var(--c-primary) 0%, transparent);
  border-radius: 18px;
  box-shadow: inset 0 0 0 0 color-mix(in srgb, var(--c-primary) 0%, transparent);
  opacity: 0;
  pointer-events: none;
}

.toast-signal.toast-signal-success {
  --toast-signal-color: #22c55e;
}

.toast-signal.toast-signal-error {
  --toast-signal-color: #ef4444;
}

.toast-signal.toast-signal-warning {
  --toast-signal-color: #f59e0b;
}

.toast-signal.toast-signal-info {
  --toast-signal-color: var(--c-primary);
}

.toast-stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  align-items: center;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  min-width: 180px;
  max-width: 360px;
  background: color-mix(in srgb, var(--c-bg) 92%, var(--c-primary-soft));
  border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border));
  border-radius: 10px;
  box-shadow:
    0 4px 20px var(--ld-shadow),
    0 1px 4px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(16px);
  pointer-events: auto;
  cursor: default;
  overflow: hidden;
  position: relative;
  opacity: 0;
  transform: translateY(12px) scale(0.96);
  transition:
    opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-item.toast-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.toast-item:not(.toast-visible) {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in;
}

.toast-icon {
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1;
}

.toast-success .toast-icon { color: #22c55e; }
.toast-error .toast-icon { color: #ef4444; }
.toast-warning .toast-icon { color: #f59e0b; }
.toast-info .toast-icon { color: var(--c-primary); }
.toast-success { --toast-accent: #22c55e; }
.toast-error { --toast-accent: #ef4444; }
.toast-warning { --toast-accent: #f59e0b; }
.toast-info { --toast-accent: var(--c-primary); }

.toast-message {
  flex: 1;
  font-size: 12px;
  line-height: 1.4;
  color: var(--c-text-1);
  word-break: break-word;
  text-align: center;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: var(--c-text-3);
  cursor: pointer;
  border-radius: 4px;
  font-size: 11px;
  transition: all 0.15s;
  opacity: 0;
}

.toast-item:hover .toast-close {
  opacity: 1;
}

.toast-close:hover {
  background: var(--c-bg-soft);
  color: var(--c-text-1);
}
</style>

<style>
html.toast-feedback-success body { background-color: color-mix(in srgb, #22c55e 3%, var(--c-bg)); }
html.toast-feedback-error body { background-color: color-mix(in srgb, #ef4444 3%, var(--c-bg)); }
html.toast-feedback-warning body { background-color: color-mix(in srgb, #f59e0b 3%, var(--c-bg)); }
html.toast-feedback-info body { background-color: color-mix(in srgb, var(--c-primary) 3%, var(--c-bg)); }
html.toast-feedback-success body,
html.toast-feedback-error body,
html.toast-feedback-warning body,
html.toast-feedback-info body { transition: background-color 0.45s ease; }
</style>

<style>
.toast-container { z-index: 13500; }
.toast-signal { z-index: 13499; inset: auto; top: max(14px, env(safe-area-inset-top)); left: 50%; width: min(360px, calc(100vw - 28px)); height: 72px; transform: translateX(-50%); border: 0; border-radius: 18px; opacity: 0; background: color-mix(in srgb, var(--toast-signal-color, var(--c-primary)) 5%, transparent); filter: blur(8px); backdrop-filter: blur(12px) saturate(1.08); }
.toast-signal.active { animation: toast-soft-focus .72s cubic-bezier(.22,1,.36,1) both; }
.toast-item::after { display: none; }
.toast-item::before { position: absolute; inset: -30% 18% auto; height: 75%; border-radius: 50%; background: color-mix(in srgb, var(--toast-accent) 9%, transparent); content: ''; filter: blur(14px); opacity: 0; pointer-events: none; transform: translate3d(0, 8px, 0); }
.toast-item.toast-visible::before { animation: toast-sheen .78s cubic-bezier(.22,1,.36,1) both; }
@keyframes toast-soft-focus { 0% { opacity: 0; transform: translateX(-50%) scale(.94); } 34% { opacity: .72; transform: translateX(-50%) scale(1.01); } 100% { opacity: 0; transform: translateX(-50%) scale(1.04); } }
@keyframes toast-sheen { 0% { opacity: 0; transform: translate3d(0, 8px, 0) scale(.84); } 35% { opacity: .9; transform: translate3d(0, 0, 0) scale(1); } 100% { opacity: 0; transform: translate3d(0, -6px, 0) scale(1.06); } }
</style>
