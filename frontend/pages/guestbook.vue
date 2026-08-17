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

      <div
        ref="tabsRef"
        class="tabs content-reveal"
        role="tablist"
        aria-label="时光留言板分区"
      >
        <span
          class="tabs-track"
          :class="`tabs-${activeTab}`"
          aria-hidden="true"
        />
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'messages'"
          :class="{ active: activeTab === 'messages' }"
          @click="switchTab('messages')"
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
          <div
            v-for="(col, ci) in masonryColumns"
            :key="`col-${ci}`"
            class="msg-col"
          >
            <article v-for="msg in col" :key="msg.id" class="msg-card">
              <header class="msg-head">
                <span
                  class="msg-avatar"
                  :class="{
                    'is-user': !!msg.userId,
                    'guest-char': !msg.userId && !!msg.visitorIdHash,
                  }"
                  :style="
                    !msg.userId && msg.visitorIdHash
                      ? visitorAvatarStyle(msg)
                      : undefined
                  "
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
                  <template v-else-if="msg.visitorIdHash">{{
                    (msg.nickname || "访").trim().charAt(0)
                  }}</template>
                  <Icon v-else name="ph:face-mask-bold" />
                </span>
                <div class="msg-meta">
                  <span class="msg-name-row">
                    <span class="msg-name">{{ msg.nickname }}</span>
                    <span
                      class="msg-role"
                      :class="{
                        'role-user': !!msg.userId,
                        'role-guest': !msg.userId,
                      }"
                    >
                      <Icon
                        :name="
                          msg.userId
                            ? 'ph:shield-check-bold'
                            : 'ph:footprints-bold'
                        "
                      />
                      {{ msg.userId ? "账号" : "访客" }}
                    </span>
                  </span>
                  <time class="msg-time">{{
                    msgRelativeTime(msg.createdAt)
                  }}</time>
                </div>
                <span class="msg-pin" aria-hidden="true"
                  ><Icon name="ph:push-pin-simple-fill"
                /></span>
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
          <Icon
            :name="
              messagesLoading ? 'ph:circle-notch-bold' : 'ph:arrow-down-bold'
            "
            :spin="messagesLoading"
          />
          {{ messagesLoading ? "打捞中…" : "打捞更早的留言" }}
        </button>

        <div class="composer content-reveal">
          <div class="composer-head">
            <span class="composer-sign">
              <span
                v-if="composerName"
                class="sign-name"
                :class="{ 'is-user': isLoggedIn }"
              >
                <Icon
                  :name="isLoggedIn ? 'ph:user-bold' : 'ph:feather-bold'"
                />{{ composerName }}
              </span>
              <button v-else type="button" class="sign-anon" @click="askName">
                <Icon name="ph:face-mask-bold" />尚未署名
              </button>
            </span>
            <span class="composer-hint"
              ><Icon name="ph:info-bold" />内容会经过 AI 审核后展示</span
            >
          </div>
          <textarea
            v-model="composerText"
            class="composer-input"
            :maxlength="200"
            rows="3"
            :placeholder="
              composerName
                ? `把此刻想说的话，留给时光…（${composerName}）`
                : '先署名，再留下一句话…'
            "
            @keydown.ctrl.enter="submitMessage"
            @keydown.meta.enter="submitMessage"
          />
          <div
            v-if="sendingMessage"
            class="ai-reviewing"
            role="status"
            aria-live="polite"
          >
            <span class="ai-reviewing-bar" />
            <span class="ai-reviewing-text"
              ><Icon name="ph:sparkle-fill" />AI 正在审核内容，请稍候…</span
            >
          </div>
          <div class="composer-foot">
            <span class="composer-count">{{ composerText.length }}/200</span>
            <button
              type="button"
              class="composer-submit"
              :disabled="sendingMessage"
              @click="submitMessage"
            >
              <Icon
                :name="
                  sendingMessage
                    ? 'ph:circle-notch-bold'
                    : 'ph:paper-plane-tilt-bold'
                "
                :spin="sendingMessage"
              />
              {{ sendingMessage ? "AI 审核中…" : "投入时光" }}
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
            :disabled="fishing || !!caughtBottle || fishExhausted"
            @fish="onFishBottle"
          />

          <div class="sea-copy">
            <span class="sea-kicker">THE TIME SEA · 时光海</span>
            <h2>海面下，漂着来自陌生时刻的信</h2>
            <div class="sea-quota" aria-live="polite">
              <span :class="{ exhausted: fishExhausted }"
                ><Icon name="ph:anchor-bold" />今日打捞
                {{ bottleQuota.fish.used }}/{{ bottleQuota.fish.limit }}</span
              >
              <span :class="{ exhausted: throwExhausted }"
                ><Icon name="solar:bottle-outline" />今日投入
                {{ bottleQuota.throw.used }}/{{ bottleQuota.throw.limit }}</span
              >
            </div>
          </div>

          <Transition name="bottle-pop">
            <div v-if="caughtBottle" class="bottle-caught">
              <button
                type="button"
                class="caught-close"
                title="合上信纸并放回海里"
                aria-label="关闭并放回海里"
                @click="releaseCaughtBottle(false)"
              >
                <Icon name="ph:x-bold" />
              </button>
              <div class="caught-head">
                <span class="caught-seal"><Icon name="ph:anchor-fill" /></span>
                <div class="caught-title">
                  <strong
                    >一封漂了
                    {{ caughtBottle.chain?.length ?? 1 }} 段的信</strong
                  >
                  <span class="caught-meta">
                    <Icon name="ph:user-circle-bold" />{{
                      caughtBottle.nickname
                    }}
                    <i aria-hidden="true" />
                    <Icon name="ph:map-pin-bold" />{{
                      caughtBottle.originRegion || "神秘海岸"
                    }}
                    <i aria-hidden="true" />
                    <Icon name="ph:clock-bold" />{{
                      minuteLabel(caughtBottle.createdAt)
                    }}
                    投入
                  </span>
                </div>
              </div>
              <ol class="chain-list">
                <li
                  v-for="(seg, i) in chainReversed"
                  :key="seg.id"
                  class="chain-seg"
                >
                  <span class="chain-tag">{{
                    i === 0
                      ? "最新"
                      : `第 ${(caughtBottle?.chain?.length ?? 1) - i} 段`
                  }}</span>
                  <div class="chain-body">
                    <span class="chain-meta">
                      <Icon name="ph:user-bold" />{{ seg.nickname }}
                      <Icon name="ph:map-pin-bold" />{{
                        seg.originRegion || "神秘海岸"
                      }}
                      <Icon name="ph:clock-bold" />{{
                        minuteLabel(seg.createdAt)
                      }}
                    </span>
                    <p>{{ seg.content }}</p>
                  </div>
                </li>
              </ol>
              <p class="relay-prompt">
                <Icon
                  name="ph:arrows-clockwise-bold"
                />把一句新的话接在信尾，再交给下一位旅人。
              </p>
              <div class="caught-actions">
                <button
                  v-if="!relayMode"
                  type="button"
                  class="caught-action relay"
                  :disabled="throwExhausted"
                  @click="relayMode = true"
                >
                  <Icon name="ph:paper-plane-tilt-bold" />接力下去
                </button>
                <button
                  type="button"
                  class="caught-action release"
                  :disabled="releasingBottle"
                  @click="releaseCaughtBottle(true)"
                >
                  <Icon
                    :name="
                      releasingBottle
                        ? 'ph:circle-notch-bold'
                        : 'ph:arrow-u-down-left-bold'
                    "
                    :spin="releasingBottle"
                  />
                  {{ releasingBottle ? "交还潮汐…" : "原样扔回海里" }}
                </button>
              </div>
              <div v-if="relayMode" class="relay-box">
                <textarea
                  v-model="relayText"
                  class="composer-input"
                  :maxlength="120"
                  rows="3"
                  placeholder="写一段接力的话，塞进瓶子里…"
                />
                <div class="relay-foot">
                  <span class="composer-count">{{ relayText.length }}/120</span>
                  <button
                    type="button"
                    class="composer-submit sea-submit"
                    :disabled="relaySending || throwExhausted"
                    @click="submitRelay"
                  >
                    <Icon
                      :name="
                        relaySending
                          ? 'ph:circle-notch-bold'
                          : 'solar:bottle-outline'
                      "
                      :spin="relaySending"
                    />
                    {{ relaySending ? "瓶子审核中…" : "写入并接力" }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <Transition name="bottle-composer">
          <div
            v-if="!caughtBottle"
            class="composer bottle-composer content-reveal"
          >
            <div class="composer-head">
              <span class="composer-sign">
                <span
                  v-if="composerName"
                  class="sign-name"
                  :class="{ 'is-user': isLoggedIn }"
                >
                  <Icon
                    :name="isLoggedIn ? 'ph:user-bold' : 'ph:feather-bold'"
                  />{{ composerName }}
                </span>
                <button v-else type="button" class="sign-anon" @click="askName">
                  <Icon name="ph:face-mask-bold" />尚未署名
                </button>
              </span>
              <span class="composer-hint"
                ><Icon name="ph:info-bold" />今日还可投入
                {{ bottleQuota.throw.remaining }} 只</span
              >
            </div>
            <textarea
              v-model="bottleText"
              class="composer-input"
              :maxlength="120"
              rows="3"
              :disabled="throwExhausted"
              placeholder="写一封信，塞进瓶子里，让它漂向未来的海岸…"
              @keydown.ctrl.enter="submitBottle"
              @keydown.meta.enter="submitBottle"
            />
            <div
              v-if="sendingBottle"
              class="ai-reviewing sea-reviewing"
              role="status"
              aria-live="polite"
            >
              <span class="ai-reviewing-bar" />
              <span class="ai-reviewing-text"
                ><Icon name="ph:sparkle-fill" />AI 正在审核瓶子，请稍候…</span
              >
            </div>
            <div class="composer-foot">
              <span class="composer-count">{{ bottleText.length }}/120</span>
              <button
                type="button"
                class="composer-submit sea-submit"
                :disabled="sendingBottle || throwExhausted"
                @click="submitBottle"
              >
                <Icon
                  :name="
                    sendingBottle
                      ? 'ph:circle-notch-bold'
                      : 'solar:bottle-outline'
                  "
                  :spin="sendingBottle"
                />
                {{
                  sendingBottle
                    ? "瓶子审核中…"
                    : throwExhausted
                      ? "今日额度已用完"
                      : "投入时光海"
                }}
              </button>
            </div>
          </div>
        </Transition>
      </section>

      <!-- ========== 我的徽章 ========== -->
      <section
        class="badges content-reveal"
        :class="{ expanded: badgesExpanded }"
      >
        <header class="badges-head">
          <div>
            <span class="badges-kicker">MY CONSTELLATION · 我的徽章</span>
            <h2>旅途中的星光</h2>
          </div>
          <div class="badges-head-actions">
            <span class="badges-progress"
              >{{ me?.achievements?.length ?? 0 }} /
              {{ badges.length }} 枚点亮</span
            >
            <button
              type="button"
              class="badge-toggle"
              :aria-expanded="badgesExpanded"
              :title="badgesExpanded ? '收起徽章详情' : '展开徽章详情'"
              @click="badgesExpanded = !badgesExpanded"
            >
              <Icon
                :name="
                  badgesExpanded ? 'ph:caret-up-bold' : 'ph:caret-down-bold'
                "
              />
            </button>
          </div>
        </header>
        <div class="badges-grid">
          <div
            v-for="badge in badges"
            :key="badge.code"
            class="badge"
            :class="{
              locked: !ownedCodes.has(badge.code),
              fresh: freshCodes.has(badge.code),
            }"
            :title="badge.description"
          >
            <span class="badge-status">
              <span>{{ badge.rarity }}</span>
              <Icon
                :name="
                  ownedCodes.has(badge.code)
                    ? 'ph:seal-check-fill'
                    : 'ph:lock-key-bold'
                "
              />
            </span>
            <span class="badge-icon"
              ><BadgeMedal
                :code="badge.code"
                :locked="!ownedCodes.has(badge.code)"
                :size="badgesExpanded ? 58 : 38"
            /></span>
            <strong>{{ badge.title }}</strong>
            <small>{{ badge.description }}</small>
            <span class="badge-meter" aria-hidden="true"
              ><i :style="{ width: `${badgeProgress(badge).percent}%` }"
            /></span>
            <span class="badge-count">{{
              ownedCodes.has(badge.code)
                ? "已典藏"
                : `${badgeProgress(badge).current} / ${badge.target}`
            }}</span>
          </div>
        </div>
      </section>
    </main>

    <aside class="sidebar-right">
      <section
        v-if="wall"
        class="right-card journey-card"
        aria-label="时光留言板统计"
      >
        <div class="right-card-title">
          <span><Icon name="ph:chart-line-up-bold" /> 今日潮汐</span>
        </div>
        <div class="journey-stats">
          <div>
            <span><Icon name="ph:users-three-bold" /></span>
            <strong>{{ wall.todayVisitors }}</strong>
            <small>今日访客</small>
          </div>
          <div>
            <span><Icon name="ph:footprints-bold" /></span>
            <strong>{{ wall.totalVisits }}</strong>
            <small>累计足迹</small>
          </div>
        </div>
      </section>
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
          <template v-if="(me?.visitCount ?? 0) > 1"
            >第 <strong>{{ me?.visitCount }}</strong> 次</template
          >
          <template v-else>初次</template>
          相伴这座角落
        </p>
        <p v-else-if="nickname" class="my-sub">
          <template v-if="(me?.visitCount ?? 0) > 1"
            >第 <strong>{{ me?.visitCount }}</strong> 次</template
          >
          <template v-else>初次</template>
          来到这座角落
        </p>
        <p v-else class="my-sub">还没起名，起个名字开启旅程吧</p>
        <div class="my-stats">
          <div>
            <strong>{{ me?.messageCount ?? 0 }}</strong
            ><span>留言</span>
          </div>
          <div>
            <strong>{{ me?.caughtCount ?? 0 }}</strong
            ><span>捞瓶</span>
          </div>
        </div>
        <button
          v-if="isLoggedIn"
          type="button"
          class="my-rename primary"
          @click="toProfile"
        >
          <Icon name="ph:user-circle-bold" />查看我的账号
        </button>
        <button
          v-else-if="!nickname"
          type="button"
          class="my-rename primary"
          @click="askName()"
        >
          <Icon name="ph:feather-bold" />现在起名
        </button>
        <span v-else class="my-signed"
          ><Icon name="ph:check-circle-bold" />已署名「{{ nickname }}」</span
        >
      </section>

      <section v-if="ownedBadges.length" class="right-card badge-mini-card">
        <div class="right-card-title">
          <span
            ><Icon name="ph:star-four-bold" /> 星光徽章 · 已点亮
            {{ ownedBadges.length }} 枚</span
          >
        </div>
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
    </aside>

    <VisitorNameModal
      :visible="nameModalVisible"
      :initial="nickname"
      :pending-hint="pendingHint"
      @close="nameModalVisible = false"
      @confirm="handleNameConfirm"
      @authenticated="handleAuthenticated"
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
  identify,
  fetchWall,
  fetchMe,
  fetchMessages,
  sendMessage,
  throwBottle,
  fetchBottleQuota,
  fishBottle,
  releaseBottle,
} = useVisitor();
const toast = useToast();
const { isLoggedIn, user } = useAuth();
const { mediaUrl } = useMediaUrl();

