<template>
  <div class="guestbook-page">
    <ContentPageHero
      variant="guestbook"
      eyebrow="TIME GUESTBOOK"
      title="时光留言"
      description="写下此刻的风、路上的一句话，或只是打个招呼——它们会被留在时光的墙上，被后来的旅人读到。"
      icon="ph:chat-circle-dots-bold"
      :metric="wall.total || undefined"
      metric-label="条留言"
    />

    <div class="gb-tabs" role="tablist" aria-label="留言板板块">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'wall'"
        :class="{ active: activeTab === 'wall' }"
        @click="activeTab = 'wall'"
      >
        <Icon name="ph:chat-circle-dots-bold" />留言墙
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'bottles'"
        :class="{ active: activeTab === 'bottles' }"
        @click="activeTab = 'bottles'"
      >
        <Icon name="ph:sailboat-bold" />漂流瓶
      </button>
    </div>

    <!-- ================= 留言墙 ================= -->
    <section v-show="activeTab === 'wall'" class="wall-pane">
      <div class="wall-composer ui-card content-reveal">
        <div class="composer-quill" aria-hidden="true">
          <Icon name="ph:pen-nib-bold" />
        </div>
        <textarea
          v-model="draft"
          class="composer-text"
          rows="3"
          maxlength="200"
          placeholder="留一句话给未来路过的人……"
          @keydown.enter.exact.prevent="submitMessage"
        ></textarea>
        <footer class="composer-foot">
          <span class="composer-identity">
            <Icon name="ph:user-circle-bold" />
            <input
              v-model.trim="nameDraft"
              class="composer-name"
              maxlength="20"
              placeholder="署名（可留空）"
            />
          </span>
          <span class="composer-right">
            <b :class="{ warn: draft.length > 180 }">{{ draft.length }}/200</b>
            <button
              type="button"
              class="composer-send"
              :disabled="posting || !draft.trim()"
              @click="submitMessage"
            >
              <Icon
                :name="
                  posting ? 'ph:circle-notch-bold' : 'ph:paper-plane-tilt-bold'
                "
                :spin="posting"
              />
              {{ posting ? "正在投递" : "贴上墙" }}
            </button>
          </span>
        </footer>
      </div>

      <div v-if="loadingWall && !wall.items.length" class="wall-loading">
        <Icon name="ph:circle-notch-bold" spin />
        <span>正在取下墙上的留言…</span>
      </div>

      <div v-else-if="wall.items.length" class="msg-masonry content-reveal">
        <article
          v-for="(msg, index) in wall.items"
          :key="msg.id"
          class="msg-card"
          :style="{ '--msg-delay': `${Math.min(index, 12) * 45}ms` }"
        >
          <span class="msg-quote" aria-hidden="true">“</span>
          <p class="msg-content">{{ msg.content }}</p>
          <footer class="msg-foot">
            <span class="msg-author">
              <i class="msg-dot" aria-hidden="true" />
              {{ msg.nickname }}
            </span>
            <span class="msg-meta">
              <span v-if="msg.originRegion" class="msg-region">
                <Icon name="ph:map-pin-bold" />{{ msg.originRegion }}
              </span>
              <time>{{ shortTime(msg.createdAt) }}</time>
            </span>
          </footer>
        </article>
      </div>

      <div v-else class="wall-empty">
        <Icon name="ph:chat-circle-dots-bold" />
        <p>墙上还没有留言，来做第一个留下痕迹的人吧。</p>
      </div>

      <div v-if="wall.items.length < wall.total" class="wall-more">
        <button type="button" :disabled="loadingWall" @click="loadMoreMessages">
          <Icon
            :name="loadingWall ? 'ph:circle-notch-bold' : 'ph:caret-down-bold'"
            :spin="loadingWall"
          />
          {{
            loadingWall
              ? "正在取"
              : `还有 ${wall.total - wall.items.length} 条 · 继续看`
          }}
        </button>
      </div>
    </section>

    <!-- ================= 漂流瓶 ================= -->
    <section v-show="activeTab === 'bottles'" class="bottles-pane">
      <div class="sea-stage content-reveal">
        <SeaScene
          ref="seaRef"
          class="sea-scene"
          :disabled="
            fishing || !!caughtBottle || quota.fishUsed >= quota.fishLimit
          "
          @fish="onFish"
        />
        <div class="sea-copy">
          <span class="sea-kicker">THE TIME SEA · 时光海</span>
          <h2>海面之下，漂着来自陌生时刻的信</h2>
          <div class="sea-quota" aria-live="polite">
            <span :class="{ exhausted: quota.fishUsed >= quota.fishLimit }">
              <Icon name="ph:anchor-bold" />打捞 {{ quota.fishUsed }}/{{
                quota.fishLimit
              }}
            </span>
            <span :class="{ exhausted: quota.throwUsed >= quota.throwLimit }">
              <Icon name="ph:sailboat-bold" />投入 {{ quota.throwUsed }}/{{
                quota.throwLimit
              }}
            </span>
          </div>
        </div>
        <div class="sea-hint" :class="{ dim: fishing || !!caughtBottle }">
          <Icon name="ph:hand-tap-bold" />
          {{
            quota.fishUsed >= quota.fishLimit
              ? "今日打捞次数已用完"
              : "点击海面，捞起一只瓶子"
          }}
        </div>
      </div>

      <div class="sea-actions">
        <button
          type="button"
          class="sea-action primary"
          :disabled="
            throwingOpen ||
            !!caughtBottle ||
            quota.throwUsed >= quota.throwLimit
          "
          @click="throwingOpen = true"
        >
          <Icon name="ph:sailboat-bold" />
          {{
            quota.throwUsed >= quota.throwLimit
              ? "今日瓶子已投完"
              : "写一瓶心事，投入海里"
          }}
        </button>
      </div>

      <!-- 投瓶面板 -->
      <Transition name="throw-slide">
        <div v-if="throwingOpen" class="throw-panel ui-card">
          <header>
            <strong><Icon name="ph:pen-nib-bold" />写点什么，卷进瓶子里</strong>
            <button
              type="button"
              aria-label="收起"
              @click="throwingOpen = false"
            >
              <Icon name="ph:x-bold" />
            </button>
          </header>
          <textarea
            v-model="throwText"
            rows="3"
            maxlength="200"
            placeholder="一句没说出口的话、一个秘密、或给陌生人的祝福……"
          ></textarea>
          <footer>
            <b>{{ throwText.length }}/200</b>
            <button
              type="button"
              class="composer-send"
              :disabled="throwing || !throwText.trim()"
              @click="submitThrow"
            >
              <Icon
                :name="throwing ? 'ph:circle-notch-bold' : 'ph:sailboat-bold'"
                :spin="throwing"
              />
              {{ throwing ? "正在启航" : "投入海里" }}
            </button>
          </footer>
        </div>
      </Transition>

      <!-- 打捞到的信 -->
      <Transition name="letter-pop">
        <article v-if="caughtBottle" class="letter-card ui-card">
          <button
            type="button"
            class="letter-close"
            title="合上信纸，放回海里"
            aria-label="关闭并放回海里"
            @click="releaseCaught"
          >
            <Icon name="ph:x-bold" />
          </button>
          <div class="letter-head">
            <span class="letter-seal"><Icon name="ph:anchor-fill" /></span>
            <div>
              <strong>一封来自海上的信</strong>
              <span class="letter-meta">
                <Icon name="ph:user-circle-bold" />{{ caughtBottle.nickname }}
                <i aria-hidden="true" />
                <Icon name="ph:map-pin-bold" />{{
                  caughtBottle.originRegion || "神秘海岸"
                }}
                <i aria-hidden="true" />
                <Icon name="ph:clock-bold" />{{
                  shortTime(caughtBottle.createdAt)
                }}投入
                <template v-if="caughtBottle.catchCount > 1">
                  <i aria-hidden="true" />
                  <Icon name="ph:hands-clapping-bold" />已被捞起
                  {{ caughtBottle.catchCount }} 次
                </template>
              </span>
            </div>
          </div>

          <div class="letter-paper">
            <template v-if="chainSegments.length">
              <p v-for="seg in chainSegments" :key="seg.id" class="letter-line">
                <span class="letter-who">{{ seg.nickname }}：</span
                >{{ seg.content }}
              </p>
            </template>
            <p class="letter-line is-main">{{ caughtBottle.content }}</p>
          </div>

          <div class="letter-actions">
            <button
              type="button"
              class="letter-btn relay"
              :disabled="quota.throwUsed >= quota.throwLimit"
              @click="relayMode = !relayMode"
            >
              <Icon name="ph:arrows-clockwise-bold" />接力一句话
            </button>
            <button
              type="button"
              class="letter-btn"
              :disabled="releasing"
              @click="releaseCaught"
            >
              <Icon
                :name="
                  releasing
                    ? 'ph:circle-notch-bold'
                    : 'ph:arrow-u-down-left-bold'
                "
                :spin="releasing"
              />
              {{ releasing ? "交还潮汐…" : "原样放回海里" }}
            </button>
          </div>
          <Transition name="throw-slide">
            <div v-if="relayMode" class="relay-box">
              <textarea
                v-model="relayText"
                rows="2"
                maxlength="200"
                placeholder="把一句新的话接在信尾，再交给下一位旅人……"
              ></textarea>
              <button
                type="button"
                class="composer-send"
                :disabled="relaying || !relayText.trim()"
                @click="submitRelay"
              >
                <Icon
                  :name="
                    relaying
                      ? 'ph:circle-notch-bold'
                      : 'ph:paper-plane-tilt-bold'
                  "
                  :spin="relaying"
                />
                {{ relaying ? "正在接力" : "接下去" }}
              </button>
            </div>
          </Transition>
        </article>
      </Transition>

      <div v-if="seaEmpty" class="sea-empty">
        <Icon name="ph:sailboat-bold" />
        <p>海面上暂时没有瓶子——不如投出第一封？</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { useVisitor } from "@/composables/useVisitor";
