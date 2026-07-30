<template>
  <main class="album-detail">
    <template v-if="album">
      <header class="detail-hero">
        <NuxtLink to="/albums" class="back"><Icon name="ph:arrow-left" /> 返回相册</NuxtLink>
        <span>PHOTO STORY · {{ String(album.items?.length || 0).padStart(2, '0') }}</span><h1>{{ album.title }}</h1>
        <p>{{ album.description || '一组被风留住的照片。' }}</p>
        <div class="detail-meta"><time v-if="album.happenedAt"><Icon name="ph:calendar-blank" />{{ formatDate(album.happenedAt) }}</time><span v-if="album.publicLocation"><Icon name="ph:map-pin-fill" />{{ album.publicLocation.name }}</span></div>
      </header>
      <section class="photo-wall">
        <button v-for="(item, index) in album.items" :key="item.id" type="button" class="wall-item" :class="wallClass(index)" @click="open(index)"><img :src="mediaUrl(item.media.path)" :alt="item.caption || album.title" loading="lazy"><span class="wall-index">{{ String(index + 1).padStart(2, '0') }}</span><div v-if="item.caption || item.happenedAt || item.publicLocation" class="wall-caption"><p v-if="item.caption">{{ item.caption }}</p><small><time v-if="item.happenedAt">{{ formatDate(item.happenedAt) }}</time><em v-if="item.publicLocation"><Icon name="ph:map-pin-fill" />{{ item.publicLocation.name }}</em></small></div></button>
      </section>
      <footer class="detail-footer"><NuxtLink to="/albums"><Icon name="ph:arrow-left" /> 继续翻阅其他相册</NuxtLink><span>风隅随笔 · PHOTO ARCHIVE</span></footer>
      <ImageLightbox v-model="lightboxOpen" v-model:index="lightboxIndex" :images="lightboxImages" label="相册照片">
        <template #toolbar="{ index }"><NuxtLink v-if="album.items?.[index]?.publicLocation?.latitude != null" class="lightbox-map-link" :to="mapLink(album.items[index])" title="在地图查看" aria-label="在地图查看"><Icon name="ph:map-trifold-bold" /></NuxtLink></template>
        <template #caption="{ image, index }"><div class="lightbox-rich-caption"><p>{{ image.caption }}</p><div v-if="album.items?.[index]?.moment || album.items?.[index]?.publicLocation"><NuxtLink v-if="album.items[index].moment" :to="`/moments?focus=${album.items[index].moment.slug}`"><Icon name="ph:sparkle-bold" />{{ album.items[index].moment.title }}</NuxtLink><NuxtLink v-if="album.items[index].publicLocation?.latitude != null" :to="mapLink(album.items[index])"><Icon name="ph:map-pin-fill" />{{ album.items[index].publicLocation.name }} · 在地图查看</NuxtLink></div></div></template>
      </ImageLightbox>
    </template>
    <div v-else-if="!loading" class="not-found"><Icon name="ph:image-broken" /><h1>相册没有找到</h1><NuxtLink to="/albums">回到相册馆</NuxtLink></div>
  </main>
</template>

<script setup lang="ts">
const api = useApi(); const route = useRoute(); const { mediaUrl } = useMediaUrl(); const loading = ref(true); const album = ref<any>(null); const lightboxOpen = ref(false); const lightboxIndex = ref(0)
const lightboxImages = computed(() => (album.value?.items || []).map((item: any) => ({ src: item.media.path, caption: item.caption || undefined })))
function formatDate(value: string) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value)) }
function wallClass(index: number) { return index % 7 === 0 ? 'landscape' : index % 5 === 0 ? 'portrait' : '' }
function open(index: number) { lightboxIndex.value = index; lightboxOpen.value = true }
function mapLink(item: any) { const location = item.publicLocation; return { path: '/time/map', query: { lng: location.longitude, lat: location.latitude, cs: 'wgs84', place: location.slug || undefined, memory: `photo:${item.id}` } } }
async function load() { loading.value = true; try { album.value = await api.get(`/albums/${route.params.slug}`) } catch { album.value = null } finally { loading.value = false } }
onMounted(load)
useHead({ title: computed(() => album.value ? `${album.value.title} · 风隅相册` : '相册') })
</script>

