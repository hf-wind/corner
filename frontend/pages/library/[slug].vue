<template>
  <main class="detail-page">
    <div v-if="!loading && !item" class="not-found content-reveal">
      <Icon name="ph:books" />
      <h1>没有找到这份记录</h1>
      <p>它可能还在草稿箱，或已经被移走。</p>
      <AppLink to="/library">返回书影</AppLink>
    </div>
    <template v-else>
      <section class="detail-hero content-reveal">
        <div
          class="hero-backdrop"
          :style="
            item.coverImage
              ? { backgroundImage: `url(${mediaUrl(item.coverImage)})` }
              : {}
          "
        />
        <div class="hero-overlay" />
        <div class="hero-inner">
          <AppLink to="/library" class="back-link"
            ><Icon name="ph:arrow-left-bold" /> 返回收藏馆</AppLink
          >
          <div class="hero-content">
            <div class="poster" :class="item.type">
              <img
                v-if="item.coverImage"
                :src="mediaUrl(item.coverImage)"
                :alt="item.title"
              />
              <div v-else>
                <Icon
                  :name="
                    item.type === 'book' ? 'ph:book-open-text' : 'ph:film-strip'
                  "
                /><span>{{ item.title }}</span>
              </div>
              <span v-if="item.recommended" class="ribbon"
                ><Icon name="ph:heart-fill" /> 私藏推荐</span
              >
            </div>
            <div class="hero-copy">
              <span class="record-type"
                >{{
                  item.type === "book" ? "READING RECORD" : "VIEWING RECORD"
                }}
                · {{ item.type === "book" ? "阅读手记" : "观影档案" }}</span
              >
              <h1>{{ item.title }}</h1>
              <p v-if="item.originalTitle" class="original-title">
                {{ item.originalTitle }}
              </p>
              <div class="creator-line">
                <span>{{ item.type === "book" ? "作者" : "导演" }}</span
                ><strong>{{
                  item.type === "book"
                    ? item.creator || "未记录"
                    : item.director || "未记录"
                }}</strong>
                <i v-if="item.type === 'film' && item.releaseYear" /><span
                  v-if="item.type === 'film' && item.releaseYear"
                  >{{ item.releaseYear }}</span
                >
              </div>
              <div class="hero-tags">
                <span v-for="genre in item.genres || []" :key="genre">{{
                  genre
                }}</span>
              </div>
              <div class="hero-rating">
                <div v-if="item.rating != null">
                  <small>我的评分</small
                  ><strong>{{ Number(item.rating).toFixed(1) }}</strong
                  ><span>/ 10</span>
                </div>
                <i
                  v-if="
                    item.rating != null && item.type === 'film' && item.rank
                  "
                />
                <div v-if="item.type === 'film' && item.rank">
                  <small>悬疑片单</small><strong>#{{ item.rank }}</strong
                  ><span>私人口味排名</span>
                </div>
                <i
                  v-if="(item.rating != null || item.rank) && experienceLabel"
                />
                <div v-if="experienceLabel" class="date-stat">
                  <small>{{
                    item.type === "book" ? "阅读时间" : "观看时间"
                  }}</small
                  ><strong>{{ experienceLabel }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="detail-body">
        <article class="detail-main">
          <section
            v-if="item.reflection"
            class="content-section reflection-section"
          >
            <header>
              <span>01</span>
              <div>
                <small>AFTERTHOUGHTS</small>
                <h2>我的体会</h2>
              </div>
            </header>
            <div class="reflection-text">{{ item.reflection }}</div>
          </section>
          <section v-if="item.summary" class="content-section">
            <header>
              <span>02</span>
              <div>
                <small>ABOUT THE STORY</small>
                <h2>作品简介</h2>
              </div>
            </header>
            <p class="body-copy">{{ item.summary }}</p>
          </section>
          <section v-if="item.highlights?.length" class="content-section">
            <header>
              <span>03</span>
              <div>
                <small>{{
                  item.type === "book" ? "HIGHLIGHTS" : "MEMORABLE SCENES"
                }}</small>
                <h2>{{ item.type === "book" ? "页间摘录" : "难忘片段" }}</h2>
              </div>
            </header>
            <div class="highlight-list">
              <blockquote v-for="(text, index) in item.highlights" :key="index">
                <span>{{ String(index + 1).padStart(2, "0") }}</span>
                <p>{{ text }}</p>
              </blockquote>
            </div>
          </section>
          <section
            v-if="item.quotes?.length"
            class="content-section quote-section"
          >
            <header>
              <span>04</span>
              <div>
                <small>WORDS TO KEEP</small>
                <h2>
                  {{ item.type === "book" ? "留在心里的句子" : "经典台词" }}
                </h2>
              </div>
            </header>
            <div class="quote-list">
              <blockquote v-for="(quote, index) in item.quotes" :key="index">
                <Icon name="ph:quotes-fill" />
                <p>{{ quote }}</p>
              </blockquote>
            </div>
          </section>
        </article>

        <aside class="detail-aside">
          <section class="info-card">
            <span class="card-label">档案 / ARCHIVE</span>
            <dl>
              <template v-for="row in infoRows" :key="row.label"
                ><div v-if="row.value">
                  <dt>{{ row.label }}</dt>
                  <dd>{{ row.value }}</dd>
                </div></template
              >
            </dl>
          </section>
          <section class="timeline-card">
            <span class="card-label">我的时间线</span>
            <div class="timeline">
              <div v-if="item.experienceDate">
                <i /><span>{{ formatMonth(item.experienceDate) }}</span
                ><strong>{{
                  item.type === "book" ? "阅读这本书" : "观看这部作品"
                }}</strong>
              </div>
              <div>
                <i /><span>{{
                  formatDate(item.publishedAt || item.createdAt)
                }}</span
                ><strong>写下这份记录</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section v-if="related.length" class="related-section">
        <header>
          <div>
            <small>KEEP EXPLORING</small>
            <h2>也许你还会喜欢</h2>
          </div>
          <AppLink to="/library"
            >查看全部 <Icon name="ph:arrow-right-bold"
          /></AppLink>
        </header>
        <div>
          <LibraryCard v-for="entry in related" :key="entry.id" :item="entry" />
        </div>
      </section>
      <footer class="detail-footer">
        <AppLink to="/library"
          ><Icon name="ph:arrow-left" /> 回到书影收藏馆</AppLink
        ><span>风隅随笔 · PERSONAL COLLECTION</span>
      </footer>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { LibraryItem } from "~/types/library";
const api = useApi();
const route = useRoute();
const { mediaUrl } = useMediaUrl();
const loading = ref(true);
const item = ref<LibraryItem | null>(null);
const related = ref<LibraryItem[]>([]);
const progressLabels: Record<string, string> = {
  "want-to-read": "想读",
  reading: "在读",
  finished: "已读",
  "want-to-watch": "想看",
  watching: "在看",
  watched: "已看",
  paused: "搁置",
};
const experienceLabel = computed(() => {
  return item.value?.experienceDate
    ? formatMonth(item.value.experienceDate)
    : "";
});
const infoRows = computed(() => {
  const value = item.value;
  if (!value) return [];
  if (value.type === "book")
    return [
      { label: "作者", value: value.creator },
      { label: "国家 / 地区", value: value.country },
      { label: "语言", value: value.language },
      {
        label: "阅读状态",
        value: value.progressStatus
          ? progressLabels[value.progressStatus] || value.progressStatus
          : "",
      },
    ];
  return [
    { label: "导演", value: value.director },
    { label: "主演", value: value.cast?.join(" / ") },
    { label: "上映年份", value: value.releaseYear },
    { label: "国家 / 地区", value: value.country },
    { label: "语言", value: value.language },
    {
      label: "时长",
      value: value.runtimeMinutes
        ? `${value.runtimeMinutes} 分钟${value.episodeCount ? " / 集" : ""}`
        : "",
    },
    {
      label: "集数",
      value: value.episodeCount ? `${value.episodeCount} 集` : "",
    },
    { label: "观看平台", value: value.platform },
    {
      label: "观看状态",
      value: value.progressStatus
        ? progressLabels[value.progressStatus] || value.progressStatus
        : "",
    },
  ];
});
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
function formatMonth(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
async function load() {
  loading.value = true;
  try {
    item.value = await api.get<LibraryItem>(`/library/${route.params.slug}`);
    const res = await api.get<any>("/library", {
      type: item.value.type,
      limit: 3,
      sort: item.value.type === "film" ? "rank" : undefined,
    });
    related.value = (res.items || [])
      .filter((entry: LibraryItem) => entry.id !== item.value?.id)
      .slice(0, 2);
  } catch {
    item.value = null;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
useHead({
  title: computed(() =>
    item.value
      ? `${item.value.title} · ${item.value.type === "book" ? "阅读手记" : "观影记录"}`
      : "书影",
  ),
  meta: [
    {
      name: "description",
      content: computed(
        () =>
          item.value?.summary ||
          item.value?.reflection ||
          "风隅随笔的书影收藏记录",
      ),
    },
  ],
});
</script>

<style scoped>
.detail-page {
  --detail-accent: var(--c-primary);
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--c-bg);
  color: var(--c-text);
  scrollbar-gutter: stable;
}
.not-found {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--c-text-3);
}
.not-found > svg {
  margin-bottom: 18px;
  color: var(--detail-accent);
  font-size: 3rem;
}
.not-found h1 {
  margin: 0 0 8px;
  color: var(--c-text);
  font-size: 1.35rem;
}
.not-found p {
  margin-bottom: 20px;
  font-size: 0.73rem;
}
.not-found a {
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.72rem;
  text-decoration: none;
}
.detail-hero {
  position: relative;
  min-height: 470px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c-primary-soft) 28%, var(--c-bg)),
    var(--c-bg)
  );
}
.hero-backdrop {
  position: absolute;
  inset: -80px;
  background-position: center 35%;
  background-size: cover;
  opacity: 0.12;
  filter: blur(42px) saturate(0.75);
  transform: scale(1.08);
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--c-bg) 94%, transparent) 0%,
      color-mix(in srgb, var(--c-bg) 80%, transparent) 55%,
      color-mix(in srgb, var(--c-bg) 94%, transparent)
    ),
    linear-gradient(0deg, var(--c-bg), transparent 32%);
}
.hero-inner {
  position: relative;
  z-index: 1;
  width: min(1060px, calc(100% - 70px));
  margin: 0 auto;
  padding: 36px 0 54px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 35px;
  color: var(--c-text-3);
  font-size: 0.64rem;
  text-decoration: none;
  transition: color 0.2s;
}
.back-link:hover {
  color: var(--detail-accent);
}
.hero-content {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: center;
  gap: 52px;
}
.poster {
  position: relative;
  aspect-ratio: 2/3;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  border-radius: 16px;
  background: linear-gradient(145deg, var(--c-bg-2), var(--c-primary-soft));
  box-shadow: 0 20px 52px rgb(0 0 0 / 18%);
}
.poster > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.poster > div {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 24px;
  color: var(--c-text-2);
  text-align: center;
}
.poster > div :deep(svg) {
  color: var(--detail-accent);
  font-size: 3rem;
}
.ribbon {
  position: absolute;
  top: 16px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  border-radius: 0 999px 999px 0;
  background: var(--detail-accent);
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
}
.record-type {
  color: var(--detail-accent);
  font-size: 0.57rem;
  font-weight: 750;
  letter-spacing: 0.21em;
}
.hero-copy h1 {
  max-width: 700px;
  margin: 13px 0 0;
  font-family: var(--font-heading);
  font-size: clamp(2.1rem, 4vw, 3.45rem);
  letter-spacing: 0.02em;
  line-height: 1.14;
}
.original-title {
  margin: 8px 0 0;
  color: var(--c-text-3);
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-style: normal;
}
.creator-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  color: var(--c-text-3);
  font-size: 0.66rem;
}
.creator-line strong {
  color: var(--c-text-2);
  font-size: 0.78rem;
}
.creator-line i {
  width: 1px;
  height: 13px;
  background: var(--border);
}
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 17px;
}
.hero-tags span {
  padding: 5px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 999px;
  color: var(--c-text-2);
  font-size: 0.57rem;
}
.hero-rating {
  display: flex;
  align-items: stretch;
  gap: 22px;
  margin-top: 31px;
}
.hero-rating > div {
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  column-gap: 6px;
}
.hero-rating small {
  grid-column: 1/-1;
  margin-bottom: 4px;
  color: var(--c-text-3);
  font-size: 0.52rem;
  letter-spacing: 0.1em;
}
.hero-rating strong {
  color: var(--detail-accent);
  font-family: var(--font-heading);
  font-size: 1.65rem;
}
.hero-rating span {
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.hero-rating > i {
  width: 1px;
  background: var(--border);
}
.hero-rating .date-stat strong {
  color: var(--c-text);
  font-size: 0.75rem;
}
.detail-body {
  display: grid;
  width: min(1000px, calc(100% - 70px));
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 70px;
  margin: 0 auto;
  padding: 70px 0 90px;
}
.detail-main {
  min-width: 0;
}
.content-section + .content-section {
  margin-top: 68px;
}
.content-section header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}
.content-section header > span {
  color: var(--detail-accent);
  font-family: var(--font-mono);
  font-size: 0.56rem;
}
.content-section header > div {
  padding-left: 15px;
  border-left: 1px solid var(--border);
}
.content-section header small {
  color: var(--c-text-3);
  font-size: 0.45rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.content-section h2 {
  margin: 3px 0 0;
  font-family: var(--font-heading);
  font-size: 1.3rem;
}
.reflection-text,
.body-copy {
  color: var(--c-text-2);
  font-size: 0.84rem;
  line-height: 2.15;
  white-space: pre-line;
}
.reflection-text::first-letter {
  float: left;
  margin: 8px 10px 0 0;
  color: var(--detail-accent);
  font-family: var(--font-serif, var(--font-heading));
  font-size: 3.4rem;
  line-height: 0.8;
}
.highlight-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.highlight-list blockquote {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  margin: 0;
  padding: 17px 19px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ld-bg-card) 72%, transparent);
}
.highlight-list span {
  padding-top: 3px;
  color: var(--detail-accent);
  font-family: var(--font-mono);
  font-size: 0.5rem;
}
.highlight-list p {
  color: var(--c-text-2);
  font-family: var(--font-serif, var(--font-body));
  font-size: 0.8rem;
  line-height: 1.85;
}
.quote-list {
  display: grid;
  gap: 11px;
}
.quote-list blockquote {
  position: relative;
  margin: 0;
  padding: 24px 25px 22px 52px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--detail-accent) 10%, var(--ld-bg-card)),
    var(--ld-bg-card)
  );
}
.quote-list :deep(svg) {
  position: absolute;
  top: 21px;
  left: 19px;
  color: var(--detail-accent);
  font-size: 1.25rem;
  opacity: 0.45;
}
.quote-list p {
  color: var(--c-text);
  font-family: var(--font-serif, var(--font-body));
  font-size: 0.88rem;
  line-height: 1.85;
}
.detail-aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.info-card,
.timeline-card {
  padding: 23px 21px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 15px;
  background: color-mix(in srgb, var(--ld-bg-card) 78%, transparent);
}
.card-label {
  display: block;
  margin-bottom: 18px;
  color: var(--detail-accent);
  font-size: 0.5rem;
  font-weight: 750;
  letter-spacing: 0.16em;
}
.info-card dl {
  margin: 0;
}
.info-card dl > div {
  display: grid;
  grid-template-columns: 67px 1fr;
  gap: 8px;
  padding: 9px 0;
  border-bottom: 1px dashed color-mix(in srgb, var(--border) 72%, transparent);
}
.info-card dt {
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.info-card dd {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.63rem;
  line-height: 1.55;
  text-align: right;
  overflow-wrap: anywhere;
}
.source-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  color: var(--detail-accent);
  font-size: 0.62rem;
  text-decoration: none;
}
.timeline {
  position: relative;
  padding-left: 14px;
}
.timeline::before {
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: 3px;
  width: 1px;
  background: var(--border);
  content: "";
}
.timeline > div {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 0 18px 11px;
}
.timeline > div:last-child {
  padding-bottom: 0;
}
.timeline i {
  position: absolute;
  top: 5px;
  left: -14px;
  width: 7px;
  height: 7px;
  border: 2px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--detail-accent);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--detail-accent) 20%, transparent);
}
.timeline span {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.49rem;
}
.timeline strong {
  color: var(--c-text-2);
  font-size: 0.63rem;
}
.related-section {
  width: min(1000px, calc(100% - 70px));
  margin: 0 auto;
  padding: 55px 0 70px;
  border-top: 1px solid var(--border);
}
.related-section > header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.related-section small {
  color: var(--detail-accent);
  font-size: 0.47rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.related-section h2 {
  margin: 4px 0 0;
  font-size: 1.3rem;
}
.related-section > header a {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--c-text-3);
  font-size: 0.62rem;
  text-decoration: none;
}
.related-section > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px max(35px, calc((100% - 1000px) / 2))
    max(28px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  color: var(--c-text-3);
  font-size: 0.5rem;
  letter-spacing: 0.12em;
}
.detail-footer a {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-2);
  text-decoration: none;
}
@media (max-width: 850px) {
  .hero-content {
    grid-template-columns: 180px 1fr;
    gap: 35px;
  }
  .detail-body {
    grid-template-columns: 1fr;
    gap: 45px;
  }
  .detail-aside {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero-rating {
    flex-wrap: wrap;
  }
}
@media (max-width: 620px) {
  .hero-inner,
  .detail-body,
  .related-section {
    width: calc(100% - 32px);
  }
  .hero-inner {
    padding-top: 82px;
  }
  .hero-content {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .poster {
    width: 152px;
  }
  .hero-copy h1 {
    font-size: 2.2rem;
  }
  .hero-rating {
    gap: 14px;
  }
  .detail-body {
    padding-top: 48px;
  }
  .detail-aside,
  .related-section > div {
    grid-template-columns: 1fr;
  }
  .detail-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    padding-inline: 16px;
  }
  .content-section + .content-section {
    margin-top: 50px;
  }
}
</style>
