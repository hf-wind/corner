<template>
  <div class="changelog-shell">
    <Loading
      v-if="loading && !ready"
      class="changelog-loading"
      fullscreen
      title="正在整理更新记录"
      text="正在完成提交翻译，请稍候"
    />
    <main v-else ref="scrollRef" class="changelog-scroll" :aria-busy="loading">
      <div class="changelog-page">
        <ContentPageHero
          eyebrow="CHANGELOG · 近期更新"
          :title="data.title"
          :description="data.subtitle"
          icon="ph:git-commit-bold"
          variant="archive"
          :metric="data.total"
          metric-label="次更新"
        />

        <div v-if="error && !data.groups.length" class="dynamic-state error">
            <span class="state-mark"><Icon name="ph:cloud-slash-bold" /></span>
            <div>
              <strong>更新记录暂时没有抵达</strong>
              <p>{{ error }}</p>
            </div>
            <button type="button" @click="load(1)">
              <Icon name="ph:arrow-clockwise-bold" />重新读取
            </button>
        </div>

        <section class="release-section" aria-labelledby="release-title">
          <header class="changelog-welcome friend-welcome">
            <div class="welcome-mark" aria-hidden="true"><Icon name="ph:wind-bold" /></div>
            <div class="welcome-copy">
              <span>WIND TRAIL / SHIPPED RECORDS</span>
              <h2 id="release-title">时间风迹</h2>
              <p>每一次提交都按时间聚合在这里，欢迎沿着时间线回望风隅的变化。</p>
              <div class="welcome-meta" aria-label="更新来源与统计">
                <span><Icon name="ph:git-branch-bold" />{{ data.sourceLabel || "仓库同步中" }}</span>
                <span><b>{{ data.total }}</b> 次更新</span>
                <span><b>{{ data.itemCount }}</b> 项变更</span>
                <span v-if="data.fetchedAt"><Icon name="ph:clock-counter-clockwise-bold" />{{ formatSyncTime(data.fetchedAt) }}</span>
              </div>
            </div>
          </header>

          <div class="changelog-filters" aria-label="时间筛选与搜索">
            <div ref="monthPickerRef" class="month-picker" :class="{ open: monthOpen }">
              <button
                type="button"
                class="month-trigger"
                :aria-expanded="monthOpen"
                @click="monthOpen = !monthOpen"
              >
                <Icon name="ph:calendar-blank-bold" />
                <span>{{ monthLabel || "全部时间" }}</span>
                <Icon name="ph:caret-down-bold" class="month-caret" />
              </button>
              <Transition name="month-pop">
                <div v-if="monthOpen" class="month-menu" role="listbox">
                  <button
                    type="button"
                    role="option"
                    :aria-selected="!month"
                    :class="{ active: !month }"
                    @click="chooseMonth('')"
                  >
                    <Icon name="ph:infinity-bold" />
                    全部时间
                  </button>
                  <button
                    v-for="item in data.months"
                    :key="item"
                    type="button"
                    role="option"
                    :aria-selected="month === item"
                    :class="{ active: month === item }"
                    @click="chooseMonth(item)"
                  >
                    <Icon name="ph:calendar-dot-bold" />
                    {{ formatMonth(item) }}
                  </button>
                </div>
              </Transition>
            </div>
            <label class="trail-search">
              <Icon name="ph:magnifying-glass-bold" />
              <input
                v-model.trim="searchInput"
                type="search"
                placeholder="搜索提交内容、标题…"
                maxlength="60"
              />
              <button v-if="searchInput" type="button" aria-label="清空" @click="searchInput = ''">
                <Icon name="ph:x-bold" />
              </button>
            </label>
          </div>

            <div v-if="error" class="inline-error">
              <Icon name="ph:warning-circle-bold" />
              <span>{{ error }}</span>
              <button type="button" @click="load(page)">重新读取</button>
            </div>

            <div
              v-if="data.groups.length"
              class="release-stream"
              :class="{ updating }"
            >
              <article
                v-for="(release, releaseIndex) in data.groups"
                :key="release.id"
                class="release-entry"
                :style="{ '--entry-delay': `${releaseIndex * 55}ms` }"
              >
                <aside class="release-date">
                  <time :datetime="release.publishedAt">{{ formatReleaseDate(release.publishedAt) }}</time>
                  <i aria-hidden="true" />
                </aside>

                <div class="release-body">
                  <header>
                    <div class="release-labels">
                      <span :class="release.source">
                        <Icon
                          :name="
                            release.source === 'git'
                              ? 'ph:git-branch-bold'
                              : 'ph:note-pencil-bold'
                          "
                        />
                        {{ release.sourceLabel }}
                      </span>
                    </div>
                  </header>

                  <h3>{{ release.title }}</h3>
                  <p v-if="release.summary" class="release-summary">
                    {{ release.summary }}
                  </p>

                  <ol v-if="release.items.length" class="change-list">
                    <li
                      v-for="(item, itemIndex) in release.items"
                      :key="item.sha || `${release.id}-${itemIndex}`"
                    >
                      <span>{{ pad(itemIndex + 1) }}</span>
                      <p>{{ item.text }}</p>
                      <code>{{ shortSha(item.sha) }}</code>
                    </li>
                  </ol>
                </div>
              </article>
            </div>
            <div v-else-if="!loading && !error" class="empty-release">
              <span class="empty-mark"><Icon name="ph:wind-bold" /></span>
              <div><h3>这段风里没有找到记录</h3><p>换个关键词或时间范围，也许就有惊喜。</p></div>
            </div>
            <div class="load-more-sentinel" aria-live="polite">
              <span v-if="loading && data.groups.length">正在读取时间线</span>
            </div>
        </section>

        <footer class="page-footer">
          <span>WIND CORNER · CHANGELOG</span>
          <span>已展示仓库同步的完整推送记录</span>
        </footer>
      </div>
    </main>
    <FloatingPagination
      v-model="page"
      :total="data.totalPages"
      :hidden="data.totalPages <= 1"
      variant="changelog"
      @change="changePage"
    />
  </div>
