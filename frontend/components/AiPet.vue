<template>
  <Teleport to="body" :disabled="!teleportToBody">
    <div class="ai-pet" :class="{ open: chatOpen, 'is-article': isArticleMode, docked }">
    <Transition name="pet-panel">
      <div
        v-if="chatOpen"
        class="pet-chat"
        role="dialog"
        aria-label="和哆啦A梦聊天"
      >
        <header class="pet-chat-head">
          <div class="pet-chat-title">
            <span class="pet-chat-avatar" aria-hidden="true">
              <span class="dora-avatar-image" :style="{ backgroundImage: `url(${spriteUrl})` }" />
            </span>
            <div>
              <div class="pet-name-row">
                <strong>{{ displayName }}</strong>
                <span class="pet-online">在线</span>
              </div>
              <p>{{ description }}</p>
              <span v-if="isContentMode" class="pet-context-label">{{
                contextLabel
              }}</span>
            </div>
          </div>
          <button
            type="button"
            class="pet-icon-btn"
            aria-label="关闭"
            @click="closeChat"
          >
            <Icon name="ph:x-bold" />
          </button>
        </header>

        <div ref="listRef" class="pet-chat-list">
          <div v-if="historyLoading" class="pet-history-loading" aria-label="正在加载历史消息">
            <span /><span /><span />
          </div>
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="pet-msg"
            :class="m.role"
          >
            <template v-if="m.role === 'assistant'">
              <div
                v-if="m.streaming && m.renderedHtml"
                class="pet-bubble pet-markdown pet-streaming"
                v-html="m.renderedHtml"
              />
              <div
                v-else-if="!m.streaming"
                class="pet-bubble pet-markdown"
                v-html="renderMarkdown(m.content)"
              />
              <div
                v-if="!m.streaming && m.cards?.length"
                class="pet-source-cards"
              >
                <AppLink
                  v-for="card in m.cards"
                  :key="`${card.type}:${card.sourceId}`"
                  :to="card.href"
                  @click="trackCard(card)"
                >
                  <span class="pet-source-media">
                    <img
                      v-if="sourceImage(card)"
                      :src="sourceImage(card)"
                      :alt="card.title"
                      loading="lazy"
                    />
                    <Icon v-else :name="sourceIcon(card.type)" />
                  </span>
                  <span class="pet-source-copy">
                    <small>{{ sourceLabel(card.type) }}</small>
                    <strong>{{ sourceTitle(card) }}</strong>
                    <span v-if="sourceExcerpt(card)">{{
                      sourceExcerpt(card)
                    }}</span>
                  </span>
                  <Icon
                    name="ph:arrow-up-right-bold"
                    class="pet-source-arrow"
                  />
                </AppLink>
              </div>
              <div
                v-if="!m.streaming && m.music?.length"
                class="pet-music-cards"
              >
                <button
                  v-for="track in m.music"
                  :key="`${track.name}:${track.artist}`"
                  type="button"
                  @click="playTrack(track)"
                >
                  <span class="pet-music-cover">
                    <img
                      v-if="track.pic"
                      :src="track.pic"
                      :alt="track.name"
                      loading="lazy"
                    />
                    <Icon v-else name="ph:music-notes-fill" />
                  </span>
                  <span
                    ><strong>{{ track.name }}</strong
                    ><small>{{ track.artist }}</small></span
                  >
                  <Icon name="ph:play-fill" />
                </button>
              </div>
              <div v-if="shouldAskFeedback(m, i)" class="pet-feedback">
                <span>这次有帮到你吗？</span>
                <div>
                  <button
                    type="button"
                    title="有帮助"
                    :disabled="m.feedbackPending"
                    @click="feedback(m, true)"
                  >
                    <Icon name="ph:thumbs-up-bold" /><span>有</span>
                  </button>
                  <button
                    type="button"
                    title="没帮助"
                    :disabled="m.feedbackPending"
                    @click="feedback(m, false)"
                  >
                    <Icon name="ph:thumbs-down-bold" /><span>没有</span>
                  </button>
                </div>
              </div>
              <div
                v-else-if="m.feedbackRecorded && i === latestFeedbackIndex"
                class="pet-feedback-confirmed"
              >
                <Icon name="ph:check-circle-fill" />
                <span>谢谢，我记下了</span>
              </div>
            </template>
            <div v-else class="pet-bubble">{{ m.content }}</div>
          </div>
          <div v-if="sending && !streamStarted" class="pet-msg assistant">
            <div class="pet-bubble typing"><span /><span /><span /></div>
          </div>
        </div>

        <div class="pet-suggestions">
          <button
            v-for="action in quickActions"
            :key="action.label"
            type="button"
            :disabled="sending"
            @click="runQuickAction(action)"
          >
            <Icon :name="action.icon" />
            <span>{{ action.label }}</span>
          </button>
        </div>

        <form class="pet-chat-form" @submit.prevent="send">
          <Icon name="ph:sparkle-bold" class="pet-input-mark" />
          <textarea
            ref="inputRef"
            v-model="input"
            class="pet-input"
            rows="1"
            :maxlength="inputMaxChars"
            :placeholder="inputPlaceholder"
            :disabled="sending"
            @input="resizeInput"
            @keydown.enter.exact.prevent="send"
          />
          <button
            type="submit"
            class="pet-send"
            :disabled="sending || !input.trim()"
            aria-label="发送"
          >
            <Icon name="ph:paper-plane-right-fill" />
          </button>
        </form>
      </div>
    </Transition>

    <Transition name="pet-actions">
      <div v-if="actionsVisible" class="pet-actions" aria-label="AI 快捷功能">
        <button
          v-for="action in quickActions.slice(0, 3)"
          :key="action.label"
          type="button"
          @click="runQuickAction(action)"
        >
          <Icon :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </Transition>

    <button
      type="button"
      class="pet-fab"
      :title="chatOpen ? '收起' : '和哆啦A梦聊天'"
      @click="toggleChat"
    >
      <span class="pet-sprite-wrap" :style="wrapStyle">
        <span class="pet-sprite-img" :key="animKey" :style="spriteStyle" />
      </span>
      <Transition name="pet-hint" appear>
        <span v-if="showHint" class="pet-hint">{{ hintText }}</span>
      </Transition>
    </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import petMeta from "~/assets/dram/pet.json";