<style scoped>
.lightbox-map-link{display:grid;width:31px;height:31px;border-radius:6px;color:#fff;place-items:center}.lightbox-map-link:hover{background:rgb(255 255 255 / 13%)}
.album-detail{min-height:100%;padding:52px clamp(16px,5vw,72px) 45px}.detail-hero{max-width:840px;margin:0 auto 42px;text-align:center}.back{display:inline-flex;align-items:center;gap:6px;margin-bottom:28px;color:var(--c-text-3);font-size:.65rem;text-decoration:none}.detail-hero>span{display:block;color:var(--c-primary);font-size:.58rem;font-weight:700;letter-spacing:.2em}.detail-hero h1{margin:13px 0 0;color:var(--c-text);font-family:var(--font-serif);font-size:clamp(2.2rem,6vw,4.7rem);font-weight:500;letter-spacing:.05em}.detail-hero>p{max-width:660px;margin:16px auto 0;color:var(--c-text-2);font-size:.8rem;line-height:1.95}.detail-meta{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:18px;color:var(--c-text-3);font-size:.62rem}.detail-meta>*{display:flex;align-items:center;gap:5px}.photo-wall{display:grid;max-width:1300px;margin:0 auto;grid-auto-flow:dense;grid-auto-rows:240px;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.wall-item{position:relative;padding:0;overflow:hidden;border:0;border-radius:3px;background:var(--c-bg-2);cursor:zoom-in}.wall-item.landscape{grid-column:span 2}.wall-item.portrait{grid-row:span 2}.wall-item img{width:100%;height:100%;object-fit:cover;transition:transform .65s cubic-bezier(.2,.7,.2,1),filter .3s}.wall-item:hover img{filter:saturate(1.04);transform:scale(1.035)}.wall-index{position:absolute;top:10px;left:10px;padding:3px 5px;border-radius:4px;background:rgb(0 0 0 / 38%);color:#fff;font-size:.48rem;letter-spacing:.12em;backdrop-filter:blur(6px)}.wall-caption{position:absolute;right:0;bottom:0;left:0;padding:32px 14px 12px;background:linear-gradient(transparent,rgb(4 6 9 / 68%));color:#fff;text-align:left;opacity:0;transform:translateY(7px);transition:opacity .25s,transform .25s}.wall-item:hover .wall-caption{opacity:1;transform:none}.wall-caption p{margin:0;font-size:.7rem;line-height:1.55}.wall-caption small{display:flex;gap:10px;margin-top:5px;color:rgb(255 255 255 / 68%);font-size:.54rem}.wall-caption em{display:flex;align-items:center;gap:3px;font-style:normal}.detail-footer{display:flex;max-width:1300px;align-items:center;justify-content:space-between;margin:35px auto 0;padding-top:20px;border-top:1px solid var(--border);color:var(--c-text-3);font-size:.58rem;letter-spacing:.08em}.detail-footer a{display:flex;align-items:center;gap:6px;color:var(--c-text-2);text-decoration:none}.lightbox-rich-caption p{margin:0}.lightbox-rich-caption>div{display:flex;justify-content:center;gap:14px;margin-top:5px}.lightbox-rich-caption a,.lightbox-rich-caption span{display:flex;align-items:center;gap:4px;color:rgb(255 255 255 / 76%);text-decoration:none}.not-found{display:grid;min-height:70vh;place-items:center;align-content:center;color:var(--c-text-3);text-align:center}.not-found>svg{color:var(--c-primary);font-size:3rem}.not-found h1{color:var(--c-text)}.not-found a{color:var(--c-primary)}@media(max-width:900px){.photo-wall{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:220px}}@media(max-width:580px){.album-detail{padding:42px 10px 30px}.photo-wall{grid-auto-rows:190px;grid-template-columns:1fr}.wall-item.landscape{grid-column:span 1}.wall-item.portrait{grid-row:span 2}.wall-caption{opacity:1;transform:none}.detail-footer{align-items:flex-start;flex-direction:column;gap:10px;padding-inline:6px}}
</style>