</template>

<script setup lang="ts">
import type { ChangelogRelease, ChangelogTimelineResponse } from "@/types/changelog";

const api = useApi();
const scrollRef = ref<HTMLElement | null>(null);
const page = ref(1);
const loading = ref(true);
const updating = ref(false);
const ready = ref(false);
const error = ref("");
const month = ref("");
const monthOpen = ref(false);
const searchInput = ref("");
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let requestSequence = 0;
const monthPickerRef = ref<HTMLElement | null>(null);

const monthLabel = computed(() =>
  month.value ? formatMonth(month.value) : "",
);

const data = reactive<ChangelogTimelineResponse>({
  enabled: true,
  title: "风迹墙",
  subtitle:
    "风过无声，循迹可寻。每一次改变，都在时间里留下属于自己的印记，那些细微的更迭与变化，也终将成为一路走来不可忽略的痕迹。",
  repository: { owner: "", name: "", branch: "main", url: "" },
  groups: [],
  months: [],
  page: 1,
  totalPages: 1,
  total: 0,
  itemCount: 0,
  fetchedAt: "",
  sourceStatus: "unavailable",
  sourceLabel: "",
  translationPending: false,
});

async function load(nextPage = page.value) {
  if (loading.value && nextPage !== 1) return;
  const sequence = ++requestSequence;
  if (ready.value) updating.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const result = await api.get<ChangelogTimelineResponse>("/changelog/timeline", {
      page: nextPage,
      limit: 10,
      q: searchInput.value || undefined,
      month: month.value || undefined,
    });
    if (sequence !== requestSequence) return;
    const incoming = Array.isArray(result.groups) ? result.groups : [];
    Object.assign(data, { ...result, groups: incoming });
    page.value = result.page;
    await nextTick();
    if (!ready.value) {
      requestAnimationFrame(() => {
        ready.value = true;
      });
    }
  } catch (cause: any) {
    if (sequence === requestSequence) error.value = cause?.message || "请稍后再试";
  } finally {
    if (sequence === requestSequence) {
      loading.value = false;
      updating.value = false;
    }
  }
}

