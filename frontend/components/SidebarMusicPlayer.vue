<template>
  <!-- audio stays outside Teleport so layout switches never interrupt playback -->
  <audio
    ref="audioRef"
    preload="metadata"
    :src="current?.url || undefined"
    @ended="onEnded"
    @timeupdate="onTime"
    @loadedmetadata="onMeta"
    @play="playing = true"
    @pause="playing = false"
    @error="onAudioError"
  />

  <Teleport v-if="slotEl" :to="slotEl" :key="slotKey">
    <div
      v-if="enabled"
      ref="rootRef"
      class="smp"
      :class="{
        'is-list': listOpen,
        'is-playing': playing,
        'is-ready': ready,
      }"
    >
      <Transition name="smp-list">
        <div
          v-if="listOpen"
          class="smp-list"
          role="listbox"
          aria-label="播放列表"
        >
          <div class="smp-list-head">
            <div class="smp-list-tabs">
              <button
                v-for="(pl, i) in playlists"
                :key="`${pl.id}-${i}`"
                type="button"
                class="smp-tab"
                :class="{ active: playlistIndex === i }"
                @click="switchPlaylist(i)"
              >
                {{ pl.name }}
              </button>
              <button
                v-if="isLoggedIn"
                type="button"
                class="smp-tab smp-favorite-tab"
                :class="{ active: playlistTab === 'favorites' }"
                @click="switchFavoritePlaylist"
              >
                <Icon name="ph:heart-fill" /> 我的收藏<span v-if="favoriteTracks.length">{{ favoriteTracks.length }}</span>
              </button>
            </div>
            <div class="smp-list-actions">
              <button type="button" class="smp-icon-btn" title="定位当前歌曲" @click="locateCurrentTrack">
                <Icon name="ph:crosshair-bold" />
              </button>
              <button type="button" class="smp-icon-btn" title="关闭" @click="listOpen = false">
                <Icon name="ph:caret-down-bold" />
              </button>
            </div>
          </div>
          <div class="smp-list-body" @scroll.passive="onTrackListScroll">
            <div
              v-for="(t, i) in tracks"
              :key="`${t.url}-${i}`"
              class="smp-track"
              role="option"
              tabindex="0"
              :class="{ active: i === index }"
              @click="playAt(i)"
              @keydown.enter.prevent="playAt(i)"
              @keydown.space.prevent="playAt(i)"
            >
              <span class="smp-track-idx">{{ i + 1 }}</span>
              <span class="smp-track-meta">
                <span class="smp-track-name">{{ t.name }}</span>
                <span class="smp-track-artist">{{ t.artist }}</span>
              </span>
              <Icon
                v-if="i === index && playing"
                name="ph:waveform-bold"
                class="smp-track-wave"
              />
              <button
                v-if="isLoggedIn"
                type="button"
                class="smp-track-favorite"
                :class="{ active: isFavorite(t) }"
                :title="isFavorite(t) ? '取消收藏' : '收藏歌曲'"
                @click.stop="toggleFavorite(t)"
              >
                <Icon :name="isFavorite(t) ? 'ph:heart-fill' : 'ph:heart-bold'" />
              </button>
            </div>
            <div v-if="hasMoreTracks" class="smp-list-loading">
              {{ loadingMore ? "正在加载更多歌曲…" : "继续滚动以加载更多歌曲" }}
            </div>
            <div v-if="!tracks.length" class="smp-empty">
              {{ loading || favoritesLoading ? "加载中…" : "暂无歌曲" }}
            </div>
          </div>
        </div>
      </Transition>

      <div class="smp-shell">
        <div class="smp-bar">
          <div class="smp-info" @click="toggleList">
            <div class="smp-title" :title="current?.name">
              {{ current?.name || "未选择歌曲" }}
            </div>
            <div class="smp-artist">{{ current?.artist || "—" }}</div>
          </div>

          <div class="smp-controls">
            <button
              type="button"
              class="smp-icon-btn"
              :title="modeTitle"
              @click="cycleMode"
            >
              <Icon :name="modeIcon" />
            </button>
            <button
              type="button"
              class="smp-icon-btn"
              v-if="isLoggedIn && current"
              :class="{ active: isFavorite(current) }"
              :title="isFavorite(current) ? '取消收藏' : '收藏歌曲'"
              @click="toggleFavorite(current)"
            >
              <Icon :name="isFavorite(current) ? 'ph:heart-fill' : 'ph:heart-bold'" />
            </button>
            <button
              type="button"
              class="smp-icon-btn"
              title="上一首"
              @click="prev"
            >
              <Icon name="ph:skip-back-fill" />
            </button>
            <button
              type="button"
              class="smp-play"
              :title="playing ? '暂停' : '播放'"
              @click="togglePlay"
            >
              <Icon :name="playing ? 'ph:pause-fill' : 'ph:play-fill'" />
            </button>
            <button
              type="button"
              class="smp-icon-btn"
              title="下一首"
              @click="next"
            >
              <Icon name="ph:skip-forward-fill" />
            </button>
            <button
              type="button"
              class="smp-icon-btn"
              title="静音"
              @click="toggleMute"
            >
              <Icon
                :name="
                  muted || volume <= 0
                    ? 'ph:speaker-slash-fill'
                    : 'ph:speaker-high-fill'
                "
              />
            </button>
          </div>

          <div class="smp-progress" @click="seek">
            <div class="smp-progress-fill" :style="{ width: `${progress}%` }" />
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
type Track = {
  name: string;
  artist: string;
  url: string;
  pic: string;
  lrc?: string;
  key?: string;
};
type PlaylistMeta = {
  index: number;
  name: string;
  server: string;
  type: string;
  id: string;
};
type PlayMode = "order" | "loop" | "shuffle";

