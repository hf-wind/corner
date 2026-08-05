export function useMediaUrl() {
  const config = useRuntimeConfig();
  const imageBase = computed(() => {
    const apiBase = String(config.public.apiBase || "").replace(/\/$/, "");
    // In development /api is proxied by Vite, while production uses the same
    // origin behind nginx. Uploaded files live beside that API prefix.
    if (!apiBase || apiBase === "/api") return "";
    return apiBase.replace(/\/api\/?$/, "");
  });

  function mediaUrl(path?: string | null) {
    if (!path) return "";
    let source = String(path).trim();
    if (/^(?:https?)%3a%2f%2f|^%2fuploads%2f/i.test(source)) {
      try {
        source = decodeURIComponent(source);
      } catch {
        /* keep the original value */
      }
    }
    if (/^https?:\/\//i.test(source)) {
      try {
        const url = new URL(source);
        if (
          ["cdn.jsdelivr.net", "koishi.js.org"].includes(
            url.hostname.toLowerCase(),
          )
        ) {
          return `/api/emoji-packs/asset?url=${encodeURIComponent(url.toString())}`;
        }
      } catch {
        /* keep the original URL */
      }
      return source;
    }
    if (source.startsWith("data:")) return source;
    const normalized = source.startsWith("/") ? source : `/${source}`;
    return `${imageBase.value}${normalized}`;
  }

  return { imageBase, mediaUrl };
}
