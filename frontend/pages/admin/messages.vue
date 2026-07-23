<template>
  <div class="messages-page">
    <a-card :bordered="false" class="section-card" size="small" title="我的消息">
      <div class="empty">
        <Icon name="ph:bell-slash-bold" class="empty-icon" />
        <div class="empty-title">消息中心即将上线</div>
        <div class="empty-desc">之后可在这里查看系统通知、评论回复等消息。</div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
</script>

<style scoped>
.messages-page { max-width: 560px; }
.section-card { border-radius: 10px; }
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}
.empty-icon {
  font-size: 2.4rem;
  color: var(--c-text-3);
  margin-bottom: 12px;
}
.empty-title {
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--c-text);
}
.empty-desc {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--c-text-3);
  max-width: 280px;
  line-height: 1.5;
}
</style>
