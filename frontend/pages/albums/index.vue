<template>
  <main ref="pageEl" class="albums-page">
    <section class="archive-intro">
      <div class="intro-mark" aria-hidden="true">
        <span class="intro-orbit orbit-primary"><i /><i /></span>
        <span class="intro-orbit orbit-secondary"><i /></span>
        <span class="intro-lens"><Icon name="ph:aperture-bold" /></span>
      </div>
      <div class="intro-copy">
        <span>PHOTO ARCHIVE · 风隅相册</span>
        <h1>把路过的光，<em>慢慢装订成册</em></h1>
        <p>
          不追求宏大的叙事，只留下走过的城、吹过的风，以及当时恰好按下快门的普通一天。
        </p>
      </div>
      <dl class="intro-stats">
        <div>
          <dt>{{ total }}</dt>
          <dd>册公开记忆</dd>
        </div>
        <i />
        <div>
          <dt>{{ photoTotal }}</dt>
          <dd>张照片</dd>
        </div>
      </dl>
      <span class="intro-serial"
        >ARCHIVE / {{ String(page).padStart(2, "0") }}</span
      >
    </section>

    <section class="archive-section" aria-labelledby="album-list-title">
      <header class="section-heading">
        <div>
          <span>CONTACT SHEETS</span>
          <h2 id="album-list-title">相册目录</h2>
        </div>
        <p><Icon name="ph:wind-bold" /> 按时间翻阅，新的在前</p>
      </header>

      <Transition name="content-switch" mode="out-in">
        <div
          v-if="albums.length"
          key="albums"
          class="album-grid content-reveal"
        >
          <article
            v-for="(album, index) in albums"
            :key="album.id"
            class="album-card"
          >
            <AppLink :to="`/albums/${album.slug}`" class="album-frame">
              <div class="film-edge" aria-hidden="true">
                <i v-for="dot in 8" :key="dot" />
              </div>
              <img
                v-if="album.cover?.path"
                :src="mediaUrl(album.cover.path)"
                :alt="album.title"
                loading="lazy"
              />
              <span v-else class="cover-empty"
                ><Icon name="ph:image-square"
              /></span>
              <div class="cover-shade" />
              <span class="card-number">{{
                String((page - 1) * 12 + index + 1).padStart(2, "0")
              }}</span>
              <span class="photo-count"
                ><Icon name="ph:images-square-bold" />
                {{ album.itemCount || 0 }}</span
              >
              <div class="open-hint">
                <span>打开相册</span><Icon name="ph:arrow-up-right-bold" />
              </div>
            </AppLink>
            <div class="album-copy">
              <div class="album-meta">
                <time>{{
                  formatDate(album.happenedAt || album.publishedAt)
                }}</time>
                <span v-if="album.publicLocation"
                  ><Icon name="ph:map-pin-fill" />{{
                    album.publicLocation.name
                  }}</span
                >
              </div>
              <h2>
                <AppLink :to="`/albums/${album.slug}`">{{
                  album.title
                }}</AppLink>
              </h2>
              <p>{{ album.description || "一组被风留住的照片。" }}</p>
            </div>
          </article>
        </div>
        <div
          v-else-if="!loading"
          key="empty"
          class="public-empty content-reveal"
        >
          <Icon name="ph:wind" />
          <h2>风还没有带来照片</h2>
          <p>下一册记忆，正在路上。</p>
        </div>
      </Transition>
    </section>

    <nav v-if="totalPages > 1" class="public-pagination" aria-label="相册分页">
      <button
        type="button"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="go(page - 1)"
      >
        <Icon name="ph:arrow-left" />
      </button>
      <span
        ><b>{{ String(page).padStart(2, "0") }}</b
        ><i />{{ String(totalPages).padStart(2, "0") }}</span
      >
      <button
        type="button"
        :disabled="page >= totalPages"
        aria-label="下一页"
        @click="go(page + 1)"
      >
        <Icon name="ph:arrow-right" />
      </button>
    </nav>
  </main>
</template>

<script setup lang="ts">
import type { Album } from "~/types/album";

const api = useApi();
const { mediaUrl } = useMediaUrl();
const pageEl = ref<HTMLElement | null>(null);
const loading = ref(true);
const albums = ref<Album[]>([]);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const photoTotal = computed(() =>
  albums.value.reduce((sum, album) => sum + Number(album.itemCount || 0), 0),
);

