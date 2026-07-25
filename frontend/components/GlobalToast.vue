<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup
        name="toast"
        tag="div"
        class="toast-stack"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="[`toast-${t.type}`, { 'toast-visible': t.visible }]"
          @mouseenter="pauseAuto(t.id)"
          @mouseleave="resumeAuto(t.id)"
        >
          <div class="toast-accent" />
          <div class="toast-icon">
            <Icon v-if="t.type === 'success'" name="ph:check-circle-bold" />
            <Icon v-else-if="t.type === 'error'" name="ph:x-circle-bold" />
            <Icon v-else-if="t.type === 'warning'" name="ph:warning-bold" />
            <Icon v-else name="ph:info-bold" />
          </div>
          <div class="toast-message">{{ t.message }}</div>
          <button class="toast-close" type="button" @click="dismiss(t.id)">
            <Icon name="ph:x-bold" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts, dismiss } = useToast()

const timers = new Map<number, ReturnType<typeof setTimeout>>()

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

watch(() => toasts.value.length, () => {
  toasts.value.forEach(t => {
    if (!timers.has(t.id) && t.visible) {
      timers.set(t.id, setTimeout(() => dismiss(t.id), 3000))
    }
  })
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.toast-stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  align-items: center;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  min-width: 240px;
  max-width: 420px;
  background: var(--c-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow:
    0 8px 32px var(--ld-shadow),
    0 2px 8px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(16px);
  pointer-events: auto;
  cursor: default;
  overflow: hidden;
  position: relative;
  opacity: 0;
  transform: translateY(16px) scale(0.96);
  transition:
    opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.3s,
    border-color 0.3s;
}

.toast-item.toast-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.toast-item:not(.toast-visible) {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in;
}

.toast-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}

.toast-success .toast-accent { background: #22c55e; }
.toast-error .toast-accent { background: #ef4444; }
.toast-warning .toast-accent { background: #f59e0b; }
.toast-info .toast-accent { background: var(--c-primary); }

.toast-icon {
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
}

.toast-success .toast-icon { color: #22c55e; }
.toast-error .toast-icon { color: #ef4444; }
.toast-warning .toast-icon { color: #f59e0b; }
.toast-info .toast-icon { color: var(--c-primary); }

.toast-message {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  color: var(--c-text-1);
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: var(--c-text-3);
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.15s;
}

.toast-close:hover {
  background: var(--c-bg-soft);
  color: var(--c-text-1);
}
</style>
