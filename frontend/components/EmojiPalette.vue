<template>
  <span ref="anchorRef" class="emoji-palette-anchor" aria-hidden="true" />
  <Teleport to="body">
    <transition name="emoji-panel-fade">
      <div v-if="open" class="emoji-popover-layer">
        <div
          ref="pickerRef"
          class="emoji-palette-panel"
          :class="`placement-${resolvedPlacement}`"
          :style="pickerStyle"
          role="dialog"
          aria-label="选择表情"
        >
          <header class="emoji-picker-head">
            <strong>{{ activePack?.name || "表情" }}</strong>
            <button
              type="button"
              title="关闭"
              aria-label="关闭表情面板"
              @click="emit('close')"
            >
              <Icon name="ph:x-bold" />
            </button>
          </header>
          <div v-if="loading && !packs.length" class="emoji-loading">
            加载中...
          </div>
          <template v-else>
            <div class="emoji-sidebar">
              <button
                v-for="(pack, index) in packs"
                :key="pack.id"
                type="button"
                :class="{ active: activePackIndex === index }"
                :title="pack.name"
                @click="activePackIndex = index"
              >
                {{ shortName(pack.name) }}
              </button>
            </div>
            <div class="emoji-grid-wrap" @scroll.passive="onScroll">
              <div class="emoji-grid">
                <template v-if="activePack?.type === 'animated'">
                  <button
                    v-for="item in activePack.items"
                    :key="item.id"
                    type="button"
                    class="emoji-item emoji-img-item"
                    :title="item.label || item.char || '表情'"
                    @click="emitSelect(item)"
                    @mouseenter="onHover($event, item.imageUrl)"
                    @mousemove="onMove"
                    @mouseleave="onLeave"
                  >
                    <img
                      :src="mediaUrl(item.imageUrl)"
                      :alt="item.label || item.char || 'emoji'"
                      loading="lazy"
                    />
                  </button>
                </template>
                <template v-else>
                  <button
                    v-for="item in activePack?.items || []"
                    :key="item.id"
                    type="button"
                    class="emoji-item"
                    :title="item.label || item.char || '表情'"
                    @click="emitSelect(item)"
                  >
                    {{ item.char || "🙂" }}
                  </button>
                </template>
              </div>
              <div
                v-if="activePack && loadingMap[activePack.id]"
                class="emoji-page-state"
              >
                <Icon name="ph:spinner-gap-bold" /> 正在加载
              </div>
              <div
                v-else-if="activePack && !activePack.items.length"
                class="emoji-page-state"
              >
                暂无表情
              </div>
              <div
                v-else-if="activePack && !hasMore(activePack)"
                class="emoji-page-state is-complete"
              >
                已加载全部
                {{ activePack._count?.items || activePack.items.length }} 个表情
              </div>
            </div>
          </template>
          <div
            v-show="previewUrl"
            class="emoji-hover-preview"
            :style="previewStyle"
          >
            <img :src="mediaUrl(previewUrl)" alt="" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
type EmojiItem = {
  id: string;
  char?: string;
  label?: string;
  imageUrl?: string;
};

type EmojiPack = {
  id: string;
  name: string;
  type: "static" | "animated";
  enabled?: boolean;
  _count?: { items: number };
  items: EmojiItem[];
};

const props = defineProps<{
  open: boolean;
  placement?: "auto" | "top" | "bottom";
  anchor?: HTMLElement | null;
}>();

const emit = defineEmits<{
  select: [payload: { char?: string; imageUrl?: string; label?: string }];
  close: [];
}>();

const api = useApi();
const { mediaUrl } = useMediaUrl();
const loading = ref(false);
const packs = ref<EmojiPack[]>([]);
const activePackIndex = ref(0);
const pageMap = ref<Record<string, number>>({});
const totalPagesMap = ref<Record<string, number>>({});
const loadingMap = ref<Record<string, boolean>>({});
const previewUrl = ref("");
const previewStyle = ref<Record<string, string>>({});
const anchorRef = ref<HTMLElement | null>(null);
const pickerRef = ref<HTMLElement | null>(null);
const pickerStyle = ref<Record<string, string>>({});
const resolvedPlacement = ref<"top" | "bottom">("top");

const activePack = computed(() => packs.value[activePackIndex.value] || null);

let positionRetryTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.open,
  (value) => {
    if (value) {
      if (!packs.value.length) void loadPacks();
      updatePosition();
    }
    if (!value) {
      onLeave();
      if (positionRetryTimer) {
        clearTimeout(positionRetryTimer);
        positionRetryTimer = null;
      }
    }
  },
);

watch(activePack, (pack) => {
  if (props.open && pack && !pageMap.value[pack.id]) void loadPackPage(pack, 1);
});

