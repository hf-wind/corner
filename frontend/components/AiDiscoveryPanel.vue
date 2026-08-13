<template>
  <section class="discovery-entry" aria-labelledby="ai-discovery-title">
    <button
      type="button"
      class="discovery-trigger ui-hover-surface"
      :aria-expanded="panelOpen"
      @click="openPanel"
    >
      <span class="trigger-mark"><Icon name="ph:compass-tool-bold" /></span>
      <span class="trigger-copy">
        <small>AI DISCOVERY</small>
        <strong id="ai-discovery-title">从一个问题，走进这座内容花园</strong>
      </span>
      <span v-if="cards.length" class="trigger-previews" aria-hidden="true">
        <span
          v-for="card in previewCards"
          :key="`${card.type}:${card.sourceId}`"
          :class="`preview-${card.type}`"
        >
          <img v-if="cardImage(card)" :src="cardImage(card)" alt="" />
          <Icon v-else :name="typeIcon(card.type)" />
        </span>
      </span>
      <span class="trigger-action">
        {{ cards.length ? `${cards.length} 条线索` : "开始探索" }}
        <Icon name="ph:arrow-right-bold" />
      </span>
    </button>

    <Teleport to="body">
      <Transition name="discovery-modal">
        <div
          v-if="panelOpen"
          class="discovery-overlay"
          @click.self="closePanel"
        >
          <section
            ref="panelRef"
            class="discovery-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discovery-panel-title"
          >
            <header class="panel-head">
              <span class="panel-symbol"><Icon name="ph:sparkle-bold" /></span>
              <div>
                <small>AI DISCOVERY · CONTENT COMPASS</small>
                <h2 id="discovery-panel-title">此刻想发现什么？</h2>
                <p>文章、瞬间、书影与旅途，会沿着你的问题重新相遇。</p>
              </div>
              <button
                type="button"
                class="close-button"
                title="关闭"
                @click="closePanel"
              >
                <Icon name="ph:x-bold" />
              </button>
            </header>

            <form class="discovery-composer" @submit.prevent="explore" @click="onComposerClick">
              <Icon name="ph:chat-circle-dots-bold" />
              <input
                ref="inputRef"
                v-model="query"
                maxlength="500"
                placeholder="想看一段关于旅行、阅读，或某种心情的记录…"
              />
              <button
                type="submit"
                :disabled="loading || !query.trim()"
                title="开始探索"
              >
                <Icon
                  :name="
                    loading ? 'ph:spinner-gap-bold' : 'ph:arrow-up-right-bold'
                  "
                  :class="{ spinning: loading }"
                />
              </button>
            </form>

            <div v-if="!answer && !cards.length" class="discovery-prompts">
              <button
                v-for="prompt in prompts"
                :key="prompt"
                type="button"
                @click="usePrompt(prompt)"
              >
                {{ prompt }}
              </button>
            </div>

            <div v-if="answer" class="discovery-answer" aria-live="polite">
              <span><Icon name="ph:quotes-fill" /></span>
              <div class="discovery-markdown" v-html="renderMarkdown(answer)" />
            </div>

            <div v-if="cards.length" class="discovery-results">
              <NuxtLink
                v-for="(card, index) in cards"
                :key="`${card.type}:${card.sourceId}`"
                :to="card.href"
                class="discovery-card"
                :class="`type-${card.type}`"
                :style="{ '--result-index': index }"
                @click="track(card)"
              >
                <figure>
                  <img
                    v-if="cardImage(card)"
                    :src="cardImage(card)"
                    :alt="card.title"
                    loading="lazy"
                  />
                  <Icon v-else :name="typeIcon(card.type)" />
                  <span v-if="cardImage(card)" class="type-badge" aria-hidden="true">
                    <Icon :name="typeIcon(card.type)" />
                  </span>
                </figure>
                <div class="card-body">
                  <span class="card-label">
                    <Icon :name="typeIcon(card.type)" />
                    {{ labels[card.type] || card.type }}
                  </span>
                  <strong>{{ cardTitle(card) }}</strong>
                  <p v-if="cardExcerpt(card) && canExcerpt(card.type)">
                    {{ cardExcerpt(card) }}
                  </p>
                  <time v-if="card.occurredAt && canTime(card.type)">
                    {{ formatDate(card.occurredAt) }}
                  </time>
                </div>
                <Icon name="ph:arrow-up-right-bold" class="card-arrow" />
              </NuxtLink>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import type { AiContentCard } from "~/utils/aiContent";
import { aiCardImage, cleanAiExcerpt, cleanAiTitle } from "~/utils/aiContent";