import type { BottleChainSegment } from "@/composables/useVisitor";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const api = useApi();
const toast = useToast();
const {
  nickname: serverNickname,
  identify,
  fetchMessages,
  sendMessage,
  fetchBottleQuota,
  throwBottle,
  fishBottle,
  releaseBottle,
} = useVisitor();

const activeTab = ref<"wall" | "bottles">("wall");

/* ---------------- 留言墙 ---------------- */
const wall = ref<{
  items: Array<{
    id: string;
    content: string;
    nickname: string;
    originRegion: string | null;
    createdAt: string;
  }>;
  total: number;
}>({
  items: [],
  total: 0,
});
const loadingWall = ref(false);
const posting = ref(false);
const draft = ref("");
const nameDraft = ref("");
const PAGE_SIZE = 24;

function shortTime(value: string) {
  const at = dayjs(value);
  if (dayjs().diff(at, "day") < 7) return at.fromNow();
  return at.format("YYYY-MM-DD");
}

async function loadMessages(reset = false) {
  if (loadingWall.value) return;
  loadingWall.value = true;
  try {
    const page = reset
      ? 1
      : Math.floor(wall.value.items.length / PAGE_SIZE) + 1;
    const result = await fetchMessages(page, PAGE_SIZE);
    wall.value = {
      items: reset ? result.items : [...wall.value.items, ...result.items],
      total: result.total,
    };
  } catch (error: any) {
    toast.error(error?.message || "留言取不下来了，稍后再试");
  } finally {
    loadingWall.value = false;
  }
}

