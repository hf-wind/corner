<template>
  <div class="page-layout">
    <main class="main-content">
      <ContentPageHero
        eyebrow="TIME GUESTBOOK · 时光留言板"
        title="把此刻，留给时光"
        description="留言是投进时光里的星光，漂流瓶是漂向未知海岸的絮语。所有路过这座角落的旅人，都会在这里留下痕迹。"
        icon="solar:bottle-bold"
        variant="guestbook"
        :metric="wall?.messageCount ?? '--'"
        metric-label="条时光留言"
      />

      <PageStatsBar
        v-if="wall"
        class="content-reveal"
        label="时光留言板统计"
        :items="[
          { icon: 'ph:users-three-bold', value: wall.todayVisitors, label: '今日访客' },
          { icon: 'solar:bottle-outline', value: wall.bottleCount, label: '漂流瓶' },
          { icon: 'ph:footprints-bold', value: wall.totalVisits, label: '累计足迹' },
        ]"
      />

      <div class="tabs content-reveal" role="tablist" aria-label="时光留言板分区">
        <span class="tabs-track" :class="`tabs-${activeTab}`" aria-hidden="true" />
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'messages'"
          :class="{ active: activeTab === 'messages' }"
          @click="activeTab = 'messages'"
        >
          <Icon name="ph:note-pencil-bold" />
          留言墙
          <span class="tab-count">{{ wall?.messageCount ?? 0 }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'bottles'"
          :class="{ active: activeTab === 'bottles' }"
          @click="activeTab = 'bottles'"
        >
          <Icon name="solar:bottle-outline" />
          漂流瓶
          <span class="tab-count">{{ wall?.bottleCount ?? 0 }}</span>
        </button>
      </div>

      <!-- ========== 留言墙 ========== -->
      <section v-show="activeTab === 'messages'" class="messages-pane">
        <div v-if="messagesLoading && !messages.length" class="pane-state">
          <Icon name="ph:circle-notch-bold" :spin="true" />
          <span>正在打捞留言…</span>
        </div>

        <div v-else-if="!messages.length" class="pane-state">
          <Icon name="ph:waves-bold" />
          <strong>海面还很安静</strong>
          <span>来留下第一条时光留言吧</span>
        </div>

        <div v-else class="msg-masonry content-reveal">
          <article v-for="msg in messages" :key="msg.id" class="msg-card">
            <header class="msg-head">
              <span class="msg-avatar" :class="{ 'is-user': !!msg.userId }">
                <Icon :name="msg.userId ? 'ph:user-bold' : 'ph:face-mask-bold'" />
              </span>
              <div class="msg-meta">
                <span class="msg-name-row">
                  <span class="msg-name">{{ msg.nickname }}</span>
                  <span class="msg-role" :class="{ 'role-user': !!msg.userId, 'role-guest': !msg.userId }">
                    <Icon :name="msg.userId ? 'ph:shield-check-bold' : 'ph:user-simple-bold'" />
                    {{ msg.userId ? '登录' : '访客' }}
                  </span>
                </span>
                <time class="msg-time">{{ msgRelativeTime(msg.createdAt) }}</time>
              </div>
              <span class="msg-pin" aria-hidden="true"><Icon name="ph:push-pin-simple-fill" /></span>
            </header>
            <p class="msg-content">{{ msg.content }}</p>
          </article>
        </div>

        <button
          v-if="hasMore"
          type="button"
          class="load-more"
          :disabled="messagesLoading"
          @click="loadMore"
        >
          <Icon :name="messagesLoading ? 'ph:circle-notch-bold' : 'ph:arrow-down-bold'" :spin="messagesLoading" />
          {{ messagesLoading ? '打捞中…' : '打捞更早的留言' }}
        </button>

        <div class="composer content-reveal">
          <div class="composer-head">
            <span class="composer-sign">
              <span v-if="composerName" class="sign-name" :class="{ 'is-user': isLoggedIn }">
                <Icon :name="isLoggedIn ? 'ph:user-bold' : 'ph:feather-bold'" />{{ composerName }}
              </span>
              <button v-else type="button" class="sign-anon" @click="askName">
                <Icon name="ph:face-mask-bold" />尚未署名
              </button>
            </span>
            <span class="composer-hint"><Icon name="ph:info-bold" />内容会经过 AI 审核后展示</span>
          </div>
          <textarea
            v-model="composerText"
            class="composer-input"
            :maxlength="200"
            rows="3"
            :placeholder="composerName ? `把此刻想说的话，留给时光…（${composerName}）` : '先署名，再留下一句话…'"
            @keydown.ctrl.enter="submitMessage"
            @keydown.meta.enter="submitMessage"
          />
          <div class="composer-foot">
            <span class="composer-count">{{ composerText.length }}/200</span>
            <button type="button" class="composer-submit" :disabled="sendingMessage" @click="submitMessage">
              <Icon :name="sendingMessage ? 'ph:circle-notch-bold' : 'ph:paper-plane-tilt-bold'" :spin="sendingMessage" />
              {{ sendingMessage ? 'AI 审核中…' : '投入时光' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ========== 漂流瓶 ========== -->
      <section v-show="activeTab === 'bottles'" class="bottles-pane">
        <div class="sea-card content-reveal">
          <div class="sea" aria-hidden="true">
            <span class="sea-glow" />
            <span class="sea-ring ring-1" /><span class="sea-ring ring-2" /><span class="sea-ring ring-3" />
            <span class="sea-sheen" />
            <span class="sea-moon" />
            <span class="sea-bottle" :class="{ 'sea-bottle-caught': !!caughtBottle }">
              <Icon name="solar:bottle-bold" />
            </span>
            <span v-for="n in 5" :key="n" class="sea-star" :class="`star-${n}`" />
          </div>

          <div class="sea-copy">
            <span class="sea-kicker">THE TIME SEA · 时光海</span>
            <h2>海面下，漂着来自陌生时刻的信</h2>
            <p>捞起一只漂流瓶，读一读某个时刻某个旅人的絮语。投下的瓶子，会静静等待下一个有缘人。</p>
          </div>

          <Transition name="bottle-pop">
            <div v-if="caughtBottle" class="bottle-caught">
              <span class="caught-seal"><Icon name="ph:anchor-fill" /></span>
              <div class="caught-copy">
                <span class="caught-meta">{{ caughtBottle.nickname }} · {{ dateLabel(caughtBottle.createdAt) }} 投入</span>
                <p>「{{ caughtBottle.content }}」</p>
                <a
                  v-if="caughtBottle.contactEmail"
                  class="caught-mail"
                  :href="`mailto:${caughtBottle.contactEmail}`"
                >
                  <Icon name="ph:envelope-simple-bold" />
                  想认识这位旅人？给他写封信 → {{ caughtBottle.contactEmail }}
                </a>
              </div>
            </div>
          </Transition>

          <button type="button" class="fish-btn" :disabled="fishing" @click="fish">
            <Icon :name="fishing ? 'ph:circle-notch-bold' : 'ph:anchor-bold'" :spin="fishing" />
            {{ fishing ? '正在浮出水面…' : '捞起一只瓶子' }}
          </button>

          <div v-if="peekBottles.length" class="sea-peek">
            <span class="peek-label">海面上漂浮着最近的信</span>
            <div class="peek-row">
              <span v-for="bottle in peekBottles" :key="bottle.id" class="peek-bottle" :title="bottle.content">
                <Icon name="solar:bottle-bold" /><i>{{ bottle.nickname.slice(0, 1) }}</i>
              </span>
            </div>
          </div>
        </div>

        <div class="composer bottle-composer content-reveal">
          <div class="composer-head">
            <span class="composer-sign">
              <span v-if="composerName" class="sign-name" :class="{ 'is-user': isLoggedIn }">
                <Icon :name="isLoggedIn ? 'ph:user-bold' : 'ph:feather-bold'" />{{ composerName }}
              </span>
              <button v-else type="button" class="sign-anon" @click="askName">
                <Icon name="ph:face-mask-bold" />尚未署名
              </button>
            </span>
            <span class="composer-hint"><Icon name="ph:info-bold" />每天最多投 3 只瓶子</span>
          </div>
          <textarea
            v-model="bottleText"
            class="composer-input"
            :maxlength="120"
            rows="3"
            placeholder="写一封信，塞进瓶子里，让它漂向未来的海岸…"
            @keydown.ctrl.enter="submitBottle"
            @keydown.meta.enter="submitBottle"
          />
          <div class="composer-foot">
            <span class="composer-count">{{ bottleText.length }}/120</span>
            <button type="button" class="composer-submit sea-submit" :disabled="sendingBottle" @click="submitBottle">
              <Icon :name="sendingBottle ? 'ph:circle-notch-bold' : 'solar:bottle-outline'" :spin="sendingBottle" />
              {{ sendingBottle ? '瓶子审核中…' : '投入时光海' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ========== 我的徽章 ========== -->
      <section class="badges content-reveal">
        <header class="badges-head">
          <div>
            <span class="badges-kicker">MY CONSTELLATION · 我的徽章</span>
            <h2>旅途中的星光</h2>
          </div>
          <span class="badges-progress">{{ me?.achievements?.length ?? 0 }} / {{ badges.length }} 枚点亮</span>
        </header>
        <div class="badges-grid">
          <div
            v-for="badge in badges"
            :key="badge.code"
            class="badge"
            :class="{ locked: !ownedCodes.has(badge.code), fresh: freshCodes.has(badge.code) }"
            :title="badge.description"
          >
            <span class="badge-icon"><BadgeMedal :code="badge.code" :locked="!ownedCodes.has(badge.code)" /></span>
            <strong>{{ badge.title }}</strong>
            <small>{{ badge.description }}</small>
          </div>
        </div>
      </section>
    </main>

    <aside class="sidebar-right">
      <section class="right-card my-card">
        <span class="aside-kicker">MY TIME · 我的时光</span>
        <div class="my-avatar" :class="{ 'is-user': isLoggedIn }">
          <Icon v-if="isLoggedIn" name="ph:user-bold" />
          <Icon v-else-if="nickname" name="ph:feather-bold" />
          <Icon v-else name="ph:user-fill" />
        </div>
        <h3>{{ displayName }}</h3>
        <p v-if="isLoggedIn" class="my-sub">以账号身份留下的旅人 · <strong>第 {{ me?.visitCount ?? 0 }}</strong> 次光临</p>
        <p v-else-if="nickname" class="my-sub">第 <strong>{{ me?.visitCount ?? 0 }}</strong> 次光临这座角落</p>
        <p v-else class="my-sub">还没起名，起个名字开启旅程吧</p>
        <div class="my-stats">
          <div><strong>{{ me?.messageCount ?? 0 }}</strong><span>留言</span></div>
          <div><strong>{{ me?.bottleCount ?? 0 }}</strong><span>投瓶</span></div>
          <div><strong>{{ me?.caughtCount ?? 0 }}</strong><span>捞瓶</span></div>
        </div>
        <button v-if="isLoggedIn" type="button" class="my-rename primary" @click="toProfile">
          <Icon name="ph:user-circle-bold" />查看我的账号
        </button>
        <button v-else-if="!nickname" type="button" class="my-rename primary" @click="askName()">
          <Icon name="ph:feather-bold" />现在起名
        </button>
        <span v-else class="my-signed"><Icon name="ph:check-circle-bold" />已署名「{{ nickname }}」</span>
      </section>

      <section v-if="ownedBadges.length" class="right-card badge-mini-card">
        <div class="right-card-title"><span><Icon name="ph:star-four-bold" /> 星光徽章 · 已点亮 {{ ownedBadges.length }} 枚</span></div>
        <div class="badge-mini-grid">
          <span
            v-for="badge in ownedBadges"
            :key="badge.code"
            class="badge-mini"
            :title="`${badge.title}：${badge.description}`"
          >
            <BadgeMedal :code="badge.code" :size="32" />
          </span>
        </div>
      </section>

      <VisitorFootprints />
    </aside>

    <VisitorNameModal
      :visible="nameModalVisible"
      :initial="nickname"
      :initial-email="email"
      @close="nameModalVisible = false"
      @confirm="handleNameConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { useVisitor } from "~/composables/useVisitor";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const {
  nickname,
  email,
  identify,
  fetchWall,
  fetchMe,
  fetchMessages,
  sendMessage,
  throwBottle,
  fishBottle,
  peekBottles: fetchPeek,
} = useVisitor();
const toast = useToast();
const { isLoggedIn, user } = useAuth();

const composerName = computed(() =>
  isLoggedIn.value ? user.value?.username || "" : nickname.value,
);
const displayName = computed(() =>
  isLoggedIn.value ? user.value?.username || "登录旅人" : nickname.value || "无名旅人",
);

const activeTab = ref<"messages" | "bottles">("messages");

const wall = ref<any>(null);
const me = ref<any>(null);
const messages = ref<any[]>([]);
const page = ref(1);
const hasMore = ref(false);
const messagesLoading = ref(false);

const composerText = ref("");
const sendingMessage = ref(false);

const bottleText = ref("");
const sendingBottle = ref(false);
const fishing = ref(false);
const caughtBottle = ref<any>(null);
const peekBottles = ref<any[]>([]);

const nameModalVisible = ref(false);
const pendingAction = ref<null | (() => Promise<void>)>(null);

const BADGES = [
  { code: "first_visit", icon: "ph:star-four-fill", title: "初识之旅", description: "第一次踏上这座角落" },
  { code: "set_nickname", icon: "ph:feather-fill", title: "署名旅人", description: "留下了属于自己的名字" },
  { code: "first_message", icon: "ph:note-pencil-fill", title: "时光笔迹", description: "在时光留言板写下第一笔" },
  { code: "first_bottle", icon: "solar:bottle-bold", title: "漂流瓶初航", description: "投下第一只漂流瓶" },
  { code: "catch_bottle", icon: "ph:anchor-fill", title: "潮汐拾贝", description: "捞起海面上的一只瓶子" },
  { code: "visits_5", icon: "ph:sparkle-fill", title: "五夜星光", description: "五度归来，星光为引" },
  { code: "visits_30", icon: "ph:meteor-fill", title: "三十夜长旅", description: "三十次往返，已成默契" },
  { code: "pages_10", icon: "ph:compass-fill", title: "十页浮光", description: "浏览过十个角落" },
  { code: "pages_20", icon: "ph:map-trifold-fill", title: "深度游历", description: "足迹踏遍二十页光景" },
];

const badges = BADGES;
const ownedCodes = computed(() => new Set((me.value?.achievements ?? []).map((a: any) => a.code)));
const ownedBadges = computed(() => BADGES.filter((b) => ownedCodes.value.has(b.code)));
const freshCodes = ref<Set<string>>(new Set());

const msgRelativeTime = (time: string) => dayjs(time).fromNow();
const dateLabel = (time: string) => dayjs(time).format("YYYY 年 M 月 D 日");

function celebrate(unlocked: string[] | undefined) {
  if (!unlocked?.length) return;
  for (const code of unlocked) {
    const badge = BADGES.find((b) => b.code === code);
    if (!badge) continue;
    freshCodes.value = new Set([...freshCodes.value, code]);
    window.setTimeout(() => {
      toast.success(`解锁徽章「${badge.title}」`);
    }, 350);
  }
}

function askName(rename = false) {
  pendingAction.value = null;
  nameModalVisible.value = true;
  if (rename) pendingAction.value = null;
}

async function handleNameConfirm(name: string, mail: string) {
  const result = await identify(name, mail);
  await refreshMe();
  toast.success(`你好，${name}`);
  celebrate(result?.unlocked);
  const action = pendingAction.value;
  pendingAction.value = null;
  if (action) await action();
}

function requireName(action: () => Promise<void>): boolean {
  if (isLoggedIn.value || nickname.value) return true;
  pendingAction.value = action;
  nameModalVisible.value = true;
  return false;
}

function toProfile() {
  const { isAdmin, panelHome } = useAuth();
  navigateTo(panelHome());
}

async function refreshMe() {
  try {
    me.value = await fetchMe();
  } catch {
    /* ignore */
  }
}

async function loadMessages(reset = false) {
  if (reset) page.value = 1;
  messagesLoading.value = true;
  try {
    const data = await fetchMessages(page.value);
    const items = data?.items ?? [];
    if (reset) messages.value = items;
    else messages.value = [...messages.value, ...items];
    hasMore.value = !!data?.hasMore;
  } catch {
    if (reset) messages.value = [];
  } finally {
    messagesLoading.value = false;
  }
}

async function loadMore() {
  if (!hasMore.value || messagesLoading.value) return;
  page.value += 1;
  await loadMessages();
}

async function submitMessage() {
  const text = composerText.value.trim();
  if (!text) {
    toast.warning("先写下一句话再投入时光吧");
    return;
  }
  if (!requireName(() => doSendMessage(text))) return;
  await doSendMessage(text);
}

async function doSendMessage(text: string) {
  sendingMessage.value = true;
  try {
    const result = await sendMessage(text);
    if (result?.review && !result.review.approved) {
      toast.error(`留言未通过审核：${result.review.reason}`);
      return;
    }
    composerText.value = "";
    toast.success("留言已通过审核，展示在时光墙上");
    celebrate(result?.unlocked);
    await Promise.all([loadMessages(true), refreshWall(), refreshMe()]);
  } catch (err: any) {
    toast.error(err?.message || "留言失败，请稍后再试");
  } finally {
    sendingMessage.value = false;
  }
}

async function submitBottle() {
  const text = bottleText.value.trim();
  if (!text) {
    toast.warning("先写下一封信再投入海面吧");
    return;
  }
  if (!requireName(() => doThrowBottle(text))) return;
  await doThrowBottle(text);
}

async function doThrowBottle(text: string) {
  sendingBottle.value = true;
  try {
    const result = await throwBottle(text);
    if (result?.review && !result.review.approved) {
      toast.error(`瓶子未能漂远：${result.review.reason}`);
      return;
    }
    bottleText.value = "";
    toast.success("瓶子已通过审核，漂向时光海等待有缘人");
    celebrate(result?.unlocked);
    await Promise.all([refreshWall(), refreshPeek(), refreshMe()]);
  } catch (err: any) {
    toast.error(err?.message || "投瓶失败，请稍后再试");
  } finally {
    sendingBottle.value = false;
  }
}

async function fish() {
  if (!requireName(() => doFish())) return;
  await doFish();
}

async function doFish() {
  fishing.value = true;
  caughtBottle.value = null;
  try {
    const result = await fishBottle();
    caughtBottle.value = result?.bottle ?? null;
    toast.success(`捞起了一只来自「${result?.bottle?.nickname ?? "远方"}」的瓶子`);
    celebrate(result?.unlocked);
    await Promise.all([refreshWall(), refreshPeek(), refreshMe()]);
  } catch (err: any) {
    toast.info(err?.message || "海面还很平静");
  } finally {
    fishing.value = false;
  }
}

async function refreshWall() {
  try {
    wall.value = await fetchWall();
  } catch {
    /* ignore */
  }
}

async function refreshPeek() {
  try {
    const data = await fetchPeek(3);
    peekBottles.value = Array.isArray(data) ? data : [];
  } catch {
    peekBottles.value = [];
  }
}

onMounted(async () => {
  await Promise.allSettled([refreshWall(), refreshMe(), loadMessages(true), refreshPeek()]);
});

useHead({ title: "时光留言板" });
</script>

<style scoped>
.page-layout {
  position: relative;
  display: flex;
  flex: 1;
  overflow: hidden;
  background: var(--c-bg);
  color: var(--c-text);
  isolation: isolate;
}
.page-layout::before,
.page-layout::after {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  content: "";
  pointer-events: none;
}
.page-layout::before {
  top: -210px;
  right: 60px;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 11%, transparent), transparent 69%);
}
.page-layout::after {
  bottom: -260px;
  left: -190px;
  width: 510px;
  height: 510px;
  background: radial-gradient(circle, color-mix(in srgb, #8c72de 9%, transparent), transparent 70%);
}

.main-content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  padding: 24px 28px 42px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.sidebar-right {
  position: relative;
  z-index: 1;
  display: flex;
  width: var(--right-w);
  flex: 0 0 var(--right-w);
  flex-direction: column;
  gap: 14px;
  padding: 24px 16px;
  overflow-y: auto;
}

/* ===== Tabs ===== */
.tabs {
  position: relative;
  display: inline-flex;
  gap: 2px;
  margin: 0 0 18px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 14px;
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-soft);
}
.tabs-track {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 10px;
  background: linear-gradient(145deg, var(--c-primary-soft), color-mix(in srgb, var(--c-primary) 22%, var(--ld-bg-card)));
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 30%, transparent), 0 4px 14px color-mix(in srgb, var(--c-primary) 18%, transparent);
  transition: transform 0.34s var(--ui-ease-out);
}
.tabs-track.tabs-bottles {
  transform: translateX(100%);
}
.tabs button {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--c-text-2);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  cursor: pointer;
  transition: color 0.22s ease;
}
.tabs button.active {
  color: var(--c-primary);
}
.tabs button > svg {
  font-size: 1rem;
}
.tab-count {
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-text-3) 14%, transparent);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  font-variant-numeric: tabular-nums;
}
.tabs button.active .tab-count {
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
}