const api = useApi();
const toast = useToast();
const { isLoggedIn } = useAuth();
const rootRef = ref<HTMLElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const { setPlaying, playRequest } = useMusicPlayerState();
const { slotEl } = useMusicPlayerSlot();
const slotKey = ref(0);

const enabled = ref(false);
const ready = ref(false);
const loading = ref(false);
const autoplay = ref(false);
const volume = ref(0.55);
const muted = ref(false);
const playing = ref(false);

watch(playing, (v) => setPlaying(v), { immediate: true });
watch(slotEl, (el) => {
  if (el) slotKey.value += 1;
});
const listOpen = ref(false);
const tracks = ref<Track[]>([]);
const playlists = ref<PlaylistMeta[]>([]);
const favoriteTracks = ref<Track[]>([]);
const favoritesLoading = ref(false);
const playlistTab = ref<"preset" | "favorites">("preset");
const playlistIndex = ref(0);
const index = ref(0);
const progress = ref(0);
const duration = ref(0);
const mode = ref<PlayMode>("order");
const playbackRequested = ref(false);
const errorRecoveryAvailable = ref(false);
const trackPage = ref(1);
const hasMoreTracks = ref(false);
const loadingMore = ref(false);

const current = computed(() => tracks.value[index.value] || null);
watch(playRequest, (request) => {
  if (!request?.url) return;
  const existing = tracks.value.findIndex(
    (track) =>
      track.url === request.url ||
      (track.name === request.name && track.artist === request.artist),
  );
  if (existing >= 0) index.value = existing;
  else {
    tracks.value.unshift({
      name: request.name,
      artist: request.artist || "未知音乐人",
      url: request.url,
      pic: request.pic || "",
      key: request.key,
    });
    index.value = 0;
  }
  listOpen.value = false;
  errorRecoveryAvailable.value = true;
  void reloadAndPlay();
});
const modeIcon = computed(() => {
  if (mode.value === "loop") return "ph:repeat-once-bold";
  if (mode.value === "shuffle") return "ph:shuffle-bold";
  return "ph:repeat-bold";
});
const modeTitle = computed(() => {
  if (mode.value === "loop") return "单曲循环";
  if (mode.value === "shuffle") return "随机播放";
  return "列表循环";
});

let playlistRequestId = 0;

