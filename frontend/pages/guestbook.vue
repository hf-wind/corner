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
          @click="switchTab('bottles')"
        >
          <Icon name="solar:bottle-outline" />
          漂流瓶
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
          <div v-for="(col, ci) in masonryColumns" :key="`col-${ci}`" class="msg-col">
            <article v-for="msg in col" :key="msg.id" class="msg-card">
              <header class="msg-head">
                <span
                  class="msg-avatar"
                  :class="{ 'is-user': !!msg.userId, 'guest-char': !msg.userId && !!msg.visitorIdHash }"
                  :style="!msg.userId && msg.visitorIdHash ? visitorAvatarStyle(msg) : undefined"
                >
                  <img
                    v-if="msg.userId && !avatarErrors.has(msg.id)"
                    :src="mediaUrl(msg.user?.avatar)"
                    class="msg-avatar-img"
                    alt=""
                    loading="lazy"
                    @error="onAvatarError(msg.id)"
                  />
                  <Icon v-else-if="msg.userId" name="ph:user-bold" />
                  <template v-else-if="msg.visitorIdHash">{{ (msg.nickname || "访").trim().charAt(0) }}</template>
                  <Icon v-else name="ph:face-mask-bold" />
                </span>
                <div class="msg-meta">
                  <span class="msg-name-row">
                    <span class="msg-name">{{ msg.nickname }}</span>
                    <span class="msg-role" :class="{ 'role-user': !!msg.userId, 'role-guest': !msg.userId }">
                      <Icon :name="msg.userId ? 'ph:shield-check-bold' : 'ph:footprints-bold'" />
                      {{ msg.userId ? '账号' : '访客' }}
                    </span>
                  </span>
                  <time class="msg-time">{{ msgRelativeTime(msg.createdAt) }}</time>
                </div>
                <span class="msg-pin" aria-hidden="true"><Icon name="ph:push-pin-simple-fill" /></span>
              </header>
              <p class="msg-content">{{ msg.content }}</p>
            </article>
          </div>
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
          <div v-if="sendingMessage" class="ai-reviewing" role="status" aria-live="polite">
            <span class="ai-reviewing-bar" />
            <span class="ai-reviewing-text"><Icon name="ph:sparkle-fill" />AI 正在审核内容，请稍候…</span>
          </div>
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
        <div class="sea-card content-reveal" ref="seaCardRef">
          <SeaScene
            ref="seaRef"
            class="sea-scene-wrap"
            :bottles="peekBottles"
            :disabled="fishing"
            @fish="onFishBottle"
          />

          <div class="sea-copy">
            <span class="sea-kicker">THE TIME SEA · 时光海</span>
            <h2>海面下，漂着来自陌生时刻的信</h2>
            <p>捞起一只漂流瓶，读一读某个时刻某个旅人的絮语。投下的瓶子，会静静等待下一个有缘人。</p>
          </div>

          <Transition name="bottle-pop">
            <div v-if="caughtBottle" class="bottle-caught" ref="caughtRef">
              <div class="caught-head">
                <span class="caught-seal"><Icon name="ph:anchor-fill" /></span>
                <div class="caught-title">
                  <strong>一封漂了 {{ caughtBottle.chain?.length ?? 1 }} 段的信</strong>
                  <span class="caught-meta">来自「{{ caughtBottle.nickname }}」 · {{ dateLabel(caughtBottle.createdAt) }} 投入</span>
                </div>
              </div>
              <ol class="chain-list">
                <li v-for="(seg, i) in chainReversed" :key="seg.id" class="chain-seg">
                  <span class="chain-tag">{{ i === 0 ? '最新' : `第 ${(caughtBottle?.chain?.length ?? 1) - i} 段` }}</span>
                  <div class="chain-body">
                    <span class="chain-meta">{{ seg.nickname }} · {{ msgRelativeTime(seg.createdAt) }}</span>
                    <p>{{ seg.content }}</p>
                  </div>
                </li>
              </ol>
              <div class="caught-actions">
                <button v-if="canReply" type="button" class="caught-action reply" @click="replyDialogOpen = true">
                  <Icon name="ph:envelope-simple-bold" />回复这位旅人
                </button>
                <button v-else-if="!isLoggedIn" type="button" class="caught-action reply-link" @click="openIdentityForReply">
                  <Icon name="ph:envelope-simple-bold" />登录后可以回复这位旅人
                </button>
                <button v-if="!relayMode" type="button" class="caught-action relay" @click="relayMode = true">
                  <Icon name="ph:paper-plane-tilt-bold" />留一句话，让瓶子继续漂流
                </button>
              </div>
              <div v-if="relayMode" class="relay-box">
                <textarea v-model="relayText" class="composer-input" :maxlength="120" rows="3" placeholder="写一段接力的话，塞进瓶子里…" />
                <div class="relay-foot">
                  <span class="composer-count">{{ relayText.length }}/120</span>
                  <button type="button" class="composer-submit sea-submit" :disabled="relaySending" @click="submitRelay">
                    <Icon :name="relaySending ? 'ph:circle-notch-bold' : 'solar:bottle-outline'" :spin="relaySending" />
                    {{ relaySending ? '瓶子审核中…' : '投入时光海' }}
                  </button>
                </div>
              </div>
              <a v-if="caughtBottle.contactEmail && !caughtBottle.canReply" class="caught-mail" :href="`mailto:${caughtBottle.contactEmail}`">
                <Icon name="ph:envelope-simple-bold" />想认识这位旅人？给他写封信 → {{ caughtBottle.contactEmail }}
              </a>
            </div>
          </Transition>
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
          <div v-if="sendingBottle" class="ai-reviewing sea-reviewing" role="status" aria-live="polite">
            <span class="ai-reviewing-bar" />
            <span class="ai-reviewing-text"><Icon name="ph:sparkle-fill" />AI 正在审核瓶子，请稍候…</span>
          </div>
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
          <img
            v-if="isLoggedIn && user?.avatar && !myAvatarError"
            :src="mediaUrl(user.avatar)"
            class="my-avatar-img"
            alt=""
            @error="myAvatarError = true"
          />
          <Icon v-else-if="isLoggedIn" name="ph:user-bold" />
          <Icon v-else-if="nickname" name="ph:feather-bold" />
          <Icon v-else name="ph:user-fill" />
        </div>
        <h3>{{ displayName }}</h3>
        <p v-if="isLoggedIn" class="my-sub">
          <template v-if="(me?.visitCount ?? 0) > 1">第 <strong>{{ me?.visitCount }}</strong> 次</template>
          <template v-else>初次</template>
          相伴这座角落
        </p>
        <p v-else-if="nickname" class="my-sub">
          <template v-if="(me?.visitCount ?? 0) > 1">第 <strong>{{ me?.visitCount }}</strong> 次</template>
          <template v-else>初次</template>
          来到这座角落
        </p>
        <p v-else class="my-sub">还没起名，起个名字开启旅程吧</p>
        <div class="my-stats">
          <div><strong>{{ me?.messageCount ?? 0 }}</strong><span>留言</span></div>
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
      :pending-hint="pendingHint"
      @close="nameModalVisible = false"
      @confirm="handleNameConfirm"
      @authenticated="handleAuthenticated"
    />

    <a-modal
      v-model:open="replyDialogOpen"
      title="回复这位旅人"
      :ok-text="replySending ? '发送中…' : '发送回复'"
      :ok-button-props="{ disabled: !replyText.trim() || replySending }"
      :cancel-text="'取消'"
      @ok="submitReply"
    >
      <p style="margin:0 0 10px;color:var(--c-text-2);font-size:.68rem;">
        回复会通过站内通知送达「{{ caughtBottle?.nickname }}」，内容经过 AI 审核。
      </p>
      <a-textarea v-model:value="replyText" :maxlength="120" :rows="4" placeholder="写几句想对这位旅人说的话…" />
    </a-modal>
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
  fishBottleById,
  replyBottle,
  peekBottles: fetchPeek,
} = useVisitor();
const toast = useToast();
const { isLoggedIn, user } = useAuth();
const { mediaUrl } = useMediaUrl();

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

