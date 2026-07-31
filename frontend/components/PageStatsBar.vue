<template>
  <section class="page-stats" :class="`stats-${items.length}`" :aria-label="label">
    <template v-for="(item, index) in items" :key="item.label">
      <div class="stat-entry">
        <span class="stat-icon"><Icon :name="item.icon" /></span>
        <p><strong>{{ item.value }}</strong><small>{{ item.label }}</small></p>
      </div>
      <i v-if="index < items.length - 1" class="stat-divider" aria-hidden="true" />
    </template>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ icon: string; value: string | number; label: string }>
  label?: string
}>()
</script>

<style scoped>
.page-stats { display:grid; grid-template-columns:repeat(7,auto); min-height:64px; align-items:center; justify-content:space-evenly; gap:16px; margin-bottom:28px; padding:12px 20px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:var(--ui-radius-panel); background:color-mix(in srgb,var(--ld-bg-card) 90%,transparent); box-shadow:var(--ui-shadow-soft); backdrop-filter:blur(16px); }
.page-stats.stats-3 { grid-template-columns:minmax(0,1fr) 1px minmax(0,1.2fr) 1px minmax(0,1.2fr); }
.page-stats.stats-2 { grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr); }
.stat-entry { display:flex; min-width:0; align-items:center; justify-content:center; gap:10px; }
.stat-icon { display:grid; width:34px; height:34px; flex:0 0 34px; border:1px solid color-mix(in srgb,var(--c-primary) 12%,transparent); border-radius:10px; background:linear-gradient(145deg,var(--c-primary-soft),color-mix(in srgb,var(--ld-bg-card) 72%,transparent)); color:var(--c-primary); font-size:1rem; place-items:center; }
.stat-entry p { display:flex; min-width:0; flex-direction:column; gap:2px; margin:0; }
.stat-entry strong { max-width:140px; overflow:hidden; color:var(--c-text); font-size:.78rem; line-height:1.25; text-overflow:ellipsis; white-space:nowrap; }
.stat-entry small { color:var(--c-text-3); font-size:.52rem; letter-spacing:.04em; }
.stat-divider { width:1px; height:29px; background:var(--border); }
@media (max-width:700px) {
  .page-stats,.page-stats.stats-2,.page-stats.stats-3 { grid-template-columns:repeat(2,minmax(0,1fr)); gap:0; padding:8px; }
  .stat-entry { justify-content:flex-start; padding:8px; }
  .stat-divider { display:none; }
  .stats-3 .stat-entry:last-child { grid-column:1/-1; }
}
</style>