import { aiCardImage, cleanAiExcerpt, cleanAiTitle } from "~/utils/aiContent";
const spriteUrl = "/dram/spritesheet.webp";

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

type Role = "user" | "assistant";
type SourceCard = {
  type: string;
  sourceId: string;
  title: string;
  href: string;
  excerpt: string;
  image?: string | null;
};
interface Msg {
  role: Role;
  content: string;
  streaming?: boolean;
  renderedHtml?: string;
  cards?: SourceCard[];
  feedbackEligible?: boolean;
  feedbackPending?: boolean;
  feedbackRecorded?: boolean;
  music?: MusicTrack[];
}
type ChatUsage = {
  inputMaxChars: number;
};
type MusicTrack = {
  name: string;
  artist: string;
  url: string;
  pic?: string;
  playlist?: string;
};
type QuickAction = {
  label: string;
  icon: string;
  prompt: string;
  kind?: "summary";
};
type ArticleContext = {
  title?: string;
  content?: string;
  slug?: string;
  type?: string;
  sourceId?: string;
  scene?: string;
};

type ContextProfile = {
  label: string;
  hint: string;
  placeholder: string;
  actions: QuickAction[];
};

const props = withDefaults(
  defineProps<{
    mode?: "home" | "article" | "context";
    article?: ArticleContext;
    docked?: boolean;
  }>(),
  {
    mode: "home",
    docked: false,
  },
);

type AnimClip = { row: number; frames: number; fps: number };

const meta = petMeta as {
  displayName: string;
  description: string;
  frameWidth: number;
  frameHeight: number;
  displayWidth: number;
  displayHeight: number;
  cols: number;
  rows: number;
  idle: AnimClip;
  play?: AnimClip;
  greetings: string[];
};

const api = useApi();
const { isLoggedIn } = useAuth();
const { mediaUrl } = useMediaUrl();
const toast = useToast();
const { requestTrack } = useMusicPlayerState();
const chatOpen = ref(false);
const sending = ref(false);
const streamStarted = ref(false);
const input = ref("");
const messages = ref<Msg[]>([]);
const listRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const showHint = ref(true);
const historyLoaded = ref(false);
const historyLoading = ref(false);
const suppressActions = ref(false);
let streamController: AbortController | null = null;
let scrollFrame: number | null = null;
let typingBuffer = "";
let typingHtml = "";
let typingText = "";
let typingVisibleCount = 0;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let typingMessageIndex = -1;
let typingDrainResolvers: Array<() => void> = [];

const displayName = ref(meta.displayName || "哆啦A梦");
const description = ref(meta.description || "阿风的伙伴 · 蓝色机器猫");
const greetings = ref<string[]>([...(meta.greetings || [])]);
const selectedGreeting = ref("你好呀～");
const inputMaxChars = ref(500);

const isArticleMode = computed(() => props.mode === "article");
const isContentMode = computed(
  () => props.mode === "article" || props.mode === "context",
);
const isMobileView = ref(false);
const teleportToBody = computed(
  () => props.docked && isMobileView.value,
);
function syncViewport() {
  isMobileView.value = window.matchMedia("(max-width: 900px)").matches;
}
const contentType = computed(
  () => props.article?.type || (isArticleMode.value ? "post" : "home"),
);

