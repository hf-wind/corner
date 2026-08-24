<template>
  <section class="newsletter-bar" aria-label="邮件订阅">
    <div class="nl-icon" aria-hidden="true">
      <Icon name="ph:paper-plane-tilt-bold" />
    </div>
    <div class="nl-copy">
      <strong>订阅风隅周报</strong>
      <span>每周精选新文章与瞬间，安静地送进你的邮箱。</span>
    </div>
    <form class="nl-form" @submit.prevent="onSubscribe">
      <input
        v-model.trim="email"
        type="email"
        name="email"
        class="nl-input"
        placeholder="you@example.com"
        aria-label="邮箱地址"
        :disabled="submitting"
        required
      />
      <button type="submit" class="nl-btn" :disabled="submitting">
        <Icon
          :name="submitting ? 'ph:circle-notch-bold' : 'ph:arrow-right-bold'"
          :class="{ spinning: submitting }"
        />
        {{ submitLabel }}
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
  gap: 14px;
  margin-top: 28px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 14px);
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
}

.nl-icon {
  flex: 0 0 auto;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
  color: var(--c-primary);
  font-size: 1.25rem;
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
  font-size: 0.95rem;
}

.nl-copy span {
  color: var(--c-text-3);
  font-size: 0.78rem;
  line-height: 1.5;
}

.nl-form {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.nl-input {
  width: 210px;
  padding: 9px 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--c-bg, transparent);
  color: var(--c-text);
  font-size: 0.82rem;
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
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: none;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    filter 0.2s ease,
    transform 0.2s ease;
}

.nl-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.nl-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinning {
  animation: nl-spin 0.9s linear infinite;
}

@keyframes nl-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .newsletter-bar {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .nl-icon {
    margin: 0 auto;
  }

  .nl-form {
    flex-direction: column;
  }

  .nl-input,
  .nl-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