onMounted(async () => {
  document.addEventListener("click", onDocClick);
  await bootstrap();
});

onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
  setPlaying(false);
  const a = audioRef.value;
  if (a) {
    a.pause();
    a.src = "";
  }
});

function onDocClick(e: MouseEvent) {
  if (!rootRef.value) return;
  if (rootRef.value.contains(e.target as Node)) return;
  listOpen.value = false;
}

async function bootstrap() {
  try {
    const cfg = await api.get<{
      enabled: boolean;
      autoplay: boolean;
      volume: number;
      playlists: PlaylistMeta[];
    }>("/music/config");
    enabled.value = !!cfg?.enabled;
    if (!enabled.value) return;
    autoplay.value = !!cfg.autoplay;
    volume.value =
      typeof cfg.volume === "number"
        ? Math.min(1, Math.max(0, cfg.volume))
        : 0.55;
    playlists.value = Array.isArray(cfg.playlists) ? cfg.playlists : [];
    await loadPlaylist(0, false);
    if (isLoggedIn.value) void loadFavorites();
    applyVolume();
    await nextTick();
    ready.value = true;
    if (autoplay.value) {
      // browsers block autoplay with sound; try muted-first then unmute after play
      await tryAutoplay();
    }
  } catch {
    enabled.value = false;
  }
}

async function loadFavorites() {
  if (!isLoggedIn.value) {
    favoriteTracks.value = [];
    return;
  }
  favoritesLoading.value = true;
  try {
    const result = await api.get<{ tracks?: Track[] }>("/music/favorites");
    favoriteTracks.value = Array.isArray(result?.tracks) ? result.tracks : [];
    if (playlistTab.value === "favorites") tracks.value = [...favoriteTracks.value];
  } catch {
    favoriteTracks.value = [];
  } finally {
    favoritesLoading.value = false;
  }
}

async function loadPlaylist(i: number, refresh = false) {
  const requestId = ++playlistRequestId;
  loading.value = true;
  try {
    const res = await api.get<{
      enabled: boolean;
      tracks: Track[];
      source?: { name: string };
      page: number;
      hasMore: boolean;
    }>("/music/playlist", {
      index: i,
      refresh: refresh ? "1" : undefined,
      page: 1,
      limit: 50,
    });
    if (requestId !== playlistRequestId) return;
    if (!res?.enabled) {
      enabled.value = false;
      return;
    }
    playlistIndex.value = i;
    playlistTab.value = "preset";
    tracks.value = res.tracks || [];
    trackPage.value = res.page || 1;
    hasMoreTracks.value = !!res.hasMore;
    index.value = 0;
    progress.value = 0;
    await nextTick();
    const a = audioRef.value;
    if (a) {
      a.load();
      if (playing.value)
        await a.play().catch(() => {
          playing.value = false;
        });
    }
  } catch {
    if (requestId === playlistRequestId) tracks.value = [];
  } finally {
    if (requestId === playlistRequestId) loading.value = false;
  }
}

async function switchFavoritePlaylist() {
  if (!isLoggedIn.value) return;
  if (playlistTab.value === "favorites") return;
  const wasPlaying = playing.value;
  playlistTab.value = "favorites";
  playlistIndex.value = -1;
  if (!favoriteTracks.value.length && !favoritesLoading.value) await loadFavorites();
  tracks.value = [...favoriteTracks.value];
  trackPage.value = 1;
  hasMoreTracks.value = false;
  index.value = 0;
  progress.value = 0;
  await nextTick();
  audioRef.value?.load();
  if (wasPlaying && current.value) await play();
}

