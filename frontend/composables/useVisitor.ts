// frontend/composables/useVisitor.ts
// 访客身份与互动 API：启动时无感识别（IP+归属地+浏览器+设备 由后端计算指纹），
// 行为埋点批量上报；留言墙与漂流瓶的读写入口。

import { ref } from "vue";

export interface VisitorBrief {
  visitorId: string;
  nickname: string;
  region: string | null;
  device: { browser: string; os: string; device: string };
  visits: number;
  isNew: boolean;
}

export interface VisitorMessageItem {
  id: string;
  content: string;
  nickname: string;
  originRegion: string | null;
  createdAt: string;
}

export interface BottleChainSegment {
  id: string;
  content: string;
  nickname: string;
  originRegion: string | null;
  createdAt: string;
}

export interface BottleItem {
  id: string;
  content: string;
  nickname: string;
  originRegion: string | null;
  currentRegion: string | null;
  createdAt: string;
  catchCount: number;
  holding: boolean;
  chain?: BottleChainSegment[];
}

export interface BottleQuota {
  throwLimit: number;
  throwUsed: number;
  fishLimit: number;
  fishUsed: number;
}

export interface RecentVisitorItem {
  nickname: string;
  region: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  at: string;
}

const IDENTIFY_INTERVAL = 30 * 60 * 1000;
let eventBuffer: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let identifyPromise: Promise<VisitorBrief | null> | null = null;

const nickname = ref("");
const visitorRegion = ref<string | null>(null);

function stableVisitorId(): string {
  const state = useClientState();
  const existing = String(state.get("visitor", "visitorId", ""));
  if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
          value.toString(16).padStart(2, "0"),
        ).join("");
  state.set("visitor", "visitorId", generated);
  return generated;
}

export function useVisitor() {
  const api = useApi();
  const clientState = useClientState();

  function lastIdentifyAt(): number {
    return Number(clientState.get("visitor", "identifiedAt", 0)) || 0;
  }

  /** 无感识别：30 分钟内不重复上报；失败静默（不打扰浏览） */
  function identify(force = false): Promise<VisitorBrief | null> {
    if (identifyPromise) return identifyPromise;
    const fresh = Date.now() - lastIdentifyAt() < IDENTIFY_INTERVAL;
    if (fresh && !force) return Promise.resolve(null);

    identifyPromise = (async () => {
      try {
        const result = await api.post<VisitorBrief>("/visitor/identify", {
          screen:
            typeof screen !== "undefined"
              ? `${screen.width}x${screen.height}`
              : "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          locale: navigator.language || "",
        });
        nickname.value = result?.nickname || "";
        visitorRegion.value = result?.region ?? null;
        clientState.set("visitor", "identifiedAt", Date.now());
        if (result?.nickname) clientState.set("visitor", "nickname", result.nickname);
        return result;
      } catch {
        return null;
      } finally {
        identifyPromise = null;
      }
    })();
    return identifyPromise;
  }

  /** 行为埋点入缓冲区，20 秒或退出页面前批量上报 */
  function queueEvent(event: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    eventBuffer.push({ ...event, at: new Date().toISOString() });
    if (eventBuffer.length >= 20) {
      void flushEvents(true);
      return;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => void flushEvents(), 20000);
    }
  }

  async function flushEvents(immediate = false): Promise<void> {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!eventBuffer.length) return;
    const events = eventBuffer.splice(0, eventBuffer.length);
    try {
      await api.post("/visitor/events", { events });
    } catch {
      // 埋点失败即丢弃，不阻塞页面
      if (!immediate) eventBuffer = events.slice(-10);
    }
  }

  async function trackVisit() {
    await identify(true);
  }

  /* ---- 首页侧栏：最近访客 ---- */
  async function fetchRecent(limit = 3): Promise<RecentVisitorItem[]> {
    try {
      return await api.get(`/visitor/recent?limit=${limit}`);
    } catch {
      return [];
    }
  }

  /* ---- 留言墙 ---- */
  async function fetchMessages(page = 1, limit = 30): Promise<{
    items: VisitorMessageItem[];
    total: number;
  }> {
    return api.get(`/visitor/messages?page=${page}&limit=${limit}`);
  }

  async function sendMessage(payload: {
    content: string;
    nickname?: string;
  }): Promise<{ id: string; status: string; moderated: boolean }> {
    return api.post("/visitor/messages", payload);
  }

  /* ---- 漂流瓶 ---- */
  async function fetchBottleQuota(): Promise<BottleQuota> {
    return api.get("/visitor/bottle/quota");
  }

  async function throwBottle(
    content: string,
    relayToId?: string,
  ): Promise<{ id: string; status: string; moderated: boolean; quota: BottleQuota }> {
    return api.post("/visitor/bottle/throw", { content, relayToId });
  }

  async function fishBottle(): Promise<BottleItem | null> {
    return api.post("/visitor/bottle/fish");
  }

  async function releaseBottle(id: string): Promise<{ ok: boolean }> {
    return api.post(`/visitor/bottle/${id}/release`);
  }

  return {
    nickname,
    visitorRegion,
    visitorId: stableVisitorId,
    identify,
    trackVisit,
    queueEvent,
    flushEvents,
    fetchRecent,
    fetchMessages,
    sendMessage,
    fetchBottleQuota,
    throwBottle,
    fishBottle,
    releaseBottle,
  };
}