const composerName = computed(() =>
  isLoggedIn.value ? user.value?.username || "" : nickname.value,
);
const displayName = computed(() =>
  isLoggedIn.value
    ? user.value?.username || "登录旅人"
    : nickname.value || "一位旅人",
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
const bottleQuota = ref({
  throw: { used: 0, limit: 3, remaining: 3 },
  fish: { used: 0, limit: 8, remaining: 8 },
});
const quotaLoaded = ref(false);
const throwExhausted = computed(
  () => quotaLoaded.value && bottleQuota.value.throw.remaining <= 0,
);
const fishExhausted = computed(
  () => quotaLoaded.value && bottleQuota.value.fish.remaining <= 0,
);

const seaRef = ref<InstanceType<any> | null>(null);
const seaCardRef = ref<HTMLElement | null>(null);
const tabsRef = ref<HTMLElement | null>(null);
const relayMode = ref(false);
const relayText = ref("");
const relaySending = ref(false);
const releasingBottle = ref(false);
const badgesExpanded = ref(false);
const identityCompleting = ref(false);
const chainReversed = computed(() =>
  [...(caughtBottle.value?.chain ?? [])].reverse(),
);

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

function scrollToEl(
  el: HTMLElement | null | undefined,
  align: "start" | "center" = "start",
  offset = 18,
) {
  if (!el) return;
  const container = document.querySelector<HTMLElement>(".main-content");
  if (!container) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let top =
    el.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop -
    offset;
  if (align === "center") {
    top -= Math.max(0, (container.clientHeight - el.offsetHeight) / 2 - 18);
  }
  container.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}

async function switchTab(tab: "messages" | "bottles") {
  activeTab.value = tab;
  await nextTick();
  scrollToEl(tabsRef.value);
}

const nameModalVisible = ref(false);
type PendingAction = { fn: () => Promise<void>; hint: string };
const pendingAction = ref<null | PendingAction>(null);
const pendingHint = computed(() =>
  pendingAction.value ? `正在继续：${pendingAction.value.hint}` : "",
);

type BadgeDefinition = {
  code: string;
  title: string;
  description: string;
  rarity: string;
  target: number;
  metric: "visits" | "signed_content" | "messages" | "bottles" | "caught";
};

const BADGES: BadgeDefinition[] = [
  {
    code: "first_visit",
    title: "三度相逢",
    description: "三次回到这座角落",
    rarity: "旅途",
    target: 3,
    metric: "visits",
  },
  {
    code: "set_nickname",
    title: "留名成章",
    description: "署名后留下两次时光内容",
    rarity: "记录",
    target: 2,
    metric: "signed_content",
  },
  {
    code: "first_message",
    title: "时光成笺",
    description: "留下三条通过审核的留言",
    rarity: "创作",
    target: 3,
    metric: "messages",
  },
  {
    code: "first_bottle",
    title: "远海信使",
    description: "投下三只通过审核的漂流瓶",
    rarity: "远航",
    target: 3,
    metric: "bottles",
  },
  {
    code: "catch_bottle",
    title: "潮汐守望",
    description: "从时光海打捞三封来信",
    rarity: "相遇",
    target: 3,
    metric: "caught",
  },
  {
    code: "visits_5",
    title: "十日回响",
    description: "十次归来，风声已有回音",
    rarity: "珍藏",
    target: 10,
    metric: "visits",
  },
  {
    code: "visits_30",
    title: "三十夜长旅",
    description: "三十次往返，已成默契",
    rarity: "典藏",
    target: 30,
    metric: "visits",
  },
];

const badges = BADGES;
const ownedCodes = computed(
  () => new Set((me.value?.achievements ?? []).map((a: any) => a.code)),
);
const ownedBadges = computed(() =>
  BADGES.filter((b) => ownedCodes.value.has(b.code)),
);
const freshCodes = ref<Set<string>>(new Set());

function badgeProgress(badge: BadgeDefinition) {
  const values = {
    visits: Number(me.value?.visitCount || 0),
    signed_content:
      nickname.value || isLoggedIn.value
        ? Number(me.value?.messageCount || 0) +
          Number(me.value?.bottleCount || 0)
        : 0,
    messages: Number(me.value?.messageCount || 0),
    bottles: Number(me.value?.bottleCount || 0),
    caught: Number(me.value?.caughtCount || 0),
  };
  const current = Math.min(badge.target, values[badge.metric]);
  return {
    current,
    percent: ownedCodes.value.has(badge.code)
      ? 100
      : (current / badge.target) * 100,
  };
}

const msgRelativeTime = (time: string) => dayjs(time).fromNow();
const minuteLabel = (time: string) =>
  dayjs(time).format("YYYY 年 M 月 D 日 HH:mm");

function celebrate(unlocked: string[] | undefined) {
  if (!unlocked?.length) return;
  for (const code of unlocked) {
    if (freshCodes.value.has(code)) continue;
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

async function runPendingAction() {
  const action = pendingAction.value;
  pendingAction.value = null;
  if (!action) return;
  await action.fn();
}

async function handleNameConfirm(name: string, turnstileToken: string) {
  if (identityCompleting.value) return;
  identityCompleting.value = true;
  try {
    const result = await identify(name, turnstileToken);
    await refreshMe();
    toast.success(`你好，${name}`);
    celebrate(result?.unlocked);
    await runPendingAction();
  } catch (err: any) {
    toast.error(err?.message || "署名失败，请稍后再试");
  } finally {
    identityCompleting.value = false;
    nameModalVisible.value = false;
  }
}

function requireName(action: () => Promise<void>, hint: string): boolean {
  if (isLoggedIn.value || nickname.value) return true;
  pendingAction.value = { fn: action, hint };
  nameModalVisible.value = true;
  return false;
}

async function handleAuthenticated() {
  try {
    await runPendingAction();
  } catch {
    /* action 内部已提示错误 */
  }
  nameModalVisible.value = false;
}

function toProfile() {
  const { panelHome } = useAuth();
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
  if (sendingMessage.value) return;
  const text = composerText.value.trim();
  if (!text) {
    toast.warning("先写下一句话再投入时光吧");
    return;
  }
  if (!requireName(() => doSendMessage(text), "留言将通过 AI 审核后上墙"))
    return;
  await doSendMessage(text);
}

async function doSendMessage(text: string) {
  if (sendingMessage.value) return;
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
  if (sendingBottle.value) return;
  if (throwExhausted.value)
    return void toast.warning("今天的投瓶额度已经用完了");
  const text = bottleText.value.trim();
  if (!text) {
    toast.warning("先写下一封信再投入海面吧");
    return;
  }
  if (!requireName(() => doThrowBottle(text), "瓶子将通过 AI 审核后投入时光海"))
    return;
  await doThrowBottle(text);
}

async function doThrowBottle(text: string) {
  if (sendingBottle.value) return;
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
    await nextTick();
    scrollToEl(tabsRef.value, "start", 0);
    seaRef.value?.launch();
    await Promise.all([refreshWall(), refreshMe()]);
  } catch (err: any) {
    toast.dismiss(infoToast);
    toast.error(err?.message || "投瓶失败，请稍后再试");
  } finally {
    sendingBottle.value = false;
    void refreshBottleQuota();
  }
}

async function onFishBottle() {
  if (!requireName(() => doFishBottle(), "正在为你打捞一封来信")) return;
  await doFishBottle();
}

async function doFishBottle() {
  if (fishing.value) return;
  if (fishExhausted.value)
    return void toast.warning("今天的打捞额度已经用完了");
  fishing.value = true;
  caughtBottle.value = null;
  relayMode.value = false;
  relayText.value = "";
  try {
    const result = await fishBottle();
    caughtBottle.value = result?.bottle ?? null;
    toast.success(
      `捞起了一封来自「${result?.bottle?.nickname ?? "远方"}」的信`,
    );
    celebrate(result?.unlocked);
    await Promise.all([refreshWall(), refreshMe()]);
    await nextTick();
    scrollToEl(tabsRef.value, "start", 0);
  } catch (err: any) {
    toast.info(err?.message || "这会儿还没等到新的相遇，过一会儿再来看看吧");
  } finally {
    fishing.value = false;
    void refreshBottleQuota();
  }
}

async function submitRelay() {
  if (throwExhausted.value)
    return void toast.warning("今天的投瓶额度已经用完了");
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
    await Promise.all([refreshWall(), refreshMe()]);
    await nextTick();
    scrollToEl(tabsRef.value, "start", 0);
  } catch (err: any) {
    toast.error(err?.message || "投瓶失败，请稍后再试");
  } finally {
    relaySending.value = false;
    void refreshBottleQuota();
  }
}

async function releaseCaughtBottle(showMessage = true) {
  if (releasingBottle.value) return;
  if (!caughtBottle.value) return;
  releasingBottle.value = true;
  const bottleId = caughtBottle.value.id;
  caughtBottle.value = null;
  relayMode.value = false;
  relayText.value = "";
  seaRef.value?.launch();
  try {
    await releaseBottle(bottleId);
    if (showMessage) toast.success("瓶子已回到潮汐中，其他旅人仍能继续捞到它");
    await refreshWall();
  } catch (err: any) {
    if (showMessage) toast.info("瓶子已经随潮汐继续漂流");
  } finally {
    releasingBottle.value = false;
  }
}

async function refreshWall() {
  try {
    wall.value = await fetchWall();
  } catch {
    /* ignore */
  }
}

async function refreshBottleQuota() {
  try {
    const result = await fetchBottleQuota();
    if (result?.throw && result?.fish) bottleQuota.value = result;
  } catch {
    /* 配额仍由服务端强制校验 */
  } finally {
    quotaLoaded.value = true;
  }
}

onMounted(async () => {
  await Promise.allSettled([
    refreshWall(),
    refreshMe(),
    refreshBottleQuota(),
    loadMessages(true),
  ]);
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
  overflow: hidden;
}

/* ===== Tabs ===== */
.tabs {
  position: sticky;
  z-index: 30;
  top: 0;
  display: inline-flex;
  gap: 2px;
  margin: 0 0 18px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, transparent);
  box-shadow: var(--ui-shadow-soft);
  backdrop-filter: blur(14px);
}
.tabs-track {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 10px;
  background: linear-gradient(
    145deg,
    var(--c-primary-soft),
    color-mix(in srgb, var(--c-primary) 22%, var(--ld-bg-card))
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 30%, transparent),
    0 4px 14px color-mix(in srgb, var(--c-primary) 18%, transparent);
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
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft)),
    var(--ld-bg-card)
  );
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  transition:
    transform 0.36s var(--ui-ease-out),
    box-shadow 0.36s ease,
    border-color 0.3s ease;
  animation: card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.msg-card::before {
  position: absolute;
  top: 0;
  left: 14%;
  right: 14%;
  height: 2px;
  border-radius: 99px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--c-primary) 52%, transparent),
    transparent
  );
  content: "";
  opacity: 0;
  transform: scaleX(0.25);
  transition:
    opacity 0.32s ease,
    transform 0.5s var(--ui-ease-out);
  pointer-events: none;
}
.msg-card::after {
  position: absolute;
  top: -40%;
  right: -34%;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--c-primary) 13%, transparent),
    transparent 68%
  );
  content: "";
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity 0.36s ease,
    transform 0.5s var(--ui-ease-out);
  pointer-events: none;
}
.msg-card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 32%, var(--border));
  box-shadow:
    0 16px 38px color-mix(in srgb, var(--ld-shadow) 48%, transparent),
    0 0 0 1px color-mix(in srgb, var(--c-primary) 9%, transparent);
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
  background: linear-gradient(
    145deg,
    var(--c-primary-soft),
    color-mix(in srgb, var(--c-primary) 14%, var(--ld-bg-card))
  );
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
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--c-primary) 18%, var(--ld-bg-card)),
    color-mix(in srgb, var(--c-primary) 30%, var(--ld-bg-card))
  );
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
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
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
  from {
    opacity: 0;
    transform: translateY(12px);
  }
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
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
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
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
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
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
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
  background: linear-gradient(
    100deg,
    transparent 30%,
    color-mix(in srgb, var(--c-primary) 22%, transparent) 50%,
    transparent 70%
  );
  background-size: 220% 100%;
  animation: ai-reviewing-sweep 1.6s linear infinite;
}
@keyframes ai-reviewing-sweep {
  from {
    transform: translateX(-60%);
  }
  to {
    transform: translateX(60%);
  }
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
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
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
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;
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
  padding: 0 0 24px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
  border-radius: 12px;
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-panel);
  text-align: center;
}
.sea-copy {
  position: relative;
  z-index: 1;
  max-width: 430px;
  padding: 22px 20px 0;
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
.sea-quota {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin-top: 10px;
}
.sea-quota span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
  border-radius: 6px;
  background: color-mix(in srgb, var(--c-primary-soft) 45%, transparent);
  color: var(--c-text-2);
  font-family: var(--font-mono);
  font-size: 0.5rem;
}
.sea-quota span.exhausted {
  border-color: var(--border);
  background: var(--c-bg-1);
  color: var(--c-text-3);
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
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--c-primary-soft) 55%, var(--ld-bg-card)),
    var(--ld-bg-card)
  );
  box-shadow: 0 14px 34px
    color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
  text-align: left;
}
.caught-close {
  position: absolute;
  z-index: 2;
  top: 10px;
  right: 10px;
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}
.caught-close:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
  transform: rotate(8deg);
}
.caught-seal {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: linear-gradient(
    145deg,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 55%, #4a5bd0)
  );
  box-shadow: 0 8px 18px color-mix(in srgb, var(--c-primary) 34%, transparent);
  color: #fff;
  font-size: 1rem;
  place-items: center;
}
.caught-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.caught-meta > svg {
  color: var(--c-primary);
  font-size: 0.66rem;
}
.caught-meta > i {
  width: 2px;
  height: 2px;
  margin: 0 2px;
  border-radius: 50%;
  background: var(--c-text-3);
}
.bottle-pop-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.bottle-pop-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.bottle-pop-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.94);
}
.bottle-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
.bottle-composer-enter-active,
.bottle-composer-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.bottle-composer-enter-from,
.bottle-composer-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.sea-scene-wrap {
  width: 100%;
  margin-bottom: 0;
}
.caught-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.caught-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.caught-title strong {
  color: var(--c-text);
  font-size: 0.8rem;
}
.chain-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
}
.chain-seg {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.chain-tag {
  flex: 0 0 auto;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
  color: var(--c-primary);
  font-size: 0.52rem;
  font-weight: 700;
}
.chain-body {
  min-width: 0;
  flex: 1;
  padding: 8px 11px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 11px;
  background: var(--ld-bg-card);
}
.chain-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 7px;
  color: var(--c-text-3);
  font-size: 0.54rem;
}
.chain-meta > svg {
  color: color-mix(in srgb, var(--c-primary) 72%, var(--c-text-3));
  font-size: 0.62rem;
}
.chain-body p {
  margin: 4px 0 0;
  color: var(--c-text);
  font-size: 0.74rem;
  line-height: 1.7;
  overflow-wrap: break-word;
}
.relay-prompt {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 13px 0 0;
  padding: 9px 11px;
  border-left: 3px solid var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 54%, transparent);
  color: var(--c-text-2);
  font-size: 0.62rem;
  line-height: 1.6;
}
.relay-prompt > svg {
  flex: 0 0 auto;
  color: var(--c-primary);
  font-size: 0.76rem;
}
.caught-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 14px;
}
.caught-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 7px;
  font: inherit;
  font-size: 0.64rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
  text-decoration: none;
}
.caught-action:hover {
  transform: translateY(-1px);
}
.caught-action.relay {
  border: 1px solid var(--c-primary);
  background: var(--c-primary);
  color: #fff;
  box-shadow: 0 7px 18px color-mix(in srgb, var(--c-primary) 28%, transparent);
}
.caught-action.release {
  border: 1px solid color-mix(in srgb, var(--c-text-3) 34%, var(--border));
  background: var(--ld-bg-card);
  color: var(--c-text-2);
}
.caught-action:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
}
.relay-box {
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px dashed color-mix(in srgb, var(--border) 78%, transparent);
}
.relay-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
.sea-submit {
  background: linear-gradient(145deg, hsl(215deg 92% 58%), hsl(222deg 92% 44%));
  border-color: transparent;
}
.sea-submit:hover:not(:disabled) {
  box-shadow: 0 10px 24px
    color-mix(in srgb, hsl(220deg 90% 50%) 40%, transparent);
}

