<template>
  <main
    ref="pageEl"
    class="memory-map-page"
    :class="{ immersive }"
    @pointerdown="restartTour"
  >
    <section
      class="map-canvas-shell"
      :class="{ hidden: mobileMode === 'list' }"
    >
      <div ref="mapEl" class="map-canvas" />
      <Transition name="map-reveal">
        <div
          v-if="!pageReady && !mapError"
          class="initial-loading"
          aria-live="polite"
        >
          <span class="loading-orbit"><i /><i /><i /></span>
          <strong>正在展开风隅地图</strong><small>准备你的时光坐标</small>
        </div>
      </Transition>

      <section class="map-brand" aria-label="地图说明">
        <span>WIND &amp; MEMORY · 风隅地图</span>
        <h1>在地点里翻阅时间</h1>
        <p>每一个坐标，都保存着一段公开的记忆。</p>
        <div>
          <strong>{{ result.totalMemories || 0 }}</strong
          ><small
            >条记忆 · {{ immersive ? "沉浸巡游中" : "拖动地图探索" }}</small
          >
        </div>
      </section>

      <div class="map-actions">
        <button
          v-if="!immersive"
          type="button"
          title="进入沉浸模式"
          aria-label="进入沉浸模式"
          @click="enterImmersive"
        >
          <Icon name="ph:arrows-out-bold" />
        </button>
        <button
          v-else
          type="button"
          title="退出沉浸模式"
          aria-label="退出沉浸模式"
          @click="exitImmersive"
        >
          <Icon name="ph:arrows-in-bold" />
        </button>
      </div>
      <div v-if="mapError" class="map-state error">
        <Icon name="ph:warning-circle-bold" /><span>{{ mapError }}</span>
      </div>
      <div v-else-if="loading && pageReady" class="map-state">
        <Icon name="ph:spinner-gap-bold" class="spinning" /><span
          >正在更新视野</span
        >
      </div>

      <div class="map-legend" aria-label="点位图例">
        <span><i class="moment" />瞬间</span><span><i class="album" />相册</span
        ><span><i class="photo" />照片</span
        ><span
          ><i class="stack"><b /><b /></i>同址</span
        >
      </div>

      <Transition name="memory-focus">
        <article v-if="selectedMemory && !immersive" class="map-focus-card">
          <button
            type="button"
            class="focus-close"
            title="关闭详情"
            aria-label="关闭详情"
            @click="clearSelection"
          >
            <Icon name="ph:x-bold" />
          </button>
          <div class="focus-cover">
            <img
              v-if="selectedMemory.thumbnail"
              :src="mediaUrl(selectedMemory.thumbnail)"
              :alt="selectedMemory.title"
            /><Icon v-else :name="typeIcon(selectedMemory.type)" />
          </div>
          <div class="focus-copy">
            <div class="focus-meta">
              <span
                ><Icon :name="typeIcon(selectedMemory.type)" />{{
                  typeLabel(selectedMemory.type)
                }}</span
              ><time>{{ formatDate(selectedMemory.occurredAt) }}</time>
            </div>
            <h2>{{ selectedMemory.title }}</h2>
            <p>
              {{
                selectedMemory.excerpt ||
                `${selectedMemory.placeName}的一段记忆。`
              }}
            </p>
            <footer>
              <span
                ><Icon name="ph:map-pin-fill" />{{ selectedMemory.placeName }} ·
                {{ precisionLabel(selectedMemory.precision) }}</span
              ><AppLink :to="selectedMemory.href"
                >查看详情 <Icon name="ph:arrow-up-right-bold"
              /></AppLink>
            </footer>
          </div>
        </article>
      </Transition>
    </section>

    <aside class="memory-panel" :class="{ hidden: mobileMode === 'map' }">
      <header class="panel-head">
        <div>
          <span>MEMORY ATLAS</span>
          <h1>时光坐标</h1>
          <p>沿着地图，重新遇见那些被保存的瞬间。</p>
        </div>
        <strong>{{ result.returned }}<small> 点位</small></strong>
      </header>
      <div class="filters">
        <div class="type-filter">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            :class="{ active: types.includes(option.value) }"
            @click="toggleType(option.value)"
          >
            <Icon :name="option.icon" />{{ option.label }}
          </button>
        </div>
        <PublicSelectMenu
          v-model="year"
          :options="yearOptions"
          icon="ph:calendar-blank-bold"
          label="年份筛选"
          @update:model-value="selectYear"
        />
        <PublicSelectMenu
          v-model="place"
          :options="mapPlaceOptions"
          icon="ph:map-pin-line-bold"
          label="地点筛选"
          empty-text="当前视野暂无地点"
          @update:model-value="selectPlace"
        />
      </div>
      <div class="panel-meta">
        <span>{{ result.returned }} 个可见点位</span
        ><small v-if="result.truncated">视野结果已限制为 500 项</small>
      </div>
      <div ref="listEl" class="memory-list">
        <template v-for="item in result.items" :key="item.id">
          <article
            v-if="item.kind === 'memory'"
            :id="`map-memory-${safeId(item.id)}`"
            :class="['memory-card', { active: selectedId === item.id }]"
            @click="selectMemory(item, true, true)"
          >
            <img
              v-if="item.thumbnail"
              :src="mediaUrl(item.thumbnail)"
              :alt="item.title"
              loading="lazy"
            />
            <div v-else class="memory-icon">
              <Icon :name="typeIcon(item.type)" />
            </div>
            <div class="memory-copy">
              <div>
                <span>{{ typeLabel(item.type) }}</span
                ><time>{{ formatDate(item.occurredAt) }}</time>
              </div>
              <h2>{{ item.title }}</h2>
              <p>{{ item.excerpt || `${item.placeName}的一段记忆。` }}</p>
              <footer>
                <span
                  ><Icon name="ph:map-pin-fill" />{{ item.placeName }} ·
                  {{ precisionLabel(item.precision) }}</span
                ><AppLink :to="item.href"
                  >查看 <Icon name="ph:arrow-up-right-bold"
                /></AppLink>
              </footer>
            </div>
          </article>
          <button
            v-else
            type="button"
            class="cluster-card"
            @click="openCluster(item)"
          >
            <span
              ><strong>{{ item.count }}</strong
              ><small>条记忆</small></span
            >
            <div>
              <h2>一组相邻的时光</h2>
              <p>{{ clusterSummary(item) }}</p>
            </div>
            <Icon name="ph:magnifying-glass-plus-bold" />
          </button>
        </template>
        <div v-if="!loading && !result.items.length" class="empty">
          <Icon name="ph:map-pin-line" />
          <h2>当前视野没有公开记忆</h2>
          <p>移动地图去别处看看。</p>
        </div>
      </div>
    </aside>

    <nav class="mobile-switch" aria-label="地图和列表切换">
      <button
        type="button"
        :class="{ active: mobileMode === 'map' }"
        @click="mobileMode = 'map'"
      >
        <Icon name="ph:map-trifold-bold" />地图</button
      ><button
        type="button"
        :class="{ active: mobileMode === 'list' }"
        @click="mobileMode = 'list'"
      >
        <Icon name="ph:list-bullets-bold" />列表
      </button>
    </nav>
  </main>
