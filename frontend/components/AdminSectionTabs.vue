<template>
  <a-tabs
    class="admin-section-tabs"
    :active-key="activeKey"
    :aria-label="label"
    size="small"
    @change="onChange"
  >
    <a-tab-pane v-for="item in items" :key="item.to">
      <template #tab>
        <span class="admin-tab-label">
          <Icon :name="item.icon" />
          <span>{{ item.label }}</span>
          <b v-if="item.count !== undefined">{{ item.count }}</b>
        </span>
      </template>
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  items: Array<{ to: string; label: string; icon: string; count?: number }>;
}>();
const route = useRoute();
const router = useRouter();
const activeKey = computed(() => {
  const match = props.items.find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`));
  return match?.to || props.items[0]?.to;
});
function onChange(value: string) {
  const target = props.items.find((item) => item.to === value)?.to;
  if (target && target !== route.path) void router.push(target);
}
</script>

<style scoped>
.admin-section-tabs { margin: 0 0 14px; }
.admin-tab-label { display: inline-flex; align-items: center; gap: 6px; }
.admin-tab-label b { min-width: 18px; padding: 1px 5px; border-radius: 9px; background: var(--c-primary-soft); color: var(--c-primary); font-size: .62rem; text-align: center; }
</style>