async function loadMoreTracks() {
  if (loading.value || loadingMore.value || !hasMoreTracks.value) return;
  const targetPlaylist = playlistIndex.value;
  const targetPage = trackPage.value + 1;
  loadingMore.value = true;
  try {
    const res = await api.get<{
      tracks: Track[];
      page: number;
      hasMore: boolean;
    }>("/music/playlist", {
      index: targetPlaylist,
      page: targetPage,
      limit: 50,
    });
    if (targetPlaylist !== playlistIndex.value) return;
    const seen = new Set(tracks.value.map((track) => track.url));
    tracks.value.push(
      ...(res.tracks || []).filter((track) => !seen.has(track.url)),
    );
    trackPage.value = res.page || targetPage;
    hasMoreTracks.value = !!res.hasMore;
  } catch {
    // 保留已经加载的歌曲，允许用户再次滚动重试。
  } finally {
    loadingMore.value = false;
  }
}

async function switchPlaylist(i: number) {
  if (playlistTab.value === "preset" && i === playlistIndex.value) return;
  const wasPlaying = playing.value;
  playlistTab.value = "preset";
  await loadPlaylist(i);
  if (wasPlaying) await play();
}

function isFavorite(track: Track | null | undefined) {
  if (!track) return false;
  return favoriteTracks.value.some(
    (item) => (track.key && item.key === track.key) ||
      (item.name === track.name && item.artist === track.artist),
  );
}

async function toggleFavorite(track: Track) {
  if (!isLoggedIn.value) {
    toast.info("登录后可以收藏歌曲");
    return;
  }
  if (!track.key) {
    toast.warning("这首歌曲暂时无法收藏");
    return;
  }
  try {
    if (isFavorite(track)) {
      const wasPlaying = playing.value;
      await api.delete(`/music/favorites/${encodeURIComponent(track.key)}`);
      favoriteTracks.value = favoriteTracks.value.filter((item) => item.key !== track.key);
      if (playlistTab.value === "favorites") {
        const nextIndex = Math.min(index.value, Math.max(0, favoriteTracks.value.length - 1));
        tracks.value = [...favoriteTracks.value];
        if (!tracks.value.length) {
          pause();
          index.value = 0;
        } else {
          index.value = nextIndex;
          await nextTick();
          audioRef.value?.load();
          if (wasPlaying) await play();
        }
      }
      toast.success("已取消收藏");
    } else {
      const result = await api.post<{ track?: Track }>("/music/favorites", {
        name: track.name,
        artist: track.artist,
        url: track.url,
        pic: track.pic,
        lrc: track.lrc,
      });
      if (result?.track) {
        favoriteTracks.value = [result.track, ...favoriteTracks.value.filter((item) => item.key !== result.track?.key)];
        if (playlistTab.value === "favorites") tracks.value = [...favoriteTracks.value];
      }
      toast.success("已加入收藏歌单");
    }
  } catch {
    toast.error("歌曲收藏更新失败");
  }
}

function applyVolume() {
  const a = audioRef.value;
  if (!a) return;
  a.volume = muted.value ? 0 : volume.value;
}

async function tryAutoplay() {
  const a = audioRef.value;
  if (!a || !current.value) return;
  try {
    a.muted = true;
    await a.play();
    playing.value = true;
    // keep muted unless user interacts — policy
    a.muted = false;
    muted.value = false;
    applyVolume();
  } catch {
    playing.value = false;
    a.muted = false;
  }
}

function togglePlay() {
  if (!current.value) return;
  if (playing.value) pause();
  else {
    errorRecoveryAvailable.value = true;
    play();
  }
}

async function play() {
  const a = audioRef.value;
  if (!a || !current.value) return;
  playbackRequested.value = true;
  try {
    await a.play();
    playing.value = true;
  } catch {
    playing.value = false;
    playbackRequested.value = false;
  }
}

function pause() {
  playbackRequested.value = false;
  audioRef.value?.pause();
  playing.value = false;
}

function prev() {
  if (!tracks.value.length) return;
  if (mode.value === "shuffle") {
    index.value = Math.floor(Math.random() * tracks.value.length);
  } else {
    index.value = (index.value - 1 + tracks.value.length) % tracks.value.length;
  }
  errorRecoveryAvailable.value = true;
  reloadAndPlay();
}

