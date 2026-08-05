<template>
  <section class="discovery-entry" aria-labelledby="ai-discovery-title">
    <button
      type="button"
      class="discovery-trigger"
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

            <form class="discovery-composer" @submit.prevent="explore">
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
                v-for="card in cards"
                :key="`${card.type}:${card.sourceId}`"
                :to="card.href"
                class="discovery-card"
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
                </figure>
                <div>
                  <span>{{ labels[card.type] || card.type }}</span>
                  <strong>{{ cardTitle(card) }}</strong>
                  <p v-if="cardExcerpt(card)">{{ cardExcerpt(card) }}</p>
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

const previewCards = computed(() => cards.value.slice(0, 3));

function typeIcon(type: string) {
  return icons[type] || "ph:star-four-bold";
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
.discovery-trigger {
  display: grid;
  width: 100%;
  min-height: 66px;
  grid-template-columns: 42px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 20%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 94%, var(--c-primary-soft));
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ld-shadow) 58%, transparent);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.25s ease,
    box-shadow 0.35s ease,
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-trigger:hover {
  border-color: color-mix(in srgb, var(--c-primary) 48%, var(--border));
  box-shadow: 0 14px 34px
    color-mix(in srgb, var(--c-primary) 12%, var(--ld-shadow));
  transform: translateY(-2px);
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
  border-radius: 8px;
  font-size: 1.05rem;
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
  letter-spacing: 0;
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
}
.trigger-action :deep(svg) {
  color: var(--c-primary);
  transition: transform 0.25s ease;
}
.discovery-trigger:hover .trigger-action :deep(svg) {
  transform: translateX(3px);
}
.trigger-previews {
  display: flex;
  padding-left: 10px;
}
.trigger-previews > span {
  display: grid;
  width: 30px;
  height: 30px;
  margin-left: -10px;
  overflow: hidden;
  border: 2px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-bg-2);
  color: var(--c-primary);
  place-items: center;
}
.trigger-previews img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.discovery-overlay {
  position: fixed;
  z-index: 12000;
  inset: 0;
  display: grid;
  padding: 24px;
  background: rgb(4 12 24 / 54%);
  backdrop-filter: blur(9px);
  place-items: center;
}
.discovery-panel {
  width: min(820px, 100%);
  max-height: min(760px, calc(100dvh - 48px));
  overflow-y: auto;
  padding: 22px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 24%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft));
  box-shadow: 0 34px 100px rgb(0 0 0 / 34%);
}
.panel-head {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 34px;
  align-items: start;
  gap: 13px;
}
.panel-symbol {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  font-size: 1.15rem;
}
.panel-head h2 {
  margin: 4px 0 3px;
  color: var(--c-text);
  font-size: 1.18rem;
}
.panel-head p {
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
.discovery-composer {
  display: grid;
  min-height: 54px;
  grid-template-columns: 20px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  padding: 7px 8px 7px 15px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border));
  border-radius: 8px;
  background: var(--c-bg-1);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent);
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}
.discovery-composer:focus-within {
  border-color: color-mix(in srgb, var(--c-primary) 62%, var(--border));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.discovery-composer > svg {
  color: var(--c-primary);
  font-size: 1rem;
}
.discovery-composer input {
  min-width: 0;
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
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  place-items: center;
}
.discovery-composer button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
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
.discovery-answer {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 9px;
  margin-top: 16px;
  padding: 12px 14px;
  border-left: 2px solid var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 58%, transparent);
}
.discovery-answer > span {
  color: var(--c-primary);
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
.discovery-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.discovery-card {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 104px;
  grid-template-columns: 94px minmax(0, 1fr);
  gap: 11px;
  padding: 8px 34px 8px 8px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 8px;
  background: var(--ld-bg-card);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.25s ease,
    box-shadow 0.3s ease,
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 42%, var(--border));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--ld-shadow) 72%, transparent);
  transform: translateY(-2px);
}
.discovery-card figure {
  display: grid;
  min-height: 86px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  font-size: 1.45rem;
  place-items: center;
}
.discovery-card figure img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-card:hover figure img {
  transform: scale(1.055);
}
.discovery-card > div {
  display: flex;
  min-width: 0;
  justify-content: center;
  flex-direction: column;
}
.discovery-card > div > span {
  color: var(--c-primary);
  font-size: 0.5rem;
}
.discovery-card strong {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.72rem;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.discovery-card p {
  display: -webkit-box;
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.57rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.card-arrow {
  position: absolute;
  top: 12px;
  right: 11px;
  color: var(--c-primary);
  font-size: 0.75rem;
}
.discovery-modal-enter-active {
  transition: opacity 0.3s ease;
}
.discovery-modal-leave-active {
  transition: opacity 0.22s ease;
}
.discovery-modal-enter-active .discovery-panel {
  transition:
    opacity 0.38s ease,
    transform 0.58s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-modal-leave-active .discovery-panel {
  transition:
    opacity 0.2s ease,
    transform 0.28s ease;
}
.discovery-modal-enter-from,
.discovery-modal-leave-to {
  opacity: 0;
}
.discovery-modal-enter-from .discovery-panel {
  opacity: 0;
  transform: translateY(24px) scale(0.975);
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
@media (max-width: 700px) {
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
  .discovery-overlay {
    align-items: end;
    padding: 10px;
  }
  .discovery-panel {
    max-height: calc(100dvh - 20px);
    padding: 17px;
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
    grid-template-columns: 1fr;
  }
  .discovery-card {
    grid-template-columns: 82px minmax(0, 1fr);
  }
  .discovery-composer {
    margin-top: 16px;
    padding-left: 11px;
  }
  .discovery-composer input {
    font-size: 0.72rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .discovery-trigger,
  .discovery-card,
  .discovery-modal-enter-active,
  .discovery-modal-leave-active,
  .discovery-modal-enter-active .discovery-panel,
  .discovery-modal-leave-active .discovery-panel {
    transition: none;
  }
  .spinning {
    animation: none;
  }
}
</style>