/* ===== 通用空态 ===== */
.pane-state {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px dashed var(--border);
  border-radius: var(--ui-radius-panel);
  color: var(--c-text-3);
}
.pane-state > svg {
  margin-bottom: 5px;
  color: var(--c-primary);
  font-size: 2rem;
  opacity: 0.7;
}
.pane-state strong {
  color: var(--c-text-2);
  font-size: 0.78rem;
}
.pane-state span {
  font-size: 0.62rem;
}

/* ===== 留言墙 ===== */
.msg-masonry {
  column-gap: 13px;
  column-count: 3;
  margin-bottom: 16px;
}
.msg-card {
  display: inline-block;
  width: 100%;
  margin: 0 0 13px;
  padding: 16px 17px 15px;
  break-inside: avoid;
  border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
  border-radius: 15px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft)), var(--ld-bg-card));
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  transition: transform 0.32s var(--ui-ease-out), box-shadow 0.32s ease;
  animation: card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.msg-card:hover {
  box-shadow: 0 16px 36px color-mix(in srgb, var(--ld-shadow) 50%, transparent);
  transform: translateY(-2px);
}
.msg-head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.msg-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--c-primary-soft), color-mix(in srgb, var(--c-primary) 14%, var(--ld-bg-card)));
  color: color-mix(in srgb, var(--c-primary) 82%, var(--c-text-2));
  font-size: 0.86rem;
  place-items: center;
}
.msg-avatar.is-user {
  background: linear-gradient(145deg, color-mix(in srgb, var(--c-primary) 18%, var(--ld-bg-card)), color-mix(in srgb, var(--c-primary) 30%, var(--ld-bg-card)));
  color: var(--c-primary);
}
.msg-meta {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}
.msg-name-row {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}
.msg-name {
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.7rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg-role {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 0.5rem;
  font-weight: 650;
  line-height: 1.4;
}
.msg-role > svg {
  font-size: 0.56rem;
}
.msg-role.role-user {
  border: 1px solid color-mix(in srgb, var(--c-primary) 32%, transparent);
  background: color-mix(in srgb, var(--c-primary) 11%, transparent);
  color: var(--c-primary);
}
.msg-role.role-guest {
  border: 1px solid color-mix(in srgb, var(--c-text-3) 26%, transparent);
  background: color-mix(in srgb, var(--c-text-3) 8%, transparent);
  color: var(--c-text-3);
}
.msg-time {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.52rem;
}
.msg-pin {
  color: var(--c-text-3);
  font-size: 0.7rem;
  opacity: 0;
  transform: rotate(-14deg);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.msg-card:hover .msg-pin {
  opacity: 0.55;
  transform: rotate(0deg);
}
.msg-content {
  margin: 10px 0 0;
  color: var(--c-text-1);
  font-size: 0.72rem;
  line-height: 1.75;
  overflow-wrap: break-word;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
}

.load-more {
  display: flex;
  width: 100%;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-bottom: 18px;
  border: 1px dashed color-mix(in srgb, var(--border) 85%, transparent);
  border-radius: 12px;
  background: transparent;
  color: var(--c-text-3);
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.load-more:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--c-primary) 38%, var(--border));
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.load-more:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ===== 发布框 ===== */
.composer {
  padding: 16px 17px 14px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: var(--ui-radius-panel);
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-panel);
}
.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.composer-sign {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}
.sign-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.64rem;
  font-weight: 700;
}
.sign-name.is-user {
  background: color-mix(in srgb, var(--c-primary) 13%, var(--ld-bg-card));
  border: 1px solid color-mix(in srgb, var(--c-primary) 30%, transparent);
}
.sign-name > svg {
  font-size: 0.78rem;
}
.sign-anon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px dashed color-mix(in srgb, var(--c-text-3) 45%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--c-text-3);
  font: inherit;
  font-size: 0.64rem;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.sign-anon:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.composer-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-text-3);
  font-size: 0.54rem;
}
.composer-input {
  width: 100%;
  min-height: 84px;
  padding: 11px 13px;
  resize: vertical;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 11px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font: inherit;
  font-size: 0.74rem;
  line-height: 1.7;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.composer-input::placeholder {
  color: var(--c-text-3);
}
.composer-input:focus {
  border-color: color-mix(in srgb, var(--c-primary) 60%, var(--border));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.composer-count {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  font-variant-numeric: tabular-nums;
}
.composer-submit {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 17px;
  border: 1px solid var(--c-primary);
  border-radius: 11px;
  background: var(--c-primary);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--c-primary) 26%, transparent);
  color: #fff;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}
.composer-submit:hover:not(:disabled) {
  box-shadow: 0 10px 24px color-mix(in srgb, var(--c-primary) 34%, transparent);
  transform: translateY(-1px);
}
.composer-submit:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.composer-submit > svg {
  font-size: 0.9rem;
}

/* ===== 漂流瓶 · 时光海 ===== */
.sea-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 18px;
  padding: 34px 26px 26px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
  border-radius: 20px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--ld-bg-card) 96%, var(--c-primary-soft)), var(--ld-bg-card));
  box-shadow: var(--ui-shadow-panel);
  text-align: center;
}
.sea-card::before {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 9%, transparent), transparent 68%);
  content: "";
  pointer-events: none;
}

