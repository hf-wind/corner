<template>
  <nav class="admin-section-tabs" :aria-label="label">
    <AppLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :class="{ active: isActive(item.to) }"
    >
      <Icon :name="item.icon" />
      <span>{{ item.label }}</span>
      <b v-if="item.count !== undefined">{{ item.count }}</b>
    </AppLink>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  items: Array<{ to: string; label: string; icon: string; count?: number }>;
}>();
const route = useRoute();
function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<style scoped>
.admin-section-tabs{display:flex;align-items:center;gap:4px;margin:0 0 14px;padding:4px;width:max-content;max-width:100%;overflow-x:auto;border:1px solid var(--border);border-radius:8px;background:var(--c-bg-1)}.admin-section-tabs a{display:inline-flex;min-height:34px;align-items:center;justify-content:center;gap:7px;padding:7px 12px;border-radius:6px;color:var(--c-text-2);font-size:.64rem;text-decoration:none;white-space:nowrap;transition:background .18s,color .18s,box-shadow .18s}.admin-section-tabs a:hover{color:var(--c-text);background:var(--ld-bg-card)}.admin-section-tabs a.active{color:var(--c-primary);background:var(--ld-bg-card);box-shadow:0 1px 4px color-mix(in srgb,var(--ld-shadow) 70%,transparent);font-weight:700}.admin-section-tabs svg{font-size:.9rem}.admin-section-tabs b{display:grid;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--c-primary-soft);place-items:center;font-size:.5rem}
</style>
