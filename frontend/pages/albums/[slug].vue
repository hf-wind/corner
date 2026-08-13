<template>
  <main ref="pageEl" class="album-detail">
    <template v-if="album">
      <section class="story-head content-reveal">
        <div class="head-cover">
          <img
            v-if="album.cover?.path"
            :src="mediaUrl(album.cover.path)"
            :alt="album.title"
          />
          <span v-else><Icon name="ph:image-square" /></span>
          <i class="cover-noise" />
          <small
            >{{ String(album.items?.length || 0).padStart(2, "0") }} /
            PHOTOS</small
          >
        </div>
        <div class="head-copy">
          <AppLink to="/albums" class="back"
            ><Icon name="ph:arrow-left-bold" /><span>返回相册</span></AppLink
          >
          <p class="head-kicker">PHOTO STORY · {{ issueNumber }}</p>
          <h1>{{ album.title }}</h1>
          <p class="head-description">
            {{ album.description || "一组被风留住的照片。" }}
          </p>
          <dl class="head-meta">
            <div>
              <dt>时间</dt>
              <dd>
                <Icon name="ph:calendar-blank-bold" />{{
                  formatDate(album.happenedAt || album.publishedAt)
                }}
              </dd>
            </div>
            <div>
              <dt>地点</dt>
              <dd>
                <Icon name="ph:map-pin-fill" />{{
                  album.publicLocation?.name || "未公开"
                }}
              </dd>
            </div>
            <div>
              <dt>照片</dt>
              <dd>
                <Icon name="ph:images-square-bold" />{{
                  album.items?.length || 0
                }}
                张
              </dd>
            </div>
          </dl>
        </div>
        <span class="head-stamp">WIND<br />MEMORY</span>
      </section>

      <section class="photo-journal" aria-labelledby="photo-journal-title">
        <header class="journal-heading">
          <div>
            <span>VISUAL NOTES</span>
            <h2 id="photo-journal-title">这一册的光影</h2>
          </div>
          <p>点击照片，近一点看</p>
        </header>
        <div class="photo-wall">
          <button
            v-for="(item, index) in album.items"
            :key="item.id"
            type="button"
            class="wall-item"
            :class="wallClass(index)"
            @click="open(index)"
          >
            <img
              :src="mediaUrl(item.media.path)"
              :alt="item.caption || album.title"
              loading="lazy"
            />
            <span class="wall-index">{{
              String(index + 1).padStart(2, "0")
            }}</span>
            <div class="wall-overlay">
              <Icon name="ph:magnifying-glass-plus-bold" />
            </div>
            <div
              v-if="item.caption || item.happenedAt || item.publicLocation"
              class="wall-caption"
            >
              <p v-if="item.caption">{{ item.caption }}</p>
              <small
                ><time v-if="item.happenedAt">{{
                  formatDate(item.happenedAt)
                }}</time
                ><em v-if="item.publicLocation"
                  ><Icon name="ph:map-pin-fill" />{{
                    item.publicLocation.name
                  }}</em
                ></small
              >
            </div>
          </button>
        </div>
      </section>

      <footer class="detail-footer">
        <AppLink to="/albums"
          ><Icon name="ph:arrow-left-bold" />继续翻阅其他相册</AppLink
        ><span>风隅随笔 · PHOTO ARCHIVE</span>
      </footer>
      <ImageLightbox
        v-model="lightboxOpen"
        v-model:index="lightboxIndex"
        :images="lightboxImages"
        label="相册照片"
      >
        <template #toolbar="{ index }"
          ><AppLink
            v-if="album.items?.[index]?.publicLocation?.latitude != null"
            class="lightbox-map-link"
            :to="mapLink(album.items[index])"
            title="在地图查看"
            aria-label="在地图查看"
            ><Icon name="ph:map-trifold-bold" /></AppLink
        ></template>
        <template #caption="{ image, index }"
          ><div class="lightbox-rich-caption">
            <p>{{ image.caption }}</p>
            <div
              v-if="
                album.items?.[index]?.moment ||
                album.items?.[index]?.publicLocation
              "
            >
              <AppLink
                v-if="album.items[index].moment"
                :to="`/moments?focus=${album.items[index].moment.slug}`"
                ><Icon name="ph:sparkle-bold" />{{
                  album.items[index].moment.title
                }}</AppLink
              ><AppLink
                v-if="album.items[index].publicLocation?.latitude != null"
                :to="mapLink(album.items[index])"
                ><Icon name="ph:map-pin-fill" />{{
                  album.items[index].publicLocation.name
                }}
                · 在地图查看</AppLink
              >
            </div>
          </div></template
        >
      </ImageLightbox>
    </template>
    <div v-else-if="!loading" class="not-found content-reveal">
      <Icon name="ph:image-broken" />
      <h1>相册没有找到</h1>
      <p>也许它还在整理，或已被收回私藏。</p>
      <AppLink to="/albums"
        ><Icon name="ph:arrow-left-bold" />回到相册馆</AppLink
      >
    </div>
  </main>
