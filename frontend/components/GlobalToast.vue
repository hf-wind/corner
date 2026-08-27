<template>
  <Teleport to="body">
    <div class="toast-signal" :class="{ active: signalActive }" aria-hidden="true" />
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast" tag="div" class="toast-stack">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="[`toast-${t.type}`, { 'toast-visible': t.visible }]"
          @mouseenter="pauseAuto(t.id)"
          @mouseleave="resumeAuto(t.id)"
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

const timers = new Map<number, ReturnType<typeof setTimeout>>()
const signalActive = ref(false)
let signalTimer: ReturnType<typeof setTimeout> | null = null

function pauseAuto(id: number) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
}

function resumeAuto(id: number) {
  const t = toasts.value.find(t => t.id === id)
  if (t && t.visible) {
    timers.set(id, setTimeout(() => dismiss(id), 2000))
  }
}

watch(() => toasts.value.map(t => t.id).join(','), () => {
  signalActive.value = false
  requestAnimationFrame(() => {
    signalActive.value = true
    if (signalTimer) clearTimeout(signalTimer)
    signalTimer = setTimeout(() => { signalActive.value = false }, 900)
  })
  toasts.value.forEach(t => {
    if (!timers.has(t.id) && t.visible) {
      timers.set(t.id, setTimeout(() => dismiss(t.id), 3000))
    }
  })
})

onUnmounted(() => {
  if (signalTimer) clearTimeout(signalTimer)
  timers.forEach(timer => clearTimeout(timer))
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

.toast-signal.active {
  animation: toast-edge-signal 0.9s ease-out both;
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
  padding: 7px 12px;
  min-width: 180px;
  max-width: 360px;
  background: var(--c-bg);
  border: 1px solid var(--border);
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

@keyframes toast-edge-signal {
  0% { opacity: 0; border-color: color-mix(in srgb, var(--c-primary) 0%, transparent); box-shadow: inset 0 0 0 0 color-mix(in srgb, var(--c-primary) 0%, transparent); }
  22% { opacity: 1; border-color: color-mix(in srgb, var(--c-primary) 38%, transparent); box-shadow: inset 0 0 28px color-mix(in srgb, var(--c-primary) 5%, transparent); }
  100% { opacity: 0; border-color: color-mix(in srgb, var(--c-primary) 0%, transparent); box-shadow: inset 0 0 0 0 color-mix(in srgb, var(--c-primary) 0%, transparent); }
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