.sea {
  position: relative;
  width: 190px;
  height: 190px;
  margin-bottom: 22px;
  border-radius: 50%;
  background:
    radial-gradient(120% 120% at 32% 26%, hsl(217deg 78% 64%), hsl(220deg 88% 42%) 46%, hsl(221deg 92% 26%) 78%, hsl(223deg 96% 15%));
  box-shadow:
    inset 0 -14px 34px rgb(4 12 32 / 48%),
    inset 0 10px 24px rgb(255 255 255 / 14%),
    0 18px 44px color-mix(in srgb, var(--c-primary) 22%, transparent);
  isolation: isolate;
}
.sea-glow {
  position: absolute;
  z-index: -1;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 26%, transparent), transparent 66%);
  filter: blur(6px);
}
.sea-moon {
  position: absolute;
  top: 16%;
  left: 22%;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #fff, #cfe3ff 58%, rgb(207 227 255 / 22%) 100%);
  box-shadow: 0 0 22px rgb(214 235 255 / 68%);
}
.sea-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.sea-ring.ring-1 {
  inset: 18px;
  animation: sea-spin 22s linear infinite;
}
.sea-ring.ring-1::before,
.sea-ring.ring-1::after {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(214 236 255 / 85%);
  box-shadow: 0 0 10px rgb(190 220 255 / 75%);
  content: "";
}
.sea-ring.ring-1::before { top: 10px; left: 18px; }
.sea-ring.ring-1::after { right: 6px; bottom: 30px; }
.sea-ring.ring-2 {
  inset: 34px;
  border-style: dashed;
  animation: sea-spin 15s linear infinite reverse;
}
.sea-ring.ring-3 {
  inset: 52px;
  border-color: rgb(255 255 255 / 10%);
  animation: sea-breathe 5s ease-in-out infinite;
}
.sea-sheen {
  position: absolute;
  top: 34%;
  left: 14%;
  width: 44%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 60%), transparent);
  transform: rotate(-12deg);
  animation: sea-sheen-move 4.6s ease-in-out infinite;
}
.sea-bottle {
  position: absolute;
  z-index: 2;
  bottom: 24%;
  left: 50%;
  display: grid;
  width: 46px;
  height: 56px;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 13px 13px 17px 17px;
  background: linear-gradient(165deg, rgb(255 255 255 / 30%), rgb(255 255 255 / 8%) 55%, rgb(0 0 0 / 10%));
  box-shadow: 0 10px 22px rgb(0 6 24 / 34%);
  color: rgb(255 255 255 / 92%);
  font-size: 1.35rem;
  place-items: center;
  transform: translateX(-50%) rotate(6deg);
  animation: bottle-float 4.4s ease-in-out infinite;
  transition: opacity 0.3s ease;
}
.sea-bottle::after {
  position: absolute;
  top: -7px;
  left: 50%;
  width: 12px;
  height: 8px;
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 3px 3px 7px 7px;
  background: rgb(255 255 255 / 22%);
  content: "";
  transform: translateX(-50%);
}
.sea-bottle-caught {
  opacity: 0.25;
}
.sea-star {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgb(255 255 255 / 70%);
  box-shadow: 0 0 8px rgb(255 255 255 / 55%);
  animation: sea-star-blink 3.6s ease-in-out infinite;
}
.sea-star.star-1 { top: 14%; right: 24%; }
.sea-star.star-2 { top: 30%; right: 13%; width: 3px; height: 3px; animation-delay: -1s; }
.sea-star.star-3 { top: 46%; left: 12%; animation-delay: -1.9s; }
.sea-star.star-4 { bottom: 26%; right: 20%; animation-delay: -2.6s; }
.sea-star.star-5 { bottom: 40%; left: 20%; width: 3px; height: 3px; animation-delay: -3.1s; }