function chooseMonth(value: string) {
  month.value = value;
  monthOpen.value = false;
  void load(1);
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void load(1), 380);
}

function formatMonth(value: string) {
  const [year, monthPart] = value.split("-");
  return `${year} 年 ${Number(monthPart)} 月`;
}

watch(searchInput, onSearchInput);

function onDocumentClick(event: MouseEvent) {
  if (!monthOpen.value) return;
  if (monthPickerRef.value && !monthPickerRef.value.contains(event.target as Node)) {
    monthOpen.value = false;
  }
}

function onFilterKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && monthOpen.value) monthOpen.value = false;
}

async function changePage(nextPage: number) {
  await load(nextPage);
  scrollRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

function pad(value: number) {
  return String(value || 0).padStart(2, "0");
}

function shortSha(value: string) {
  return String(value || "").slice(0, 7);
}

function formatReleaseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未标日期";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date).replace(/年|月/g, ".").replace("日", "");
}

function formatSyncTime(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

onMounted(() => {
  void load(1);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onFilterKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onFilterKeydown);
  if (searchTimer) clearTimeout(searchTimer);
});
useHead({
  title: "风迹墙 · 风隅随笔",
  meta: [
    {
      name: "description",
      content: "风隅随笔的近期功能、体验与内容更新记录。",
    },
  ],
});
</script>

<style scoped>
.changelog-shell {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 100%;
  background: var(--c-bg);
}

.changelog-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
}

.changelog-page {
  width: min(1000px, calc(100% - 56px));
  margin: 0 auto;
  padding: 28px 0 76px;
}

.release-ledger {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px 14px;
  max-width: 48%;
  padding: 7px 0 0;
  color: var(--c-text-3);
  font-size: 0.54rem;
}

.ledger-source,
.ledger-metric {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.ledger-source {
  overflow: hidden;
  color: var(--c-primary);
  text-overflow: ellipsis;
}

.ledger-metric b {
  color: var(--c-text-2);
  font: 700 0.6rem var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.release-section {
  padding: 28px 8px 10px;
}

.changelog-welcome {
  position: relative;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 17px;
  align-items: center;
  margin: 0 0 22px;
  padding: 20px 22px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--ld-bg-card) 94%, var(--c-primary-soft)), var(--ld-bg-card));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--ld-shadow) 24%, transparent);
}

.changelog-welcome::after {
  position: absolute;
  top: -90px;
  right: 8%;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 13%, transparent), transparent 70%);
  content: "";
  pointer-events: none;
}

.welcome-mark {
  position: relative;
  z-index: 1;
  display: grid;
  width: 58px;
  height: 58px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 30%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--c-primary-soft) 80%, var(--ld-bg-card));
  color: var(--c-primary);
  font-size: 1.5rem;
  place-items: center;
  animation: welcome-float 4.5s ease-in-out infinite;
}

.welcome-copy { position: relative; z-index: 1; min-width: 0; }
.welcome-copy > span { color: var(--c-primary); font: 700 .49rem var(--font-mono); letter-spacing: .14em; }
.welcome-copy h2 { margin: 5px 0 5px; color: var(--c-text); font-size: 1.25rem; }
.welcome-copy > p { margin: 0; color: var(--c-text-2); font-size: .63rem; line-height: 1.65; }
.welcome-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 14px; margin-top: 11px; color: var(--c-text-3); font-size: .52rem; }
.welcome-meta span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.welcome-meta b { color: var(--c-text-2); font: 700 .58rem var(--font-mono); }