const contextProfiles: Record<string, ContextProfile> = {
  post: {
    label: "正在陪你读这篇文章",
    hint: "这篇文章，要一起读读吗？",
    placeholder: "聊聊这篇文章…",
    actions: [
      {
        label: "三句话总结",
        icon: "ph:magic-wand-bold",
        prompt: "请用三句话总结当前文章。",
        kind: "summary",
      },
      {
        label: "提炼核心要点",
        icon: "ph:list-checks-bold",
        prompt: "请结合当前文章，提炼 4 到 6 个核心要点，表达简洁。",
      },
      {
        label: "这篇适合谁",
        icon: "ph:users-three-bold",
        prompt: "请说明这篇文章适合哪些读者，以及读完能获得什么。",
      },
      {
        label: "解释难点",
        icon: "ph:lightbulb-filament-bold",
        prompt: "请找出当前文章里最难理解的部分，并用通俗方式解释。",
      },
    ],
  },
  moment: {
    label: "正在陪你看这则瞬间",
    hint: "想听听这则瞬间的余味吗？",
    placeholder: "聊聊这则瞬间…",
    actions: [
      {
        label: "读读此刻",
        icon: "ph:sparkle-bold",
        prompt: "请结合当前瞬间，说说它记录了怎样的时刻与情绪。",
      },
      {
        label: "寻找相似记忆",
        icon: "ph:circles-three-plus-bold",
        prompt: "请从本站找出与当前瞬间气质或主题相近的内容。",
      },
      {
        label: "从这里继续",
        icon: "ph:path-bold",
        prompt: "如果从这则瞬间继续探索，推荐下一条值得看的内容。",
      },
    ],
  },
  library: {
    label: "正在陪你翻这份书影",
    hint: "这本书或这部电影，聊聊吗？",
    placeholder: "问问这份书影记录…",
    actions: [
      {
        label: "为什么值得看",
        icon: "ph:star-bold",
        prompt: "结合当前书影记录，说说它为什么值得读或值得看。",
      },
      {
        label: "读后感重点",
        icon: "ph:quotes-bold",
        prompt: "提炼这份书影记录中最重要的个人感受，不要写成文章摘要。",
      },
      {
        label: "找相似作品",
        icon: "ph:books-bold",
        prompt: "从本站书影中推荐气质或主题相近的作品。",
      },
    ],
  },
  album: {
    label: "正在陪你翻这册相簿",
    hint: "要一起看看这册相簿吗？",
    placeholder: "聊聊照片里的故事…",
    actions: [
      {
        label: "读懂这册相簿",
        icon: "ph:images-square-bold",
        prompt: "结合当前相册资料，概括它记录的时间、地点与主题。",
      },
      {
        label: "照片里的线索",
        icon: "ph:magnifying-glass-bold",
        prompt: "从当前相册信息中找出值得留意的细节与线索。",
      },
      {
        label: "寻找相关记忆",
        icon: "ph:clock-counter-clockwise-bold",
        prompt: "推荐与当前相册相关的文章、瞬间或地点记忆。",
      },
    ],
  },
  photo: {
    label: "正在陪你看这张照片",
    hint: "照片里的故事，要一起找找吗？",
    placeholder: "问问这张照片…",
    actions: [
      {
        label: "照片讲了什么",
        icon: "ph:image-bold",
        prompt: "仅依据当前照片的公开资料，说说它记录了什么。",
      },
      {
        label: "找到所属相册",
        icon: "ph:images-square-bold",
        prompt: "帮我找到这张照片所属的相册与相关记忆。",
      },
    ],
  },
  place: {
    label: "正在陪你抵达这个地点",
    hint: "想看看这里发生过什么吗？",
    placeholder: "问问这个地点的记忆…",
    actions: [
      {
        label: "这里发生过什么",
        icon: "ph:map-pin-bold",
        prompt: "结合本站公开内容，介绍当前地点发生过的记忆。",
      },
      {
        label: "按时间逛一遍",
        icon: "ph:clock-counter-clockwise-bold",
        prompt: "按时间顺序整理与当前地点有关的内容。",
      },
      {
        label: "推荐下一站",
        icon: "ph:navigation-arrow-bold",
        prompt: "根据当前地点的记忆，推荐下一处值得探索的地点。",
      },
    ],
  },
  journey: {
    label: "正在陪你走这段旅程",
    hint: "这段旅程，要从哪一站聊起？",
    placeholder: "问问这段旅程…",
    actions: [
      {
        label: "旅程速览",
        icon: "ph:path-bold",
        prompt: "概括当前旅程的路线、节点与最值得留意的记忆。",
      },
      {
        label: "挑一站停留",
        icon: "ph:map-pin-line-bold",
        prompt: "从当前旅程中挑一站重点介绍，并说明选择理由。",
      },
      {
        label: "沿线继续阅读",
        icon: "ph:book-open-text-bold",
        prompt: "推荐与当前旅程沿线相关的文章、瞬间或相册。",
      },
    ],
  },
  story: {
    label: "正在陪你走进这条故事线",
    hint: "要一起理清这段故事吗？",
    placeholder: "聊聊这条故事线…",
    actions: [
      {
        label: "故事线索",
        icon: "ph:film-strip-bold",
        prompt: "整理当前故事的公开线索与叙事顺序。",
      },
      {
        label: "关键节点",
        icon: "ph:git-branch-bold",
        prompt: "指出当前故事中最关键的几个记忆节点。",
      },
      {
        label: "继续探索",
        icon: "ph:arrow-circle-right-bold",
        prompt: "推荐与当前故事相关、适合继续探索的内容。",
      },
    ],
  },
  map: {
    label: "正在陪你浏览时光地图",
    hint: "想从哪座城市开始找记忆？",
    placeholder: "问问地图上的地点与记忆…",
    actions: [
      {
        label: "最近的地点记忆",
        icon: "ph:map-trifold-bold",
        prompt: "从本站最近的公开内容中，推荐几处有记忆的地点。",
      },
      {
        label: "按城市探索",
        icon: "ph:buildings-bold",
        prompt: "先问我想去的城市，再推荐该城市相关的公开内容。",
      },
      {
        label: "随机去一处",
        icon: "ph:navigation-arrow-bold",
        prompt: "从时光地图中随机挑一处值得探索的地点并说明理由。",
      },
    ],
  },
  constellation: {
    label: "正在陪你观察时光星图",
    hint: "想从哪颗记忆星开始？",
    placeholder: "问问星图里的记忆关系…",
    actions: [
      {
        label: "最近点亮的记忆",
        icon: "ph:star-four-bold",
        prompt: "介绍本站最近点亮的公开记忆，并推荐从哪一颗开始。",
      },
      {
        label: "解释星图关系",
        icon: "ph:graph-bold",
        prompt: "简洁解释时光星图中的内容如何按时间、地点与主题相连。",
      },
      {
        label: "随机定位一颗",
        icon: "ph:crosshair-bold",
        prompt: "随机推荐一段公开记忆，并说明它与其他内容的联系。",
      },
    ],
  },
};

