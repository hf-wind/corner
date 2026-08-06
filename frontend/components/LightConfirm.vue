<template>
  <Teleport to="body">
    <Transition name="light-confirm">
      <div
        v-if="state"
        class="light-confirm-overlay"
        role="presentation"
        @click.self="settle(false)"
      >
        <section
          class="light-confirm"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="`light-confirm-title-${state.id}`"
          :aria-describedby="`light-confirm-message-${state.id}`"
        >
          <div class="light-confirm-mark" :class="{ danger: state.danger }">
            <Icon :name="state.danger ? 'ph:warning-bold' : 'ph:question-bold'" />
          </div>
          <div class="light-confirm-copy">
            <h2 :id="`light-confirm-title-${state.id}`">{{ state.title }}</h2>
            <p :id="`light-confirm-message-${state.id}`">{{ state.message }}</p>
          </div>
          <div class="light-confirm-actions">
            <button type="button" class="light-confirm-cancel" @click="settle(false)">
              {{ state.cancelText }}
            </button>
            <button
              type="button"
              class="light-confirm-submit"
              :class="{ danger: state.danger }"
              @click="settle(true)"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { state, settle } = useConfirm()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && state.value) settle(false)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.light-confirm-overlay {
  position: fixed;
  z-index: 13000;
  inset: 0;
  display: grid;
  padding: 18px;
  background: rgb(8 15 24 / 28%);
  backdrop-filter: blur(5px);
  place-items: center;
}

.light-confirm {
  display: grid;
  width: min(360px, calc(100vw - 36px));
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 10px 12px;
  padding: 15px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, transparent);
  box-shadow: 0 22px 64px color-mix(in srgb, var(--ld-shadow) 72%, transparent);
}

.light-confirm-mark {
  display: grid;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1rem;
  place-items: center;
}

.light-confirm-mark.danger {
  background: color-mix(in srgb, #e86c78 14%, transparent);
  color: #d65463;
}

.light-confirm-copy h2 {
  margin: 1px 0 4px;
  color: var(--c-text);
  font-size: 0.86rem;
  line-height: 1.35;
}

.light-confirm-copy p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.68rem;
  line-height: 1.55;
}

.light-confirm-actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 7px;
  padding-top: 2px;
}

.light-confirm-actions button {
  min-height: 30px;
  padding: 5px 12px;
  border-radius: 9px;
  font: inherit;
  font-size: 0.67rem;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.light-confirm-actions button:hover {
  transform: translateY(-1px);
}

.light-confirm-cancel {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--c-text-2);
}

.light-confirm-submit {
  border: 1px solid color-mix(in srgb, var(--c-primary) 45%, transparent);
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

.light-confirm-submit.danger {
  border-color: color-mix(in srgb, #d65463 35%, transparent);
  background: color-mix(in srgb, #d65463 12%, transparent);
  color: #c74c5c;
}

.light-confirm-enter-active,
.light-confirm-leave-active {
  transition: opacity 0.2s ease;
}

.light-confirm-enter-active .light-confirm,
.light-confirm-leave-active .light-confirm {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
}

.light-confirm-enter-from,
.light-confirm-leave-to {
  opacity: 0;
}

.light-confirm-enter-from .light-confirm,
.light-confirm-leave-to .light-confirm {
  opacity: 0;
  transform: translateY(9px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .light-confirm-enter-active,
  .light-confirm-leave-active,
  .light-confirm-enter-active .light-confirm,
  .light-confirm-leave-active .light-confirm {
    transition: none;
  }
}
</style>