.load-more-sentinel {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  color: var(--c-text-3);
  font: .5rem var(--font-mono);
  letter-spacing: .08em;
}

@keyframes welcome-float { 50% { transform: translateY(-4px) rotate(3deg); } }

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 0 0 18px 104px;
  padding: 0 0 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
}

.section-head span {
  color: var(--c-primary);
  font: 700 0.49rem var(--font-mono);
}

.section-head h2 {
  margin: 5px 0 0;
  color: var(--c-text);
  font-size: 1.28rem;
  line-height: 1.3;
}

.section-heading-copy > p {
  margin: 0;
  margin-top: 5px;
  color: var(--c-text-2);
  font-size: 0.62rem;
  line-height: 1.6;
}

.release-stream {
  transition:
    opacity 0.22s ease,
    filter 0.28s ease,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.release-stream.updating {
  opacity: 0.4;
  filter: blur(2px);
  transform: translateY(5px) scale(0.995);
  pointer-events: none;
}

.release-entry {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 22px;
  animation: release-arrive 0.68s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--entry-delay);
}

.release-date {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 18px;
  padding-right: 10px;
}

.release-date::after {
  position: absolute;
  top: 0;
  right: -12px;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    transparent,
    color-mix(in srgb, var(--c-primary) 23%, transparent) 16px,
    color-mix(in srgb, var(--border) 58%, transparent) 46px,
    color-mix(in srgb, var(--border) 58%, transparent)
  );
  content: "";
}

.release-entry:last-child .release-date::after {
  bottom: 24px;
}

.release-date > i {
  position: absolute;
  z-index: 1;
  top: 25px;
  right: -15px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow:
    0 0 0 3px var(--c-bg),
    0 0 0 5px color-mix(in srgb, var(--c-primary) 10%, transparent);
  transition:
    box-shadow 0.28s ease,
    transform 0.36s cubic-bezier(0.16, 1, 0.3, 1);
}

.release-entry:hover .release-date > i {
  box-shadow:
    0 0 0 3px var(--c-bg),
    0 0 0 7px color-mix(in srgb, var(--c-primary) 12%, transparent);
  transform: scale(1.12);
}

.release-date time {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  padding: 7px 8px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--c-bg-1) 68%, transparent);
  color: var(--c-text-2);
  font: 650 .56rem var(--font-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.release-body {
  position: relative;
  min-width: 0;
  margin-bottom: 8px;
  padding: 15px 17px 13px;
  overflow: hidden;
  border-radius: 7px;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-bg-1));
  box-shadow: 0 4px 15px color-mix(in srgb, var(--ld-shadow) 15%, transparent);
  transition:
    background-color 0.22s ease,
    box-shadow 0.32s ease,
    transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
}

.release-body:hover {
  background: color-mix(in srgb, var(--ld-bg-card) 95%, var(--c-primary-soft));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  transform: translateY(-2px);
}

.release-body > header {
  display: flex;
  min-height: 20px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.release-labels {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.release-labels > span,
.release-labels > small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-primary);
  font-size: 0.49rem;
  font-weight: 650;
  white-space: nowrap;
}

.release-labels > span.manual {
  color: #2f8569;
}

.release-labels > small {
  color: var(--c-text-3);
  font-weight: 500;
}

.release-body > header > a {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border-radius: 6px;
  color: var(--c-text-3);
  text-decoration: none;
  place-items: center;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.release-body > header > a:hover {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: translate(1px, -1px);
}

.release-body h3 {
  margin: 8px 0 3px;
  color: var(--c-text);
  font-size: 0.88rem;
  line-height: 1.45;
}

.release-summary {
  margin: 0 0 8px;
  color: var(--c-text-2);
  font-size: 0.61rem;
  line-height: 1.62;
}

.change-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.change-list li {
  display: grid;
  min-height: 31px;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--c-bg-1) 64%, transparent);
  transition:
    background-color 0.2s ease,
    transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.change-list li:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 54%, var(--c-bg-1));
  transform: translateX(2px);
}