const api = useApi();
const { mediaUrl } = useMediaUrl();
const query = ref("");
const loading = ref(false);
const answer = ref("");
const cards = ref<AiContentCard[]>([]);
const panelOpen = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
});
const defaultLinkOpen = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

function renderMarkdown(content: string) {
  return markdown.render(content || "");
}

const prompts = [
  "最近适合安静读的内容",
  "关于旅行与城市的记忆",
  "随机带我逛一逛",
];
const labels: Record<string, string> = {
  post: "文章",
  moment: "瞬间",
  library: "书影",
  place: "地点",
  album: "相册",
  photo: "照片",
  journey: "旅程",
  story: "故事",
};
const icons: Record<string, string> = {
  post: "ph:article-bold",
  moment: "ph:sparkle-bold",
  library: "ph:books-bold",
  place: "ph:map-pin-bold",
  album: "ph:images-square-bold",
  photo: "ph:image-bold",
  journey: "ph:path-bold",
  story: "ph:film-strip-bold",
};
const excerptable = new Set(["post", "moment", "library", "journey", "story"]);
const timable = new Set(["moment", "place", "journey"]);

const previewCards = computed(() => cards.value.slice(0, 3));

function typeIcon(type: string) {
  return icons[type] || "ph:star-four-bold";
}

function canExcerpt(type: string) {
  return excerptable.has(type);
}

function canTime(type: string) {
  return timable.has(type);
}

function formatDate(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function cardImage(card: AiContentCard) {
  const source = aiCardImage(card);
  return source ? mediaUrl(source) : "";
}

function cardExcerpt(card: AiContentCard) {
  return cleanAiExcerpt(card.excerpt);
}

function cardTitle(card: AiContentCard) {
  return cleanAiTitle(card.title, card.type);
}

function openPanel() {
  panelOpen.value = true;
  nextTick(() => inputRef.value?.focus());
}

function closePanel() {
  panelOpen.value = false;
}

function usePrompt(prompt: string) {
  query.value = prompt;
  void explore();
}

function onComposerClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest("button")) return;
  inputRef.value?.focus();
}

async function explore() {
  if (!query.value.trim() || loading.value) return;
  loading.value = true;
  try {
    const result = await api.post<{ answer: string; cards: AiContentCard[] }>(
      "/ai/explore",
      { query: query.value.trim(), limit: 6 },
    );
    answer.value = result.answer;
    cards.value = result.cards || [];
  } catch {
    answer.value = "这次没有接收到清晰的线索，稍后再换个说法试试。";
    cards.value = [];
  } finally {
    loading.value = false;
  }
}

function track(card: AiContentCard) {
  closePanel();
  void api
    .post("/ai/events", {
      scene: "home",
      action: "recommend_click",
      contentType: card.type,
      sourceId: card.sourceId,
      href: card.href,
      sourceClicked: true,
    })
    .catch(() => undefined);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && panelOpen.value) closePanel();
}

onMounted(async () => {
  document.addEventListener("keydown", onKeydown);
  void api
    .post("/ai/events", {
      scene: "home",
      action: "exposure",
      metadata: { component: "discovery" },
    })
    .catch(() => undefined);
  try {
    const personalized = await api.get<AiContentCard[]>("/ai/personalized", {
      limit: 6,
    });
    if (personalized.length) {
      cards.value = personalized;
      answer.value =
        "根据你最近的阅读与点击，我重新整理了一条更贴近此刻的探索路线。";
    }
  } catch {
    /* personalization is optional */
  }
});

onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.discovery-entry {
  margin-bottom: 18px;
}

/* ---------- entry trigger ---------- */
.discovery-trigger {
  display: grid;
  width: 100%;
  min-height: 78px;
  grid-template-columns: 42px minmax(0, 1fr) minmax(150px, 240px) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  border-radius: 20px;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.trigger-mark,
.panel-symbol {
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--c-primary) 26%, var(--border));
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.trigger-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  font-size: 1.25rem;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--c-primary-soft) 55%, transparent);
}
.trigger-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.trigger-copy small,
.panel-head small {
  color: var(--c-primary);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}
