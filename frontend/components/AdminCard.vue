<template>
  <a-card size="small" :bordered="false" class="admin-card">
    <template #title>
      <span class="admin-card-head">
        <span class="admin-card-icon"><Icon :name="icon" /></span>
        <span class="admin-card-text">
          <span class="admin-card-title">{{ title }}</span>
          <span v-if="desc" class="admin-card-desc">{{ desc }}</span>
        </span>
      </span>
    </template>
    <template v-if="$slots.extra" #extra><slot name="extra" /></template>
    <slot />
  </a-card>
</template>

<script setup lang="ts">
defineProps<{ icon: string; title: string; desc?: string }>()
</script>

<style scoped>
.admin-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
}
.admin-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 0;
}
.admin-card-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 9px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1rem;
}
.admin-card-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.admin-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.3;
}
.admin-card-desc {
  font-size: 0.72rem;
  color: var(--c-text-3);
  line-height: 1.4;
}
</style>