</template>

<script setup lang="ts">
import {
  AmapAdapter,
  type MapAdapter,
  type MapBounds,
  type MapInitialView,
  wgs84ToGcj02,
} from "@/utils/map-adapter";
import type {
  MapMemoryType,
  MemoryMapCluster,
  MemoryMapItem,
  MemoryMapResult,
} from "@/types/memory-map";

const api = useApi();
const route = useRoute();
const { mediaUrl } = useMediaUrl();
const {
  selectMemory: selectSharedMemory,
  clearMemory: clearSharedMemory,
  setMemoryContext,
  clearMemoryContext,
} = useMemorySelection();
const pageEl = ref<HTMLElement | null>(null);
const mapEl = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const adapter = shallowRef<MapAdapter | null>(null);
const result = ref<MemoryMapResult>({
  items: [],
  recentMemories: [],
  totalMemories: 0,
  returned: 0,
  truncated: false,
  places: [],
});
const types = ref<MapMemoryType[]>(["moment", "album", "photo"]);
const year = ref(String(route.query.year || ""));
const place = ref(String(route.query.place || ""));
const selectedId = ref(String(route.query.memory || ""));
const loading = ref(true);
const pageReady = ref(false);
const immersive = ref(false);
const mapError = ref("");
const mobileMode = ref<"map" | "list">("map");
let requestController: AbortController | null = null;
let requestTimer: number | undefined;
let tourTimer: number | undefined;
let tourIndex = 0;
let requestSequence = 0;
let initialMemoryFocused = false;
let revealInitialResult =
  !selectedId.value && !route.query.lng && !route.query.lat;