const activeProfile = computed(
  () => contextProfiles[contentType.value] || contextProfiles.post,
);
const contextLabel = computed(() => activeProfile.value.label);
const eventScene = computed(
  () =>
    props.article?.scene ||
    (isArticleMode.value
      ? "article"
      : contentType.value || props.mode || "home"),
);
const latestFeedbackIndex = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const message = messages.value[index];
    if (
      message.role === "assistant" &&
      (message.feedbackEligible || message.feedbackRecorded)
    )
      return index;
  }
  return -1;
});
function compactHint(value: string, maxLength = 26) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(normalized);
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("")}…`
    : normalized;
}

const hintText = computed(() =>
  compactHint(
    isContentMode.value ? activeProfile.value.hint : selectedGreeting.value,
  ),
);
const inputPlaceholder = computed(() =>
  isContentMode.value ? activeProfile.value.placeholder : "想从这里发现什么？",
);
const actionsVisible = computed(
  () => !chatOpen.value && !suppressActions.value && !showHint.value,
);

watch(isLoggedIn, () => {
  historyLoaded.value = false;
  messages.value = [];
  if (chatOpen.value) void prepareChat();
});
watch(
  () =>
    `${props.article?.type || "home"}:${props.article?.slug || ""}:${props.article?.sourceId || ""}`,
  () => {
    streamController?.abort();
    historyLoaded.value = false;
    messages.value = [];
  },
);
const quickActions = computed<QuickAction[]>(() =>
  isContentMode.value
    ? activeProfile.value.actions
    : [
        {
          label: "推荐一篇文章",
          icon: "ph:sparkle-bold",
          prompt:
            "请根据本站最近发布的内容，推荐一篇值得先读的文章，并简要说明理由。",
        },
        {
          label: "推荐一册相册",
          icon: "ph:images-square-bold",
          prompt: "请从本站相册中推荐一册值得翻看的相册，并简短说明理由。",
        },
        {
          label: "推荐一份书影",
          icon: "ph:books-bold",
          prompt: "请从本站书影记录中推荐一部作品，并简短说明理由。",
        },
        {
          label: "推荐一首歌",
          icon: "ph:music-notes-bold",
          prompt: "先根据此刻的氛围推荐几首歌，我可以点击直接播放。",
        },
        {
          label: "本站有什么内容",
          icon: "ph:books-bold",
          prompt: "请简洁介绍这个博客主要有哪些内容方向，并各推荐一篇文章。",
        },
        {
          label: "帮我发现内容",
          icon: "ph:compass-bold",
          prompt:
            "我还没想好读什么，请用三个简短问题了解兴趣，再为我推荐本站文章。",
        },
        {
          label: "看看最近更新",
          icon: "ph:clock-counter-clockwise-bold",
          prompt: "请从本站最近发布的内容中挑出三篇，用一句话分别介绍。",
        },
        {
          label: "随机探索",
          icon: "ph:dice-five-bold",
          prompt:
            "请从本站文章里随机挑一个值得探索的内容，并简短说明为什么选它。",
        },
      ],
);

function chooseGreeting() {
  const list = greetings.value.length
    ? greetings.value
    : ["你好，我是哆啦A梦！"];
  const previous = sessionStorage.getItem("corner:pet:last-greeting") || "";
  const candidates =
    list.length > 1 ? list.filter((item) => item !== previous) : list;
  const next =
    candidates[Math.floor(Math.random() * candidates.length)] || list[0];
  selectedGreeting.value = next;
  sessionStorage.setItem("corner:pet:last-greeting", next);
}

async function loadPetMeta() {
  try {
    const res = await api.get<{
      displayName?: string;
      description?: string;
      greetings?: string[];
      limits?: {
        inputMaxChars?: number;
      };
    }>("/ai/pet/meta");
    if (res?.displayName) displayName.value = res.displayName;
    if (res?.description) description.value = res.description;
    if (res?.limits?.inputMaxChars)
      inputMaxChars.value = res.limits.inputMaxChars;
    if (Array.isArray(res?.greetings) && res.greetings.length) {
      greetings.value = [
        ...new Set([...(meta.greetings || []), ...res.greetings]),
      ];
      chooseGreeting();
    }
  } catch {
    // keep local pet.json defaults
  }
}

const dw = meta.displayWidth || 96;
const dh = meta.displayHeight || 104;
const bgCols = meta.cols || 8;
const bgRows = meta.rows || 9;

const idleClip: AnimClip = {
  row: meta.idle?.row ?? 0,
  frames: meta.idle?.frames ?? 6,
  fps: meta.idle?.fps ?? 6,
};
const activeClip = computed(() => idleClip);
const animKey = computed(
  () =>
    `${activeClip.value.row}-${activeClip.value.frames}-${activeClip.value.fps}`,
);

const wrapStyle = { width: `${dw}px`, height: `${dh}px` };

const spriteStyle = computed(() => {
  const clip = activeClip.value;
  const frames = Math.max(1, clip.frames);
  const fps = Math.max(1, clip.fps);
  const row = Math.max(0, clip.row);
  return {
    "--pet-frame-shift": `${-frames * dw}px`,
    "--pet-duration": `${frames / fps}s`,
    "--pet-steps": String(frames),
    backgroundImage: `url(${spriteUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0 0",
    backgroundSize: `${bgCols * dw}px ${bgRows * dh}px`,
    width: `${bgCols * dw}px`,
    height: `${bgRows * dh}px`,
    top: `${-row * dh}px`,
  };
});

let hintTimer: ReturnType<typeof setTimeout> | null = null;
let actionRevealTimer: ReturnType<typeof setTimeout> | null = null;

function openChat() {
  void api
    .post("/ai/events", {
      scene: eventScene.value,
      action: "open",
      contentType: contentType.value,
      sourceId: props.article?.sourceId,
    })
    .catch(() => undefined);
  if (actionRevealTimer) clearTimeout(actionRevealTimer);
  suppressActions.value = true;
  chatOpen.value = true;
}

function closeChat() {
  chatOpen.value = false;
  if (actionRevealTimer) clearTimeout(actionRevealTimer);
  actionRevealTimer = setTimeout(() => {
    suppressActions.value = false;
  }, 220);
}

async function toggleChat() {
  showHint.value = false;
  if (chatOpen.value) {
    closeChat();
    return;
  }
  openChat();
  await prepareChat();
}

async function prepareChat() {
  if (!historyLoaded.value && !isContentMode.value) {
    historyLoading.value = true;
    try {
      await loadHistory();
      historyLoaded.value = true;
    } finally {
      historyLoading.value = false;
    }
  }
  if (messages.value.length === 0) {
    const fallback = isContentMode.value
      ? `${activeProfile.value.label}，想从哪里开始？`
      : selectedGreeting.value;
    messages.value.push({ role: "assistant", content: fallback });
  }
  await nextTick(scrollBottom);
}

async function loadHistory() {
  try {
    const history =
      await api.get<{ role: string; content: string }[]>("/ai/chat/history");
    messages.value = (history || []).map((m) => ({
      role: m.role as Role,
      content: m.content,
    }));
  } catch {
    // not logged in or network error — keep messages empty
  }
}

async function send() {
  const text = input.value.trim();
  if (!text || sending.value) return;
  input.value = "";
  nextTick(resizeInput);
  await sendMessage(text);
}