function loadMoreMessages() {
  void loadMessages(false);
}

async function submitMessage() {
  const content = draft.value.trim();
  if (!content || posting.value) return;
  posting.value = true;
  try {
    const result = await sendMessage({
      content,
      nickname: nameDraft.value || undefined,
    });
    draft.value = "";
    if (result.moderated) {
      toast.info("留言已提交，通过审核后会出现在墙上");
    } else {
      toast.success("已贴上留言墙");
      wall.value.items.unshift({
        id: result.id,
        content,
        nickname: nameDraft.value || serverNickname.value || "神秘旅人",
        originRegion: null,
        createdAt: new Date().toISOString(),
      });
      wall.value.total += 1;
    }
  } catch (error: any) {
    toast.error(error?.message || "没贴上去，再试一次");
  } finally {
    posting.value = false;
  }
}

/* ---------------- 漂流瓶 ---------------- */
const SeaScene = defineAsyncComponent(
  () => import("@/components/SeaScene.vue"),
);
const seaRef = ref<{ launch: () => void } | null>(null);
const quota = ref({ throwLimit: 3, throwUsed: 0, fishLimit: 8, fishUsed: 0 });
const fishing = ref(false);
const throwingOpen = ref(false);
const throwing = ref(false);
const throwText = ref("");
const caughtBottle = ref<null | {
  id: string;
  content: string;
  nickname: string;
  originRegion: string | null;
  createdAt: string;
  catchCount: number;
  chain?: BottleChainSegment[];
}>(null);
const relayMode = ref(false);
const relayText = ref("");
const relaying = ref(false);
const releasing = ref(false);
const seaEmpty = ref(false);

