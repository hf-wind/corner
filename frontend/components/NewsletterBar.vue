<template>
  <section class="newsletter-bar" aria-label="邮件订阅">
    <div class="nl-mark" aria-hidden="true">
      <Icon name="ph:paper-plane-tilt-bold" />
      <span>NEWSLETTER</span>
    </div>
    <div class="nl-copy">
      <strong>把下一篇寄给你</strong>
      <span>每周精选新文章与瞬间，安静地送进你的邮箱。</span>
    </div>
    <form class="nl-form" @submit.prevent="onSubscribe">
      <label class="sr-only" for="newsletter-email">邮箱地址</label>
      <input
        id="newsletter-email"
        v-model.trim="email"
        type="email"
        name="email"
        class="nl-input"
        placeholder="输入邮箱地址"
        aria-label="邮箱地址"
        :disabled="submitting"
        required
      />
      <button type="submit" class="nl-btn" :disabled="submitting">
        <span>{{ submitLabel }}</span>
        <Icon
          :name="submitting ? 'ph:circle-notch-bold' : 'ph:arrow-right-bold'"
          :class="{ spinning: submitting }"
          aria-hidden="true"
        />
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
const api = useApi();
const toast = useToast();

const email = ref("");
const submitting = ref(false);
const done = ref(false);

const submitLabel = computed(() => {
  if (submitting.value) return "发送中";
  if (done.value) return "已发送";
  return "订阅";
});

async function onSubscribe() {
  if (!email.value) return void toast.warning("请先填写邮箱");
  if (submitting.value) return;
  submitting.value = true;
  try {
    const result = await api.post<any>("/newsletter/subscribe", {
      email: email.value,
    });
    done.value = true;
    email.value = "";
    toast.success(
      result?.alreadySubscribed
        ? "这个邮箱已经订阅过啦"
        : "确认邮件已发送，请查收邮箱完成订阅",
    );
    setTimeout(() => (done.value = false), 4000);
  } catch (error: any) {
    toast.error(error?.message || "订阅失败，请稍后再试");
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.newsletter-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
  padding: 20px 2px 22px;
  border-top: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 56%, transparent);
  background: color-mix(in srgb, var(--c-primary-soft) 18%, transparent);
}

.nl-mark {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--c-primary);
  font-size: 1.05rem;
}

.nl-mark span {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.nl-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
}

.nl-copy strong {
  color: var(--c-text);
  font-size: 0.9rem;
  font-weight: 700;
}

.nl-copy span {
  color: var(--c-text-3);
  font-size: 0.72rem;
  line-height: 1.5;
}

.nl-form {
  display: flex;
  flex: 0 0 auto;
  width: min(100%, 310px);
  gap: 6px;
  margin-left: auto;
}

.nl-input {
  min-width: 0;
  width: 100%;
  padding: 8px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 74%, transparent);
  color: var(--c-text);
  font: inherit;
  font-size: 0.72rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.nl-input::placeholder {
  color: var(--c-text-3);
}

.nl-input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 16%, transparent);
}

.nl-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 70%, transparent);
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    filter 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.nl-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--c-primary) 24%, transparent);
}

.nl-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinning {
  animation: nl-spin 0.9s linear infinite;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes nl-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .newsletter-bar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 5px 11px;
    padding: 17px 0 18px;
  }

  .nl-mark {
    grid-row: span 2;
    align-self: start;
    padding-top: 2px;
  }

  .nl-mark span {
    display: none;
  }

  .nl-copy {
    align-self: center;
  }

  .nl-form {
    grid-column: 2;
    width: 100%;
    margin: 5px 0 0;
  }

  .nl-input {
    min-width: 0;
  }

  .nl-btn {
    justify-content: center;
    padding-right: 11px;
    padding-left: 11px;
  }
}

@media (max-width: 390px) {
  .newsletter-bar {
    grid-template-columns: 1fr;
  }

  .nl-mark {
    grid-row: auto;
  }

  .nl-form {
    grid-column: 1;
  }
}
</style>
