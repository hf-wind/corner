<template>
  <div class="page-layout moment-preview-layout">
    <main class="moment-preview-main">
      <Loading v-if="loading" fullscreen title="加载中…" text="正在加载瞬间预览" />

      <template v-else-if="moment.id">
        <AppLink to="/admin/moments" class="back-btn">
          <Icon name="ph:arrow-left-bold" />
          返回列表
        </AppLink>

        <div class="moment-preview-shell">
          <MomentCard :moment="moment" />
        </div>
      </template>

      <a-empty v-else description="瞬间不存在" />
    </main>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const route = useRoute()
const loading = ref(true)
const moment = ref<any>({})

const slug = computed(() => String(route.query.slug || ''))

async function load() {
  loading.value = true
  try {
    moment.value = slug.value ? await api.get(`/moments/${slug.value}/preview`) : {}
  } catch {
    moment.value = {}
  }
  loading.value = false
}

onMounted(load)
watch(slug, load)
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.moment-preview-main {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  min-width: 0;
  width: min(640px, 100%);
  margin: 0 auto;
  scrollbar-gutter: stable;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--c-text-2);
  text-decoration: none;
  margin-bottom: 22px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--c-primary);
}

.moment-preview-shell {
  min-width: 0;
}

@media (max-width: 640px) {
  .moment-preview-main {
    padding: 18px 14px;
  }
}
</style>
