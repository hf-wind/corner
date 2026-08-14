import { useApi } from "./useApi";

const NICKNAME_KEY = "corner:visitor:nickname";
const EMAIL_KEY = "corner:visitor:email";

export function useVisitor() {
  const api = useApi();

  const nickname = ref(
    typeof window !== "undefined" ? localStorage.getItem(NICKNAME_KEY) ?? "" : "",
  );
  const email = ref(
    typeof window !== "undefined" ? localStorage.getItem(EMAIL_KEY) ?? "" : "",
  );

  const setNickname = (value: string) => {
    const clean = value.trim().slice(0, 20);
    localStorage.setItem(NICKNAME_KEY, clean);
    nickname.value = clean;
  };

  const setEmail = (value: string) => {
    const clean = value.trim().slice(0, 255);
    localStorage.setItem(EMAIL_KEY, clean);
    email.value = clean;
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

  const identify = async (name: string, mail?: string, turnstileToken?: string) => {
    const result = await api.post<any>("/visitor/identify", {
      nickname: name,
      email: mail || undefined,
      turnstileToken,
    });
    setNickname(result?.nickname ?? name);
    if (result?.email) setEmail(result.email);
    return result;
  };

  const trackVisit = async () => {
    if (!visitorId()) return null;
    try {
      return await api.post<any>("/visitor/track");
    } catch {
      return null;
    }
  };

  const fetchWall = () => api.get<any>("/visitor/wall");
  const fetchMe = () => api.get<any>("/visitor/me");
  const fetchRecent = () => api.get<any>("/visitor/recent");
  const fetchMessages = (page = 1) =>
    api.get<any>("/visitor/messages", { type: "message", page });
  const sendMessage = (content: string) =>
    api.post<any>("/visitor/messages", { content });
  const throwBottle = (content: string, parentId?: string) =>
    api.post<any>("/visitor/bottles", { content, parentId });
  const fishBottleById = (id: string) =>
    api.post<any>(`/visitor/bottles/${id}/fish`);
  const replyBottle = (id: string, content: string) =>
    api.post<any>(`/visitor/bottles/${id}/reply`, { content });
  const peekBottles = (limit = 8) =>
    api.get<any>("/visitor/bottles/peek", { limit });

  return {
    nickname,
    email,
    setNickname,
    setEmail,
    visitorId,
    identify,
    trackVisit,
    fetchWall,
    fetchMe,
    fetchRecent,
    fetchMessages,
    sendMessage,
    throwBottle,
    fishBottleById,
    replyBottle,
    peekBottles,
  };
}
