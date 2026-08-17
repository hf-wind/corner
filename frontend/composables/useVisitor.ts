import { useApi } from "./useApi";

const NICKNAME_KEY = "corner:visitor:nickname";
let activeVisit: Promise<any> | null = null;

export function useVisitor() {
  const api = useApi();

  const nickname = ref(
    typeof window !== "undefined"
      ? (localStorage.getItem(NICKNAME_KEY) ?? "")
      : "",
  );
  const setNickname = (value: string) => {
    const clean = value.trim().slice(0, 20);
    localStorage.setItem(NICKNAME_KEY, clean);
    nickname.value = clean;
  };

  const visitorId = () => {
    if (typeof window === "undefined") return "";
    const storageKey = "corner:visitor:id";
    const existing = localStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;
    const generated =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
            v.toString(16).padStart(2, "0"),
          ).join("");
    localStorage.setItem(storageKey, generated);
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
    if (activeVisit) return activeVisit;
    const visit = api.post<any>("/visitor/track").catch(() => null);
    activeVisit = visit;
    try {
      return await visit;
    } finally {
      if (activeVisit === visit) activeVisit = null;
    }
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
  };
}
