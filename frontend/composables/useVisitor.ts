import { useApi } from "./useApi";

let activeVisit: Promise<any> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingEvents: any[] = [];
let flushing: Promise<any> | null = null;

export function useVisitor() {
  const api = useApi();
  const state = useClientState();

  const nickname = ref(
    String(state.get('visitor', 'nickname', '')),
  );
  const setNickname = (value: string) => {
    const clean = value.trim().slice(0, 20);
    state.set('visitor', 'nickname', clean);
    nickname.value = clean;
  };

  const visitorId = () => {
    if (typeof window === "undefined") return "";
    const existing = String(state.get('visitor', 'visitorId', ''));
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;
    const generated =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
            v.toString(16).padStart(2, "0"),
          ).join("");
    state.set('visitor', 'visitorId', generated);
    return generated;
  };

  const identify = async (name: string, turnstileToken?: string) => {
    const result = await api.post<any>("/visitor/identify", {
      nickname: name,
      turnstileToken,
    });
    setNickname(result?.nickname ?? name);
    return result;
  };

  const trackVisit = async () => {
    if (!visitorId()) return null;
    const authToken = String(state.get('auth', 'token', ''));
    const identity = authToken ? 'user' : (nickname.value.trim() ? 'registered' : 'anonymous');
    const trackedIdentity = String(state.getSession('visitTrackedIdentity', ''));
    if (trackedIdentity === identity) return { ok: true, deduped: true };
    if (activeVisit) return activeVisit;
    const visit = api.post<any>("/visitor/track").catch(() => null);
    activeVisit = visit;
    try {
      const result = await visit;
      if (result?.ok !== false) state.setSession('visitTrackedIdentity', identity);
      return result;
    } finally {
      if (activeVisit === visit) activeVisit = null;
    }
  };

  const queueEvent = (event: Record<string, unknown>) => {
    if (typeof window === 'undefined' || !visitorId()) return;
    const authToken = String(state.get('auth', 'token', ''));
    pendingEvents.push({ ...event, identity: event.identity || (authToken ? 'user' : nickname.value.trim() ? 'registered' : 'anonymous'), at: new Date().toISOString(), sessionId: state.getSession('id', '') });
    if (pendingEvents.length >= 20) void flushEvents();
    else if (!flushTimer) flushTimer = setTimeout(() => void flushEvents(), 5 * 60 * 1000);
  };
  const flushEvents = async (keepalive = false) => {
    if (flushing || !pendingEvents.length || !visitorId()) return flushing;
    const batch = pendingEvents.splice(0);
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushing = api.post<any>('/visitor/track/batch', { events: batch }, keepalive ? { keepalive } as any : undefined)
      .catch(() => { pendingEvents.unshift(...batch); return null; })
      .finally(() => { flushing = null; });
    return flushing;
  };

  const fetchWall = () => api.get<any>("/visitor/wall");
  const fetchMe = () => api.get<any>("/visitor/me");
  const fetchRecent = async (fresh = false) => {
    if (activeVisit) await activeVisit;
    return api.get<any>(
      "/visitor/recent",
      fresh ? { refresh: 1 } : undefined,
      fresh ? { cache: "no-store" } : undefined,
    );
  };
  const fetchMessages = (page = 1) =>
    api.get<any>("/visitor/messages", { type: "message", page });
  const sendMessage = (content: string) =>
    api.post<any>("/visitor/messages", { content });
  const throwBottle = (content: string, parentId?: string) =>
    api.post<any>("/visitor/bottles", { content, parentId });
  const fetchBottleQuota = () => api.get<any>("/visitor/bottles/quota");
  const fishBottle = () => api.post<any>("/visitor/bottles/fish");
  const releaseBottle = (id: string) =>
    api.post<any>(`/visitor/bottles/${id}/release`);

  return {
    nickname,
    setNickname,
    visitorId,
    identify,
    trackVisit,
    fetchWall,
    fetchMe,
    fetchRecent,
    fetchMessages,
    sendMessage,
    throwBottle,
    fetchBottleQuota,
    fishBottle,
    releaseBottle,
    queueEvent,
    flushEvents,
  };
}
