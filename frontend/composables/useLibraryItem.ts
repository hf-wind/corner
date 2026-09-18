// 图书详情数据本地缓存：优先读缓存，缓存缺失或过期时再请求并回写
import type { LibraryItem } from "@/types/library";

const CACHE_PREFIX = "corner:library:item:";
// 缓存有效期：24 小时（书影详情更新频率低，过期后后台静默刷新）
const CACHE_TTL = 24 * 60 * 60 * 1000;

type CacheEntry = {
  savedAt: number;
  item: LibraryItem;
};

function readCache(slug: string): CacheEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.item?.slug) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(slug: string, item: LibraryItem) {
  if (typeof localStorage === "undefined") return;
  try {
    const entry: CacheEntry = { savedAt: Date.now(), item };
    localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify(entry));
  } catch {
    /* 存储空间不足等异常直接忽略 */
  }
}

export function useLibraryItem() {
  const api = useApi();

  /**
   * 获取图书详情：缓存未过期时直接返回缓存并不再请求；
   * 缓存不存在时请求接口并写入缓存。
   */
  async function fetchItem(
    slug: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<{ item: LibraryItem | null; fromCache: boolean }> {
    const cached = readCache(slug);
    const fresh = cached && Date.now() - cached.savedAt < CACHE_TTL;
    if (cached && fresh && !options.forceRefresh) {
      return { item: cached.item, fromCache: true };
    }

    try {
      const item = await api.get<LibraryItem>(`/library/${slug}`);
      if (item?.slug) {
        writeCache(slug, item);
        return { item, fromCache: false };
      }
      return { item: item ?? null, fromCache: false };
    } catch (error) {
      // 请求失败但存在旧缓存时降级返回旧数据
      if (cached) return { item: cached.item, fromCache: true };
      throw error;
    }
  }

  function peekCache(slug: string): LibraryItem | null {
    return readCache(slug)?.item ?? null;
  }

  return { fetchItem, peekCache };
}