async function next(resetErrorRecovery: boolean | Event = true) {
  if (!tracks.value.length) return;
  if (mode.value === "shuffle") {
    let n = index.value;
    if (tracks.value.length > 1) {
      while (n === index.value)
        n = Math.floor(Math.random() * tracks.value.length);
    }
    index.value = n;
  } else {
    if (index.value >= tracks.value.length - 1 && hasMoreTracks.value) {
      await loadMoreTracks();
    }
    index.value = (index.value + 1) % tracks.value.length;
  }
  if (resetErrorRecovery !== false) errorRecoveryAvailable.value = true;
  reloadAndPlay();
}

function playAt(i: number) {
  index.value = i;
  errorRecoveryAvailable.value = true;
  reloadAndPlay();
}

async function reloadAndPlay() {
  progress.value = 0;
  await nextTick();
  const a = audioRef.value;
  if (!a) return;
  a.load();
  await play();
}

function onEnded() {
  playbackRequested.value = false;
  if (mode.value === "loop") {
    const a = audioRef.value;
    if (a) {
      a.currentTime = 0;
      play();
    }
    return;
  }
  next();
}

function onTime() {
  const a = audioRef.value;
  if (!a || !a.duration) return;
  duration.value = a.duration;
  progress.value = (a.currentTime / a.duration) * 100;
}

function onMeta() {
  duration.value = audioRef.value?.duration || 0;
}

function onAudioError() {
  playing.value = false;
  if (
    playbackRequested.value &&
    errorRecoveryAvailable.value &&
    tracks.value.length > 1
  ) {
    errorRecoveryAvailable.value = false;
    void next(false);
    return;
  }
  playbackRequested.value = false;
}

function seek(e: MouseEvent) {
  const a = audioRef.value;
  const el = e.currentTarget as HTMLElement;
  if (!a || !a.duration || !el) return;
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  a.currentTime = ratio * a.duration;
  progress.value = ratio * 100;
}

function cycleMode() {
  mode.value =
    mode.value === "order"
      ? "loop"
      : mode.value === "loop"
        ? "shuffle"
        : "order";
}

function toggleMute() {
  muted.value = !muted.value;
  applyVolume();
}

function toggleList() {
  listOpen.value = !listOpen.value;
  if (listOpen.value) {
    void nextTick(locateCurrentTrack);
  }
}

function locateCurrentTrack() {
  rootRef.value?.querySelector<HTMLElement>(".smp-track.active")?.scrollIntoView({
    block: "center",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

function onTrackListScroll(event: Event) {
  const el = event.currentTarget as HTMLElement;
  if (
    el.scrollTop + el.clientHeight >= el.scrollHeight - 72 &&
    hasMoreTracks.value
  ) {
    void loadMoreTracks();
  }
}

watch(volume, applyVolume);
watch(muted, applyVolume);
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) void loadFavorites();
  else {
    favoriteTracks.value = [];
    if (playlistTab.value === "favorites") {
      playlistTab.value = "preset";
      void loadPlaylist(0);
    }
  }
});
</script>

<style scoped>
.smp {
  --smp-r: 12px;
  position: relative;
  z-index: 40;
  width: 100%;
  min-width: 0;
  height: 76px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  pointer-events: none;
  opacity: 0;
  transform: translateY(7px);
  visibility: hidden;
  transition:
    opacity 0.34s ease,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0.34s;
}

.smp.is-ready {
  opacity: 1;
  transform: none;
  visibility: visible;
}

.smp > * {
  pointer-events: auto;
}

.smp-shell {
  position: relative;
  display: block;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  height: 76px;
  border-radius: var(--smp-r);
  background: color-mix(in srgb, var(--ld-bg-card) 96%, var(--c-bg-1));
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  box-shadow: 0 7px 22px color-mix(in srgb, var(--ld-shadow) 32%, transparent);
  overflow: hidden;
  contain: layout paint;
  transition: border-color 0.2s ease, box-shadow 0.25s ease;
  z-index: 2;
}

.smp.is-list .smp-shell {
  border-color: color-mix(in srgb, var(--c-primary) 30%, var(--border));
}