.change-list li > span {
  color: var(--c-text-3);
  font: 0.45rem var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.change-list p {
  min-width: 0;
  margin: 0;
  color: var(--c-text-1);
  font-size: 0.61rem;
  line-height: 1.5;
}

.change-list a {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--c-text-3);
  font: 0.44rem var(--font-mono);
  text-decoration: none;
  transition: color 0.2s ease;
}

.dynamic-state {
  display: grid;
  width: calc(100% - 16px);
  min-height: 76px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin: 25px 8px 10px;
  padding: 12px 15px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--ld-bg-card) 90%, var(--c-bg-1));
  box-shadow: 0 5px 18px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
  color: var(--c-text-3);
}

.state-mark,
.empty-mark {
  display: grid;
  width: 36px;
  height: 36px;
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1rem;
  place-items: center;
}

.dynamic-state > div,
.empty-release > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.dynamic-state strong,
.empty-release h3 {
  margin: 0;
  color: var(--c-text);
  font-size: 0.75rem;
}

.dynamic-state p,
.empty-release p {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.5;
}

.state-dots {
  display: flex;
  gap: 4px;
  padding-right: 4px;
}

.state-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--c-primary);
  animation: loading-wind 0.9s ease-in-out infinite alternate;
}

.state-dots i:nth-child(2) {
  animation-delay: 0.13s;
}

.state-dots i:nth-child(3) {
  animation-delay: 0.26s;
}

.dynamic-state button,
.inline-error button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.56rem;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.dynamic-state button {
  min-height: 31px;
  padding: 6px 10px;
}

.dynamic-state button:hover,
.inline-error button:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 72%, var(--c-primary));
  transform: translateY(-1px);
}

.inline-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px 82px;
  padding: 8px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, #bf6570 8%, var(--c-bg-1));
  color: color-mix(in srgb, #bf6570 72%, var(--c-text));
  font-size: 0.56rem;
}

.inline-error span {
  min-width: 0;
  flex: 1;
}

.inline-error button {
  padding: 4px 7px;
}

.empty-release {
  display: grid;
  min-height: 104px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-left: 82px;
  padding: 15px 17px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--c-bg-1) 72%, transparent);
}

.empty-release > div > small {
  color: var(--c-primary);
  font: 700 0.43rem var(--font-mono);
}

.empty-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  font-size: 0.49rem;
  white-space: nowrap;
}

.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 26px 16px 0 90px;
  color: var(--c-text-3);
  font: 0.47rem var(--font-mono);
}

.page-footer a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-text-2);
  text-decoration: none;
  transition: color 0.2s ease;
}

.page-arrive-enter-active,
.page-arrive-leave-active {
  transition:
    opacity 0.34s ease,
    filter 0.38s ease,
    transform 0.52s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-arrive-enter-from {
  opacity: 0;
  filter: blur(5px);
  transform: translateY(10px) scale(0.995);
}

.page-arrive-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(-5px) scale(0.998);
}

@keyframes release-arrive {
  from {
    opacity: 0;
    filter: blur(5px);
    transform: translateY(13px);
  }
}

@keyframes loading-wind {
  to {
    opacity: 0.2;
    transform: translateY(-3px);
  }
}

@media (max-width: 900px) {
  .changelog-page {
    width: min(100% - 32px, 760px);
    padding-top: max(74px, calc(env(safe-area-inset-top) + 66px));
  }
}

