<template>
  <Teleport to="body">
    <Transition name="challenge-fade">
      <div
        v-if="open"
        class="challenge-overlay"
        role="presentation"
        @click.self="cancel"
      >
        <section
          class="challenge-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="challenge-title"
        >
          <button
            class="challenge-close"
            type="button"
            aria-label="关闭验证"
            :disabled="busy"
            @click="cancel"
          >
            <Icon name="ph:x-bold" />
          </button>

          <div class="challenge-signal" aria-hidden="true">
            <i /><i /><i />
            <span><Icon name="ph:shield-check-bold" /></span>
          </div>
          <span class="challenge-kicker">SECURE CHECK</span>
          <h2 id="challenge-title">{{ title }}</h2>
          <p>{{ description }}</p>

          <div class="challenge-widget" :class="{ busy }">
            <TurnstileWidget v-model="token" />
            <Transition name="challenge-busy">
              <div v-if="busy" class="challenge-progress" role="status">
                <Icon name="ph:circle-notch-bold" spin />
                <span>验证通过，正在继续</span>
              </div>
            </Transition>
          </div>
          <small><Icon name="ph:lock-key-bold" />验证结果仅用于本次操作</small>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    busy?: boolean;
    title?: string;
    description?: string;
  }>(),
  {
    busy: false,
    title: "确认是你本人",
    description: "完成下方校验后，我们会立即继续。",
  },
);

const emit = defineEmits<{
  cancel: [];
  verified: [token: string];
}>();

const token = ref("");
const delivered = ref(false);

watch(
  () => props.open,
  (open) => {
    if (open) {
      token.value = "";
      delivered.value = false;
    }
  },
);

watch(token, (value) => {
  if (!props.open || props.busy || delivered.value || !value) return;
  delivered.value = true;
  emit("verified", value);
});

function cancel() {
  if (!props.busy) emit("cancel");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) cancel();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.challenge-overlay {
  position: fixed;
  z-index: 14000;
  inset: 0;
  display: grid;
  padding: 24px;
  background: color-mix(in srgb, var(--c-bg) 58%, transparent);
  backdrop-filter: blur(16px) saturate(0.82);
  -webkit-backdrop-filter: blur(16px) saturate(0.82);
  place-items: center;
}

.challenge-dialog {
  position: relative;
  width: min(400px, 100%);
  overflow: hidden;
  padding: 34px 34px 28px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 24%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 94%, transparent);
  box-shadow: 0 28px 90px color-mix(in srgb, var(--ld-shadow) 72%, transparent);
  text-align: center;
}

.challenge-dialog::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--c-primary);
  content: "";
  transform-origin: left;
  animation: challenge-line 2.6s ease-in-out infinite;
}

.challenge-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
}

.challenge-close:hover:not(:disabled) {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

.challenge-signal {
  position: relative;
  display: grid;
  width: 66px;
  height: 66px;
  margin: 0 auto 18px;
  place-items: center;
}

.challenge-signal > span {
  position: relative;
  z-index: 2;
  display: grid;
  width: 46px;
  height: 46px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 44%, var(--border));
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1.2rem;
  place-items: center;
}

.challenge-signal i {
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, transparent);
  border-radius: 50%;
  animation: challenge-pulse 2.4s ease-out infinite;
}

.challenge-signal i:nth-child(2) {
  animation-delay: -0.8s;
}
.challenge-signal i:nth-child(3) {
  animation-delay: -1.6s;
}
.challenge-kicker {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 750;
}
.challenge-dialog h2 {
  margin: 8px 0 0;
  color: var(--c-text);
  font-size: 1.25rem;
  letter-spacing: 0;
}
.challenge-dialog > p {
  margin: 8px 0 22px;
  color: var(--c-text-3);
  font-size: 0.68rem;
  line-height: 1.7;
}

.challenge-widget {
  position: relative;
  display: grid;
  min-height: 74px;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: color-mix(in srgb, var(--c-bg-1) 72%, transparent);
}

.challenge-progress {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, transparent);
  color: var(--c-primary);
  font-size: 0.66rem;
  font-weight: 700;
}

.challenge-dialog small {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 16px;
  color: var(--c-text-3);
  font-size: 0.53rem;
}

.challenge-fade-enter-active,
.challenge-fade-leave-active {
  transition: opacity 0.25s ease;
}
.challenge-fade-enter-active .challenge-dialog,
.challenge-fade-leave-active .challenge-dialog {
  transition:
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.24s ease;
}
.challenge-fade-enter-from,
.challenge-fade-leave-to {
  opacity: 0;
}
.challenge-fade-enter-from .challenge-dialog {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}
.challenge-fade-leave-to .challenge-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}
.challenge-busy-enter-active,
.challenge-busy-leave-active {
  transition: opacity 0.2s ease;
}
.challenge-busy-enter-from,
.challenge-busy-leave-to {
  opacity: 0;
}

@keyframes challenge-line {
  0%,
  100% {
    transform: scaleX(0.16);
    opacity: 0.45;
  }
  50% {
    transform: scaleX(1);
    opacity: 1;
  }
}

@keyframes challenge-pulse {
  0% {
    opacity: 0;
    transform: scale(0.68);
  }
  42% {
    opacity: 0.65;
  }
  100% {
    opacity: 0;
    transform: scale(1.14);
  }
}

@media (max-width: 520px) {
  .challenge-overlay {
    padding: 16px;
  }
  .challenge-dialog {
    padding: 32px 18px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .challenge-dialog::before,
  .challenge-signal i {
    animation: none;
  }
}
</style>