const typeOptions = [
  { value: "moment" as const, label: "瞬间", icon: "ph:sparkle-bold" },
  { value: "album" as const, label: "相册", icon: "ph:images-square-bold" },
  { value: "photo" as const, label: "照片", icon: "ph:image-bold" },
];
const years = Array.from(
  { length: 30 },
  (_, index) => new Date().getFullYear() - index,
);
const yearOptions = computed(() => [
  { value: "", label: "全部年份", icon: "ph:calendar-blank-bold" },
  ...years.map((item) => ({
    value: String(item),
    label: `${item} 年`,
    icon: "ph:calendar-blank-bold",
  })),
]);
const mapPlaceOptions = computed(() => [
  {
    value: "",
    label: "全部地点",
    icon: "ph:globe-hemisphere-east-bold",
    count: result.value.totalMemories,
  },
  ...result.value.places.map((item) => ({
    value: item.slug,
    label: item.name,
    icon: "ph:map-pin-fill",
  })),
]);
const selectedMemory = computed(
  () =>
    result.value.items.find(
      (item): item is MemoryMapItem =>
        item.kind === "memory" && item.id === selectedId.value,
    ) || null,
);

onMounted(async () => {
  if (!mapEl.value) return;
  document.addEventListener("fullscreenchange", onFullscreenChange);
  void loadGlobalMemoryContext();
  try {
    const longitude = Number(route.query.lng);
    const latitude = Number(route.query.lat);
    const hasInitialPoint =
      Number.isFinite(longitude) && Number.isFinite(latitude);
    const initialPoint = hasInitialPoint
      ? route.query.cs === "wgs84"
        ? wgs84ToGcj02(longitude, latitude)
        : { longitude, latitude }
      : null;
    const initialView: MapInitialView | undefined = initialPoint
      ? { ...initialPoint, zoom: selectedId.value ? 17 : 13 }
      : window.matchMedia("(max-width: 900px)").matches
        ? { longitude: 112.8, latitude: 34.5, zoom: 4.25 }
        : undefined;
    const map = new AmapAdapter();
    await map.mount(mapEl.value, initialView);
    adapter.value = map;
    map.onViewChange(scheduleLoad);
    map.onSelect((item) =>
      item.kind === "cluster"
        ? void expandCluster(item)
        : selectMemory(item, true, false),
    );
    scheduleLoad(0);
  } catch (error: any) {
    mapError.value = error?.message || "地图初始化失败";
    loading.value = false;
  }
});

async function loadGlobalMemoryContext() {
  try {
    const overview = await api.get<MemoryMapResult>(
      "/memories/map",
      {
        west: -179.99,
        south: -85,
        east: 179.99,
        north: 85,
        zoom: 1,
        types: types.value.join(","),
        year: year.value || undefined,
        place: place.value || undefined,
      },
      { signal: AbortSignal.timeout(8000) },
    );
    setMemoryContext(buildMapContext(overview));
  } catch {
    // 地图上下文是增强信息，失败不影响地图主体继续初始化。
  }
}

onUnmounted(() => {
  clearSharedMemory();
  clearMemoryContext();
  if (requestTimer) window.clearTimeout(requestTimer);
  if (tourTimer) window.clearTimeout(tourTimer);
  requestController?.abort();
  adapter.value?.destroy();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  document.documentElement.classList.remove("map-immersive");
});

watch([types, year, place], () => scheduleLoad(0), { deep: true });

function scheduleLoad(delay = 320) {
  if (requestTimer) window.clearTimeout(requestTimer);
  requestTimer = window.setTimeout(() => void loadMap(), delay);
}

