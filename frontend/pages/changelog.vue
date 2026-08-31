<template>
  <div class="changelog-shell">
    <main ref="scrollRef" class="changelog-scroll">
      <div class="changelog-page">
        <ContentPageHero
          eyebrow="CHANGELOG · 近期更新"
          :title="data.title"
          :description="data.subtitle"
          icon="ph:git-commit-bold"
          variant="archive"
          :metric="!ready ? '··' : data.total"
          metric-label="次更新"
        />

        <section class="release-ledger" aria-label="更新来源与统计">
          <div class="ledger-source">
            <a
              v-if="data.repository.url"
              :href="data.repository.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="ph:github-logo-bold" />
              {{ data.repository.owner }}/{{ data.repository.name }}
            </a>
            <span :class="data.sourceStatus">
              <i />{{ data.sourceLabel || "等待同步" }}
            </span>
          </div>
          <div class="ledger-metrics">
            <span
              ><b>{{ pad(data.itemCount) }}</b> 项变更</span
            >
            <span v-if="data.fetchedAt">
              <Icon name="ph:clock-counter-clockwise-bold" />
              {{ formatSyncTime(data.fetchedAt) }}
            </span>
          </div>
        </section>

        <Transition name="page-arrive" mode="out-in">
          <div v-if="loading && !ready" key="loading" class="dynamic-state">
            <span class="state-mark"><Icon name="ph:wind-bold" /></span>
            <div>
              <strong>正在整理最近的更新</strong>
              <p>同步仓库与中文更新摘要</p>
            </div>
            <span class="state-dots" aria-hidden="true"><i /><i /><i /></span>
          </div>

          <div
            v-else-if="error && !ready"
            key="error"
            class="dynamic-state error"
          >
            <span class="state-mark"><Icon name="ph:cloud-slash-bold" /></span>
            <div>
              <strong>更新记录暂时没有抵达</strong>
              <p>{{ error }}</p>
            </div>
            <button type="button" @click="load(1)">
              <Icon name="ph:arrow-clockwise-bold" />重新读取
            </button>
          </div>

          <section
            v-else
            key="content"
            class="release-section"
            aria-labelledby="release-title"
          >
            <header class="section-head">
              <div>
                <span>LATEST SHIPPED</span>
                <h2 id="release-title">近期抵达</h2>
              </div>
              <p>按推送归档，完整保留每一项改动。</p>
            </header>

            <div v-if="error" class="inline-error">
              <Icon name="ph:warning-circle-bold" />
              <span>{{ error }}</span>
              <button type="button" @click="load(page)">重新读取</button>
            </div>

            <div
              v-if="data.releases.length"
              class="release-stream"
              :class="{ updating }"
            >
              <article
                v-for="(release, releaseIndex) in data.releases"
                :key="release.id"
                class="release-entry"
                :style="{ '--entry-delay': `${releaseIndex * 55}ms` }"
              >
                <aside class="release-date">
                  <time :datetime="release.publishedAt">
                    <strong>{{ dateParts(release.publishedAt).day }}</strong>
                    <span>{{ dateParts(release.publishedAt).month }}</span>
                    <small>{{ dateParts(release.publishedAt).year }}</small>
                  </time>
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
                      <small v-if="release.translation === 'ai'"
                        >中文整理</small
                      >
                    </div>
                    <a
                      v-if="release.url"
                      :href="release.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="查看本次推送"
                      aria-label="查看本次推送"
                    >
                      <Icon name="ph:arrow-up-right-bold" />
                    </a>
                  </header>

                  <h3>{{ release.title }}</h3>
                  <p v-if="release.summary" class="release-summary">
                    {{ release.summary }}
                  </p>

                  <ol class="change-list">
                    <li
                      v-for="(item, itemIndex) in release.items"
                      :key="item.sha || `${release.id}-${itemIndex}`"
                    >
                      <span>{{ pad(itemIndex + 1) }}</span>
                      <p>{{ item.text }}</p>
                      <a
                        v-if="item.url"
                        :href="item.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        :title="`查看提交 ${shortSha(item.sha)}`"
                      >
                        {{ shortSha(item.sha) }}
                        <Icon name="ph:arrow-up-right" />
                      </a>
                    </li>
                  </ol>
                </div>
              </article>
            </div>

            <div v-else class="empty-release">
              <span class="empty-mark"><Icon name="ph:git-commit-bold" /></span>
              <div>
                <small>SYNC QUEUE / 00</small>
                <h3>第一条更新还在路上</h3>
                <p>代码仓库完成同步后，这里会自动留下记录。</p>
              </div>
              <span class="empty-status" :class="data.sourceStatus">
                <i />{{ data.sourceLabel || "等待首次同步" }}
              </span>
            </div>
          </section>
        </Transition>

        <footer v-if="data.repository.url" class="page-footer">
          <span>WIND CORNER · CHANGELOG</span>
          <a
            :href="`${data.repository.url}/commits/${data.repository.branch}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看完整提交历史 <Icon name="ph:arrow-up-right-bold" />
          </a>
        </footer>
      </div>
    </main>

    <FloatingPagination
      v-if="ready && !error && data.totalPages > 1"
      v-model="page"
      :total="data.totalPages"
      @change="changePage"
    />
  </div>
</template>

<script setup lang="ts">
import type { ChangelogResponse } from "~/types/changelog";

