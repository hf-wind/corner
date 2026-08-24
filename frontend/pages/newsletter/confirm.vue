<template>
  <div class="nl-result-page">
    <div class="nl-result-card" :class="[state, { ready }]">
      <div class="nl-result-icon" aria-hidden="true">
        <Icon :name="iconName" />
      </div>
      <h1>{{ title }}</h1>
      <p class="nl-message">{{ message }}</p>
      <AppLink to="/home" class="nl-home">
        <Icon name="ph:house-bold" />
        回到首页
      </AppLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const route = useRoute();

const state = ref<"pending" | "success" | "error">("pending");
const ready = ref(false);
const title = ref("正在确认订阅…");
const message = ref("请稍候，我们正在处理你的请求。");

const iconName = computed(() => {
  if (state.value === "success") return "ph:check-circle-bold";
  if (state.value === "error") return "ph:warning-circle-bold";
  return "ph:circle-notch-bold";
});

onMounted(async () => {
  const token = String(route.query.token || "");
  if (!token) {
    state.value = "error";
    title.value = "链接无效";
    message.value = "确认链接缺失或格式不正确，请从邮件里重新点击。";
    ready.value = true;
    return;
  }
  try {
    const result = await api.post<any>("/newsletter/confirm", { token });
    state.value = "success";
    title.value = result?.alreadyConfirmed ? "你已经订阅过了" : "订阅成功";
    message.value =
      "感谢订阅风隅周报，有新内容时我们会第一时间写信告诉你。";
  } catch (error: any) {
    state.value = "error";
    title.value = "确认失败";
    message.value = error?.message || "链接可能已失效，请重新订阅。";
  } finally {
    ready.value = true;
  }
});

useHead({ title: "订阅确认 · 风隅随笔" });
</script>

<style scoped>
.nl-result-page {
  display: grid;
  min-height: 100dvh;
  width: 100%;
  place-items: center;
  padding: 24px;
  background: var(--c-bg);
}

.nl-result-card {
  width: min(420px, 100%);
  padding: 44px 36px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--ld-bg-card, #fff);
  box-shadow: 0 20px 60px rgb(0 0 0 / 8%);
  text-align: center;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.nl-result-card.ready {
  opacity: 1;
  transform: none;
}

.nl-result-icon {
  display: grid;
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  place-items: center;
  border-radius: 50%;
  font-size: 2rem;
}

.nl-result-card.pending .nl-result-icon {
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
  color: var(--c-primary);
}

.nl-result-card.pending .nl-result-icon :deep(*),
.nl-result-card.pending .nl-result-icon {
  animation: nl-spin 0.9s linear infinite;
}

.nl-result-card.success .nl-result-icon {
  background: color-mix(in srgb, #22c55e 12%, transparent);
  color: #16a34a;
}

.nl-result-card.error .nl-result-icon {
  background: color-mix(in srgb, #ef4444 10%, transparent);
  color: #dc2626;
}

.nl-result-card h1 {
  margin: 0 0 10px;
  color: var(--c-text);
  font-size: 1.35rem;
}

.nl-message {
  margin: 0 0 26px;
  color: var(--c-text-3);
  font-size: 0.88rem;
  line-height: 1.7;
}

.nl-home {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: filter 0.2s ease;
}

.nl-home:hover {
  filter: brightness(1.08);
}

@keyframes nl-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
