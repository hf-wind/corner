<template>
  <div class="place-page" :aria-busy="loading">
    <main>
      <header class="place-hero">
        <AppLink to="/time/map"><Icon name="ph:arrow-left-bold" />返回地图</AppLink>
        <span class="place-mark"><Icon name="ph:map-pin-fill" /></span>
        <p>PLACE · 时光地点</p>
        <h1>{{ loading ? "正在抵达…" : place.name || "地点" }}</h1>
        <template v-if="!loading">
          <small>{{ regionText }}</small>
          <strong>{{ totalMemories }} 条公开记忆</strong>
          <AppLink v-if="place.latitude != null" class="map-link" :to="mapLink"><Icon name="ph:map-trifold-bold" />在地图查看</AppLink>
        </template>
        <div v-else class="hero-skeleton" aria-hidden="true"><i /><i /></div>
      </header>

      <section class="place-content">
        <header><span>MEMORIES HERE</span><h2>发生在这里</h2></header>
        <div v-if="loading" class="memory-skeleton" aria-label="正在整理这里的记忆">
          <div v-for="index in 3" :key="index"><i /><span><b /><b /></span></div>
        </div>
        <div v-else-if="error" class="place-state"><Icon name="ph:map-pin-slash-bold" />{{ error }}</div>
        <div v-else-if="moments.length" class="moment-list">
          <AppLink v-for="moment in moments" :key="moment.id" :to="moment.href" class="moment-link">
            <span><Icon name="ph:sparkle-bold" /></span>
            <div><small>{{ formatDate(moment.occurredAt) }}</small><h3>{{ moment.title }}</h3><p>{{ moment.excerpt || "一段发生在这里的瞬间。" }}</p></div>
            <Icon name="ph:arrow-up-right-bold" />
          </AppLink>
        </div>
        <div v-else class="place-state"><Icon name="ph:map-pin-line" />这里暂时没有公开瞬间</div>
      </section>

      <section v-if="albums.length || photos.length" class="other-memories">
        <header><span>ALBUM & PHOTO</span><h2>相册与照片</h2></header>
        <div class="album-grid">
          <AppLink v-for="album in albums" :key="album.id" :to="album.href">
            <img v-if="album.thumbnail" :src="mediaUrl(album.thumbnail)" :alt="album.title" loading="lazy" decoding="async" />
            <span>{{ album.title }}</span>
          </AppLink>
        </div>
        <div class="photo-grid">
          <AppLink v-for="photo in photos" :key="photo.id" :to="photo.href"><img :src="mediaUrl(photo.thumbnail)" :alt="photo.title" loading="lazy" decoding="async" /></AppLink>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const route = useRoute();
const { mediaUrl } = useMediaUrl();
const loading = ref(true);
const error = ref("");
const place = ref<any>({});
const moments = ref<any[]>([]);
const albums = ref<any[]>([]);
const photos = ref<any[]>([]);
const slug = computed(() => String(route.params.slug || ""));
const regionText = computed(() => [place.value.province, place.value.city, place.value.country].filter((value, index, values) => value && values.indexOf(value) === index).join(" · "));
const totalMemories = computed(() => moments.value.length + albums.value.length + photos.value.length);
const mapLink = computed(() => ({ path: "/time/map", query: { lng: place.value.longitude, lat: place.value.latitude, place: place.value.slug } }));
let requestSequence = 0;

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