function findAnchor(): HTMLElement | null {
  if (props.anchor) return props.anchor;
  const anchor = anchorRef.value;
  if (!anchor) return null;
  const sibling = anchor.previousElementSibling as HTMLElement | null;
  if (sibling) return sibling;
  const parent = anchor.parentElement;
  if (parent) return parent;
  return anchor;
}

function updatePosition() {
  if (!props.open) {
    pickerStyle.value = {};
    return;
  }
  const el = findAnchor();
  if (!el) {
    useFallbackPosition();
    return;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    if (!positionRetryTimer) {
      positionRetryTimer = setTimeout(() => {
        positionRetryTimer = null;
        updatePosition();
      }, 50);
    }
    useFallbackPosition();
    return;
  }

  positionFromRect(rect);
}

function positionFromRect(rect: DOMRect) {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const margin = 10;
  const gap = 8;
  const width = Math.min(344, Math.max(0, viewportWidth - margin * 2));
  const preferredHeight = Math.min(
    292,
    Math.max(0, viewportHeight - margin * 2),
  );
  const spaceAbove = Math.max(0, rect.top - viewportTop - margin - gap);
  const spaceBelow = Math.max(
    0,
    viewportTop + viewportHeight - rect.bottom - margin - gap,
  );
  const placement =
    props.placement === "top" || props.placement === "bottom"
      ? props.placement
      : spaceAbove >= preferredHeight || spaceAbove > spaceBelow
        ? "top"
        : "bottom";
  resolvedPlacement.value = placement;

  const height = Math.min(
    preferredHeight,
    placement === "top" ? spaceAbove : spaceBelow,
  );
  const left = Math.min(
    viewportLeft + viewportWidth - width - margin,
    Math.max(viewportLeft + margin, rect.right - width),
  );
  const top = placement === "top" ? rect.top - height - gap : rect.bottom + gap;
  pickerStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
}

function useFallbackPosition() {
  const anchor = anchorRef.value;
  if (anchor?.parentElement) {
    const parentRect = anchor.parentElement.getBoundingClientRect();
    if (parentRect.width > 0 && parentRect.height > 0) {
      positionFromRect(parentRect);
      return;
    }
  }
  pickerStyle.value = {};
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!props.open) return;
  const target = event.target as Node;
  const trigger = findAnchor();
  if (pickerRef.value?.contains(target) || trigger?.contains(target)) return;
  emit("close");
}

onMounted(() => {
  window.addEventListener("resize", updatePosition);
  window.addEventListener("scroll", updatePosition, true);
  window.visualViewport?.addEventListener("resize", updatePosition);
  window.visualViewport?.addEventListener("scroll", updatePosition);
  document.addEventListener("pointerdown", onDocumentPointerDown);
});

onUnmounted(() => {
  window.removeEventListener("resize", updatePosition);
  window.removeEventListener("scroll", updatePosition, true);
  window.visualViewport?.removeEventListener("resize", updatePosition);
  window.visualViewport?.removeEventListener("scroll", updatePosition);
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  if (positionRetryTimer) {
    clearTimeout(positionRetryTimer);
    positionRetryTimer = null;
  }
});

async function loadPacks() {
  loading.value = true;
  try {
    const data = await api.get<any[]>("/emoji-packs");
    packs.value = (data || [])
      .filter((pack: any) => pack.enabled)
      .map((pack: any) => ({
        ...pack,
        items: Array.isArray(pack.items) ? pack.items : [],
      }));
    pageMap.value = {};
    totalPagesMap.value = {};
    const firstPack = packs.value[0];
    if (firstPack) await loadPackPage(firstPack, 1);
  } catch {
    packs.value = [];
  } finally {
    loading.value = false;
  }
}

function shortName(name: string) {
  return (
    String(name || "")
      .replace(/[·.\s]/g, "")
      .slice(0, 4) || "包"
  );
}

function emitSelect(item: EmojiItem) {
  emit("select", {
    char: item.char,
    imageUrl: item.imageUrl,
    label: item.label,
  });
  emit("close");
}

async function onScroll(event: Event) {
  const pack = activePack.value;
  if (!pack) return;

  const element = event.target as HTMLElement;
  if (element.scrollTop + element.clientHeight < element.scrollHeight - 60)
    return;
  if (loadingMap.value[pack.id] || !hasMore(pack)) return;

  const nextPage = (pageMap.value[pack.id] || 0) + 1;
  await loadPackPage(pack, nextPage);
}

function hasMore(pack: EmojiPack) {
  if (!pageMap.value[pack.id]) return true;
  return pageMap.value[pack.id] < (totalPagesMap.value[pack.id] || 1);
}

