<template>
  <main class="albums-page">
    <div class="ambient ambient-one" /><div class="ambient ambient-two" />
    <header class="albums-hero"><span>WIND & MEMORY · PHOTO ARCHIVE</span><h1>风隅相册</h1><p>照片是光停下来的地方。这里收着走过的城、遇见的人，以及一些不愿被时间吹散的瞬间。</p><div class="hero-line"><i /><em>{{ total }} 册记忆</em><i /></div></header>
    <section class="album-gallery">
      <article v-for="(album, index) in albums" :key="album.id" class="public-album" :class="{ wide: index % 5 === 0 }">
        <NuxtLink :to="`/albums/${album.slug}`" class="public-cover"><img v-if="album.cover?.path" :src="mediaUrl(album.cover.path)" :alt="album.title" loading="lazy"><span v-else><Icon name="ph:images-square" /></span><div class="cover-wash" /><small>{{ String(album.itemCount || 0).padStart(2, '0') }} PHOTOS</small></NuxtLink>
        <div class="public-copy"><div><time>{{ formatDate(album.happenedAt || album.publishedAt) }}</time><span v-if="album.publicLocation"><Icon name="ph:map-pin-fill" />{{ album.publicLocation.name }}</span></div><h2><NuxtLink :to="`/albums/${album.slug}`">{{ album.title }}</NuxtLink></h2><p>{{ album.description || '一组被风留住的照片。' }}</p></div>
      </article>
      <div v-if="!loading && !albums.length" class="public-empty"><Icon name="ph:wind" /><h2>风还没有带来照片</h2><p>下一册记忆，正在路上。</p></div>
    </section>
    <div v-if="totalPages > 1" class="public-pagination"><button :disabled="page <= 1" @click="go(page - 1)"><Icon name="ph:arrow-left" /></button><span>{{ page }} / {{ totalPages }}</span><button :disabled="page >= totalPages" @click="go(page + 1)"><Icon name="ph:arrow-right" /></button></div>
  </main>
</template>

<script setup lang="ts">
const api = useApi()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const albums = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
function formatDate(value?: string) { if (!value) return '未标日期'; const date = new Date(value); return `${date.getFullYear()} · ${String(date.getMonth() + 1).padStart(2, '0')}` }
async function load() { loading.value = true; try { const result = await api.get<any>('/albums', { page: page.value, limit: 12 }); albums.value = result.items || []; total.value = result.total || 0; totalPages.value = result.totalPages || 1 } catch { albums.value = [] } finally { loading.value = false } }
function go(next: number) { page.value = next; void load(); window.scrollTo({ top: 0, behavior: 'smooth' }) }
onMounted(load)
useHead({ title: '风隅相册', meta: [{ name: 'description', content: '风隅随笔的个人照片与时光相册。' }] })
</script>

<style scoped>
.albums-page{position:relative;min-height:100%;padding:68px clamp(20px,6vw,86px) 54px;overflow:hidden}.ambient{position:fixed;z-index:-1;border-radius:50%;filter:blur(90px);opacity:.14}.ambient-one{top:8%;left:14%;width:300px;height:300px;background:var(--c-primary)}.ambient-two{right:8%;bottom:4%;width:250px;height:250px;background:#d4a06c}.albums-hero{max-width:760px;margin:0 auto 48px;text-align:center}.albums-hero>span{color:var(--c-primary);font-size:.62rem;font-weight:700;letter-spacing:.24em}.albums-hero h1{margin:14px 0 0;color:var(--c-text);font-family:var(--font-serif);font-size:clamp(2.3rem,6vw,4.5rem);font-weight:500;letter-spacing:.08em}.albums-hero p{max-width:620px;margin:17px auto 0;color:var(--c-text-2);font-size:.82rem;line-height:2}.hero-line{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:22px}.hero-line i{width:54px;height:1px;background:var(--border)}.hero-line em{color:var(--c-text-3);font-size:.58rem;font-style:normal;letter-spacing:.13em}.album-gallery{display:grid;max-width:1240px;margin:0 auto;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px 22px}.public-album.wide{grid-column:span 2}.public-cover{position:relative;display:block;aspect-ratio:4/3;overflow:hidden;border-radius:4px;background:var(--c-bg-2);box-shadow:0 15px 45px color-mix(in srgb,var(--ld-shadow) 42%,transparent)}.wide .public-cover{aspect-ratio:16/9}.public-cover img{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.7,.2,1)}.public-cover>span{display:grid;width:100%;height:100%;color:var(--c-primary);font-size:3rem;place-items:center}.cover-wash{position:absolute;inset:0;background:linear-gradient(180deg,transparent 58%,rgb(5 8 11 / 52%))}.public-cover small{position:absolute;right:12px;bottom:10px;color:#fff;font-size:.52rem;letter-spacing:.15em}.public-album:hover img{transform:scale(1.045)}.public-copy{padding:14px 4px 0}.public-copy>div{display:flex;align-items:center;gap:13px;color:var(--c-text-3);font-size:.58rem;letter-spacing:.06em}.public-copy>div span{display:flex;align-items:center;gap:4px}.public-copy h2{margin:8px 0 0;font-size:1.22rem;font-weight:600}.public-copy h2 a{color:var(--c-text);text-decoration:none}.public-copy h2 a:hover{color:var(--c-primary)}.public-copy p{display:-webkit-box;margin:7px 0 0;overflow:hidden;color:var(--c-text-3);font-size:.68rem;line-height:1.75;-webkit-box-orient:vertical;-webkit-line-clamp:2}.public-empty{grid-column:1/-1;display:grid;min-height:360px;place-items:center;align-content:center;color:var(--c-text-3);text-align:center}.public-empty>svg{color:var(--c-primary);font-size:2.8rem}.public-empty h2{margin:12px 0 0;color:var(--c-text)}.public-empty p{font-size:.7rem}.public-pagination{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:45px}.public-pagination button{display:grid;width:36px;height:36px;border:1px solid var(--border);border-radius:50%;background:var(--ld-bg-card);color:var(--c-text-2);cursor:pointer;place-items:center}.public-pagination button:disabled{opacity:.35}.public-pagination span{color:var(--c-text-3);font-size:.62rem}@media(max-width:900px){.album-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.public-album.wide{grid-column:span 1}.wide .public-cover{aspect-ratio:4/3}}@media(max-width:580px){.albums-page{padding:56px 16px 40px}.albums-hero{margin-bottom:32px}.album-gallery{grid-template-columns:1fr;gap:28px}.public-cover,.wide .public-cover{aspect-ratio:4/3}}
</style>