@media (max-width: 640px) {
  .changelog-page {
    width: 100%;
    padding-bottom: 68px;
  }

  .changelog-page :deep(.content-hero) {
    margin-inline: 14px;
  }

  .release-ledger {
    width: 100%;
    max-width: none;
    min-height: 30px;
    justify-content: flex-start;
    padding-top: 8px;
  }

  .ledger-source {
    overflow: hidden;
  }

  .ledger-metric:last-child {
    display: none;
  }

  .release-section {
    padding: 21px 14px 8px;
  }

  .changelog-welcome { grid-template-columns: 1fr; gap: 10px; margin-bottom: 17px; padding: 17px 15px; }
  .welcome-mark { width: 42px; height: 42px; border-radius: 12px; font-size: 1.1rem; }
  .welcome-copy h2 { font-size: 1.05rem; }
  .welcome-copy > p { font-size: .6rem; }
  .welcome-meta { gap: 6px 11px; }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
    margin: 0 0 14px 82px;
  }

  .section-heading-copy > p {
    line-height: 1.5;
  }

  .release-entry {
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 14px;
  }

  .release-date {
    justify-content: center;
    padding-top: 16px;
    padding-right: 7px;
  }

  .release-date::after {
    right: -8px;
  }

  .release-date > i {
    top: 25px;
    right: -11px;
  }

  .release-date time { min-width: 62px; padding-inline: 4px; font-size: .49rem; }

  .release-body {
    margin-bottom: 7px;
    padding: 13px 12px 11px;
  }

  .release-body h3 {
    font-size: 0.82rem;
  }

  .release-summary,
  .change-list p {
    font-size: 0.59rem;
  }

  .change-list li {
    grid-template-columns: 19px minmax(0, 1fr) auto;
    gap: 5px;
    padding: 5px 6px;
  }

  .dynamic-state {
    width: calc(100% - 28px);
    grid-template-columns: 34px minmax(0, 1fr) auto;
    margin: 21px 14px 8px;
    padding: 11px 12px;
  }

  .state-mark,
  .empty-mark {
    width: 32px;
    height: 32px;
  }

  .dynamic-state.error {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .dynamic-state.error button {
    grid-column: 2;
    justify-self: start;
  }

  .inline-error { margin-left: 82px; }

  .page-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
    margin: 24px 18px 0 62px;
  }
}

@media (max-width: 390px) {
  .release-labels > small {
    display: none;
  }

  .change-list li > span {
    font-size: 0.42rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-arrive-enter-active,
  .page-arrive-leave-active,
  .release-entry,
  .release-stream,
  .release-body,
  .release-body::before,
  .release-date > i,
  .change-list li,
  .state-dots i {
    animation: none;
    transition: none;
  }
}

/* A compact ledger gives each release a legible date and keeps the stream calm. */
.changelog-page{width:min(1080px,calc(100% - 56px));padding:30px 0 72px}.release-section{padding:30px 0 10px}.changelog-welcome{grid-template-columns:52px minmax(0,1fr);gap:16px;margin:0 0 26px;padding:0 0 22px;border:0;border-bottom:1px solid var(--border);border-radius:0;background:transparent;box-shadow:none}.changelog-welcome::after{display:none}.welcome-mark{width:48px;height:48px;border-radius:8px;background:var(--c-primary-soft);box-shadow:none}.welcome-copy h2{font-size:1.2rem}.welcome-copy>p{max-width:700px;font-size:.68rem}.welcome-meta{gap:8px 16px;margin-top:12px;font-size:.58rem}.release-entry{grid-template-columns:112px minmax(0,1fr);gap:22px}.release-date{align-items:flex-start;justify-content:flex-end;padding:20px 16px 0 0}.release-date::after{right:0;background:var(--border)}.release-date>i{top:28px;right:-3px;width:7px;height:7px;background:var(--c-primary);box-shadow:0 0 0 4px var(--c-bg)}.release-date time{min-width:82px;padding:6px 8px;border:0;border-radius:0;background:transparent;color:var(--c-primary);font-size:.65rem}.release-body{margin-bottom:12px;padding:18px 20px 16px;border:1px solid color-mix(in srgb,var(--border) 84%,transparent);border-radius:8px;background:var(--ld-bg-card);box-shadow:none}.release-body:hover{background:color-mix(in srgb,var(--c-primary-soft) 12%,var(--ld-bg-card));box-shadow:none;transform:none}.release-body h3{margin-top:7px;font-size:1.04rem;line-height:1.45}.release-summary{font-size:.7rem;line-height:1.75}.change-list{margin-top:14px}.change-list li{padding:8px 9px;border-radius:5px}.change-list li>span{color:var(--c-primary);font-size:.58rem}.change-list p{font-size:.66rem;line-height:1.65}.change-list code{font-size:.54rem}.page-footer{margin:28px 0 0 134px}.release-stream.updating{filter:none;transform:none}.release-entry{animation-duration:.45s}
@media(max-width:640px){.changelog-page{width:100%;padding-bottom:60px}.changelog-page :deep(.content-hero){margin-inline:14px}.release-section{padding:22px 14px 8px}.changelog-welcome{grid-template-columns:42px minmax(0,1fr);gap:12px;padding-bottom:18px}.welcome-mark{width:40px;height:40px;font-size:1.1rem}.welcome-copy h2{font-size:1.05rem}.welcome-copy>p{font-size:.62rem}.release-entry{grid-template-columns:72px minmax(0,1fr);gap:12px}.release-date{padding:16px 10px 0 0}.release-date time{min-width:58px;padding:4px 0;font-size:.51rem}.release-date>i{top:24px}.release-body{margin-bottom:9px;padding:13px 14px 12px}.release-body h3{font-size:.88rem}.release-summary,.change-list p{font-size:.61rem}.change-list li{padding:6px}.page-footer{margin:24px 14px 0 86px}}

/* ---- 时间筛选与搜索 ---- */
.changelog-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 22px;
}