async function loadMap(boundsOverride?: MapBounds, zoomOverride?: number) {
  const map = adapter.value;
  if (!map) return;
  const sequence = ++requestSequence;
  requestController?.abort();
  requestController = new AbortController();
  loading.value = true;
  try {
    const bounds = boundsOverride || map.bounds();
    const next = await api.get<MemoryMapResult>(
      "/memories/map",
      {
        ...bounds,
        zoom: zoomOverride ?? map.zoom(),
        types: types.value.join(","),
        year: year.value || undefined,
        place: place.value || undefined,
      },
      { signal: requestController.signal },
    );
    if (sequence !== requestSequence) return;
    mapError.value = "";
    result.value = next;
    setMemoryContext(buildMapContext(next));
    map.setItems(next.items, selectedId.value);
    if (revealInitialResult) {
      const [onlyItem] = next.items;
      if (next.items.length === 1 && onlyItem)
        map.setCenter(
          onlyItem.longitude,
          onlyItem.latitude,
          onlyItem.kind === "cluster" ? 9.6 : 13.5,
        );
      revealInitialResult = false;
    }
    if (!initialMemoryFocused && selectedId.value) {
      const selected = next.items.find(
        (item): item is MemoryMapItem =>
          item.kind === "memory" && item.id === selectedId.value,
      );
      if (selected) focusSelectedMemory(selected);
      initialMemoryFocused = true;
    }
    if (!pageReady.value) {
      await nextTick();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (sequence === requestSequence) pageReady.value = true;
    }
  } catch (error: any) {
    if (error?.name !== "AbortError")
      mapError.value = error?.message || "地图记忆加载失败";
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

function selectMemory(item: MemoryMapItem, center = false, scroll = false) {
  selectedId.value = item.id;
  selectSharedMemory({
    id: item.id,
    type: item.type,
    href: item.href,
    title: item.title,
    excerpt: item.excerpt,
    placeName: item.placeName,
    occurredAt: item.occurredAt,
  });
  adapter.value?.setItems(result.value.items, item.id);
  if (center) focusSelectedMemory(item);
  if (scroll) {
    mobileMode.value = "list";
    nextTick(() =>
      document
        .getElementById(`map-memory-${safeId(item.id)}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }
  restartTour();
}
function focusSelectedMemory(item: MemoryMapItem) {
  adapter.value?.focusMemory(item.longitude, item.latitude, item.type);
}
function clearSelection() {
  selectedId.value = "";
  clearSharedMemory();
  adapter.value?.setItems(result.value.items);
}

function buildMapContext(data: MemoryMapResult) {
  const recent = data.recentMemories || [];
  const lines = recent.map((item, index) => {
    const date = item.occurredAt ? item.occurredAt.slice(0, 10) : "日期未记录";
    const excerpt = String(item.excerpt || "").replace(/\s+/g, " ").trim().slice(0, 100);
    return `${index + 1}. ${date}｜${item.placeName}｜${item.title}${excerpt ? `｜${excerpt}` : ""}`;
  });
  return [
    `当前地图视野共有 ${data.totalMemories} 条公开记忆。`,
    lines.length ? `当前视野最近记忆：\n${lines.join("\n")}` : "当前视野暂无可列出的公开记忆。",
  ].join("\n");
}
async function expandCluster(item: MemoryMapCluster) {
  adapter.value?.setCenter(item.longitude, item.latitude, 15);
  await loadMap(paddedBounds(item.bounds), 15);
  mobileMode.value = "map";
}
function openCluster(item: MemoryMapCluster) {
  void expandCluster(item);
}
function selectYear(value: string) {
  year.value = value;
}
function selectPlace(value: string) {
  place.value = value;
}
function clusterSummary(item: MemoryMapCluster) {
  return [
    `${item.types.moment} 个瞬间`,
    `${item.types.album} 册相册`,
    `${item.types.photo} 张照片`,
  ]
    .filter((text) => !text.startsWith("0 "))
    .join(" · ");
}
function toggleType(type: MapMemoryType) {
  types.value = types.value.includes(type)
    ? types.value.filter((item) => item !== type)
    : [...types.value, type];
  if (!types.value.length) types.value = [type];
}
function paddedBounds(bounds: MapBounds) {
  const d = 0.008;
  return {
    west: bounds.west - d,
    south: bounds.south - d,
    east: bounds.east + d,
    north: bounds.north + d,
  };
}
function safeId(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "-");
}
function typeIcon(type: MapMemoryType) {
  return type === "moment"
    ? "ph:sparkle-bold"
    : type === "album"
      ? "ph:images-square-bold"
      : "ph:image-bold";
}
function typeLabel(type: MapMemoryType) {
  return type === "moment" ? "瞬间" : type === "album" ? "相册" : "照片";
}
function precisionLabel(value: string) {
  return (
    (
      {
        exact: "精确位置",
        place: "地点范围",
        city: "城市范围",
        province: "省级范围",
      } as Record<string, string>
    )[value] || "公开位置"
  );
}
function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function enterImmersive() {
  if (!pageEl.value) return;
  try {
    await pageEl.value.requestFullscreen?.();
  } catch {
    /* page-level immersion remains available */
  }
  immersive.value = true;
  document.documentElement.classList.add("map-immersive");
  tourIndex = 0;
  startTour(true);
}
function exitImmersive() {
  immersive.value = false;
  document.documentElement.classList.remove("map-immersive");
  stopTour();
  if (document.fullscreenElement) void document.exitFullscreen();
}
function onFullscreenChange() {
  if (!document.fullscreenElement && immersive.value) {
    immersive.value = false;
    document.documentElement.classList.remove("map-immersive");
    stopTour();
  }
}
function stopTour() {
  if (tourTimer) window.clearTimeout(tourTimer);
  tourTimer = undefined;
}
function startTour(immediate = false) {
  stopTour();
  if (!immersive.value) return;
  tourTimer = window.setTimeout(
    () => {
      const items = result.value.items;
      const item = items[tourIndex % Math.max(1, items.length)];
      tourIndex += 1;
      if (item) {
        adapter.value?.flyTo(
          item.longitude,
          item.latitude,
          item.kind === "cluster" ? 10.8 : 15.4,
          0,
        );
        if (item.kind === "memory") {
          selectedId.value = item.id;
          adapter.value?.setItems(result.value.items, item.id);
        }
      }
      startTour();
    },
    immediate ? 900 : 6800,
  );
}
function restartTour() {
  if (immersive.value) startTour();
}

useHead({ title: "风隅地图" });
</script>

<style scoped>
.memory-map-page {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--c-bg);
}
.map-canvas-shell,
.map-canvas {
  position: absolute;
  inset: 0;
}
.map-canvas-shell {
  overflow: hidden;
  background: var(--c-bg-2);
}
.initial-loading {
  position: absolute;
  z-index: 100;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  background: color-mix(in srgb, var(--c-bg-2) 96%, #15283a);
  color: var(--c-text);
}
.initial-loading strong {
  font-family: var(--font-serif);
  font-size: 1.08rem;
  font-weight: 550;
}
.initial-loading small {
  color: var(--c-text-3);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
}
.loading-orbit {
  position: relative;
  display: grid;
  width: 54px;
  height: 54px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, transparent);
  border-radius: 50%;
  place-items: center;
  animation: spin 3.2s linear infinite;
}
.loading-orbit:before {
  width: 30px;
  height: 30px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, transparent);
  border-radius: 50%;
  content: "";
}
.loading-orbit i {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 62%, transparent);
}
.loading-orbit i:nth-child(1) {
  top: 4px;
}
.loading-orbit i:nth-child(2) {
  right: 5px;
  bottom: 9px;
  opacity: 0.55;
}
.loading-orbit i:nth-child(3) {
  bottom: 5px;
  left: 9px;
  opacity: 0.3;
}
.map-reveal-leave-active {
  transition: opacity 0.7s ease;
}
.map-reveal-leave-to {
  opacity: 0;
}
.map-brand {
  position: absolute;
  z-index: 10;
  top: 22px;
  left: 24px;
  display: flex;
  min-width: 250px;
  flex-direction: column;
  padding: 15px 17px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
  box-shadow: 0 12px 36px rgb(0 0 0/11%);
  backdrop-filter: blur(18px);
  pointer-events: none;
}
.map-brand span,
.panel-head > div > span {
  color: var(--c-primary);
  font-size: 0.48rem;
  font-weight: 750;
  letter-spacing: 0.18em;
}
.map-brand h1 {
  margin: 7px 0 0;
  color: var(--c-text);
  font-family: var(--font-serif);
  font-size: 1.22rem;
  font-weight: 550;
}
.map-brand p,
.panel-head p {
  margin: 5px 0 0;
  color: var(--c-text-3);
  font-size: 0.57rem;
  line-height: 1.55;
}
.map-brand > div {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-top: 11px;
}
.map-brand strong {
  color: var(--c-primary);
  font-family: var(--font-serif);
  font-size: 1.45rem;
}
.map-brand small {
  color: var(--c-text-3);
  font-size: 0.5rem;
}
.map-actions {
  position: absolute;
  z-index: 22;
  top: 22px;
  right: 362px;
}
.map-actions button,
.focus-close {
  display: grid;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  background: color-mix(in srgb, var(--ld-bg-card) 84%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
  backdrop-filter: blur(16px);
}
.map-actions button {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  box-shadow: 0 8px 24px rgb(0 0 0/10%);
  transition:
    transform 0.2s,
    color 0.2s;
}
.map-actions button:hover {
  color: var(--c-primary);
  transform: translateY(-1px);
}
.map-state {
  position: absolute;
  z-index: 15;
  top: 25px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0/10%);
  color: var(--c-text-2);
  font-size: 0.6rem;
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
}
.map-state.error {
  color: #c95454;
}
.map-legend {
  position: absolute;
  z-index: 1000;
  bottom: 3px;
  left: 4px;
  display: flex;
  min-width: 200px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  min-height: 32px;
  padding: 5px 11px;
  border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  box-shadow: 0 5px 16px rgb(0 0 0 / 8%);
  color: var(--c-text-3);
  font-size: 0.53rem;
  backdrop-filter: blur(16px);
  pointer-events: none;
}
.map-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.map-legend i {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgb(255 255 255/70%);
}
.map-legend .moment {
  background: #7564df;
}
.map-legend .album {
  background: #d58a4a;
  border-radius: 2px;
}
.map-legend .photo {
  background: #2b9c84;
  border-radius: 50% 50% 50% 1px;
  transform: rotate(-45deg);
}
.map-legend .stack {
  position: relative;
  width: 11px;
  height: 10px;
  border-radius: 0;
  box-shadow: none;
}
.map-legend .stack b {
  position: absolute;
  display: block;
  width: 7px;
  height: 7px;
  border: 1px solid #fff;
  border-radius: 2px;
  background: var(--c-primary);
}
.map-legend .stack b:last-child {
  right: 0;
  bottom: 0;
}
.memory-panel {
  position: absolute;
  z-index: 20;
  top: 18px;
  right: 18px;
  display: flex;
  width: min(326px, calc(100% - 36px));
  max-height: calc(100% - 36px);
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--c-bg) 84%, transparent);
  box-shadow: 0 16px 44px rgb(22 30 45/18%);
  backdrop-filter: blur(18px);
  transition:
    opacity 0.5s,
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  padding: 17px 16px 12px;
}
.panel-head h1 {
  margin: 5px 0 0;
  color: var(--c-text);
  font-size: 1.02rem;
}
.panel-head > strong {
  color: var(--c-primary);
  font-family: var(--font-serif);
  font-size: 1.45rem;
  white-space: nowrap;
}
.panel-head > strong small {
  color: var(--c-text-3);
  font-family: var(--font-body);
  font-size: 0.48rem;
  font-weight: 500;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 0 14px 12px;
}
.type-filter {
  display: flex;
  width: 100%;
  gap: 4px;
}
.type-filter button {
  display: flex;
  min-height: 30px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ld-bg-card);
  color: var(--c-text-3);
  font-size: 0.58rem;
  cursor: pointer;
}
.type-filter button.active {
  border-color: color-mix(in srgb, var(--c-primary) 48%, var(--border));
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.panel-meta {
  display: flex;
  justify-content: space-between;
  padding: 8px 14px;
  border-block: 1px solid var(--border);
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.panel-meta small {
  color: #c98545;
}
.memory-list {
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: start;
  gap: 7px;
  padding: 10px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.memory-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 9px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 11px;
  background: var(--ld-bg-card);
  cursor: pointer;
  transition:
    border-color 0.2s,
    transform 0.2s,
    box-shadow 0.2s;
}
.memory-card:hover,
.memory-card.active {
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--border));
  box-shadow: 0 9px 24px color-mix(in srgb, var(--ld-shadow) 42%, transparent);
  transform: translateY(-1px);
}
.memory-card img,
.memory-icon {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
}
.memory-icon {
  display: grid;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1.2rem;
  place-items: center;
}
.memory-copy {
  min-width: 0;
}
.memory-copy > div {
  display: flex;
  justify-content: space-between;
  color: var(--c-text-3);
  font-size: 0.49rem;
}
.memory-copy > div > span {
  color: var(--c-primary);
  font-weight: 700;
}
.memory-copy h2 {
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.memory-copy p {
  display: -webkit-box;
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.54rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
.memory-copy footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
  color: var(--c-text-3);
  font-size: 0.49rem;
}
.memory-copy footer span,
.memory-copy footer a {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.memory-copy footer a {
  flex: none;
  color: var(--c-primary);
  text-decoration: none;
}
.cluster-card {
  display: grid;
  width: 100%;
  grid-template-columns: 46px minmax(0, 1fr) 22px;
  gap: 9px;
  align-items: center;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
  border-radius: 11px;
  background: color-mix(in srgb, var(--c-primary-soft) 55%, var(--ld-bg-card));
  color: var(--c-text);
  text-align: left;
  cursor: pointer;
}
.cluster-card > span {
  display: flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-radius: 14px;
  background: var(--c-primary);
  color: #fff;
}
.cluster-card strong {
  font-size: 0.95rem;
}
.cluster-card small {
  font-size: 0.43rem;
}
.cluster-card h2 {
  font-size: 0.69rem;
}
.cluster-card p {
  margin-top: 4px;
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.cluster-card > svg {
  color: var(--c-primary);
}
.empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  color: var(--c-text-3);
  text-align: center;
}
.empty > svg {
  font-size: 1.8rem;
}
.empty h2 {
  margin-top: 9px;
  font-size: 0.82rem;
}
.empty p {
  font-size: 0.56rem;
}
.map-focus-card {
  position: absolute;
  z-index: 18;
  bottom: 48px;
  left: calc(50% - 140px);
  display: grid;
  width: min(430px, calc(100% - 380px));
  min-width: 330px;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 12px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 13px;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, transparent);
  box-shadow: 0 18px 48px rgb(0 0 0/20%);
  transform: translateX(-50%);
  backdrop-filter: blur(18px);
}
.focus-close {
  position: absolute;
  z-index: 2;
  top: 7px;
  right: 7px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.focus-cover {
  display: grid;
  width: 104px;
  height: 104px;
  overflow: hidden;
  border-radius: 9px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1.8rem;
  place-items: center;
}
.focus-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.focus-copy {
  min-width: 0;
  padding: 5px 26px 3px 0;
}
.focus-meta,
.focus-meta span,
.focus-copy footer,
.focus-copy footer span,
.focus-copy footer a {
  display: flex;
  align-items: center;
}
.focus-meta {
  justify-content: space-between;
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.focus-meta span {
  gap: 4px;
  color: var(--c-primary);
}
.focus-copy h2 {
  margin: 7px 0 0;
  overflow: hidden;
  font-family: var(--font-serif);
  font-size: 0.95rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.focus-copy p {
  display: -webkit-box;
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.focus-copy footer {
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
  font-size: 0.5rem;
}
.focus-copy footer span {
  min-width: 0;
  overflow: hidden;
  color: var(--c-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.focus-copy footer a {
  flex: none;
  color: var(--c-primary);
  text-decoration: none;
}
.memory-focus-enter-active,
.memory-focus-leave-active {
  transition:
    opacity 0.3s,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}
.memory-focus-enter-from,
.memory-focus-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px) scale(0.97);
}
.mobile-switch {
  display: none;
}
.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
:global(.corner-map-marker),
:global(.corner-map-cluster),
:global(.corner-map-stack) {
  font-family: var(--font-body);
  cursor: pointer;
}
:global(.corner-map-marker) {
  display: grid;
  width: 35px;
  height: 35px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 7px 18px rgb(0 0 0/24%);
  color: #fff;
  place-items: center;
  transition: transform 0.25s;
}
:global(.corner-map-marker.moment) {
  background: #7564df;
}
:global(.corner-map-marker.album) {
  background: #d58a4a;
  border-radius: 9px;
  box-shadow:
    4px 4px 0 rgb(213 138 74 / 25%),
    0 7px 18px rgb(0 0 0 / 22%);
}
:global(.corner-map-marker.photo) {
  background: #2b9c84;
  border-radius: 50% 50% 50% 8px;
  transform: rotate(-45deg);
}
:global(.corner-map-marker.photo > *) {
  transform: rotate(45deg);
}
:global(.corner-map-marker.has-image) {
  overflow: hidden;
}
:global(.corner-map-marker.has-image img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
:global(.corner-map-marker.selected) {
  outline: 3px solid color-mix(in srgb, var(--c-primary) 35%, transparent);
  transform: scale(1.16);
}
:global(.corner-map-marker.photo.selected) {
  transform: rotate(-45deg) scale(1.16);
}
:global(.corner-map-cluster) {
  display: flex;
  min-width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 7px;
  border: 3px solid rgb(255 255 255/92%);
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary) 82%, #27304a);
  box-shadow: 0 7px 22px rgb(0 0 0/26%);
  color: #fff;
}
:global(.corner-map-cluster strong) {
  font-size: 0.82rem;
}
:global(.corner-map-cluster span) {
  font-size: 0.4rem;
}
:global(.corner-map-stack) {
  position: relative;
  display: block;
  width: 58px;
  height: 52px;
  padding: 0;
  border: 0;
  background: transparent;
  filter: drop-shadow(0 7px 12px rgb(0 0 0/22%));
}
:global(.corner-map-stack img),
:global(.corner-map-stack i) {
  position: absolute;
  top: calc(var(--stack-index) * 3px);
  left: calc(var(--stack-index) * 4px);
  display: block;
  width: 40px;
  height: 40px;
  border: 3px solid #fff;
  border-radius: 9px;
  background: var(--c-primary-soft);
  object-fit: cover;
  transform: rotate(calc((var(--stack-index) - 1) * 6deg));
}
:global(.corner-map-stack i) {
  background: var(--c-primary);
}
:global(.corner-map-stack strong) {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.55rem;
  place-items: center;
}
:global(.corner-map-stack.selected) {
  filter: drop-shadow(
    0 8px 16px color-mix(in srgb, var(--c-primary) 42%, transparent)
  );
}
:global(.amap-logo),
:global(.amap-copyright) {
  opacity: 0.62;
}
.immersive .memory-panel {
  opacity: 0;
  pointer-events: none;
  transform: translateX(24px);
}
.immersive .map-actions {
  right: 24px;
}
:global(html.map-immersive .ai-pet) {
  display: none !important;
}
.immersive .map-focus-card {
  display: none;
}
:fullscreen.memory-map-page {
  background: var(--c-bg-2);
}
@media (max-width: 900px) {
  .map-brand {
    top: max(64px, calc(env(safe-area-inset-top) + 58px));
    left: 14px;
    min-width: 0;
    width: min(300px, calc(100% - 76px));
    padding: 13px 14px;
  }
  .map-actions {
    top: max(64px, calc(env(safe-area-inset-top) + 58px));
    right: 14px;
  }
  .map-canvas-shell.hidden,
  .memory-panel.hidden {
    display: none;
  }
  .map-legend {
    bottom: 3px;
    left: 4px;
    min-width: 200px;
    gap: 9px;
    padding-inline: 10px;
    border-radius: 999px;
  }
  .map-legend span {
    font-size: 0;
  }
  .map-legend i {
    width: 9px;
    height: 9px;
  }
  .memory-panel {
    inset: 0;
    width: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
    background: var(--c-bg);
    box-shadow: none;
    padding-top: max(58px, calc(env(safe-area-inset-top) + 52px));
  }
  .memory-list {
    padding-bottom: 88px;
  }
  .mobile-switch {
    position: fixed;
    z-index: 200;
    right: 14px;
    bottom: calc(15px + env(safe-area-inset-bottom));
    display: flex;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--ld-bg-card) 91%, transparent);
    box-shadow: 0 10px 30px rgb(0 0 0/18%);
    backdrop-filter: blur(14px);
  }
  .mobile-switch button {
    display: flex;
    min-width: 78px;
    height: 34px;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--c-text-3);
    font-size: 0.65rem;
  }
  .mobile-switch button.active {
    background: var(--c-primary-soft);
    color: var(--c-primary);
  }
  .map-focus-card {
    position: fixed;
    right: 14px;
    bottom: 70px;
    left: 14px;
    width: auto;
    min-width: 0;
    grid-template-columns: 76px minmax(0, 1fr);
    transform: none;
  }
  .focus-cover {
    width: 76px;
    height: 76px;
  }
  .memory-focus-enter-from,
  .memory-focus-leave-to {
    transform: translateY(16px) scale(0.97);
  }
}
@media (prefers-reduced-motion: reduce) {
  .loading-orbit,
  .spinning {
    animation: none;
  }
  .map-reveal-leave-active,
  .memory-focus-enter-active,
  .memory-focus-leave-active {
    transition: none;
  }
}
</style>