</template>

<script setup lang="ts">
const api = useApi();
const route = useRoute();
const { mediaUrl } = useMediaUrl();
const pageEl = ref<HTMLElement | null>(null);
const loading = ref(true);
const album = ref<any>(null);
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);
const { selectMemory, clearMemory } = useMemorySelection();
const issueNumber = computed(() =>
  String(
    album.value?.publishedAt
      ? new Date(album.value.publishedAt).getFullYear()
      : new Date().getFullYear(),
  ),
);
const lightboxImages = computed(() =>
  (album.value?.items || []).map((item: any) => ({
    src: item.media.path,
    caption: item.caption || undefined,
  })),
);

function formatDate(value?: string | null) {
  if (!value) return "未标日期";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "未标日期"
    : new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
}
function wallClass(index: number) {
  return index % 8 === 0 ? "feature" : index % 5 === 0 ? "portrait" : "";
}
function open(index: number) {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
  const item = album.value?.items?.[index];
  if (item)
    selectMemory({
      id: `photo:${item.id}`,
      type: "photo",
      href: `/albums/${album.value.slug}?photo=${item.id}`,
    });
}
watch(lightboxIndex, (index) => {
  if (!lightboxOpen.value) return;
  const item = album.value?.items?.[index];
  if (item)
    selectMemory({
      id: `photo:${item.id}`,
      type: "photo",
      href: `/albums/${album.value.slug}?photo=${item.id}`,
    });
});
watch(lightboxOpen, (open) => {
  if (!open) clearMemory();
});
function mapLink(item: any) {
  const location = item.publicLocation;
  return {
    path: "/time/map",
    query: {
      lng: location.longitude,
      lat: location.latitude,
      cs: "wgs84",
      place: location.slug || undefined,
      memory: `photo:${item.id}`,
    },
  };
}
async function load() {
  loading.value = true;
  try {
    album.value = await api.get(`/albums/${route.params.slug}`);
    const photoId = String(route.query.photo || "");
    if (photoId) {
      const target =
        album.value?.items?.findIndex((item: any) => item.id === photoId) ?? -1;
      if (target >= 0) nextTick(() => open(target));
    }
  } catch {
    album.value = null;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
onUnmounted(clearMemory);
useHead({
  title: computed(() =>
    album.value ? `${album.value.title} · 风隅相册` : "相册",
  ),
});
</script>

<style scoped>
.album-detail {
  height: 100%;
  padding: 28px clamp(16px, 4vw, 58px) 42px;
  overflow-y: auto;
  background:
    radial-gradient(
      circle at 14% 4%,
      color-mix(in srgb, var(--c-primary) 6%, transparent),
      transparent 25%
    ),
    var(--c-bg);
  scrollbar-gutter: stable;
}
.story-head {
  position: relative;
  display: grid;
  max-width: 1180px;
  min-height: 390px;
  grid-template-columns: minmax(280px, 43%) minmax(0, 1fr);
  align-items: stretch;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 20px;
  background: var(--ld-bg-card);
  box-shadow: 0 18px 52px color-mix(in srgb, var(--ld-shadow) 34%, transparent);
}
.head-cover {
  position: relative;
  min-height: 390px;
  overflow: hidden;
  background: var(--c-bg-2);
}
.head-cover > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.head-cover > span {
  display: grid;
  width: 100%;
  height: 100%;
  color: var(--c-primary);
  font-size: 4rem;
  place-items: center;
}
.cover-noise {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 57%, rgb(3 6 10/55%));
  pointer-events: none;
}
.head-cover > small {
  position: absolute;
  right: 15px;
  bottom: 13px;
  color: #fff;
  font-size: 0.5rem;
  letter-spacing: 0.18em;
}
.head-copy {
  display: flex;
  min-width: 0;
  justify-content: center;
  flex-direction: column;
  padding: 52px clamp(32px, 5vw, 68px);
}
.back {
  position: absolute;
  top: 22px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: max-content;
  padding: 7px 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
  color: var(--c-text-2);
  font-size: 0.59rem;
  transition: 0.2s;
}
.back:hover {
  border-color: color-mix(in srgb, var(--c-primary) 42%, var(--border));
  color: var(--c-primary);
  transform: translateX(-2px);
}
.head-kicker,
.journal-heading span {
  color: var(--c-primary);
  font-size: 0.52rem;
  font-weight: 750;
  letter-spacing: 0.2em;
}
.head-copy h1 {
  max-width: 620px;
  margin: 13px 0 0;
  color: var(--c-text);
  font-family: var(--font-serif);
  font-size: clamp(2.2rem, 5vw, 4.3rem);
  font-weight: 520;
  letter-spacing: 0.04em;
  line-height: 1.16;
}
.head-description {
  max-width: 610px;
  margin: 18px 0 0;
  color: var(--c-text-2);
  font-size: 0.73rem;
  line-height: 1.95;
}
.head-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin: 32px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.head-meta dt {
  color: var(--c-text-3);
  font-size: 0.5rem;
}
.head-meta dd {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 6px 0 0;
  color: var(--c-text-2);
  font-size: 0.62rem;
}
.head-meta dd :deep(svg) {
  color: var(--c-primary);
}
.head-stamp {
  position: absolute;
  right: 10px;
  bottom: 8px;
  color: var(--c-text-3);
  font-size: 0.42rem;
  letter-spacing: 0.17em;
  line-height: 1.5;
  text-align: right;
  opacity: 0.55;
}
.photo-journal {
  max-width: 1180px;
  margin: 34px auto 0;
}
.journal-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 0 2px 14px;
}
.journal-heading h2 {
  margin: 4px 0 0;
  color: var(--c-text);
  font-size: 1.12rem;
}
.journal-heading > p {
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.photo-wall {
  display: grid;
  grid-auto-flow: dense;
  grid-auto-rows: 230px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.wall-item {
  position: relative;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 10px;
  background: var(--c-bg-2);
  cursor: zoom-in;
}
.wall-item.feature {
  grid-column: span 2;
}
.wall-item.portrait {
  grid-row: span 2;
}
.wall-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.3s;
}
.wall-item:hover img {
  filter: saturate(1.05);
  transform: scale(1.04);
}
.wall-index {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 6px;
  border: 1px solid rgb(255 255 255/24%);
  border-radius: 5px;
  background: rgb(0 0 0/32%);
  color: #fff;
  font-size: 0.46rem;
  letter-spacing: 0.12em;
  backdrop-filter: blur(5px);
}
.wall-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  background: rgb(4 8 12/15%);
  color: #fff;
  font-size: 1.25rem;
  opacity: 0;
  transition: opacity 0.25s;
  place-items: center;
}
.wall-item:hover .wall-overlay {
  opacity: 1;
}
.wall-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 38px 14px 12px;
  background: linear-gradient(transparent, rgb(4 6 9/72%));
  color: #fff;
  text-align: left;
  transform: translateY(3px);
  transition: transform 0.25s;
}
.wall-caption p {
  margin: 0;
  font-size: 0.66rem;
  line-height: 1.55;
}
.wall-caption small {
  display: flex;
  gap: 10px;
  margin-top: 5px;
  color: rgb(255 255 255/70%);
  font-size: 0.5rem;
}
.wall-caption em {
  display: flex;
  align-items: center;
  gap: 3px;
  font-style: normal;
}
.detail-footer {
  display: flex;
  max-width: 1180px;
  align-items: center;
  justify-content: space-between;
  margin: 32px auto 0;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  color: var(--c-text-3);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
}
.detail-footer a {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-2);
  transition: color 0.18s;
}
.detail-footer a:hover {
  color: var(--c-primary);
}
.lightbox-map-link {
  display: grid;
  width: 31px;
  height: 31px;
  border-radius: 7px;
  color: #fff;
  place-items: center;
}
.lightbox-map-link:hover {
  background: rgb(255 255 255/13%);
}
.lightbox-rich-caption p {
  margin: 0;
}
.lightbox-rich-caption > div {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 5px;
}
.lightbox-rich-caption a {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgb(255 255 255/76%);
}
.not-found {
  display: grid;
  min-height: 72vh;
  place-items: center;
  align-content: center;
  color: var(--c-text-3);
  text-align: center;
}
.not-found > svg {
  color: var(--c-primary);
  font-size: 3rem;
}
.not-found h1 {
  margin-top: 12px;
  color: var(--c-text);
}
.not-found p {
  margin-top: 6px;
  font-size: 0.66rem;
}
.not-found a {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--c-primary);
  font-size: 0.62rem;
}
@media (max-width: 900px) {
  .album-detail {
    padding-top: max(70px, calc(env(safe-area-inset-top) + 64px));
  }
  .story-head {
    grid-template-columns: 38% 1fr;
  }
  .head-copy {
    padding: 58px 30px 40px;
  }
  .photo-wall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 220px;
  }
}
@media (max-width: 650px) {
  .album-detail {
    padding-right: 10px;
    padding-left: 10px;
  }
  .story-head {
    grid-template-columns: 1fr;
  }
  .head-cover {
    min-height: 280px;
  }
  .head-copy {
    padding: 58px 22px 34px;
  }
  .back {
    top: 300px;
  }
  .head-copy h1 {
    font-size: 2.35rem;
  }
  .photo-wall {
    grid-auto-rows: 190px;
    grid-template-columns: 1fr;
  }
  .wall-item.feature {
    grid-column: span 1;
  }
  .wall-item.portrait {
    grid-row: span 2;
  }
  .detail-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding-inline: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .wall-item img,
  .wall-overlay,
  .back {
    animation: none;
    transition: none;
  }
}
</style>
