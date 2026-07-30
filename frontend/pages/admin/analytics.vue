<template>
  <div class="analytics-page">
    <header class="analytics-header">
      <h1>访问统计</h1>
      <a-button href="https://cloud.umami.is/share/z8bB3Qqg3bGNyd5z" target="_blank" rel="noopener noreferrer">
        <Icon name="ph:arrow-square-out-bold" />
        在 Umami 打开
      </a-button>
    </header>
    <iframe
      class="analytics-frame"
      src="https://cloud.umami.is/share/z8bB3Qqg3bGNyd5z"
      title="Umami 访问统计"
      loading="eager"
      referrerpolicy="strict-origin-when-cross-origin"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
useHead({ title: '访问统计' })
</script>

<style scoped>
.analytics-page {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.analytics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.analytics-header h1 {
  margin: 0;
  color: var(--c-text);
  font-size: 1.25rem;
}

.analytics-frame {
  width: 100%;
  min-height: 680px;
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
}

@media (max-width: 900px) {
  .analytics-frame { min-height: calc(100dvh - 145px); }
}
</style>