function formatDate(value?: string | null) {
  if (!value) return "未标日期";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "未标日期"
    : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function load() {
  loading.value = true;
  try {
    const result = await api.get<any>("/albums", {
      page: page.value,
      limit: 12,
    });
    albums.value = result.items || [];
    total.value = result.total || 0;
    totalPages.value = result.totalPages || 1;
  } catch {
    albums.value = [];
  } finally {
    loading.value = false;
  }
}

function go(next: number) {
  page.value = next;
  void load();
  pageEl.value?.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(load);
useHead({
  title: "风隅相册",
  meta: [{ name: "description", content: "风隅随笔的个人照片与时光相册。" }],
});
</script>

<style scoped>
.albums-page {
  height: 100%;
  padding: 28px clamp(18px, 4vw, 58px) 48px;
  overflow-y: auto;
  background:
    radial-gradient(
      circle at 82% 0,
      color-mix(in srgb, var(--c-primary) 7%, transparent),
      transparent 28%
    ),
    var(--c-bg);
  scrollbar-gutter: stable;
}
.archive-intro {
  position: relative;
  display: grid;
  min-height: 176px;
  grid-template-columns: 112px minmax(0, 1fr) auto;
  align-items: center;
  gap: 26px;
  padding: 28px 32px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c-primary-soft) 44%, var(--ld-bg-card)),
    var(--ld-bg-card) 70%
  );
  box-shadow: 0 10px 34px color-mix(in srgb, var(--ld-shadow) 28%, transparent);
}
.archive-intro::before {
  position: absolute;
  top: 26px;
  bottom: 26px;
  left: 0;
  width: 3px;
  background: linear-gradient(var(--c-primary), transparent);
  content: "";
}
.intro-mark {
  position: relative;
  display: grid;
  width: 88px;
  height: 88px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, var(--border));
  border-radius: 50%;
  color: var(--c-primary);
  font-size: 2.1rem;
  place-items: center;
}
.intro-mark::before {
  position: absolute;
  inset: 12px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 32%, transparent);
  border-radius: 50%;
  content: "";
  animation: album-orbit 18s linear infinite;
}
.intro-mark i {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 2px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-primary);
}
.intro-mark i:first-of-type {
  top: 5px;
  right: 15px;
}
.intro-mark i:last-of-type {
  bottom: 10px;
  left: 5px;
  background: #d79558;
}
.intro-copy > span,
.section-heading span {
  color: var(--c-primary);
  font-size: 0.52rem;
  font-weight: 750;
  letter-spacing: 0.19em;
}
.intro-copy h1 {
  max-width: 650px;
  margin: 8px 0 0;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: clamp(1.55rem, 3vw, 2.35rem);
  line-height: 1.28;
}
.intro-copy h1 em {
  color: var(--c-primary);
  font-style: normal;
}
.intro-copy p {
  max-width: 610px;
  margin: 9px 0 0;
  color: var(--c-text-2);
  font-size: 0.7rem;
  line-height: 1.8;
}
.intro-stats {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 0;
}
.intro-stats div {
  text-align: right;
}
.intro-stats dt {
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}
.intro-stats dd {
  margin-top: 6px;
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.intro-stats > i {
  width: 1px;
  height: 38px;
  background: var(--border);
}
.intro-serial {
  position: absolute;
  right: 10px;
  bottom: 8px;
  color: var(--c-text-3);
  font-size: 0.42rem;
  letter-spacing: 0.16em;
  opacity: 0.6;
}
.archive-section {
  margin-top: 30px;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 0 2px 14px;
}
.section-heading h2 {
  margin: 4px 0 0;
  color: var(--c-text);
  font-size: 1.15rem;
}
.section-heading > p {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.album-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px 16px;
}
.album-card {
  min-width: 0;
}
.album-frame {
  position: relative;
  display: block;
  aspect-ratio: 4/3;
  padding: 7px 7px 7px 18px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 14px;
  background: var(--ld-bg-card);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ld-shadow) 28%, transparent);
  isolation: isolate;
}
.album-frame > img,
.cover-empty {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}
.album-frame > img {
  transition:
    transform 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.3s;
}
.cover-empty {
  display: grid;
  background: linear-gradient(145deg, var(--c-primary-soft), var(--c-bg-2));
  color: var(--c-primary);
  font-size: 2.5rem;
  place-items: center;
}
.film-edge {
  position: absolute;
  z-index: 3;
  top: 10px;
  bottom: 10px;
  left: 5px;
  display: flex;
  width: 8px;
  align-items: center;
  justify-content: space-around;
  flex-direction: column;
}
.film-edge i {
  width: 4px;
  height: 7px;
  border-radius: 2px;
  background: var(--c-bg-3);
}
.cover-shade {
  position: absolute;
  z-index: 1;
  inset: 7px 7px 7px 18px;
  border-radius: 8px;
  background: linear-gradient(180deg, transparent 55%, rgb(5 8 12/52%));
  pointer-events: none;
}
.card-number,
.photo-count {
  position: absolute;
  z-index: 2;
  color: #fff;
  font-size: 0.49rem;
  letter-spacing: 0.12em;
}
.card-number {
  top: 16px;
  left: 28px;
}
.photo-count {
  right: 16px;
  bottom: 15px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.open-hint {
  position: absolute;
  z-index: 4;
  inset: 7px 7px 7px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  background: rgb(8 13 20/38%);
  color: #fff;
  font-size: 0.62rem;
  opacity: 0;
  transition: opacity 0.28s;
  backdrop-filter: blur(2px);
}
.album-card:hover .album-frame > img {
  filter: saturate(1.06);
  transform: scale(1.045);
}
.album-card:hover .open-hint {
  opacity: 1;
}
.album-copy {
  padding: 12px 5px 0;
}
.album-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.album-meta span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.album-copy h2 {
  margin: 7px 0 0;
  overflow: hidden;
  font-size: 0.96rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.album-copy h2 a {
  color: var(--c-text);
  transition: color 0.18s;
}
.album-copy h2 a:hover {
  color: var(--c-primary);
}
.album-copy p {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.61rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.public-empty {
  display: grid;
  min-height: 340px;
  place-items: center;
  align-content: center;
  border: 1px dashed var(--border);
  border-radius: 16px;
  color: var(--c-text-3);
  text-align: center;
}
.public-empty > svg {
  color: var(--c-primary);
  font-size: 2.6rem;
}
.public-empty h2 {
  margin: 12px 0 0;
  color: var(--c-text);
  font-size: 1rem;
}
.public-empty p {
  margin-top: 5px;
  font-size: 0.64rem;
}
.public-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 17px;
  margin-top: 36px;
}
.public-pagination button {
  display: grid;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
}
.public-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
.public-pagination span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: 0.57rem;
}
.public-pagination span b {
  color: var(--c-primary);
  font-size: 0.72rem;
}
.public-pagination span i {
  width: 24px;
  height: 1px;
  background: var(--border);
}
@keyframes album-orbit {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1050px) {
  .archive-intro {
    grid-template-columns: 88px minmax(0, 1fr);
  }
  .intro-mark {
    width: 74px;
    height: 74px;
  }
  .intro-stats {
    grid-column: 2;
    justify-self: start;
  }
  .album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .albums-page {
    padding-top: max(70px, calc(env(safe-area-inset-top) + 64px));
  }
}
@media (max-width: 620px) {
  .albums-page {
    padding-right: 14px;
    padding-left: 14px;
  }
  .archive-intro {
    grid-template-columns: 1fr;
    padding: 24px 21px;
  }
  .intro-mark {
    display: none;
  }
  .intro-stats {
    grid-column: auto;
  }
  .album-grid {
    grid-template-columns: 1fr;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .album-frame {
    aspect-ratio: 4/3;
  }
}
@media (prefers-reduced-motion: reduce) {
  .intro-mark::before {
    animation: none;
  }
  .album-frame > img,
  .open-hint {
    transition: none;
  }
}
.intro-orbit {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--c-primary) 34%, transparent);
  border-radius: 50%;
}
.orbit-primary {
  inset: 3px;
  animation: album-orbit 12s linear infinite;
}
.orbit-secondary {
  inset: 18px;
  border-style: dashed;
  animation: album-orbit 8s linear infinite reverse;
}
.intro-orbit i {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 2px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 13px color-mix(in srgb, var(--c-primary) 55%, transparent);
}
.orbit-primary i:first-child {
  top: 6px;
  right: 15px;
}
.orbit-primary i:last-child {
  bottom: 7px;
  left: 5px;
  background: var(--ui-accent-warm);
}
.intro-mark .orbit-secondary i {
  top: auto;
  right: -5px;
  bottom: 16px;
  left: auto;
  width: 7px;
  height: 7px;
}
.intro-lens {
  position: absolute;
  inset: 27px;
  display: grid;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  box-shadow: 0 7px 22px color-mix(in srgb, var(--ld-shadow) 35%, transparent);
  font-size: 1.55rem;
  animation: album-focus 4.2s ease-in-out infinite;
  place-items: center;
}
@keyframes album-focus {
  50% {
    box-shadow: 0 7px 28px color-mix(in srgb, var(--c-primary) 22%, transparent);
    transform: scale(0.94) rotate(18deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .intro-orbit,
  .intro-lens {
    animation: none;
  }
}
</style>