const chainSegments = computed(() => {
  if (!caughtBottle.value?.chain?.length) return [];
  return caughtBottle.value.chain;
});

async function refreshQuota() {
  try {
    quota.value = await fetchBottleQuota();
  } catch {
    /* 静默 */
  }
}

async function onFish() {
  if (fishing.value || caughtBottle.value) return;
  fishing.value = true;
  seaEmpty.value = false;
  try {
    const bottle = await fishBottle();
    if (!bottle) {
      seaEmpty.value = true;
      toast.info("海面上暂时没有瓶子，投出一封吧");
      return;
    }
    caughtBottle.value = bottle;
    relayMode.value = false;
    relayText.value = "";
    quota.value = { ...quota.value, fishUsed: quota.value.fishUsed + 1 };
  } catch (error: any) {
    toast.error(error?.message || "打捞落空了，再试一次");
  } finally {
    fishing.value = false;
  }
}

async function submitThrow() {
  const content = throwText.value.trim();
  if (!content || throwing.value) return;
  throwing.value = true;
  try {
    const result = await throwBottle(content);
    throwText.value = "";
    throwingOpen.value = false;
    quota.value = result.quota || quota.value;
    if (result.moderated) {
      toast.info("瓶子已交给潮汐，通过审核后会漂向大海");
    } else {
      toast.success("瓶子已投入海里，等一位有缘的旅人");
      seaRef.value?.launch();
    }
  } catch (error: any) {
    toast.error(error?.message || "瓶子没能出手，再试一次");
  } finally {
    throwing.value = false;
  }
}

async function submitRelay() {
  if (!caughtBottle.value || !relayText.value.trim() || relaying.value) return;
  relaying.value = true;
  try {
    const result = await throwBottle(
      relayText.value.trim(),
      caughtBottle.value.id,
    );
    caughtBottle.value.chain = [
      ...(caughtBottle.value.chain || []),
      {
        id: caughtBottle.value.id,
        content: caughtBottle.value.content,
        nickname: caughtBottle.value.nickname,
        originRegion: caughtBottle.value.originRegion,
        createdAt: caughtBottle.value.createdAt,
      },
    ];
    caughtBottle.value = {
      ...caughtBottle.value,
      id: result.id,
      content: relayText.value.trim(),
      nickname: serverNickname.value || "我",
      originRegion: null,
      createdAt: new Date().toISOString(),
      catchCount: 0,
      chain: caughtBottle.value.chain,
    };
    relayText.value = "";
    relayMode.value = false;
    quota.value = result.quota || quota.value;
    toast.success("信已接力下去，故事还在继续");
  } catch (error: any) {
    toast.error(error?.message || "接力失败，再试一次");
  } finally {
    relaying.value = false;
  }
}

async function releaseCaught() {
  if (!caughtBottle.value || releasing.value) return;
  releasing.value = true;
  try {
    await releaseBottle(caughtBottle.value.id);
    caughtBottle.value = null;
    relayMode.value = false;
    toast.success("已放回海里，让它继续漂流");
  } catch (error: any) {
    toast.error(error?.message || "没能放回去，稍后再试");
  } finally {
    releasing.value = false;
  }
}

onMounted(() => {
  void identify();
  void loadMessages(true);
  void refreshQuota();
});
</script>

<style scoped>
.guestbook-page {
  width: 100%;
  height: 100%;
  max-width: 1080px;
  min-height: 0;
  margin: 0 auto;
  padding: 0 22px 72px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
}

/* ---- tabs ---- */
.gb-tabs {
  position: sticky;
  z-index: 30;
  top: 12px;
  display: inline-flex;
  gap: 4px;
  margin-bottom: 22px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.gb-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.gb-tabs button:hover {
  color: var(--c-text);
}

.gb-tabs button.active {
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 62%, transparent);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--ld-shadow) 22%, transparent);
}

/* ---- 留言墙 composer ---- */
.wall-composer {
  position: relative;
  padding: 18px 20px 14px;
  margin-bottom: 26px;
  overflow: hidden;
}

.composer-quill {
  position: absolute;
  top: -14px;
  right: 14px;
  color: var(--c-primary);
  font-size: 4.6rem;
  opacity: 0.08;
  transform: rotate(12deg);
}

.composer-text {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-text);
  font: inherit;
  font-family: var(--font-summary);
  font-size: 0.92rem;
  line-height: 1.8;
  letter-spacing: 0.02em;
  resize: none;
  outline: none;
}

