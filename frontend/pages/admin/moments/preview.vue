<template>
  <div class="moment-preview-page">
    <header class="preview-header">
      <NuxtLink to="/admin/moments"><Icon name="ph:arrow-left-bold" /> 返回列表</NuxtLink>
      <a-button v-if="moment.slug" type="primary" @click="router.push(`/admin/moments/${moment.slug}`)">继续编辑</a-button>
    </header>

    <a-spin :spinning="loading">
      <article v-if="moment.title" class="preview-card">
        <div class="preview-meta"><Icon name="ph:sparkle-bold" /> {{ dateText }}</div>
        <h1>{{ moment.title }}</h1>
        <div v-if="moment.excerpt" class="preview-excerpt"><span>摘要</span><p>{{ moment.excerpt }}</p></div>
        <MomentContent :content="moment.content" />
      </article>
      <a-empty v-else-if="!loading" description="瞬间不存在" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const moment = ref<any>({})
const slug = computed(() => String(route.query.slug || ''))
const dateText = computed(() => String(moment.value.updatedAt || moment.value.createdAt || '').slice(0, 10))

async function load() {
  loading.value = true
  try { moment.value = slug.value ? await api.get(`/moments/${slug.value}/preview`) : {} }
  catch { moment.value = {} }
  finally { loading.value = false }
}

onMounted(load)
watch(slug, load)
</script>

<style scoped>
.moment-preview-page { width:min(800px,100%); padding:8px 0 28px; }
.preview-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
.preview-header a { display:inline-flex; align-items:center; gap:6px; color:var(--c-text-2); text-decoration:none; font-size:.82rem; }
.preview-card { padding:28px; border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); }
.preview-meta { display:flex; align-items:center; gap:7px; color:var(--c-text-3); font-size:.78rem; }
.preview-card h1 { margin:14px 0 0; color:var(--c-text); font-size:1.7rem; }
.preview-excerpt { margin:18px 0; padding:14px 16px; border-left:3px solid var(--c-primary); background:var(--c-primary-soft); }
.preview-excerpt span { color:var(--c-primary); font-size:.72rem; letter-spacing:.1em; }
.preview-excerpt p { margin:6px 0 0; color:var(--c-text-2); line-height:1.8; }
@media (max-width:640px) { .preview-card { padding:20px; } }
</style>