const seaRef = ref<InstanceType<any> | null>(null);
const seaCardRef = ref<HTMLElement | null>(null);
const caughtRef = ref<HTMLElement | null>(null);
const relayMode = ref(false);
const relayText = ref("");
const relaySending = ref(false);
const replyDialogOpen = ref(false);
const replyText = ref("");
const replySending = ref(false);
const chainReversed = computed(() => [...(caughtBottle.value?.chain ?? [])].reverse());

const canReply = computed(() => {
  const bottle = caughtBottle.value;
  if (!isLoggedIn.value || !bottle) return false;
  if (bottle.ownerUserId) return bottle.ownerUserId !== user.value?.id;
  return !!bottle.canReply;
});

const avatarErrors = ref<Set<string>>(new Set());
const myAvatarError = ref(false);

const columnCount = ref(3);

function computeColumnCount() {
  const w = window.innerWidth;
  if (w <= 480) return 1;
  if (w <= 700) return 2;
  if (w <= 900) return 3;
  if (w <= 1150) return 2;
  return 3;
}

const masonryColumns = computed(() => {
  const count = columnCount.value;
  if (count <= 1) return [messages.value];
  const cols: any[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);
  for (const msg of messages.value) {
    const text = String(msg.content || "");
    const estimate = Math.max(1.4, Math.ceil(text.length / 56) * 1.5 + 1.8);
    const target = heights.indexOf(Math.min(...heights));
    cols[target].push(msg);
    heights[target] += estimate;
  }
  return cols;
});