/* ===== 徽章 ===== */
.badges {
  position: relative;
  margin-top: 34px;
  padding: 16px 18px 18px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 10px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--c-bg-2) 72%, var(--ld-bg-card)),
    var(--ld-bg-card)
  );
  box-shadow:
    var(--ui-shadow-panel),
    inset 0 1px 0 color-mix(in srgb, #fff 24%, transparent);
}
.badges::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(
      color-mix(in srgb, var(--c-text-3) 6%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--c-text-3) 6%, transparent) 1px,
      transparent 1px
    );
  background-size: 32px 32px;
  content: "";
  pointer-events: none;
}
.badges-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.badges-kicker {
  color: var(--ui-accent-warm);
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
  padding: 5px 9px;
  border: 1px solid color-mix(in srgb, var(--ui-accent-warm) 32%, var(--border));
  border-radius: 6px;
  color: var(--c-text-2);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
}
.badges-head-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.badge-toggle {
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
}
.badge-toggle:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.badges-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.badge {
  --badge-accent: #d8b96e;
  position: relative;
  display: flex;
  min-height: 92px;
  flex-direction: column;
  align-items: center;
  padding: 8px 6px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, var(--badge-accent) 4%);
  text-align: center;
  transition:
    border-color 0.28s ease,
    background 0.28s ease,
    transform 0.28s var(--ui-ease-out);
  animation: badge-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.badge:nth-child(2) {
  --badge-accent: #71c3a1;
}
.badge:nth-child(3) {
  --badge-accent: #e7a85d;
}
.badge:nth-child(4) {
  --badge-accent: #67a9e8;
}
.badge:nth-child(5) {
  --badge-accent: #54c4c6;
}
.badge:nth-child(6) {
  --badge-accent: #c58fd9;
}
.badge:nth-child(7) {
  --badge-accent: #e1c36f;
}
.badge:hover {
  border-color: color-mix(in srgb, var(--badge-accent) 50%, transparent);
  background: linear-gradient(
    155deg,
    color-mix(in srgb, var(--badge-accent) 12%, transparent),
    rgb(255 255 255 / 3%)
  );
  transform: translateY(-2px);
}
.badge-status {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: color-mix(in srgb, var(--badge-accent) 78%, var(--c-text));
  font-size: 0.48rem;
  font-weight: 750;
}
.badge-status > span {
  text-transform: uppercase;
}
.badge-status > svg {
  font-size: 0.68rem;
}
.badge.locked .badge-status {
  color: #777d84;
}
.badge-icon {
  position: relative;
  display: grid;
  width: 42px;
  height: 42px;
  margin: 2px 0 4px;
  place-items: center;
}
.badge-icon::after {
  position: absolute;
  inset: -4px;
  border: 1px solid color-mix(in srgb, var(--badge-accent) 32%, transparent);
  border-radius: 50%;
  content: "";
  animation: badge-orbit 16s linear infinite;
  pointer-events: none;
}
.badge strong {
  color: var(--c-text);
  font-size: 0.61rem;
  font-weight: 700;
}
.badge small {
  margin-top: 3px;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.5;
}
.badge.locked {
  border-color: color-mix(in srgb, var(--border) 72%, transparent);
  background: color-mix(in srgb, var(--c-bg-2) 72%, transparent);
  filter: saturate(0.25);
  opacity: 0.72;
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
.badge-meter {
  width: 100%;
  height: 3px;
  margin-top: auto;
  overflow: hidden;
  border-radius: 99px;
  background: rgb(255 255 255 / 8%);
}
.badge-meter > i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--badge-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--badge-accent) 55%, transparent);
}
.badge-count {
  width: 100%;
  margin-top: 6px;
  color: #777d84;
  font-family: var(--font-mono);
  font-size: 0.47rem;
  text-align: right;
}
.badge:not(.locked) .badge-count {
  color: color-mix(in srgb, var(--badge-accent) 74%, #fff);
}
.badge :deep(.badge-medal.locked)::before {
  background: var(--c-bg-3);
}
.badge :deep(.badge-medal.locked)::after {
  border-color: var(--border);
}
.badges:not(.expanded) .badge-status > span,
.badges:not(.expanded) .badge small,
.badges:not(.expanded) .badge-meter,
.badges:not(.expanded) .badge-count {
  display: none;
}
.badges:not(.expanded) .badge-status {
  position: absolute;
  top: 7px;
  right: 7px;
  width: auto;
}
.badges.expanded {
  padding: 25px 26px 28px;
}
.badges.expanded .badges-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.badges.expanded .badge {
  min-height: 206px;
  padding: 15px 13px 13px;
}
.badges.expanded .badge-icon {
  width: 58px;
  height: 58px;
  margin: 9px 0 11px;
}
.badges.expanded .badge strong {
  font-size: 0.74rem;
}
:global(.dark) .badges {
  background: linear-gradient(145deg, #17191d, #22262a 62%, #191c20);
  border-color: rgb(255 255 255 / 9%);
  box-shadow:
    0 24px 58px rgb(12 14 18 / 28%),
    inset 0 1px 0 rgb(255 255 255 / 7%);
}
:global(.dark) .badge {
  background: linear-gradient(
    155deg,
    rgb(255 255 255 / 7%),
    rgb(255 255 255 / 2%)
  );
  border-color: rgb(255 255 255 / 9%);
}
@keyframes badge-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
}
@keyframes badge-unlock {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-primary) 42%, transparent);
    transform: scale(1);
  }
  55% {
    box-shadow: 0 0 0 14px transparent;
    transform: scale(1.18);
  }
  100% {
    transform: scale(1);
  }
}