.trigger-copy strong {
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trigger-action {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-2);
  font-size: 0.62rem;
  white-space: nowrap;
  padding-left: 8px;
}
.trigger-action :deep(svg) {
  color: var(--c-primary);
  transition: transform 0.25s ease;
}
.discovery-trigger:hover .trigger-action :deep(svg) {
  transform: translateX(3px);
}
.trigger-previews {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  height: 52px;
}
.trigger-previews > span {
  display: grid;
  width: auto;
  height: 52px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
  border-radius: 11px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  place-items: center;
}
.trigger-previews img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ---------- modal shell ---------- */
.discovery-overlay {
  position: fixed;
  z-index: 12000;
  inset: 0;
  display: grid;
  padding: 24px;
  background: rgb(6 13 24 / 60%);
  backdrop-filter: blur(13px) saturate(1.1);
  place-items: center;
}
.discovery-panel {
  width: min(980px, 100%);
  max-height: min(820px, calc(100dvh - 48px));
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 24%, var(--border));
  border-radius: 26px;
  background: color-mix(in srgb, var(--ld-bg-card) 98%, var(--c-primary-soft));
  box-shadow: 0 40px 120px rgb(0 0 0 / 38%);
}
.discovery-panel::-webkit-scrollbar {
  display: none;
}
.panel-head {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 13px;
}
.panel-symbol {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  font-size: 1.15rem;
}
.panel-head h2 {
  margin: 4px 0 3px;
  color: var(--c-text);
  font-size: 1.12rem;
}
.panel-head p {
  max-width: 540px;
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.66rem;
  line-height: 1.55;
}
.close-button {
  display: grid;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.close-button:hover {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: rotate(4deg);
}

/* ---------- composer / search input ---------- */
.discovery-composer {
  display: grid;
  min-height: 62px;
  grid-template-columns: 20px minmax(0, 1fr) 44px;
  align-items: stretch;
  gap: 10px;
  margin-top: 18px;
  padding: 8px 9px 8px 17px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border));
  border-radius: 15px;
  background: color-mix(in srgb, var(--c-bg-1) 92%, var(--c-primary-soft));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 48%, transparent),
    0 8px 22px color-mix(in srgb, var(--ld-shadow) 22%, transparent);
  cursor: text;
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;
}
.discovery-composer:focus-within {
  border-color: color-mix(in srgb, var(--c-primary) 62%, var(--border));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.discovery-composer > svg {
  align-self: center;
  color: var(--c-primary);
  font-size: 1rem;
}
.discovery-composer input {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--c-text);
  font: inherit;
  font-size: 0.78rem;
}
.discovery-composer input::placeholder {
  color: var(--c-text-3);
}
.discovery-composer button {
  display: grid;
  width: 44px;
  height: 44px;
  align-self: center;
  border: 0;
  border-radius: 12px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  place-items: center;
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.24s ease;
}
.discovery-composer button:not(:disabled):hover {
  transform: translateY(-2px) rotate(-2deg);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--c-primary) 28%, transparent);
}
.discovery-composer button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

/* ---------- prompts ---------- */
.discovery-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 11px;
}
.discovery-prompts button {
  padding: 6px 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font: inherit;
  font-size: 0.58rem;
  transition: 0.2s ease;
}
.discovery-prompts button:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

/* ---------- answer ---------- */
.discovery-answer {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  margin-top: 18px;
  padding: 15px 17px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 14%, var(--border));
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c-primary-soft) 70%, transparent),
    color-mix(in srgb, var(--ld-bg-card) 88%, transparent)
  );
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
  animation: discovery-answer-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.discovery-answer::before {
  position: absolute;
  top: -1px;
  left: 17px;
  width: 44px;
  height: 2px;
  border-radius: 2px;
  background: var(--c-primary);
  content: "";
  opacity: 0.65;
}
.discovery-answer > span {
  display: grid;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
  color: var(--c-primary);
  font-size: 0.95rem;
  place-items: center;
}
.discovery-markdown {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.7rem;
  line-height: 1.72;
}
.discovery-markdown :deep(> :first-child) {
  margin-top: 0;
}
.discovery-markdown :deep(> :last-child) {
  margin-bottom: 0;
}
.discovery-markdown :deep(p) {
  margin: 0 0 0.55em;
}
.discovery-markdown :deep(ul),
.discovery-markdown :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.discovery-markdown :deep(a) {
  color: var(--c-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---------- results grid ---------- */
.discovery-results {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

/* ---------- base card ---------- */
.discovery-card {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 132px;
  grid-column: span 6;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 13px;
  padding: 9px 38px 9px 9px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 16px;
  background: var(--ld-bg-card);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 5px 16px color-mix(in srgb, var(--ld-shadow) 20%, transparent);
  will-change: transform, opacity;
  transition:
    border-color 0.25s ease,
    box-shadow 0.3s ease,
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: discovery-card-in 0.55s
    calc(var(--result-index) * 55ms) cubic-bezier(0.22, 1, 0.36, 1) both;
}
.discovery-card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 42%, var(--border));
  box-shadow: 0 15px 30px color-mix(in srgb, var(--c-primary) 12%, var(--ld-shadow));
  transform: translateY(-4px);
}
.discovery-card figure {
  display: grid;
  position: relative;
  min-height: 112px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  font-size: 1.45rem;
  place-items: center;
}
.discovery-card figure img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-card:hover figure img {
  transform: scale(1.06);
}
.type-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  display: grid;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  color: var(--type-color, var(--c-primary));
  font-size: 0.72rem;
  box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
  place-items: center;
  backdrop-filter: blur(6px);
}
.card-body {
  display: flex;
  min-width: 0;
  justify-content: center;
  flex-direction: column;
}
.card-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--type-color, var(--c-primary));
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.discovery-card strong {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.74rem;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.discovery-card p {
  display: -webkit-box;
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.6rem;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.discovery-card time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  color: var(--type-color, var(--c-primary));
  font-size: 0.54rem;
  opacity: 0.85;
}
.discovery-card time::before {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--type-color, var(--c-primary));
  content: "";
  opacity: 0.7;
}
.card-arrow {
  position: absolute;
  top: 12px;
  right: 11px;
  color: var(--c-primary);
  font-size: 0.75rem;
  transition: transform 0.25s ease;
}
.discovery-card:hover .card-arrow {
  transform: translate(2px, -2px);
}