function onResize() {
  columnCount.value = computeColumnCount();
}

onMounted(() => {
  columnCount.value = computeColumnCount();
  window.addEventListener("resize", onResize, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

function onAvatarError(id: string) {
  if (avatarErrors.value.has(id)) return;
  avatarErrors.value = new Set([...avatarErrors.value, id]);
}

function visitorAvatarStyle(msg: any): Record<string, string> {
  const seed = String(msg.visitorIdHash || msg.nickname || "guest");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const sat = 50 + (hash % 3) * 10;
  const light = 66 + ((hash >>> 4) % 3) * 6;
  return {
    background: `linear-gradient(145deg, hsl(${hue} ${sat}% ${light + 5}%), hsl(${hue} ${sat - 13}% ${light - 8}%))`,
    color: `hsl(${hue} 48% 22%)`,
  };
}

function scrollToEl(el: HTMLElement | null | undefined) {
  if (!el) return;
  const container = document.querySelector<HTMLElement>(".main-content");
  if (!container) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top =
    el.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop -
    18;
  container.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}

async function switchTab(tab: "messages" | "bottles") {
  activeTab.value = tab;
  if (tab !== "bottles") return;
  await nextTick();
  scrollToEl(seaCardRef.value);
}

function openIdentityForReply() {
  pendingAction.value = {
    fn: async () => {
      await refreshMe();
      await nextTick();
      if (canReply.value) {
        replyDialogOpen.value = true;
        scrollToEl(caughtRef.value);
      }
    },
    hint: "回复漂流瓶主人",
  };
  nameModalVisible.value = true;
}

const nameModalVisible = ref(false);
type PendingAction = { fn: () => Promise<void>; hint: string };
const pendingAction = ref<null | PendingAction>(null);
const pendingHint = computed(() =>
  pendingAction.value ? `正在继续：${pendingAction.value.hint}` : "",
);

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
  try {
    const result = await identify(name, mail);
    await refreshMe();
    toast.success(`你好，${name}`);
    celebrate(result?.unlocked);
  } catch (err: any) {
    toast.error(err?.message || "署名失败，请稍后再试");
    nameModalVisible.value = false;
    return;
  }
  const action = pendingAction.value;
  pendingAction.value = null;
  if (action) {
    try {
      await action.fn();
    } catch {
      /* action 内部已提示错误 */
    }
  }
  nameModalVisible.value = false;
}

function requireName(action: () => Promise<void>, hint: string): boolean {
  if (isLoggedIn.value || nickname.value) return true;
  pendingAction.value = { fn: action, hint };
  nameModalVisible.value = true;
  return false;
}

async function handleAuthenticated() {
  const action = pendingAction.value;
  pendingAction.value = null;
  try {
    if (action) await action.fn();
  } catch {
    /* action 内部已提示错误 */
  }
  nameModalVisible.value = false;
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
  if (!requireName(() => doSendMessage(text), "留言将通过 AI 审核后上墙")) return;
  await doSendMessage(text);
}

async function doSendMessage(text: string) {
  sendingMessage.value = true;
  const infoToast = toast.info("已提交，AI 审核中…");
  try {
    const result = await sendMessage(text);
    composerText.value = "";
    if (result?.review?.pending) {
      toast.dismiss(infoToast);
      toast.warning("留言已提交，等待管理员审核后展示");
      return;
    }
    if (result?.review && !result.review.approved) {
      toast.dismiss(infoToast);
      toast.error(`留言未通过审核：${result.review.reason}`);
      return;
    }
    if (result?.review) toast.dismiss(infoToast);
    toast.success("留言已通过审核，展示在时光墙上");
    celebrate(result?.unlocked);
    await Promise.all([loadMessages(true), refreshWall(), refreshMe()]);
  } catch (err: any) {
    toast.dismiss(infoToast);
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
  if (!requireName(() => doThrowBottle(text), "瓶子将通过 AI 审核后投入时光海")) return;
  await doThrowBottle(text);
}

async function doThrowBottle(text: string) {
  sendingBottle.value = true;
  const infoToast = toast.info("已提交，AI 正在审核瓶子…");
  try {
    const result = await throwBottle(text);
    bottleText.value = "";
    if (result?.review?.pending) {
      toast.dismiss(infoToast);
      toast.warning("瓶子已提交，等待管理员审核后漂向时光海");
      return;
    }
    if (result?.review && !result.review.approved) {
      toast.dismiss(infoToast);
      toast.error(`瓶子未能漂远：${result.review.reason}`);
      return;
    }
    if (result?.review) toast.dismiss(infoToast);
    toast.success("瓶子已通过审核，漂向时光海等待有缘人");
    celebrate(result?.unlocked);
    seaRef.value?.launch();
    await Promise.all([refreshWall(), refreshPeek(), refreshMe()]);
    await nextTick();
    scrollToEl(seaCardRef.value);
  } catch (err: any) {
    toast.dismiss(infoToast);
    toast.error(err?.message || "投瓶失败，请稍后再试");
  } finally {
    sendingBottle.value = false;
  }
}

async function onFishBottle(bottle: { id: string }) {
  if (!requireName(() => doFishBottle(bottle), "正在为你捞起这只瓶子")) return;
  await doFishBottle(bottle);
}

async function doFishBottle(bottle: { id: string }) {
  fishing.value = true;
  caughtBottle.value = null;
  relayMode.value = false;
  relayText.value = "";
  replyText.value = "";
  try {
    const result = await fishBottleById(bottle.id);
    caughtBottle.value = result?.bottle ?? null;
    toast.success(`捞起了一封来自「${result?.bottle?.nickname ?? "远方"}」的信`);
    celebrate(result?.unlocked);
    await Promise.all([refreshWall(), refreshPeek(), refreshMe()]);
    await nextTick();
    scrollToEl(caughtRef.value);
  } catch (err: any) {
    toast.info(err?.message || "这只瓶子似乎已经漂走了");
    await refreshPeek();
  } finally {
    fishing.value = false;
  }
}

async function submitRelay() {
  const text = relayText.value.trim();
  if (!text) {
    toast.warning("先写一段话再投入海面吧");
    return;
  }
  if (!caughtBottle.value) return;
  relaySending.value = true;
  try {
    const result = await throwBottle(text, caughtBottle.value.id);
    relayText.value = "";
    relayMode.value = false;
    if (result?.review?.pending) {
      toast.warning("接力瓶已提交，等待管理员审核后继续漂流");
      return;
    }
    if (result?.review && !result.review.approved) {
      toast.error(`瓶子未能漂远：${result.review.reason}`);
      return;
    }
    toast.success("接力瓶已投入时光海，等待下一个有缘人");
    celebrate(result?.unlocked);
    caughtBottle.value = null;
    seaRef.value?.launch();
    await Promise.all([refreshWall(), refreshPeek(), refreshMe()]);
  } catch (err: any) {
    toast.error(err?.message || "投瓶失败，请稍后再试");
  } finally {
    relaySending.value = false;
  }
}

async function submitReply() {
  const text = replyText.value.trim();
  if (!text) {
    toast.warning("先写下想说的话吧");
    return;
  }
  if (!caughtBottle.value) return;
  replySending.value = true;
  try {
    const result = await replyBottle(caughtBottle.value.id, text);
    if (result?.review?.pending) {
      toast.warning("回复已提交，等待管理员审核后送达");
      return;
    }
    if (result?.review && !result.review.approved) {
      toast.error(`回复未通过审核：${result.review.reason}`);
      return;
    }
    replyDialogOpen.value = false;
    replyText.value = "";
    toast.success("回复已送达瓶主，祝你们有缘");
  } catch (err: any) {
    toast.error(err?.message || "回复失败，请稍后再试");
  } finally {
    replySending.value = false;
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
    const data = await fetchPeek();
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
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-bottom: 16px;
}
.msg-col {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 13px;
}
.msg-card {
  position: relative;
  display: block;
  width: 100%;
  padding: 16px 17px 15px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
  border-radius: 15px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft)), var(--ld-bg-card));
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  transition: transform 0.36s var(--ui-ease-out), box-shadow 0.36s ease, border-color 0.3s ease;
  animation: card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.msg-card::before {
  position: absolute;
  top: 0;
  left: 14%;
  right: 14%;
  height: 2px;
  border-radius: 99px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c-primary) 52%, transparent), transparent);
  content: "";
  opacity: 0;
  transform: scaleX(0.25);
  transition: opacity 0.32s ease, transform 0.5s var(--ui-ease-out);
  pointer-events: none;
}
.msg-card::after {
  position: absolute;
  top: -40%;
  right: -34%;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 13%, transparent), transparent 68%);
  content: "";
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.36s ease, transform 0.5s var(--ui-ease-out);
  pointer-events: none;
}
.msg-card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 32%, var(--border));
  box-shadow: 0 16px 38px color-mix(in srgb, var(--ld-shadow) 48%, transparent), 0 0 0 1px color-mix(in srgb, var(--c-primary) 9%, transparent);
  /* transform: translateY(-5px); */
}
.msg-card:hover::before {
  opacity: 1;
  transform: scaleX(1);
}
.msg-card:hover::after {
  opacity: 1;
  transform: scale(1);
}
.msg-card:hover .msg-avatar {
  transform: scale(1.08);
}
.msg-card:hover .msg-name {
  color: var(--c-primary);
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
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--c-primary-soft), color-mix(in srgb, var(--c-primary) 14%, var(--ld-bg-card)));
  color: color-mix(in srgb, var(--c-primary) 82%, var(--c-text-2));
  font-size: 0.86rem;
  place-items: center;
  transition: transform 0.3s var(--ui-ease-out);
}
.msg-avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
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
.ai-reviewing {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  overflow: hidden;
  border-radius: 9px;
  background: color-mix(in srgb, var(--c-primary) 8%, var(--c-bg-1));
}
.ai-reviewing-bar {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--c-primary) 22%, transparent) 50%, transparent 70%);
  background-size: 220% 100%;
  animation: ai-reviewing-sweep 1.6s linear infinite;
}
@keyframes ai-reviewing-sweep {
  from { transform: translateX(-60%); }
  to { transform: translateX(60%); }
}
.ai-reviewing-text {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--c-primary);
  font-weight: 600;
}
.ai-reviewing-text .icon {
  animation: ai-reviewing-pulse 1.6s ease-in-out infinite;
}
@keyframes ai-reviewing-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
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