.sea-copy {
  position: relative;
  z-index: 1;
  max-width: 430px;
}
.sea-kicker {
  color: var(--c-primary);
  font-size: 0.48rem;
  font-weight: 750;
  letter-spacing: 0.18em;
}
.sea-copy h2 {
  margin: 7px 0 8px;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 1.1rem;
}
.sea-copy p {
  margin: 0 auto;
  max-width: 400px;
  color: var(--c-text-2);
  font-size: 0.66rem;
  line-height: 1.75;
}

.fish-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 0 24px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 44%, var(--border));
  border-radius: 999px;
  background: linear-gradient(145deg, var(--c-primary-soft), color-mix(in srgb, var(--c-primary) 20%, var(--ld-bg-card)));
  color: var(--c-primary);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.fish-btn:hover:not(:disabled) {
  box-shadow: 0 10px 26px color-mix(in srgb, var(--c-primary) 28%, transparent);
  transform: translateY(-2px);
}
.fish-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.bottle-caught {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(480px, 100%);
  align-items: flex-start;
  gap: 13px;
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 24%, var(--border));
  border-radius: 16px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c-primary-soft) 55%, var(--ld-bg-card)), var(--ld-bg-card));
  box-shadow: 0 14px 34px color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
  text-align: left;
}
.caught-seal {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 55%, #4a5bd0));
  box-shadow: 0 8px 18px color-mix(in srgb, var(--c-primary) 34%, transparent);
  color: #fff;
  font-size: 1rem;
  place-items: center;
}
.caught-copy {
  min-width: 0;
}
.caught-meta {
  display: block;
  color: var(--c-text-3);
  font-size: 0.56rem;
  letter-spacing: 0.04em;
}
.caught-copy p {
  margin: 7px 0 0;
  color: var(--c-text);
  font-size: 0.78rem;
  line-height: 1.8;
  overflow-wrap: break-word;
}
.caught-mail {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 11px;
  padding: 6px 11px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 30%, var(--border));
  border-radius: 9px;
  background: color-mix(in srgb, var(--c-primary-soft) 55%, var(--ld-bg-card));
  color: var(--c-primary);
  font-size: 0.6rem;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.caught-mail:hover {
  box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 20%, var(--ld-shadow));
  transform: translateY(-1px);
}
.caught-mail > svg {
  font-size: 0.8rem;
}
.bottle-pop-enter-active {
  transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.bottle-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.bottle-pop-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.94);
}
.bottle-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.sea-peek {
  position: relative;
  z-index: 1;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed color-mix(in srgb, var(--border) 78%, transparent);
}
.peek-label {
  display: block;
  margin-bottom: 10px;
  color: var(--c-text-3);
  font-size: 0.54rem;
  letter-spacing: 0.1em;
}
.peek-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.peek-bottle {
  position: relative;
  display: grid;
  width: 34px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border));
  border-radius: 9px 9px 12px 12px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--c-primary-soft) 80%, var(--ld-bg-card)), var(--ld-bg-card));
  box-shadow: 0 7px 16px color-mix(in srgb, var(--ld-shadow) 32%, transparent);
  color: var(--c-primary);
  font-size: 0.9rem;
  cursor: default;
  place-items: center;
  transition: transform 0.24s var(--ui-ease-out), box-shadow 0.24s ease;
  animation: peek-bob 3.8s ease-in-out infinite;
}
.peek-bottle:nth-child(2) {
  animation-delay: -1.2s;
}
.peek-bottle:nth-child(3) {
  animation-delay: -2.4s;
}
.peek-bottle:hover {
  box-shadow: 0 12px 24px color-mix(in srgb, var(--ld-shadow) 48%, transparent);
  transform: translateY(-4px);
}
.peek-bottle i {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: grid;
  width: 15px;
  height: 15px;
  border: 2px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.44rem;
  font-style: normal;
  font-weight: 700;
  place-items: center;
}
.sea-submit {
  background: linear-gradient(145deg, hsl(215deg 92% 58%), hsl(222deg 92% 44%));
  border-color: transparent;
}
.sea-submit:hover:not(:disabled) {
  box-shadow: 0 10px 24px color-mix(in srgb, hsl(220deg 90% 50%) 40%, transparent);
}