async function sendMessage(text: string) {
  if (!text.trim() || sending.value) return;
  messages.value.forEach((message) => {
    message.feedbackEligible = false;
  });
  messages.value.push({ role: "user", content: text });
  sending.value = true;
  streamStarted.value = false;
  await nextTick(scrollBottom);

  const assistantIndex = messages.value.length;
  messages.value.push({ role: "assistant", content: "", streaming: true });
  resetTypingBuffer(assistantIndex);
  streamController?.abort();
  streamController = new AbortController();

  try {
    let responseMarkdown = "";
    const article = isContentMode.value
      ? {
          title: props.article?.title || "",
          content: String(props.article?.content || "").slice(0, 10000),
          slug: props.article?.slug || "",
          type: contentType.value === "home" ? "" : contentType.value,
          sourceId: props.article?.sourceId || "",
          scene: eventScene.value,
        }
      : undefined;
    let pendingCards: SourceCard[] = [];
    await api.postStream(
      "/ai/chat/stream",
      { message: text, article },
      ({ event, data }) => {
        if (event === "token" && typeof data === "string") {
          responseMarkdown += data;
        }
        if (event === "done" && Array.isArray(data?.recommendations)) {
          pendingCards = data.recommendations.slice(0, 2);
        }
        if (event === "done" && Array.isArray(data?.music)) {
          const message = messages.value[assistantIndex];
          if (message) message.music = data.music.slice(0, 4);
          if (/播放|来一首|听(?:一首|点|歌)/u.test(text) && data.music[0]) {
            requestTrack(data.music[0]);
          }
        }
        if (event === "done" && data?.usage) {
          const usage = data.usage as ChatUsage;
          inputMaxChars.value = usage.inputMaxChars;
        }
        if (event === "error")
          throw new Error(data?.message || "Stream failed");
      },
      streamController.signal,
    );
    enqueueTyping(responseMarkdown || "……", assistantIndex);
    await waitForTypingDrain();
    if (pendingCards.length) {
      await new Promise(resolve => window.setTimeout(resolve, 180));
      const message = messages.value[assistantIndex];
      if (message) message.cards = pendingCards;
    }
  } catch (error: any) {
    if (error?.name !== "AbortError") {
      enqueueTyping(
        error?.message || "呜，任意门开小差了。稍后再试，或者先逛逛文章吧～",
        assistantIndex,
      );
      await waitForTypingDrain();
    }
  } finally {
    if (messages.value[assistantIndex]) {
      messages.value[assistantIndex].streaming = false;
      messages.value[assistantIndex].feedbackEligible = Boolean(
        messages.value[assistantIndex].content,
      );
    }
    sending.value = false;
    streamStarted.value = false;
    streamController = null;
    await nextTick(scrollBottom);
  }
}

async function runQuickAction(action: QuickAction) {
  showHint.value = false;
  openChat();
  await prepareChat();
  await sendMessage(action.prompt);
}

function shouldAskFeedback(message: Msg, index: number) {
  return (
    index === latestFeedbackIndex.value &&
    Boolean(message.feedbackEligible) &&
    !message.feedbackRecorded &&
    !message.streaming
  );
}

async function feedback(message: Msg, helpful: boolean) {
  if (message.feedbackPending || message.feedbackRecorded) return;
  message.feedbackPending = true;
  try {
    await api.post("/ai/events", {
      scene: eventScene.value,
      action: "feedback",
      contentType: contentType.value,
      sourceId: props.article?.sourceId,
      helpful,
    });
    message.feedbackEligible = false;
    message.feedbackRecorded = true;
  } catch {
    toast.error("这次反馈没有送达，请稍后再试");
  } finally {
    message.feedbackPending = false;
  }
}

function trackCard(card: SourceCard) {
  void api
    .post("/ai/events", {
      scene: eventScene.value,
      action: "recommend_click",
      contentType: card.type,
      sourceId: card.sourceId,
      href: card.href,
      sourceClicked: true,
    })
    .catch(() => undefined);
}

function playTrack(track: MusicTrack) {
  requestTrack(track);
  toast.success(`正在播放：${track.name}`);
  void api
    .post("/ai/events", {
      scene: eventScene.value,
      action: "music_play",
      metadata: {
        name: track.name,
        artist: track.artist,
        playlist: track.playlist,
      },
    })
    .catch(() => undefined);
}

const sourceLabels: Record<string, string> = {
  post: "文章",
  moment: "瞬间",
  library: "书影",
  place: "地点",
  album: "相册",
  photo: "照片",
  journey: "旅程",
  story: "故事",
};
const sourceIcons: Record<string, string> = {
  post: "ph:article-bold",
  moment: "ph:sparkle-bold",
  library: "ph:books-bold",
  place: "ph:map-pin-bold",
  album: "ph:images-square-bold",
  photo: "ph:image-bold",
  journey: "ph:path-bold",
  story: "ph:film-strip-bold",
};

function sourceLabel(type: string) {
  return sourceLabels[type] || type;
}

function sourceIcon(type: string) {
  return sourceIcons[type] || "ph:star-four-bold";
}

function sourceImage(card: SourceCard) {
  const source = aiCardImage(card);
  return source ? mediaUrl(source) : "";
}

function sourceExcerpt(card: SourceCard) {
  return cleanAiExcerpt(card.excerpt);
}

function sourceTitle(card: SourceCard) {
  return cleanAiTitle(card.title, card.type);
}