async function load() {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = "";
  place.value = {};
  moments.value = [];
  albums.value = [];
  photos.value = [];
  try {
    const detail = await api.get<any>(`/memories/places/${slug.value}`);
    if (sequence !== requestSequence) return;
    place.value = detail.place || {};
    moments.value = detail.moments || [];
    albums.value = detail.albums || [];
    photos.value = detail.photos || [];
  } catch (exception: any) {
    if (sequence !== requestSequence) return;
    place.value = { name: "地点不存在" };
    error.value = exception?.message || "暂时无法读取这里的记忆";
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

watch(slug, () => void load(), { immediate: true });
useHead({ title: computed(() => `${place.value.name || "地点"} · 时光地点`) });
</script>

<style scoped>
.place-page { flex: 1; min-height: 0; overflow-y: auto; background: var(--c-bg); }
.place-page main { width: min(920px, 100%); margin: 0 auto; padding: 28px 28px 60px; }
.place-hero { position: relative; min-height: 250px; padding: 48px 28px 34px 86px; border-bottom: 1px solid var(--border); }
.place-hero > a:first-child { position: absolute; top: 0; left: 0; display: flex; align-items: center; gap: 5px; color: var(--c-text-3); font-size: .66rem; text-decoration: none; }
.place-mark { position: absolute; top: 52px; left: 18px; display: grid; width: 50px; height: 50px; border: 1px solid color-mix(in srgb, var(--c-primary) 32%, var(--border)); border-radius: 8px; background: var(--c-primary-soft); color: var(--c-primary); font-size: 1.45rem; place-items: center; }
.place-hero p, .place-content > header span, .other-memories > header span { color: var(--c-primary); font-size: .56rem; font-weight: 700; }
.place-hero h1 { margin: 12px 0 7px; color: var(--c-text); font-size: 2.2rem; }
.place-hero small { color: var(--c-text-3); font-size: .7rem; }
.place-hero strong { display: block; margin-top: 22px; color: var(--c-text-2); font-size: .72rem; }
.map-link { display: inline-flex; align-items: center; gap: 5px; margin-top: 11px; padding: 7px 10px; border: 1px solid color-mix(in srgb, var(--c-primary) 35%, var(--border)); border-radius: 7px; background: var(--c-primary-soft); color: var(--c-primary); font-size: .62rem; text-decoration: none; }
.place-content, .other-memories { padding-top: 28px; }
.place-content h2, .other-memories h2 { margin: 5px 0 18px; color: var(--c-text); font-size: 1.1rem; }
.moment-list { display: grid; gap: 12px; }
.moment-link { display: grid; grid-template-columns: 42px minmax(0, 1fr) 20px; gap: 11px; align-items: center; padding: 13px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--ld-bg-card); text-decoration: none; transition: border-color .18s, transform .18s; }
.moment-link:hover { border-color: color-mix(in srgb, var(--c-primary) 45%, var(--border)); transform: translateY(-1px); }
.moment-link > span { display: grid; width: 42px; height: 42px; border-radius: 7px; background: var(--c-primary-soft); color: var(--c-primary); place-items: center; }
.moment-link small { color: var(--c-primary); font-size: .54rem; }
.moment-link h3 { margin: 3px 0 0; color: var(--c-text); font-size: .82rem; }
.moment-link p { margin: 4px 0 0; overflow: hidden; color: var(--c-text-3); font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }
.moment-link > svg { color: var(--c-text-3); }
.place-state { display: flex; min-height: 220px; align-items: center; justify-content: center; gap: 7px; border: 1px dashed var(--border); border-radius: 8px; color: var(--c-text-3); font-size: .72rem; }
.hero-skeleton { display: grid; gap: 9px; margin-top: 18px; }
.hero-skeleton i, .memory-skeleton i, .memory-skeleton b { display: block; border-radius: 4px; background: var(--c-bg-2); animation: skeleton-pulse 1.2s ease-in-out infinite alternate; }
.hero-skeleton i:first-child { width: 140px; height: 10px; }
.hero-skeleton i:last-child { width: 90px; height: 10px; }
.memory-skeleton { display: grid; gap: 12px; }
.memory-skeleton > div { display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: center; height: 72px; padding: 13px; border: 1px solid var(--border); border-radius: 8px; }
.memory-skeleton > div > i { width: 42px; height: 42px; }
.memory-skeleton span { display: grid; gap: 9px; }
.memory-skeleton b { width: 62%; height: 9px; }
.memory-skeleton b:last-child { width: 86%; height: 7px; }
.album-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.album-grid a { position: relative; display: block; aspect-ratio: 4/3; overflow: hidden; border-radius: 8px; background: var(--c-bg-2); }
.album-grid img, .photo-grid img { width: 100%; height: 100%; object-fit: cover; }
.album-grid span { position: absolute; right: 0; bottom: 0; left: 0; padding: 24px 9px 8px; background: linear-gradient(transparent, rgb(0 0 0 / 65%)); color: #fff; font-size: .64rem; }
.photo-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
.photo-grid a { aspect-ratio: 1; overflow: hidden; border-radius: 6px; }
@keyframes skeleton-pulse { to { opacity: .48; } }
@media (max-width: 640px) {
  .place-page main { padding: max(72px, calc(env(safe-area-inset-top) + 64px)) 16px 36px; }
  .place-hero { min-height: 220px; padding: 44px 4px 26px 60px; }
  .place-mark { left: 0; width: 45px; height: 45px; }
  .place-hero h1 { font-size: 1.7rem; }
  .album-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .photo-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) { .hero-skeleton i, .memory-skeleton i, .memory-skeleton b { animation: none; } }
</style>