/* ===== 徽章 ===== */
.badges {
  margin-top: 34px;
  padding: 22px 24px 24px;
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
  border-radius: var(--ui-radius-hero);
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-panel);
}
.badges-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}
.badges-kicker {
  color: var(--c-primary);
  font-size: 0.48rem;
  font-weight: 750;
  letter-spacing: 0.18em;
}
.badges-head h2 {
  margin: 5px 0 0;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 1.15rem;
}
.badges-progress {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
}
.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 17px 10px 14px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 14%, var(--border));
  border-radius: 15px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--c-primary-soft) 40%, var(--ld-bg-card)), var(--ld-bg-card));
  text-align: center;
  transition: transform 0.28s var(--ui-ease-out), box-shadow 0.28s ease;
  animation: badge-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.badge:hover {
  box-shadow: 0 14px 30px color-mix(in srgb, var(--ld-shadow) 44%, transparent);
  transform: translateY(-2px);
}
.badge-icon {
  position: relative;
  display: grid;
  width: 52px;
  height: 52px;
  margin-bottom: 10px;
  place-items: center;
}
.badge-icon::after {
  position: absolute;
  inset: -4px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 26%, transparent);
  border-radius: 50%;
  content: "";
  animation: badge-orbit 16s linear infinite;
  pointer-events: none;
}
.badge strong {
  color: var(--c-text);
  font-size: 0.7rem;
  font-weight: 700;
}
.badge small {
  margin-top: 3px;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.5;
}
.badge.locked {
  border-color: var(--border);
  background: var(--ld-bg-card);
  filter: saturate(0);
  opacity: 0.55;
}
.badge.locked .badge-icon {
  background: transparent;
  box-shadow: none;
}
.badge.locked .badge-icon::after {
  border-color: color-mix(in srgb, var(--border) 90%, transparent);
}
.badge.locked strong {
  color: var(--c-text-3);
}
.badge.fresh .badge-icon {
  animation: badge-unlock 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.badge.fresh .badge-icon::after {
  border-color: color-mix(in srgb, var(--c-primary) 46%, transparent);
}
@keyframes badge-in {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
}
@keyframes badge-unlock {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-primary) 42%, transparent); transform: scale(1); }
  55% { box-shadow: 0 0 0 14px transparent; transform: scale(1.18); }
  100% { transform: scale(1); }
}