const api = useApi();
const scrollRef = ref<HTMLElement | null>(null);
const page = ref(1);
const loading = ref(true);
const updating = ref(false);
const ready = ref(false);
const error = ref("");
const data = reactive<ChangelogResponse>({
  enabled: true,
  title: "最近更新",
  subtitle: "记录每一次推送，也留下那些不适合写进提交信息的细节。",
  repository: { owner: "", name: "", branch: "main", url: "" },
  releases: [],
  page: 1,
  totalPages: 1,
  total: 0,
  itemCount: 0,
  fetchedAt: "",
  sourceStatus: "unavailable",
  sourceLabel: "",
});

async function load(nextPage = page.value) {
  if (ready.value) updating.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const result = await api.get<ChangelogResponse>("/changelog", {
      page: nextPage,
      limit: 6,
    });
    Object.assign(data, result);
    page.value = result.page;
    await nextTick();
    if (!ready.value) {
      requestAnimationFrame(() => {
        ready.value = true;
      });
    }
  } catch (cause: any) {
    error.value = cause?.message || "请稍后再试";
  } finally {
    loading.value = false;
    updating.value = false;
  }
}

async function changePage(nextPage: number) {
  updating.value = true;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 160));
  await load(nextPage);
  scrollRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

function pad(value: number) {
  return String(value || 0).padStart(2, "0");
}

function shortSha(value: string) {
  return String(value || "").slice(0, 7);
}

function dateParts(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("zh-CN", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(date),
    year: new Intl.DateTimeFormat("zh-CN", { year: "numeric" }).format(date),
  };
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

onMounted(() => load(1));
useHead({
  title: "最近更新 · 风隅随笔",
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
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -8px 8px 0;
  padding: 0 12px;
  color: var(--c-text-3);
  font-size: 0.54rem;
}

.ledger-source,
.ledger-metrics,
.ledger-source a,
.ledger-source span,
.ledger-metrics span {
  display: flex;
  align-items: center;
}

.ledger-source,
.ledger-metrics {
  min-width: 0;
  gap: 14px;
}

.ledger-source a,
.ledger-source span,
.ledger-metrics span {
  gap: 5px;
  white-space: nowrap;
}

.ledger-source a {
  overflow: hidden;
  color: var(--c-text-2);
  text-decoration: none;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.ledger-source a:hover,
.page-footer a:hover,
.change-list a:hover {
  color: var(--c-primary);
}

.ledger-source i,
.empty-status i {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #a88748;
}

.ledger-source .connected i,
.empty-status.connected i {
  background: #2f8b69;
  box-shadow: 0 0 0 3px color-mix(in srgb, #2f8b69 12%, transparent);
}

.ledger-source .fallback i,
.ledger-source .stale i,
.empty-status.fallback i,
.empty-status.stale i {
  background: var(--c-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 11%, transparent);
}

.ledger-metrics {
  justify-content: flex-end;
}

.ledger-metrics b {
  color: var(--c-text-2);
  font: 700 0.6rem var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.release-section {
  padding: 25px 8px 10px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 0 0 15px 82px;
}

.section-head span {
  color: var(--c-primary);
  font: 700 0.49rem var(--font-mono);
}

.section-head h2 {
  margin: 4px 0 0;
  color: var(--c-text);
  font-size: 1.12rem;
  line-height: 1.3;
}

.section-head > p {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.58rem;
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
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 14px;
  animation: release-arrive 0.68s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--entry-delay);
}

.release-date {
  position: relative;
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.release-date::after {
  position: absolute;
  top: 0;
  right: -15px;
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
  right: -18px;
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
  display: grid;
  grid-template-columns: auto auto;
  align-content: start;
  align-items: baseline;
  gap: 0 4px;
  text-align: right;
}

.release-date strong {
  color: var(--c-text);
  font: 740 1.02rem var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.release-date span {
  color: var(--c-text-2);
  font-size: 0.55rem;
}

.release-date small {
  grid-column: 1 / -1;
  color: var(--c-text-3);
  font: 0.45rem var(--font-mono);
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

.release-body::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(var(--c-primary), transparent 78%);
  content: "";
  opacity: 0.34;
  transform: scaleY(0.38);
  transform-origin: top;
  transition:
    opacity 0.28s ease,
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.release-body:hover {
  background: color-mix(in srgb, var(--ld-bg-card) 95%, var(--c-primary-soft));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  transform: translateY(-2px);
}

.release-body:hover::before {
  opacity: 0.72;
  transform: scaleY(1);
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
    min-height: 42px;
    margin-inline: 14px;
    padding-inline: 4px;
  }

  .ledger-source {
    overflow: hidden;
  }

  .ledger-source span {
    display: none;
  }

  .ledger-metrics span:last-child {
    display: none;
  }

  .release-section {
    padding: 21px 14px 8px;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
    margin: 0 0 12px 49px;
  }

  .section-head > p {
    line-height: 1.5;
  }

  .release-entry {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
  }

  .release-date {
    padding-top: 14px;
  }

  .release-date::after {
    right: -11px;
  }

  .release-date > i {
    top: 23px;
    right: -14px;
  }

  .release-date time {
    display: flex;
    align-items: flex-end;
    flex-direction: column;
    gap: 0;
  }

  .release-date strong {
    font-size: 0.88rem;
  }

  .release-date span {
    font-size: 0.48rem;
  }

  .release-date small {
    display: none;
  }

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

  .inline-error,
  .empty-release {
    margin-left: 48px;
  }

  .empty-release {
    grid-template-columns: 34px minmax(0, 1fr);
    min-height: 96px;
    padding: 13px;
  }

  .empty-status {
    grid-column: 2;
    justify-self: start;
  }

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
</style>