.smp-bar {
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: minmax(0, 1fr) auto 3px;
  align-items: center;
  column-gap: 3px;
  padding: 7px 9px 6px;
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.smp-info {
  min-width: 0;
  cursor: pointer;
  padding-right: 4px;
}

.smp-title {
  font-size: 0.72rem;
  font-weight: 650;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.smp-artist {
  font-size: 0.62rem;
  color: var(--c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.smp-controls {
  display: flex;
  align-items: center;
  gap: 1px;
  justify-content: flex-end;
}

.smp-icon-btn {
  width: 23px;
  height: 23px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--c-text-2);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.78rem;
  transition:
    color 0.15s,
    background 0.15s;
}

.smp-icon-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.smp-play {
  width: 25px;
  height: 25px;
  border: none;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.8rem;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 35%, transparent);
  transition:
    transform 0.15s ease,
    opacity 0.15s;
}

.smp-play:hover {
  transform: scale(1.06);
}

.smp-progress {
  grid-column: 1 / -1;
  height: 3px;
  border-radius: 99px;
  background: var(--c-bg-2);
  cursor: pointer;
  overflow: hidden;
  margin-top: 1px;
}

.smp-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 60%, #fff)
  );
  transition: width 0.1s linear;
}

.smp-list {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 8px);
  width: 100%;
  min-width: 0;
  max-height: min(240px, calc(100dvh - 260px));
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  box-shadow: 0 16px 40px color-mix(in srgb, #000 16%, var(--ld-shadow));
  overflow: hidden;
  transform-origin: bottom left;
}

.smp-list-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.smp-list-actions { display: flex; align-items: center; gap: 2px; }

.smp-list-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.smp-list-tabs::-webkit-scrollbar {
  display: none;
}

.smp-tab {
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.68rem;
  font-family: inherit;
  color: var(--c-text-2);
  background: var(--c-bg-2);
  cursor: pointer;
  transition: all 0.15s;
}

.smp-tab.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
  font-weight: 650;
}

.smp-favorite-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.smp-favorite-tab :deep(svg) {
  font-size: 0.72rem;
}

.smp-favorite-tab span {
  min-width: 14px;
  padding: 1px 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
  font-size: 0.56rem;
  text-align: center;
}

.smp-list-body {
  overflow-y: auto;
  padding: 4px;
  max-height: 190px;
}

.smp-track {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  text-align: left;
  padding: 7px 8px;
  border-radius: 10px;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  transition: background 0.15s;
}

.smp-track:hover {
  background: var(--c-bg-1);
}

.smp-track.active {
  background: var(--c-primary-soft);
}

.smp-track-idx {
  width: 18px;
  font-size: 0.68rem;
  color: var(--c-text-3);
  text-align: center;
  flex-shrink: 0;
}

.smp-track.active .smp-track-idx {
  color: var(--c-primary);
  font-weight: 700;
}

.smp-track-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.smp-track-name {
  font-size: 0.74rem;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.smp-track-artist {
  font-size: 0.62rem;
  color: var(--c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.smp-track-wave {
  color: var(--c-primary);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.smp-track-favorite {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font-size: 0.82rem;
  transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.smp-track-favorite:hover,
.smp-track-favorite.active,
.smp-icon-btn.active {
  color: #df6d86;
  background: color-mix(in srgb, #df6d86 12%, transparent);
}

.smp-track-favorite:hover {
  transform: translateY(-1px) scale(1.04);
}

.smp-empty {
  padding: 20px 8px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--c-text-3);
}

.smp-list-loading {
  padding: 8px;
  text-align: center;
  font-size: 0.65rem;
  color: var(--c-text-3);
}

.smp-list-enter-active,
.smp-list-leave-active {
  transition:
    opacity 0.32s ease,
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.smp-list-enter-from,
.smp-list-leave-to {
  opacity: 0;
  transform: translate3d(0, 12px, 0) scale(0.975);
}

@media (prefers-reduced-motion: reduce) {
  .smp-shell,
  .smp-bar,
  .smp-list-enter-active,
  .smp-list-leave-active {
    transition: none !important;
  }
}
</style>