.bottle-caught {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(480px, 100%);
  flex-direction: column;
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
.caught-meta {
  display: block;
  color: var(--c-text-3);
  font-size: 0.56rem;
  letter-spacing: 0.04em;
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

.sea-scene-wrap { margin-bottom: 2px; }
.caught-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.caught-title { display: flex; flex-direction: column; gap: 3px; }
.caught-title strong { color: var(--c-text); font-size: 0.8rem; }
.chain-list { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; max-height: 220px; overflow-y: auto; }
.chain-seg { display: flex; gap: 9px; align-items: flex-start; }
.chain-tag { flex: 0 0 auto; margin-top: 2px; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c-primary) 14%, transparent); color: var(--c-primary); font-size: 0.52rem; font-weight: 700; }
.chain-body { min-width: 0; flex: 1; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--border) 80%, transparent); border-radius: 11px; background: var(--ld-bg-card); }
.chain-meta { color: var(--c-text-3); font-size: 0.54rem; }
.chain-body p { margin: 4px 0 0; color: var(--c-text); font-size: 0.74rem; line-height: 1.7; overflow-wrap: break-word; }
.caught-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 14px; }
.caught-action { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: 0.64rem; font-weight: 700; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease; text-decoration: none; }
.caught-action:hover { transform: translateY(-1px); }
.caught-action.reply { border: 1px solid var(--c-primary); background: linear-gradient(145deg, hsl(215deg 92% 58%), hsl(222deg 92% 44%)); color: #fff; box-shadow: 0 7px 18px color-mix(in srgb, hsl(220deg 90% 50%) 34%, transparent); }
.caught-action.reply-link { border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border)); background: var(--ld-bg-card); color: var(--c-primary); }
.caught-action.relay { border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border)); background: color-mix(in srgb, var(--c-primary-soft) 50%, var(--ld-bg-card)); color: var(--c-primary); }
.relay-box { margin-top: 13px; padding-top: 13px; border-top: 1px dashed color-mix(in srgb, var(--border) 78%, transparent); }
.relay-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 8px; }
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
  /* transform: translateY(-2px); */
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
  overflow: hidden;
  border: 4px solid var(--ld-bg-card);
  border-radius: 50%;
  background: linear-gradient(145deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 52%, #4a5bd0));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c-primary) 30%, transparent);
  color: #fff;
  font-size: 1.5rem;
  place-items: center;
}
.my-avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
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
  grid-template-columns: repeat(2, 1fr);
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
@keyframes badge-orbit {
  to { transform: rotate(360deg); }
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .sidebar-right {
    display: none;
  }
}
@media (max-width: 700px) {
  .main-content {
    padding: max(68px, calc(env(safe-area-inset-top) + 60px)) 16px 24px !important;
  }
  .msg-masonry {
    gap: 10px;
  }
  .msg-col {
    gap: 10px;
  }
  .composer-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
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
  .badge-icon::after {
    animation: none;
  }
}
</style>