.composer-text::placeholder {
  color: var(--c-text-3);
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
}

.composer-identity {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--c-text-2);
  font-size: 0.74rem;
}

.composer-name {
  width: 140px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-bg-1) 74%, transparent);
  color: var(--c-text);
  font: inherit;
  font-size: 0.72rem;
  outline: none;
  transition: border-color 0.16s ease;
}

.composer-name:focus {
  border-color: color-mix(in srgb, var(--c-primary) 55%, transparent);
}

.composer-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.composer-right b {
  color: var(--c-text-3);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}

.composer-right b.warn {
  color: var(--ui-accent-warm);
}

.composer-send {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: 0;
  border-radius: 11px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 650;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.composer-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--c-primary) 32%, transparent);
}

.composer-send:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---- 留言墙 masonry ---- */
.msg-masonry {
  columns: 3 240px;
  column-gap: 14px;
}

.msg-card {
  position: relative;
  break-inside: avoid;
  margin-bottom: 14px;
  padding: 20px 18px 14px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 16px;
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-soft);
  opacity: 0;
  animation: msg-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--msg-delay, 0ms)
    forwards;
  transition:
    transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

@media (hover: hover) {
  .msg-card:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--c-primary) 26%, transparent);
    box-shadow: 0 18px 40px
      color-mix(in srgb, var(--ld-shadow) 38%, transparent);
  }
}

.msg-quote {
  position: absolute;
  top: 2px;
  left: 12px;
  color: var(--c-primary);
  font-family: Georgia, serif;
  font-size: 2.6rem;
  line-height: 1;
  opacity: 0.14;
  pointer-events: none;
}

.msg-content {
  margin: 0;
  color: var(--c-text-1);
  font-family: var(--font-summary);
  font-size: 0.84rem;
  line-height: 1.85;
  letter-spacing: 0.02em;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.msg-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.msg-author {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--c-text);
  font-size: 0.7rem;
  font-weight: 650;
}

.msg-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 40%, #fff)
  );
}

.msg-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: 0.62rem;
}

.msg-region {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.wall-loading,
.wall-empty,
.sea-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 60px 20px;
  color: var(--c-text-3);
  font-size: 0.76rem;
  text-align: center;
}

.wall-loading :deep(svg),
.wall-empty :deep(svg),
.sea-empty :deep(svg) {
  font-size: 2rem;
  color: var(--c-primary);
  opacity: 0.6;
}

.wall-more {
  display: grid;
  justify-items: center;
  margin-top: 8px;
}

.wall-more button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 22px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  transition:
    color 0.16s ease,
    border-color 0.16s ease;
}

.wall-more button:hover:not(:disabled) {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 46%, transparent);
}

/* ---- 漂流瓶 ---- */
.sea-stage {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: var(--ui-radius-hero);
  box-shadow: var(--ui-shadow-panel);
}

.sea-scene {
  display: block;
  height: clamp(300px, 44vh, 430px);
}

.sea-copy {
  position: absolute;
  top: 22px;
  left: 26px;
  pointer-events: none;
}

.sea-kicker {
  color: rgba(255, 255, 255, 0.82);
  font-family: var(--font-accent);
  font-size: 0.54rem;
  font-weight: 760;
  letter-spacing: 0.22em;
  text-shadow: 0 2px 12px rgba(10, 30, 50, 0.5);
}

.sea-copy h2 {
  margin: 8px 0 0;
  color: #fff;
  font-family: var(--font-heading);
  font-size: clamp(1.05rem, 2.4vw, 1.5rem);
  letter-spacing: 0.04em;
  text-shadow: 0 2px 18px rgba(10, 30, 50, 0.55);
}

.sea-quota {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  pointer-events: auto;
}

.sea-quota span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 99px;
  background: rgba(10, 30, 50, 0.34);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.64rem;
  font-variant-numeric: tabular-nums;
}

.sea-quota span.exhausted {
  color: rgba(255, 255, 255, 0.55);
}

.sea-hint {
  position: absolute;
  right: 26px;
  bottom: 20px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 99px;
  background: rgba(10, 30, 50, 0.34);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.66rem;
  transition: opacity 0.3s ease;
}

.sea-hint.dim {
  opacity: 0.45;
}

.sea-actions {
  display: flex;
  justify-content: center;
  margin: 18px 0 6px;
}

.sea-action.primary {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 26px;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(
    135deg,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 68%, #0b1c30)
  );
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 680;
  letter-spacing: 0.04em;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    opacity 0.2s ease;
}