function resizeInput() {
  const element = inputRef.value;
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(88, Math.max(24, element.scrollHeight))}px`;
}

function scrollBottom() {
  const el = listRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function queueScrollBottom() {
  if (scrollFrame !== null) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    scrollBottom();
  });
}

function resolveTypingDrain() {
  const resolvers = typingDrainResolvers;
  typingDrainResolvers = [];
  resolvers.forEach((resolve) => resolve());
}

function resetTypingBuffer(messageIndex: number) {
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = null;
  typingBuffer = "";
  typingHtml = "";
  typingText = "";
  typingVisibleCount = 0;
  typingMessageIndex = messageIndex;
  resolveTypingDrain();
}

function enqueueTyping(text: string, messageIndex: number) {
  if (!text) return;
  if (typingMessageIndex !== messageIndex) resetTypingBuffer(messageIndex);
  typingBuffer = text;
  typingHtml = renderMarkdown(text);
  const container = document.createElement("div");
  container.innerHTML = typingHtml;
  typingText = container.textContent || "";
  typingVisibleCount = 0;
  const message = messages.value[messageIndex];
  if (message) {
    message.content = text;
    message.renderedHtml = "";
  }
  streamStarted.value = true;
  if (!typingTimer) typeNextCharacter();
}

function renderHtmlPrefix(html: string, visibleCount: number) {
  const source = document.createElement("template");
  source.innerHTML = html;
  let remaining = visibleCount;

  const clonePrefix = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= 0) return null;
      const characters = Array.from(node.textContent || "");
      const value = characters.slice(0, remaining).join("");
      remaining -= Math.min(remaining, characters.length);
      return value ? document.createTextNode(value) : null;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const element = node as HTMLElement;
    const clone = element.cloneNode(false) as HTMLElement;
    for (const child of Array.from(element.childNodes)) {
      const childClone = clonePrefix(child);
      if (childClone) clone.appendChild(childClone);
      if (remaining <= 0) break;
    }
    if (clone.childNodes.length || ["BR", "HR"].includes(clone.tagName))
      return clone;
    return null;
  };

  const output = document.createElement("div");
  for (const child of Array.from(source.content.childNodes)) {
    const clone = clonePrefix(child);
    if (clone) output.appendChild(clone);
    if (remaining <= 0) break;
  }
  return output.innerHTML;
}

function typeNextCharacter() {
  if (!typingBuffer || typingMessageIndex < 0) {
    typingTimer = null;
    resolveTypingDrain();
    return;
  }

  const characters = Array.from(typingText);
  const character = characters[typingVisibleCount] || "";
  typingVisibleCount += 1;
  const message = messages.value[typingMessageIndex];
  if (message)
    message.renderedHtml = renderHtmlPrefix(typingHtml, typingVisibleCount);
  queueScrollBottom();

  if (typingVisibleCount >= characters.length) {
    typingBuffer = "";
    typingTimer = null;
    resolveTypingDrain();
    return;
  }

  const delay = /[。！？.!?\n]/u.test(character)
    ? 96
    : /[，、；：,;:]/u.test(character)
      ? 58
      : 34;
  typingTimer = setTimeout(typeNextCharacter, delay);
}

function waitForTypingDrain() {
  if (!typingBuffer && !typingTimer) return Promise.resolve();
  return new Promise<void>((resolve) => typingDrainResolvers.push(resolve));
}

onMounted(() => {
  syncViewport();
  window.addEventListener("resize", syncViewport);
  chooseGreeting();
  loadPetMeta();
  hintTimer = setTimeout(
    () => {
      showHint.value = false;
    },
    isContentMode.value ? 4200 : 6000,
  );
});

onUnmounted(() => {
  window.removeEventListener("resize", syncViewport);
  if (hintTimer) clearTimeout(hintTimer);
  if (actionRevealTimer) clearTimeout(actionRevealTimer);
  streamController?.abort();
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = null;
  typingBuffer = "";
  resolveTypingDrain();
});
</script>

<style scoped>
.ai-pet {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 1100;
  width: 88px;
  height: 92px;
  pointer-events: none;
}

.ai-pet > * {
  pointer-events: auto;
}


.pet-fab {
  position: absolute;
  right: 0;
  bottom: 0;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
  animation: pet-bob 2.8s ease-in-out infinite;
  will-change: transform;
}

.pet-fab::after {
  content: "";
  position: absolute;
  z-index: -1;
  left: 22%;
  right: 22%;
  bottom: 3px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary) 18%, transparent);
  box-shadow: 0 4px 10px color-mix(in srgb, var(--c-primary) 16%, transparent);
}

.pet-fab:hover {
  cursor: pointer;
}

.pet-sprite-wrap {
  display: block;
  position: relative;
  border-radius: 28px;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
  contain: strict;
}

.pet-sprite-img {
  display: block;
  position: absolute;
  left: 0;
  will-change: transform;
  animation: pet-frames var(--pet-duration) steps(var(--pet-steps)) infinite;
}

.pet-hint {
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  width: max-content;
  max-width: min(168px, calc(100vw - 132px));
  padding: 5px 8px;
  border-radius: 9px;
  background: var(--ld-bg-card);
  color: var(--c-text-1);
  font-size: 0.63rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  text-align: left;
  white-space: normal;
  box-shadow: 0 8px 22px var(--ld-shadow);
}

.pet-hint::after {
  content: "";
  position: absolute;
  right: -6px;
  top: 50%;
  width: 10px;
  height: 10px;
  background: var(--ld-bg-card);
  transform: translateY(-50%) rotate(45deg);
}

.pet-chat {
  position: absolute;
  right: calc(100% + 10px);
  bottom: 0;
  width: min(300px, calc(100vw - 32px));
  height: min(400px, calc(100dvh - 180px));
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: color-mix(in srgb, var(--ld-bg-card) 98%, var(--c-primary-soft));
  box-shadow:
    0 18px 46px color-mix(in srgb, #000 20%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 60%, transparent) inset;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 12%, var(--border));
}

.pet-chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 80%, var(--c-primary-soft));
  border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  position: relative;
}
.pet-chat-head::after { content: ""; position: absolute; left: 14px; bottom: -1px; width: 32px; height: 3px; border-radius: 999px; background: var(--c-primary); opacity: .65; }

.pet-chat-title {
  display: flex;
  gap: 10px;
  min-width: 0;
}

.pet-chat-title > div {
  min-width: 0;
}

.pet-chat-avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-primary-soft);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--c-primary) 28%, transparent);
  flex-shrink: 0;
}

.dora-avatar-image { display: block; width: 100%; height: 100%; background-repeat: no-repeat; background-size: 288px 312px; background-position: 0 0; transform: scale(1.18); transform-origin: center; }

.pet-chat-avatar :deep(.icon) {
  font-size: 1rem;
}

.pet-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pet-online {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #22a06b;
  font-size: 0.6rem;
  font-weight: 600;
}

.pet-online::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgb(34 197 94 / 12%);
}

.pet-chat-title strong {
  display: block;
  font-size: 0.92rem;
  color: var(--c-text);
}

.pet-chat-title p {
  margin: 2px 0 0;
  font-size: 0.68rem;
  color: var(--c-text-3);
  line-height: 1.4;
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pet-context-label {
  display: inline-flex;
  align-items: center;
  margin-top: 5px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.62rem;
  line-height: 1.5;
}

.pet-icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.pet-icon-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.pet-chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 15px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: color-mix(in srgb, var(--c-bg-1) 80%, var(--ld-bg-card));
}

.pet-msg {
  display: flex;
  min-width: 0;
}

.pet-msg.user {
  justify-content: flex-end;
}

.pet-msg.assistant {
  align-items: flex-start;
  flex-direction: column;
}

.pet-bubble {
  max-width: 88%;
  padding: 8px 11px;
  border-radius: 8px;
  font-size: 0.76rem;
  line-height: 1.58;
  word-break: break-word;
}

.pet-msg.assistant .pet-bubble {
  background: var(--ld-bg-card);
  color: var(--c-text-1);
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
  border-bottom-left-radius: 3px;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--ld-shadow) 80%, transparent);
}

.pet-msg.user .pet-bubble {
  background: var(--c-primary);
  color: #fff;
  border-bottom-right-radius: 3px;
}

.pet-markdown {
  max-width: 94%;
}

.pet-streaming {
  white-space: normal;
}

.pet-markdown :deep(> :first-child) {
  margin-top: 0;
}

.pet-markdown :deep(> :last-child) {
  margin-bottom: 0;
}

.pet-markdown :deep(p) {
  margin: 0 0 0.62em;
}

.pet-markdown :deep(ol),
.pet-markdown :deep(ul) {
  margin: 0.5em 0 0.65em;
  padding-left: 1.55em;
}

.pet-markdown :deep(li) {
  padding-left: 0.15em;
}

.pet-markdown :deep(li + li) {
  margin-top: 0.42em;
}

.pet-markdown :deep(li::marker) {
  color: var(--c-primary);
  font-weight: 700;
}

.pet-markdown :deep(strong) {
  color: var(--c-text);
  font-weight: 750;
}

.pet-markdown :deep(a) {
  color: var(--c-primary);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--c-primary) 35%, transparent);
  text-underline-offset: 2px;
}

.pet-markdown :deep(code) {
  padding: 0.12em 0.38em;
  border-radius: 5px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  font-size: 0.9em;
}

.pet-markdown :deep(pre) {
  max-width: 100%;
  margin: 0.65em 0;
  padding: 10px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--code-bg);
}

.pet-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
  color: var(--c-text-1);
}

.pet-markdown :deep(blockquote) {
  margin: 0.6em 0;
  padding: 0.35em 0.75em;
  border-left: 3px solid var(--c-primary);
  border-radius: 0 7px 7px 0;
  background: var(--c-primary-soft);
  color: var(--c-text-2);
}

.pet-bubble.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: 48px;
  justify-content: center;
}

.pet-bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-text-3);
  animation: typing 1.1s infinite ease-in-out;
}

.pet-bubble.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.pet-bubble.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.pet-suggestions {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  background: var(--ld-bg-card);
}

.pet-suggestions button,
.pet-actions button {
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft));
  color: var(--c-text-1);
  font-family: inherit;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;
}

.pet-suggestions button {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.66rem;
  line-height: 1.35;
  text-align: left;
  white-space: normal;
}

.pet-suggestions button:hover,
.pet-actions button:hover {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 48%, var(--border));
  box-shadow: 0 7px 18px
    color-mix(in srgb, var(--c-primary) 12%, var(--ld-shadow));
  transform: translateY(-1px);
}

.pet-suggestions button:disabled {
  opacity: 0.5;
  cursor: wait;
  transform: none;
}

.pet-suggestions :deep(.icon),
.pet-actions :deep(.icon) {
  flex: 0 0 auto;
  font-size: 0.82rem;
  color: var(--c-primary);
}

.pet-actions {
  position: absolute;
  right: calc(100% + 8px);
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  width: max-content;
  max-width: min(230px, calc(100vw - 140px));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7px;
}

.pet-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  max-width: 100%;
  padding: 7px 11px;
  border-radius: 12px 12px 4px 12px;
  box-shadow: 0 7px 18px var(--ld-shadow);
  font-size: 0.7rem;
  white-space: nowrap;
}

.pet-chat-form {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 40px;
  align-items: end;
  gap: 8px;
  margin: 10px 12px 12px;
  padding: 6px 6px 6px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--c-bg-1) 74%, transparent);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.pet-history-loading { display: grid; gap: 8px; width: 74%; padding: 4px 0 10px; }
.pet-history-loading span { display: block; height: 34px; border-radius: 14px 14px 14px 4px; background: linear-gradient(90deg, var(--c-bg-2), color-mix(in srgb, var(--c-primary-soft) 65%, var(--c-bg-2)), var(--c-bg-2)); background-size: 220% 100%; animation: pet-loading 1.2s ease-in-out infinite; }
.pet-history-loading span:nth-child(2) { width: 86%; margin-left: 14%; border-radius: 14px 14px 4px 14px; }
.pet-history-loading span:nth-child(3) { width: 62%; }
@keyframes pet-loading { to { background-position: -120% 0; } }

.pet-chat-form:focus-within {
  border-color: color-mix(in srgb, var(--c-primary) 58%, var(--border));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 9%, transparent);
}
.pet-input-mark {
  margin-bottom: 10px;
  color: var(--c-primary);
  font-size: 0.88rem;
}

.pet-input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  max-height: 88px;
  border: none;
  border-radius: 0;
  padding: 9px 2px 7px;
  overflow-y: auto;
  resize: none;
  background: transparent;
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.8rem;
  outline: none;
  line-height: 1.55;
}

.pet-input:focus {
  box-shadow: none;
}

.pet-send {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pet-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pet-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes pet-frames {
  to {
    transform: translate3d(var(--pet-frame-shift), 0, 0);
  }
}

.pet-hint-enter-active,
.pet-hint-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.pet-hint-enter-from,
.pet-hint-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(8px);
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.pet-panel-enter-active {
  transition:
    opacity 0.28s ease,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.pet-panel-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.4, 0, 1, 1);
}

.pet-panel-enter-from,
.pet-panel-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.975);
}

.pet-actions-enter-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.pet-actions-leave-active {
  transition: none;
}

.pet-actions-enter-from,
.pet-actions-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(8px);
}

@media (max-width: 640px) {
  .ai-pet {
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
  }

  .pet-hint-login {
    width: max-content;
    max-width: min(210px, calc(100vw - 92px));
    white-space: normal;
    line-height: 1.45;
    text-align: left;
  }

  .pet-chat {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    width: min(300px, calc(100vw - 20px));
    height: min(400px, calc(68dvh - env(safe-area-inset-bottom)));
    border-radius: 18px;
  }

  .pet-actions {
    max-width: calc(100vw - 24px);
    gap: 5px;
  }

  .pet-actions button {
    min-height: 31px;
    padding: 6px 9px;
    border-radius: 11px;
    font-size: 0.66rem;
  }
}

.ai-pet.docked {
  position: relative;
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
  width: auto;
  height: auto;
  margin: 0 0 0 auto;
}

.ai-pet.docked .pet-fab {
  position: relative;
  right: auto;
  bottom: auto;
  display: block;
  margin: 0;
  animation: none;
}

.ai-pet.docked .pet-hint {
  right: calc(100% + 8px);
  left: auto;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
}

.ai-pet.docked .pet-hint::after {
  right: -6px;
  left: auto;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%) rotate(45deg);
}

.ai-pet.docked .pet-hint-enter-from,
.ai-pet.docked .pet-hint-leave-to {
  transform: translateY(-50%) translateX(8px);
}

.ai-pet.docked .pet-actions {
  right: calc(100% + 8px);
  left: auto;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  align-items: flex-end;
}

.ai-pet.docked .pet-actions-enter-from,
.ai-pet.docked .pet-actions-leave-to {
  transform: translateY(-50%) translateX(8px);
}

.ai-pet.docked .pet-chat {
  position: absolute;
  right: calc(100% + 10px);
  bottom: 0;
  width: min(300px, calc(100vw - 32px));
  height: min(400px, calc(100dvh - 180px));
}

@media (max-width: 900px) {
  .ai-pet.docked {
    position: fixed;
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    width: 88px;
    height: 92px;
    margin: 0;
  }


  .ai-pet.docked .pet-fab {
    position: absolute;
    right: 0;
    bottom: 0;
    left: auto;
    animation: pet-bob 2.8s ease-in-out infinite;
  }

  .ai-pet.docked .pet-hint {
    right: calc(100% + 10px);
    left: auto;
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
  }

  .ai-pet.docked .pet-hint::after {
    right: -6px;
    left: auto;
    top: 50%;
    bottom: auto;
    transform: translateY(-50%) rotate(45deg);
  }

  .ai-pet.docked .pet-actions {
    right: calc(100% + 8px);
    left: auto;
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
    align-items: flex-end;
  }

  .ai-pet.docked .pet-chat {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    width: min(300px, calc(100vw - 20px));
    height: min(400px, calc(68dvh - env(safe-area-inset-bottom)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-fab,
  .pet-sprite-img,
  .pet-bubble.typing span {
    animation: none !important;
  }

  .pet-panel-enter-active,
  .pet-panel-leave-active,
  .pet-hint-enter-active,
  .pet-hint-leave-active,
  .pet-actions-enter-active,
  .pet-actions-leave-active {
    transition: none;
  }
}

.pet-feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: min(94%, 270px);
  margin-top: 7px;
  padding-left: 3px;
  color: var(--c-text-3);
  font-size: 0.55rem;
}
.pet-feedback > div {
  display: flex;
  gap: 5px;
}
.pet-feedback button {
  display: inline-flex;
  min-height: 25px;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--ld-bg-card);
  color: var(--c-text-3);
  font-size: 0.5rem;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}
.pet-feedback button:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: var(--c-primary-soft);
  transform: translateY(-1px);
}
.pet-feedback button:disabled {
  cursor: wait;
  opacity: 0.55;
}
.pet-feedback-confirmed {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  padding-left: 3px;
  color: #26936a;
  font-size: 0.55rem;
  animation: feedback-in 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.pet-feedback-confirmed :deep(svg) {
  font-size: 0.78rem;
}
.pet-source-cards {
  display: grid;
  gap: 6px;
  width: 94%;
  margin-top: 7px;
  animation: pet-source-in .48s cubic-bezier(.16,1,.3,1) both;
}
.pet-source-cards a {
  position: relative;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 5px 8px 5px 5px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--ld-bg-card);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.18s ease,
    transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
.pet-source-cards a:hover {
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--border));
  transform: translateY(-1px);
}
.pet-source-media {
  display: grid;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  place-items: center;
}
@keyframes pet-source-in { from { opacity: 0; transform: translateY(7px); } }
.pet-source-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pet-source-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.pet-source-cards small {
  color: var(--c-primary);
  font-size: 0.5rem;
}
.pet-source-cards strong {
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pet-source-copy > span {
  display: -webkit-box;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.pet-source-arrow {
  color: var(--c-primary);
  font-size: 0.65rem;
}

.pet-music-cards {
  display: grid;
  width: 94%;
  gap: 6px;
  margin-top: 7px;
}
.pet-music-cards button {
  display: grid;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 8px;
  padding: 5px 7px 5px 5px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 15%, var(--border));
  border-radius: 9px;
  background: var(--ld-bg-card);
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 0.2s ease,
    transform 0.22s ease;
}
.pet-music-cards button:hover {
  border-color: var(--c-primary);
  transform: translateX(2px);
}
.pet-music-cover {
  display: grid;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  place-items: center;
}
.pet-music-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pet-music-cards button > span:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.pet-music-cards strong,
.pet-music-cards small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pet-music-cards strong {
  color: var(--c-text);
  font-size: 0.66rem;
}
.pet-music-cards small {
  color: var(--c-text-3);
  font-size: 0.54rem;
}
.pet-music-cards button > svg {
  color: var(--c-primary);
}
@keyframes feedback-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
