<template>
  <header class="section-head">
    <div class="section-head-title">
      <span v-if="kicker" class="section-kicker">{{ kicker }}</span>
      <h2 :id="titleId || undefined">{{ title }}</h2>
    </div>
    <div v-if="$slots.actions" class="section-head-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  kicker?: string
  title: string
  titleId?: string
}>(), {
  kicker: '',
  titleId: '',
})
</script>

<style scoped>
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;
  padding: 0 2px;
}
.section-head-title {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.section-kicker {
  color: var(--c-primary);
  font-size: .55rem;
  font-weight: 800;
  letter-spacing: .12em;
}
.section-head h2 {
  margin: 0;
  color: var(--c-text);
  font-size: .96rem;
  letter-spacing: 0;
}
.section-head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-head-actions :deep(button) {
  display: grid;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
  transition: border-color .2s ease, color .2s ease, transform .2s ease;
}
.section-head-actions :deep(button:hover:not(:disabled)) {
  border-color: var(--c-primary);
  color: var(--c-primary);
  transform: translateY(-1px);
}
.section-head-actions :deep(button:disabled) {
  cursor: default;
  opacity: .34;
}

@media (max-width: 640px) {
  .section-head {
    margin-bottom: 11px;
  }
  .section-head-actions :deep(button) {
    display: none;
  }
}
</style>