.month-picker {
  position: relative;
  flex-shrink: 0;
}

.month-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 10px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.month-trigger:hover,
.month-picker.open .month-trigger {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 48%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 10%, transparent);
}

.month-caret {
  font-size: 0.6rem;
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.month-picker.open .month-caret {
  transform: rotate(180deg);
}

.month-menu {
  position: absolute;
  z-index: 40;
  top: calc(100% + 8px);
  left: 0;
  min-width: 168px;
  max-height: 264px;
  overflow-y: auto;
  padding: 5px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 12px;
  background: var(--ld-bg-card);
  box-shadow: 0 18px 44px color-mix(in srgb, var(--ld-shadow) 36%, transparent);
}

.month-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  text-align: left;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.month-menu button:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 46%, transparent);
  color: var(--c-text);
}

.month-menu button.active {
  background: color-mix(in srgb, var(--c-primary-soft) 72%, transparent);
  color: var(--c-primary);
  font-weight: 650;
}

.month-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.26s cubic-bezier(0.22, 1.4, 0.36, 1);
}

.month-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.month-pop-enter-from,
.month-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.trail-search {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
  max-width: 320px;
}

.trail-search > svg {
  position: absolute;
  left: 12px;
  color: var(--c-text-3);
  font-size: 0.8rem;
  pointer-events: none;
}

.trail-search input {
  width: 100%;
  padding: 9px 34px 9px 34px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 10px;
  background: var(--ld-bg-card);
  color: var(--c-text);
  font: inherit;
  font-size: 0.7rem;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.trail-search input::placeholder {
  color: var(--c-text-3);
}

.trail-search input:focus {
  border-color: color-mix(in srgb, var(--c-primary) 48%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 10%, transparent);
}

.trail-search button {
  position: absolute;
  right: 8px;
  display: grid;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-bg-2) 80%, transparent);
  color: var(--c-text-3);
  cursor: pointer;
  font-size: 0.55rem;
  place-items: center;
}

.trail-search button:hover {
  color: var(--c-text);
}

@media (max-width: 640px) {
  .changelog-filters {
    flex-wrap: wrap;
  }

  .trail-search {
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .month-caret,
  .month-pop-enter-active,
  .month-pop-leave-active,
  .month-trigger {
    transition: none;
  }
}
</style>