/* ---------- type layouts ---------- */
.discovery-card {
  --type-color: var(--c-primary);
}
.discovery-card.type-post {
  --type-color: hsl(220deg 100% 55%);
}
.discovery-card.type-moment {
  --type-color: hsl(40deg 92% 52%);
  grid-column: span 6;
  grid-template-columns: 158px minmax(0, 1fr);
  min-height: 150px;
  padding: 9px 38px 9px 9px;
}
.discovery-card.type-moment figure {
  min-height: 130px;
}
.discovery-card.type-library {
  --type-color: hsl(165deg 55% 42%);
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  gap: 0;
  min-height: 0;
  padding: 0;
}
.discovery-card.type-library figure {
  height: 148px;
  border-radius: 0;
}
.discovery-card.type-library .card-body {
  padding: 12px 15px 14px;
}
.discovery-card.type-library strong {
  -webkit-line-clamp: 1;
}
.discovery-card.type-place {
  --type-color: hsl(14deg 85% 55%);
  grid-column: span 3;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 10px;
  min-height: 96px;
  padding: 12px 26px 12px 12px;
}
.discovery-card.type-place figure {
  min-height: 46px;
  border-radius: 12px;
  font-size: 1.05rem;
}
.discovery-card.type-journey {
  --type-color: hsl(130deg 45% 42%);
  grid-column: span 3;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 10px;
  min-height: 96px;
  padding: 12px 26px 12px 12px;
}
.discovery-card.type-journey figure {
  min-height: 46px;
  border-radius: 12px;
  font-size: 1.05rem;
}
.discovery-card.type-story {
  --type-color: hsl(240deg 55% 62%);
  grid-column: span 3;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 10px;
  min-height: 96px;
  padding: 12px 26px 12px 12px;
}
.discovery-card.type-story figure {
  min-height: 46px;
  border-radius: 12px;
  font-size: 1.05rem;
}
.discovery-card.type-place .card-label,
.discovery-card.type-journey .card-label,
.discovery-card.type-story .card-label {
  font-size: 0.48rem;
}
.discovery-card.type-place strong,
.discovery-card.type-journey strong,
.discovery-card.type-story strong {
  -webkit-line-clamp: 2;
}
.discovery-card.type-album {
  --type-color: hsl(270deg 55% 58%);
  grid-column: span 6;
  min-height: 214px;
  grid-template-columns: 1fr;
  padding: 0;
}
.discovery-card.type-album figure {
  position: absolute;
  inset: 0;
  min-height: 214px;
  border-radius: inherit;
}
.discovery-card.type-album figure::after {
  position: absolute;
  inset: 42% 0 0;
  background: linear-gradient(transparent, rgb(0 0 0 / 74%));
  content: "";
}
.discovery-card.type-album .card-body {
  position: relative;
  z-index: 1;
  align-self: end;
  padding: 18px;
}
.discovery-card.type-album .card-label,
.discovery-card.type-album strong {
  color: #fff;
}
.discovery-card.type-album .type-badge {
  background: rgb(255 255 255 / 22%);
  color: #fff;
  backdrop-filter: blur(8px);
}
.discovery-card.type-photo {
  --type-color: hsl(330deg 75% 55%);
  grid-column: span 3;
  min-height: 214px;
  grid-template-columns: 1fr;
  padding: 0;
}
.discovery-card.type-photo figure {
  position: absolute;
  inset: 0;
  min-height: 214px;
  border-radius: inherit;
}
.discovery-card.type-photo .card-body {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 1;
  padding: 34px 14px 12px;
  background: linear-gradient(transparent, rgb(0 0 0 / 72%));
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.3s ease,
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-card.type-photo:hover .card-body {
  opacity: 1;
  transform: translateY(0);
}
.discovery-card.type-photo .card-label,
.discovery-card.type-photo strong {
  color: #fff;
}
.discovery-card.type-photo .type-badge {
  background: rgb(255 255 255 / 22%);
  color: #fff;
  backdrop-filter: blur(8px);
}
.discovery-card.type-photo .card-arrow {
  top: 13px;
  right: 13px;
  color: #fff;
  filter: drop-shadow(0 1px 3px rgb(0 0 0 / 50%));
}
.discovery-card.type-album .card-arrow {
  top: 13px;
  right: 13px;
  color: #fff;
  filter: drop-shadow(0 1px 3px rgb(0 0 0 / 50%));
}
.discovery-card.type-place .type-badge,
.discovery-card.type-journey .type-badge,
.discovery-card.type-story .type-badge {
  display: none;
}

/* ---------- animations ---------- */
@keyframes discovery-card-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  62% {
    transform: translateY(-1px) scale(1.002);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes discovery-answer-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
.discovery-modal-enter-active {
  transition: opacity 0.3s ease;
}
.discovery-modal-leave-active {
  transition: opacity 0.2s ease;
}
.discovery-modal-enter-active .discovery-panel {
  transition:
    opacity 0.42s ease,
    transform 0.56s cubic-bezier(0.22, 1, 0.36, 1);
}
.discovery-modal-leave-active .discovery-panel {
  transition:
    opacity 0.18s ease,
    transform 0.26s cubic-bezier(0.55, 0, 0.55, 0.2);
}
.discovery-modal-enter-from,
.discovery-modal-leave-to {
  opacity: 0;
}
.discovery-modal-enter-from .discovery-panel {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
.discovery-modal-leave-to .discovery-panel {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}
.spinning {
  animation: discovery-spin 0.8s linear infinite;
}
@keyframes discovery-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- responsive ---------- */
@media (max-width: 780px) {
  .discovery-panel {
    padding: 18px;
    border-radius: 22px;
  }
  .discovery-card,
  .discovery-card.type-moment,
  .discovery-card.type-album {
    grid-column: span 6;
  }
  .discovery-card.type-photo,
  .discovery-card.type-place,
  .discovery-card.type-journey,
  .discovery-card.type-story {
    grid-column: span 3;
  }
}

@media (max-width: 560px) {
  .discovery-overlay {
    align-items: end;
    padding: 8px;
  }
  .discovery-panel {
    max-height: calc(100dvh - 16px);
    padding: 16px;
    border-radius: 22px 22px 16px 16px;
  }
  .discovery-trigger {
    grid-template-columns: 40px minmax(0, 1fr) auto;
  }
  .trigger-previews {
    display: none;
  }
  .trigger-action {
    font-size: 0;
  }
  .trigger-action :deep(svg) {
    font-size: 0.9rem;
  }
  .panel-head {
    grid-template-columns: 40px minmax(0, 1fr) 32px;
  }
  .panel-symbol {
    width: 40px;
    height: 40px;
  }
  .panel-head p {
    display: none;
  }
  .discovery-results {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .discovery-card,
  .discovery-card.type-moment,
  .discovery-card.type-album,
  .discovery-card.type-photo,
  .discovery-card.type-place,
  .discovery-card.type-journey,
  .discovery-card.type-story {
    grid-column: span 2;
  }
  .discovery-card.type-moment {
    grid-template-columns: 120px minmax(0, 1fr);
  }
  .discovery-card.type-library {
    grid-template-columns: 1fr;
  }
  .discovery-card.type-photo,
  .discovery-card.type-album {
    min-height: 190px;
  }
  .discovery-card.type-photo figure,
  .discovery-card.type-album figure {
    min-height: 190px;
  }
  .discovery-composer {
    margin-top: 16px;
    padding-left: 12px;
  }
  .discovery-composer input {
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-trigger,
  .discovery-card,
  .discovery-answer,
  .discovery-modal-enter-active,
  .discovery-modal-leave-active,
  .discovery-modal-enter-active .discovery-panel,
  .discovery-modal-leave-active .discovery-panel {
    transition: none;
    animation: none;
  }
  .spinning {
    animation: none;
  }
}
</style>