async function loadPackPage(pack: EmojiPack, page: number) {
  if (loadingMap.value[pack.id]) return;
  loadingMap.value = { ...loadingMap.value, [pack.id]: true };

  try {
    const data = await api.get<any>(`/emoji-packs/${pack.id}/items`, {
      page,
      limit: 48,
    });
    const nextItems = Array.isArray(data?.items) ? data.items : [];
    const existingIds = new Set(pack.items.map((item) => item.id));
    pack.items.push(
      ...nextItems.filter((item: EmojiItem) => !existingIds.has(item.id)),
    );
    pageMap.value = { ...pageMap.value, [pack.id]: Number(data?.page) || page };
    totalPagesMap.value = {
      ...totalPagesMap.value,
      [pack.id]: Math.max(1, Number(data?.totalPages) || 1),
    };
  } catch {
    // keep current pack items
  } finally {
    loadingMap.value = { ...loadingMap.value, [pack.id]: false };
  }
}

function onHover(event: MouseEvent, url?: string) {
  if (!url || !url.startsWith("/uploads")) return;
  previewUrl.value = url;
  onMove(event);
}

function onMove(event: MouseEvent) {
  let x = event.clientX + 12;
  let y = event.clientY - 40;
  const width = 84;
  const height = 84;
  if (x + width > window.innerWidth - 8) x = event.clientX - 12 - width;
  if (y + height > window.innerHeight - 8) y = window.innerHeight - 8 - height;
  if (y < 8) y = 8;
  previewStyle.value = { left: `${x}px`, top: `${y}px` };
}

function onLeave() {
  previewUrl.value = "";
  previewStyle.value = {};
}
</script>

<style scoped>
.emoji-palette-anchor {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0;
  height: 0;
}

.emoji-popover-layer {
  position: fixed;
  z-index: 2400;
  inset: 0;
  pointer-events: none;
}

.emoji-palette-panel {
  position: fixed;
  z-index: 1;
  display: flex;
  width: 344px;
  height: 292px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 8px;
  background: var(--ld-bg-card);
  pointer-events: auto;
  box-shadow:
    0 18px 46px color-mix(in srgb, var(--ld-shadow) 58%, transparent),
    0 2px 8px color-mix(in srgb, #000 10%, transparent);
}

.emoji-picker-head {
  display: none;
}

.emoji-panel-fade-enter-active,
.emoji-panel-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.emoji-panel-fade-enter-from,
.emoji-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.emoji-loading {
  display: grid;
  flex: 1;
  place-items: center;
  color: var(--c-text-3);
  font-size: 0.84rem;
}

.emoji-sidebar {
  display: flex;
  width: 62px;
  flex-shrink: 0;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  background: var(--c-bg-2);
  padding: 6px 0;
}

.emoji-sidebar button {
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.emoji-sidebar button.active {
  background: var(--ld-bg-card);
  color: var(--c-primary);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--c-primary);
}

.emoji-sidebar button:hover:not(.active) {
  background: var(--c-bg);
  color: var(--c-text);
}

.emoji-grid-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}

.emoji-page-state {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--c-text-3);
  font-size: 0.6rem;
}

.emoji-page-state > svg {
  animation: emoji-loading-spin 0.8s linear infinite;
}

.emoji-page-state.is-complete {
  opacity: 0.65;
}

@keyframes emoji-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.emoji-item {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 1.35rem;
  transition: background 0.12s ease;
}

.emoji-item:hover {
  background: var(--c-bg-2);
}

.emoji-img-item img {
  width: 34px;
  height: 34px;
  border-radius: 5px;
  object-fit: contain;
}

.emoji-hover-preview {
  position: fixed;
  z-index: 2;
  pointer-events: none;
}

.emoji-hover-preview img {
  width: 100px;
  height: 100px;
  object-fit: contain;
}

@media (max-width: 640px) {
  .emoji-popover-layer {
    background: transparent;
    pointer-events: none;
  }

  .emoji-palette-panel {
    border-width: 1px;
    border-radius: 8px;
    box-shadow: 0 14px 38px rgb(0 0 0 / 24%);
  }

  .emoji-picker-head {
    position: absolute;
    z-index: 2;
    top: 0;
    right: 0;
    left: 0;
    display: flex;
    height: 42px;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px 0 14px;
    border-bottom: 1px solid var(--border);
    background: var(--ld-bg-card);
  }

  .emoji-picker-head strong {
    color: var(--c-text-2);
    font-size: 0.75rem;
  }
  .emoji-picker-head button {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--c-text-2);
    cursor: pointer;
  }
  .emoji-sidebar,
  .emoji-grid-wrap {
    margin-top: 42px;
  }
  .emoji-sidebar {
    width: 68px;
    padding-bottom: 10px;
  }
  .emoji-grid-wrap {
    padding: 8px 10px 14px;
  }
  .emoji-grid {
    gap: 6px;
  }
  .emoji-item {
    width: 44px;
    height: 44px;
  }
  .emoji-img-item img {
    width: 36px;
    height: 36px;
  }

  .emoji-hover-preview {
    display: none;
  }
}
</style>