.sea-action.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--c-primary) 34%, transparent);
}

.sea-action.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 投瓶面板 */
.throw-panel {
  margin-top: 14px;
  padding: 16px 18px 14px;
}

.throw-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--c-text);
  font-size: 0.8rem;
}

.throw-panel header button {
  display: grid;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-bg-2) 74%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
}

.throw-panel textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-bg-1) 70%, transparent);
  color: var(--c-text);
  font: inherit;
  font-family: var(--font-summary);
  font-size: 0.84rem;
  line-height: 1.8;
  resize: vertical;
  outline: none;
  transition: border-color 0.16s ease;
}

.throw-panel textarea:focus {
  border-color: color-mix(in srgb, var(--c-primary) 55%, transparent);
}

.throw-panel footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

.throw-panel footer b {
  color: var(--c-text-3);
  font-size: 0.66rem;
}

.throw-slide-enter-active,
.throw-slide-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.throw-slide-enter-from,
.throw-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 捞到的信 */
.letter-card {
  position: relative;
  margin-top: 16px;
  padding: 22px 24px 18px;
  border-radius: 18px;
  overflow: hidden;
}

.letter-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-bg-2) 76%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
  transition:
    color 0.16s ease,
    transform 0.16s ease;
}

.letter-close:hover {
  color: var(--c-primary);
  transform: rotate(90deg);
}

.letter-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.letter-seal {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 40%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary-soft) 66%, transparent);
  color: var(--c-primary);
  font-size: 1.05rem;
  place-items: center;
}

.letter-head strong {
  display: block;
  color: var(--c-text);
  font-size: 0.88rem;
}

.letter-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  color: var(--c-text-3);
  font-size: 0.64rem;
}

.letter-meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--c-text-3);
}

.letter-paper {
  margin-top: 16px;
  padding: 18px 18px 14px;
  border-radius: 12px;
  background:
    repeating-linear-gradient(
      transparent,
      transparent 31px,
      color-mix(in srgb, var(--border) 60%, transparent) 31px,
      color-mix(in srgb, var(--border) 60%, transparent) 32px
    ),
    color-mix(in srgb, var(--c-bg-1) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
}

.letter-line {
  margin: 0 0 6px;
  color: var(--c-text-1);
  font-family: var(--font-summary);
  font-size: 0.8rem;
  line-height: 32px;
  letter-spacing: 0.02em;
  overflow-wrap: anywhere;
}

.letter-who {
  color: var(--c-primary);
  font-weight: 650;
}

.letter-line.is-main {
  color: var(--c-text);
}

.letter-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.letter-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, var(--c-bg-1) 74%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  transition:
    color 0.16s ease,
    border-color 0.16s ease;
}

.letter-btn:hover:not(:disabled) {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 46%, transparent);
}

.letter-btn.relay {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 38%, transparent);
  background: color-mix(in srgb, var(--c-primary-soft) 42%, transparent);
}

.letter-pop-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.45s cubic-bezier(0.34, 1.4, 0.44, 1);
}

.letter-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.letter-pop-enter-from {
  opacity: 0;
  transform: translateY(22px) rotate(-0.6deg) scale(0.97);
}

.letter-pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

.relay-box {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.relay-box textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-bg-1) 70%, transparent);
  color: var(--c-text);
  font: inherit;
  font-family: var(--font-summary);
  font-size: 0.82rem;
  line-height: 1.8;
  resize: vertical;
  outline: none;
}

.relay-box textarea:focus {
  border-color: color-mix(in srgb, var(--c-primary) 55%, transparent);
}

.relay-box .composer-send {
  justify-self: end;
}

/* 响应式 */
@media (max-width: 640px) {
  .gb-tabs {
    position: static;
    width: 100%;
    justify-content: stretch;
  }

  .gb-tabs button {
    flex: 1;
    justify-content: center;
    padding: 9px 8px;
  }

  .sea-scene {
    height: 300px;
  }

  .sea-copy {
    top: 14px;
    left: 16px;
    right: 16px;
  }

  .sea-hint {
    right: 14px;
    bottom: 14px;
    font-size: 0.6rem;
  }

  .letter-card {
    padding: 18px 16px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msg-card {
    animation: none;
    opacity: 1;
  }

  .msg-card,
  .letter-pop-enter-active,
  .throw-slide-enter-active {
    transition: none;
  }
}
</style>