/* ===== 右侧栏 ===== */
.right-card {
  padding: 17px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 14px;
  background: var(--ld-bg-card);
  box-shadow: 0 5px 18px color-mix(in srgb, var(--ld-shadow) 25%, transparent);
}
.aside-kicker {
  color: var(--c-primary);
  font-size: 0.48rem;
  font-weight: 750;
  letter-spacing: 0.18em;
}
.my-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(155deg, var(--c-primary-soft), var(--ld-bg-card) 64%);
  text-align: center;
}
.my-avatar {
  display: grid;
  width: 58px;
  height: 58px;
  margin: 14px 0 10px;
  border: 4px solid var(--ld-bg-card);
  border-radius: 50%;
  background: linear-gradient(145deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 52%, #4a5bd0));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c-primary) 30%, transparent);
  color: #fff;
  font-size: 1.5rem;
  place-items: center;
}
.my-avatar.is-user {
  background: linear-gradient(145deg, #3a63c9, color-mix(in srgb, var(--c-primary) 40%, #243a75));
}
.my-card h3 {
  margin: 0;
  color: var(--c-text);
  font-size: 0.8rem;
}
.my-card .my-sub {
  margin: 6px 0 0;
  color: var(--c-text-2);
  font-size: 0.57rem;
}
.my-card .my-sub strong {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.my-stats {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 13px 0;
  padding: 10px 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
}
.my-stats > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.my-stats strong {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}
.my-stats span {
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.my-rename {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 30%, var(--border));
  border-radius: 9px;
  background: var(--ld-bg-card);
  color: var(--c-primary);
  font: inherit;
  font-size: 0.6rem;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.my-rename:hover {
  box-shadow: 0 6px 16px color-mix(in srgb, var(--ld-shadow) 30%, transparent);
  transform: translateY(-1px);
}
.my-rename.primary {
  border-color: var(--c-primary);
  background: var(--c-primary);
  color: #fff;
  font-weight: 700;
}
.my-signed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.my-signed > svg {
  color: var(--c-primary);
  font-size: 0.72rem;
}
.right-card-title {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.right-card-title span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text);
  font-size: 0.7rem;
  font-weight: 700;
}
.badge-mini-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 9px;
}
.badge-mini {
  display: grid;
  aspect-ratio: 1;
  border-radius: 11px;
  background: var(--c-primary-soft);
  place-items: center;
  transition: transform 0.2s var(--ui-ease-out), box-shadow 0.2s ease;
}
.badge-mini:hover {
  box-shadow: 0 8px 18px color-mix(in srgb, var(--ld-shadow) 40%, transparent);
  transform: translateY(-2px);
}

/* ===== 动画 ===== */
@keyframes sea-spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes sea-breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.14); opacity: 1; }
}
@keyframes sea-sheen-move {
  0%, 100% { opacity: 0.3; transform: translateX(-4px) rotate(-12deg); }
  50% { opacity: 0.9; transform: translateX(6px) rotate(-12deg); }
}
@keyframes sea-star-blink {
  50% { opacity: 0.2; }
}
@keyframes bottle-float {
  0%, 100% { transform: translateX(-50%) rotate(6deg) translateY(0); }
  50% { transform: translateX(-50%) rotate(9deg) translateY(-7px); }
}
@keyframes peek-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes badge-orbit {
  to { transform: rotate(360deg); }
}