/* ===== 右侧栏 ===== */
.right-card {
  padding: 17px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 14px;
  background: var(--ld-bg-card);
  box-shadow: 0 5px 18px color-mix(in srgb, var(--ld-shadow) 25%, transparent);
}
.journey-card {
  flex: 0 0 auto;
}
.journey-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.journey-stats > div {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  column-gap: 7px;
  align-items: center;
  padding: 8px 7px;
  border-radius: 8px;
  background: var(--c-bg-1);
}
.journey-stats > div > span {
  display: grid;
  width: 28px;
  height: 28px;
  grid-row: 1 / 3;
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  place-items: center;
}
.journey-stats strong {
  align-self: end;
  color: var(--c-text);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1;
}
.journey-stats small {
  align-self: start;
  color: var(--c-text-3);
  font-size: 0.45rem;
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
  background: linear-gradient(
    155deg,
    var(--c-primary-soft),
    var(--ld-bg-card) 64%
  );
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
  background: linear-gradient(
    145deg,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 52%, #4a5bd0)
  );
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
  background: linear-gradient(
    145deg,
    #3a63c9,
    color-mix(in srgb, var(--c-primary) 40%, #243a75)
  );
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
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
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
  transition:
    transform 0.2s var(--ui-ease-out),
    box-shadow 0.2s ease;
}
.badge-mini:hover {
  box-shadow: 0 8px 18px color-mix(in srgb, var(--ld-shadow) 40%, transparent);
  transform: translateY(-2px);
}

/* ===== 动画 ===== */
@keyframes badge-orbit {
  to {
    transform: rotate(360deg);
  }
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
    padding-bottom: 20px;
  }
  .badges-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .badges.expanded .badges-grid {
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
  .badges-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .badges.expanded {
    padding: 20px 16px;
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
  .bottle-composer-enter-active,
  .bottle-composer-leave-active,
  .tabs-track {
    animation: none;
    transition: none;
  }
  .badge-icon::after {
    animation: none;
  }
}
</style>
