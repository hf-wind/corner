<template>
  <main class="reader-shell" :class="{ dark: resolvedTheme === 'dark' }">
    <header class="reader-toolbar">
      <AppLink :to="`/library/${route.params.slug}`" class="reader-back"><Icon name="ph:arrow-left-bold" /> 返回书影</AppLink>
      <div class="reader-title"><Icon name="ph:book-open-text-bold" /><span>{{ item?.title || '在线阅读' }}</span><small v-if="progressCfi">· 已保存阅读位置</small></div>
      <div class="reader-actions"><button type="button" @click="rendition?.prev()"><Icon name="ph:caret-left-bold" /></button><button type="button" @click="rendition?.next()"><Icon name="ph:caret-right-bold" /></button><button type="button" @click="toggleTheme"><Icon :name="resolvedTheme === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold'" /></button><button type="button" @click="focusMode = !focusMode"><Icon name="ph:corners-out-bold" /></button></div>
    </header>
    <section class="reader-stage" :class="{ focus: focusMode }"><div ref="bookEl" class="book-view" /><div v-if="loading" class="reader-loading"><Icon name="ph:circle-notch-bold" /><span>正在打开书页…</span></div><div v-if="!loading && !item?.epubMediaPath" class="reader-empty"><Icon name="ph:book-open-text-bold" /><h1>这本书还没有绑定 EPUB</h1><AppLink :to="`/library/${route.params.slug}`">返回详情</AppLink></div></section>
  </main>
</template>

<script setup lang="ts">
import type { LibraryItem } from '@/types/library'
const api = useApi(); const route = useRoute(); const { mediaUrl } = useMediaUrl(); const { visitorId, queueEvent } = useVisitor(); const { resolvedTheme, setTheme } = useTheme()
const bookEl = ref<HTMLElement | null>(null); const item = ref<LibraryItem | null>(null); const loading = ref(true); const focusMode = ref(false); const rendition = shallowRef<any>(null); const book = shallowRef<any>(null); const progressCfi = ref('')
const storageKey = computed(() => `corner:epub:${visitorId()}:${route.params.slug}`)
function applyReaderTheme() { const themes = rendition.value?.themes; if (!themes) return; themes.override('color', resolvedTheme.value === 'dark' ? '#e8edf5' : '#253044'); themes.override('background', resolvedTheme.value === 'dark' ? '#121a28' : '#fbfcff') }
function toggleTheme() { setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark'); nextTick(applyReaderTheme) }
async function load() {
  try { item.value = await api.get<LibraryItem>(`/library/${route.params.slug}`); if (!item.value?.epubMediaPath || !bookEl.value) return
    // @ts-ignore epubjs 当前版本没有类型声明
    const ePub = (await import('epubjs')).default; book.value = ePub(mediaUrl(item.value.epubMediaPath)); rendition.value = book.value.renderTo(bookEl.value, { width: '100%', height: '100%', spread: 'none' });
    const saved = localStorage.getItem(storageKey.value) || undefined; await rendition.value.display(saved); progressCfi.value = saved || ''; applyReaderTheme()
    rendition.value.on('relocated', (location: any) => { const cfi = location?.start?.cfi || ''; if (!cfi) return; progressCfi.value = cfi; localStorage.setItem(storageKey.value, cfi); queueEvent({ action: 'content_read', path: cfi, contentType: 'library', contentId: item.value?.id, metadata: { slug: route.params.slug, progress: cfi } }) })
  } catch { item.value = null } finally { loading.value = false }
}
onMounted(load); onBeforeUnmount(() => { rendition.value?.destroy?.(); book.value?.destroy?.() }); useHead({ title: computed(() => `${item.value?.title || '在线阅读'} · 书影`) })
</script>

<style scoped>
.reader-shell{--reader-bg:#fbfcff;--reader-ink:#253044;display:flex;width:100%;height:100dvh;flex-direction:column;background:var(--reader-bg);color:var(--reader-ink);transition:background .45s ease,color .45s ease}.reader-shell.dark{--reader-bg:#121a28;--reader-ink:#e8edf5}.reader-toolbar{display:flex;height:58px;flex:0 0 58px;align-items:center;justify-content:space-between;gap:18px;padding:0 clamp(16px,4vw,54px);border-bottom:1px solid color-mix(in srgb,var(--reader-ink) 12%,transparent);background:color-mix(in srgb,var(--reader-bg) 88%,transparent);backdrop-filter:blur(18px)}.reader-back,.reader-title{display:inline-flex;align-items:center;gap:8px;color:inherit;font-size:.7rem;text-decoration:none}.reader-back{color:color-mix(in srgb,var(--reader-ink) 62%,transparent)}.reader-title{min-width:0;font-weight:700}.reader-title span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reader-title small{color:color-mix(in srgb,var(--reader-ink) 48%,transparent);font-weight:400}.reader-actions{display:flex;gap:6px}.reader-actions button{display:grid;width:32px;height:32px;border:0;border-radius:9px;background:color-mix(in srgb,var(--reader-ink) 7%,transparent);color:inherit;cursor:pointer;place-items:center;transition:transform .25s ease,background .25s ease}.reader-actions button:hover{background:color-mix(in srgb,var(--reader-ink) 14%,transparent);transform:translateY(-1px)}.reader-stage{position:relative;display:flex;min-height:0;flex:1;justify-content:center;padding:clamp(18px,4vw,48px);transition:padding .45s cubic-bezier(.16,1,.3,1)}.reader-stage.focus{padding:0}.book-view{width:min(880px,100%);height:100%;overflow:hidden;border-radius:18px;background:var(--reader-bg);box-shadow:0 12px 50px rgb(20 35 60 / 10%);transition:border-radius .45s ease,box-shadow .45s ease}.focus .book-view{width:100%;border-radius:0;box-shadow:none}.reader-loading,.reader-empty{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:10px;color:color-mix(in srgb,var(--reader-ink) 60%,transparent)}.reader-loading :deep(svg){animation:spin 1s linear infinite;font-size:1.5rem}.reader-empty :deep(svg){color:var(--c-primary);font-size:2.4rem}.reader-empty h1{margin:0;font-size:1.1rem}.reader-empty a{color:var(--c-primary);font-size:.72rem}@keyframes spin{to{transform:rotate(360deg)}}
@media (max-width:640px){.reader-toolbar{gap:10px;padding:0 12px}.reader-back{font-size:0}.reader-back :deep(svg){font-size:1rem}.reader-title{flex:1;justify-content:center}.reader-title small{display:none}.reader-actions button{width:30px;height:30px}.reader-actions button:last-child{display:none}.reader-stage{padding:10px}.book-view{border-radius:12px}}
</style>