/* ===== 响应式 ===== */
@media (max-width: 1150px) {
  .msg-masonry {
    column-count: 2;
  }
}
@media (max-width: 900px) {
  .sidebar-right {
    display: none;
  }
  .msg-masonry {
    column-count: 3;
  }
}
@media (max-width: 700px) {
  .main-content {
    padding: max(68px, calc(env(safe-area-inset-top) + 60px)) 16px 24px !important;
  }
  .msg-masonry {
    column-count: 2;
    column-gap: 10px;
  }
  .msg-card {
    margin-bottom: 10px;
  }
  .composer-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .sea {
    width: 160px;
    height: 160px;
  }
  .sea-card {
    padding: 26px 18px 22px;
  }
  .badges-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tabs {
    width: 100%;
  }
  .tabs button {
    flex: 1;
    justify-content: center;
  }
}
@media (max-width: 480px) {
  .msg-masonry {
    column-count: 1;
  }
  .badges-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .msg-card,
  .badge,
  .bottle-pop-enter-active,
  .bottle-pop-leave-active,
  .tabs-track {
    animation: none;
    transition: none;
  }
  .sea-ring,
  .sea-sheen,
  .sea-bottle,
  .sea-star,
  .peek-bottle,
  .badge-icon::after {
    animation: none;
  }
}
</style>
