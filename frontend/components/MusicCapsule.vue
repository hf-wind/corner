<template>
  <audio
    ref="audioRef"
    class="music-audio"
    preload="metadata"
    :src="current?.url || undefined"
    @ended="onEnded"
    @timeupdate="onTimeUpdate"
    @loadedmetadata="onMetadata"
    @play="playing = true"
    @pause="playing = false"
    @error="onAudioError"
  />

  <section
    v-if="enabled"
    ref="rootRef"
    class="music-capsule"
    :class="{
      'is-ready': ready,
      'is-expanded': expanded,
      'is-playing': playing,
      'is-queue-open': queueOpen,
      'has-auth': isLoggedIn,
    }"
    aria-label="音乐播放器"
  >
    <Transition name="queue-panel">
      <div
        v-if="queueOpen"
        class="queue-panel"
        role="dialog"
        aria-label="选择歌单和歌曲"
        :aria-busy="queueLoading"
      >
        <header class="queue-header">
          <div class="playlist-tabs" role="tablist" aria-label="歌单">
            <button
              v-for="(playlist, playlistPosition) in playlists"
              :key="`${playlist.server}-${playlist.type}-${playlist.id}`"
              type="button"
              role="tab"
              class="playlist-tab"
              :class="{
                active:
                  playlistTab === 'preset' &&
                  playlistIndex === playlistPosition,
              }"
              :aria-selected="
                playlistTab === 'preset' && playlistIndex === playlistPosition
              "
              @click="selectPlaylist(playlistPosition)"
            >
              {{ playlist.name }}
            </button>
            <button
              v-if="isLoggedIn"
              type="button"
              role="tab"
              class="playlist-tab personal-tab"
              :class="{ active: playlistTab === 'favorites' }"
              :aria-selected="playlistTab === 'favorites'"
              @click="selectFavoritePlaylist"
            >
              <Icon name="ph:heart-fill" />
              我的歌单
              <span v-if="favoriteTracks.length" class="playlist-count">
                {{ favoriteTracks.length }}
              </span>
            </button>
          </div>

          <div class="queue-actions">
            <button
              type="button"
              class="icon-button"
              title="定位当前歌曲"
              aria-label="定位当前歌曲"
              @click="locateCurrentTrack"
            >
              <Icon name="ph:crosshair-bold" />
            </button>
            <button
              type="button"
              class="icon-button"
              title="收起歌单"
              aria-label="收起歌单"
              @click="queueOpen = false"
            >
              <Icon name="ph:caret-down-bold" />
            </button>
          </div>
        </header>

        <div class="queue-context">
          <span>{{ activePlaylistName }}</span>
          <span>{{ totalTracks }} 首 · 列表循环</span>
        </div>

        <div
          ref="queueBodyRef"
          class="queue-body"
          role="listbox"
          @scroll.passive="onQueueScroll"
        >
          <button
            v-for="(track, trackIndex) in queueTracks"
            :key="track.key || `${track.name}-${track.artist}-${trackIndex}`"
            type="button"
            class="queue-track"
            :class="{ active: isCurrentTrack(track) }"
            role="option"
            :aria-selected="isCurrentTrack(track)"
            @click="playAt(trackIndex)"
          >
            <span class="track-index">
              <Icon
                v-if="isCurrentTrack(track) && playing"
                name="ph:waveform-bold"
              />
              <template v-else>{{
                String(trackIndex + 1).padStart(2, "0")
              }}</template>
            </span>
            <span v-lazy-cover="track.pic" class="track-cover">
              <img
                v-if="isQueueCoverVisible(track.pic) && hasCover(track.pic)"
                :src="track.pic"
                alt=""
                draggable="false"
                @error="markCoverBroken(track.pic)"
              />
              <Icon v-else name="ph:music-note-bold" />
            </span>
            <span class="track-copy">
              <strong :title="track.name">{{ track.name }}</strong>
              <small :title="track.artist">{{ track.artist }}</small>
            </span>
            <span
              v-if="isLoggedIn"
              class="track-favorite"
              :class="{ active: isFavorite(track) }"
              :title="isFavorite(track) ? '取消收藏' : '收藏到我的歌单'"
              role="button"
              tabindex="0"
              @click.stop="toggleFavorite(track)"
              @keydown.enter.stop.prevent="toggleFavorite(track)"
              @keydown.space.stop.prevent="toggleFavorite(track)"
            >
              <Icon
                :name="isFavorite(track) ? 'ph:heart-fill' : 'ph:heart-bold'"
              />
            </span>
          </button>

          <div v-if="!queueTracks.length && !queueLoading" class="queue-empty">
            <Icon name="ph:music-notes-simple-bold" />
            <span>{{
              playlistTab === "favorites"
                ? "还没有收藏歌曲"
                : "这个歌单暂时为空"
            }}</span>
          </div>
          <div
            v-if="queueTracks.length && (hasMoreTracks || loadingMore)"
            class="queue-more"
          >
            <span
              v-if="loadingMore"
              class="loading-spinner"
              aria-hidden="true"
            />
            <span>{{ loadingMore ? "正在加载下一组" : "继续滚动加载" }}</span>
          </div>
        </div>

        <Transition name="queue-loading">
          <div v-if="queueLoading" class="queue-loading" aria-live="polite">
            <span class="loading-disc"><Icon name="ph:music-note-bold" /></span>
            <span>正在准备歌单</span>
          </div>
        </Transition>
      </div>
    </Transition>

    <div class="capsule-shell">
      <span class="water-progress" aria-hidden="true">
        <span
          class="water-level"
          :class="{
            active: playing,
            'is-empty': progress <= 0.1,
            'is-full': progress >= 99.5,
          }"
          :style="{ height: `${progress}%` }"
        >
          <i class="water-wave water-wave-front" />
          <i class="water-wave water-wave-back" />
        </span>
      </span>

      <div class="cover-cluster">
        <button
          type="button"
          class="cover-button"
          :title="expanded ? '收起播放器' : '展开播放器'"
          :aria-label="expanded ? '收起播放器' : '展开播放器'"
          @click="toggleExpanded"
        >
          <span class="current-cover">
            <img
              v-if="current && hasCover(current.pic)"
              :src="current.pic"
              alt=""
              draggable="false"
              @error="markCoverBroken(current.pic)"
            />
            <Icon v-else name="ph:music-note-bold" />
          </span>
        </button>
        <button
          type="button"
          class="cover-play"
          :title="playing ? '暂停' : '播放'"
          :aria-label="playing ? '暂停' : '播放'"
          :disabled="!current"
          @click="togglePlay"
        >
          <Icon :name="playing ? 'ph:pause-fill' : 'ph:play-fill'" />
        </button>
      </div>

      <button
        type="button"
        class="title-button"
        :title="current?.name || '暂无可播放歌曲'"
        :aria-expanded="expanded"
        @click="toggleExpanded"
      >
        {{ current?.name || "暂无歌曲" }}
      </button>

      <button
        type="button"
        class="expand-button"
        :title="expanded ? '收起播放器' : '展开播放器'"
        :aria-label="expanded ? '收起播放器' : '展开播放器'"
        @click="toggleExpanded"
      >
        <Icon name="ph:caret-left-bold" />
      </button>

      <div
        class="capsule-controls"
        :class="{ 'is-visible': expanded }"
        :aria-hidden="!expanded"
      >
        <button
          type="button"
          class="control-button"
          title="上一首"
          aria-label="上一首"
          :disabled="!current"
          @click="previous"
        >
          <Icon name="ph:skip-back-fill" />
        </button>
        <button
          type="button"
          class="control-button"
          title="下一首"
          aria-label="下一首"
          :disabled="!current"
          @click="next()"
        >
          <Icon name="ph:skip-forward-fill" />
        </button>
        <button
          v-if="isLoggedIn && current"
          type="button"
          class="control-button favorite-control"
          :class="{ active: isFavorite(current) }"
          :title="isFavorite(current) ? '取消收藏' : '收藏到我的歌单'"
          :aria-label="isFavorite(current) ? '取消收藏' : '收藏到我的歌单'"
          @click="toggleFavorite(current)"
        >
          <Icon
            :name="isFavorite(current) ? 'ph:heart-fill' : 'ph:heart-bold'"
          />
        </button>
        <button
          type="button"
          class="control-button queue-button"
          :class="{ active: queueOpen }"
          title="展开歌单"
          aria-label="展开歌单"
          :aria-expanded="queueOpen"
          @click="toggleQueue"
        >
          <Icon name="ph:list-bullets-bold" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: "ready", payload: { visible: boolean }): void;
}>();

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

const PLAYLIST_PAGE_SIZE = 6;

const api = useApi();
const toast = useToast();
const { isLoggedIn } = useAuth();
const { setPlaying, playRequest } = useMusicPlayerState();

const rootRef = ref<HTMLElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const queueBodyRef = ref<HTMLElement | null>(null);
const enabled = ref(false);
const ready = ref(false);
const expanded = ref(false);
const queueOpen = ref(false);
const queueLoading = ref(false);
const autoplay = ref(false);
const playing = ref(false);
const volume = ref(0.55);
const currentTime = ref(0);
const duration = ref(0);
const tracks = ref<Track[]>([]);
const queueTracks = ref<Track[]>([]);
const totalTracks = ref(0);
const trackPage = ref(1);
const hasMoreTracks = ref(false);
const loadingMore = ref(false);
const playbackPlaylistTab = ref<"preset" | "favorites">("preset");
const playbackPlaylistIndex = ref(0);
const playbackPage = ref(1);
const playbackHasMore = ref(false);
const favoriteTracks = ref<Track[]>([]);
const playlists = ref<PlaylistMeta[]>([]);
const playlistTab = ref<"preset" | "favorites">("preset");
const playlistIndex = ref(0);
const index = ref(0);
const playbackRequested = ref(false);
const errorRecoveryAvailable = ref(false);
const brokenCovers = ref(new Set<string>());
const visibleQueueCovers = ref(new Set<string>());
let playlistRequestId = 0;
let playRequestId = 0;
let coverObserver: IntersectionObserver | null = null;

const vLazyCover = {
  mounted(element: HTMLElement, binding: { value?: string }) {
    observeQueueCover(element, binding.value);
  },
  updated(
    element: HTMLElement,
    binding: { value?: string; oldValue?: string },
  ) {
    if (binding.value === binding.oldValue) return;
    coverObserver?.unobserve(element);
    observeQueueCover(element, binding.value);
  },
  beforeUnmount(element: HTMLElement) {
    coverObserver?.unobserve(element);
  },
};

const current = computed(() => tracks.value[index.value] || null);
const progress = computed(() =>
  duration.value > 0
    ? Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
    : 0,
);
const activePlaylistName = computed(() => {
  if (playlistTab.value === "favorites") return "我的歌单";
  return playlists.value[playlistIndex.value]?.name || "站点歌单";
});

watch(playing, (value) => setPlaying(value), { immediate: true });
watch(playRequest, (request) => {
  if (request?.url) void handleExternalPlayRequest(request);
});
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    void loadFavorites();
    return;
  }
  favoriteTracks.value = [];
  if (playlistTab.value === "favorites") void selectPlaylist(0);
});

onMounted(async () => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("keydown", onDocumentKeydown);
  await bootstrap();
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  document.removeEventListener("keydown", onDocumentKeydown);
  setPlaying(false);
  coverObserver?.disconnect();
  coverObserver = null;
  const audio = audioRef.value;
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
});

async function bootstrap() {
  try {
    const config = await api.get<{
      enabled: boolean;
      autoplay: boolean;
      volume: number;
      playlists: PlaylistMeta[];
    }>("/music/config");
    enabled.value = Boolean(config?.enabled);
    if (!enabled.value) {
      emit("ready", { visible: false });
      return;
    }

    autoplay.value = Boolean(config.autoplay);
    playlists.value = Array.isArray(config.playlists) ? config.playlists : [];
    if (Number.isFinite(config.volume)) {
      volume.value = clamp(Number(config.volume), 0, 1);
    }
    applyVolume();

    await Promise.all([
      loadPlaylist(0, true),
      isLoggedIn.value ? loadFavorites() : Promise.resolve(),
    ]);
    ready.value = true;
    emit("ready", { visible: true });
    if (autoplay.value && current.value) await tryAutoplay();
  } catch {
    enabled.value = false;
    emit("ready", { visible: false });
  }
}

async function loadPlaylist(position: number, initial = false) {
  const requestId = ++playlistRequestId;
  if (!initial) queueLoading.value = true;
  try {
    const response = await api.get<{
      enabled: boolean;
      tracks: Track[];
      page: number;
      total: number;
      hasMore: boolean;
    }>("/music/playlist", {
      index: position,
      page: 1,
      limit: PLAYLIST_PAGE_SIZE,
    });
    if (requestId !== playlistRequestId) return;
    if (!response?.enabled) {
      enabled.value = false;
      return;
    }

    const nextTracks = Array.isArray(response.tracks) ? response.tracks : [];
    playlistTab.value = "preset";
    playlistIndex.value = position;
    queueTracks.value = nextTracks;
    totalTracks.value = Number(response.total) || nextTracks.length;
    trackPage.value = Number(response.page) || 1;
    hasMoreTracks.value = Boolean(response.hasMore);

    if (initial) {
      await preloadCovers(nextTracks.slice(0, 1));
      if (requestId !== playlistRequestId) return;
      tracks.value = [...nextTracks];
      playbackPlaylistTab.value = "preset";
      playbackPlaylistIndex.value = position;
      playbackPage.value = trackPage.value;
      playbackHasMore.value = hasMoreTracks.value;
      index.value = 0;
      resetProgress();
      await prepareCurrentTrack(false);
    }
  } catch (error) {
    if (initial) throw error;
    toast.error("歌单加载失败，请稍后重试");
  } finally {
    if (requestId === playlistRequestId) queueLoading.value = false;
  }
}

async function loadMoreTracks() {
  if (
    loadingMore.value ||
    queueLoading.value ||
    !hasMoreTracks.value ||
    playlistTab.value !== "preset"
  ) {
    return;
  }
  const requestId = playlistRequestId;
  const page = trackPage.value + 1;
  loadingMore.value = true;
  try {
    const response = await api.get<{
      tracks: Track[];
      page: number;
      total: number;
      hasMore: boolean;
    }>("/music/playlist", {
      index: playlistIndex.value,
      page,
      limit: PLAYLIST_PAGE_SIZE,
    });
    if (requestId !== playlistRequestId) return;
    const seen = new Set(queueTracks.value.map((track) => track.url));
    const appendedTracks = (response.tracks || []).filter(
      (track) => !seen.has(track.url),
    );
    queueTracks.value.push(...appendedTracks);
    trackPage.value = Number(response.page) || page;
    totalTracks.value = Number(response.total) || totalTracks.value;
    hasMoreTracks.value = Boolean(response.hasMore);
    if (browseMatchesPlayback()) {
      appendUniqueTracks(tracks.value, appendedTracks);
      playbackPage.value = trackPage.value;
      playbackHasMore.value = hasMoreTracks.value;
    }
  } catch {
    toast.error("更多歌曲加载失败，请稍后重试");
  } finally {
    loadingMore.value = false;
  }
}

async function loadFavorites() {
  if (!isLoggedIn.value) return;
  try {
    const response = await api.get<{ tracks?: Track[] }>("/music/favorites");
    const nextFavorites = Array.isArray(response?.tracks)
      ? response.tracks
      : [];
    favoriteTracks.value = nextFavorites;
    if (playlistTab.value === "favorites") {
      queueTracks.value = [...nextFavorites];
      totalTracks.value = nextFavorites.length;
      hasMoreTracks.value = false;
    }
  } catch {
    favoriteTracks.value = [];
  }
}

async function selectPlaylist(position: number) {
  if (
    playlistTab.value === "preset" &&
    playlistIndex.value === position &&
    queueTracks.value.length
  ) {
    return;
  }
  await loadPlaylist(position);
}

async function selectFavoritePlaylist() {
  if (!isLoggedIn.value || playlistTab.value === "favorites") return;
  queueLoading.value = true;
  try {
    if (!favoriteTracks.value.length) await loadFavorites();
    playlistTab.value = "favorites";
    playlistIndex.value = -1;
    queueTracks.value = [...favoriteTracks.value];
    totalTracks.value = queueTracks.value.length;
    trackPage.value = 1;
    hasMoreTracks.value = false;
  } finally {
    queueLoading.value = false;
  }
}

async function handleExternalPlayRequest(
  request: Track & { requestId: number },
) {
  const requestId = ++playRequestId;
  await preloadCovers([request]);
  if (requestId !== playRequestId) return;
  const existing = tracks.value.findIndex(
    (track) =>
      track.url === request.url ||
      (track.name === request.name && track.artist === request.artist),
  );
  if (existing >= 0) {
    index.value = existing;
  } else {
    tracks.value = [request, ...tracks.value];
    index.value = 0;
  }
  playbackHasMore.value = false;
  expanded.value = true;
  queueOpen.value = false;
  errorRecoveryAvailable.value = true;
  await reloadAndPlay();
}

function toggleExpanded() {
  expanded.value = !expanded.value;
  if (!expanded.value) {
    queueOpen.value = false;
  }
}

function toggleQueue() {
  queueOpen.value = !queueOpen.value;
  if (queueOpen.value) void nextTick(locateCurrentTrack);
}

function onDocumentPointerDown(event: PointerEvent) {
  if (rootRef.value?.contains(event.target as Node)) return;
  queueOpen.value = false;
  expanded.value = false;
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  if (queueOpen.value) {
    queueOpen.value = false;
    return;
  }
  expanded.value = false;
}

function togglePlay() {
  if (!current.value) return;
  if (playing.value) pause();
  else {
    errorRecoveryAvailable.value = true;
    void play();
  }
}

async function play() {
  const audio = audioRef.value;
  if (!audio || !current.value) return;
  playbackRequested.value = true;
  try {
    await audio.play();
    playing.value = true;
  } catch {
    playbackRequested.value = false;
    playing.value = false;
  }
}

function pause() {
  playbackRequested.value = false;
  audioRef.value?.pause();
  playing.value = false;
}

async function previous() {
  if (!tracks.value.length) return;
  errorRecoveryAvailable.value = true;
  const targetIndex =
    (index.value - 1 + tracks.value.length) % tracks.value.length;
  await preloadCovers([tracks.value[targetIndex]]);
  index.value = targetIndex;
  await reloadAndPlay();
}

async function next(allowErrorRecovery = true) {
  if (!tracks.value.length) return;
  if (allowErrorRecovery) errorRecoveryAvailable.value = true;
  if (index.value >= tracks.value.length - 1) {
    await loadMorePlaybackTracks();
  }
  const targetIndex = (index.value + 1) % tracks.value.length;
  await preloadCovers([tracks.value[targetIndex]]);
  index.value = targetIndex;
  await reloadAndPlay();
}

function onQueueScroll(event: Event) {
  const element = event.currentTarget as HTMLElement;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 72) {
    void loadMoreTracks();
  }
}

async function playAt(trackIndex: number) {
  const selectedTrack = queueTracks.value[trackIndex];
  if (!selectedTrack) return;
  await preloadCovers([selectedTrack]);
  tracks.value = [...queueTracks.value];
  playbackPlaylistTab.value = playlistTab.value;
  playbackPlaylistIndex.value = playlistIndex.value;
  playbackPage.value = trackPage.value;
  playbackHasMore.value = hasMoreTracks.value;
  index.value = trackIndex;
  errorRecoveryAvailable.value = true;
  await reloadAndPlay();
}

async function loadMorePlaybackTracks() {
  if (!playbackHasMore.value || playbackPlaylistTab.value !== "preset") return;
  if (browseMatchesPlayback()) {
    await loadMoreTracks();
    return;
  }

  const sourceIndex = playbackPlaylistIndex.value;
  const page = playbackPage.value + 1;
  try {
    const response = await api.get<{
      tracks: Track[];
      page: number;
      hasMore: boolean;
    }>("/music/playlist", {
      index: sourceIndex,
      page,
      limit: PLAYLIST_PAGE_SIZE,
    });
    if (
      playbackPlaylistTab.value !== "preset" ||
      playbackPlaylistIndex.value !== sourceIndex
    ) {
      return;
    }
    appendUniqueTracks(tracks.value, response.tracks || []);
    playbackPage.value = Number(response.page) || page;
    playbackHasMore.value = Boolean(response.hasMore);
  } catch {
    toast.error("下一组歌曲加载失败，请稍后重试");
  }
}

function browseMatchesPlayback() {
  return (
    playlistTab.value === playbackPlaylistTab.value &&
    playlistIndex.value === playbackPlaylistIndex.value
  );
}

function appendUniqueTracks(target: Track[], additions: Track[]) {
  const seen = new Set(target.map((track) => track.url));
  target.push(...additions.filter((track) => !seen.has(track.url)));
}

function isCurrentTrack(track: Track) {
  const playingTrack = current.value;
  if (!playingTrack) return false;
  return Boolean(
    (track.key && playingTrack.key && track.key === playingTrack.key) ||
    track.url === playingTrack.url,
  );
}

async function reloadAndPlay() {
  resetProgress();
  await prepareCurrentTrack(true);
}

async function prepareCurrentTrack(shouldPlay: boolean) {
  await nextTick();
  const audio = audioRef.value;
  if (!audio || !current.value) return;
  applyVolume();
  const metadataReady = waitForAudioMetadata(audio);
  audio.load();
  await metadataReady;
  if (shouldPlay) await play();
}

function waitForAudioMetadata(audio: HTMLAudioElement) {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    onMetadata();
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", finish);
      audio.removeEventListener("error", finish);
      resolve();
    };
    audio.addEventListener("loadedmetadata", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    timer = window.setTimeout(finish, 10_000);
  });
}

async function tryAutoplay() {
  const audio = audioRef.value;
  if (!audio || !current.value) return;
  try {
    await play();
  } catch {
    // play() already normalizes rejected browser autoplay promises.
  }
  if (playing.value) return;
}

function onEnded() {
  playbackRequested.value = false;
  next();
}

function onTimeUpdate() {
  const audio = audioRef.value;
  if (!audio) return;
  currentTime.value = Number.isFinite(audio.currentTime)
    ? audio.currentTime
    : 0;
  if (Number.isFinite(audio.duration)) duration.value = audio.duration;
}

function onMetadata() {
  const audioDuration = audioRef.value?.duration;
  duration.value = Number.isFinite(audioDuration) ? Number(audioDuration) : 0;
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

function applyVolume() {
  const audio = audioRef.value;
  if (!audio) return;
  audio.volume = clamp(volume.value, 0, 1);
}

function isFavorite(track: Track | null | undefined) {
  if (!track) return false;
  return favoriteTracks.value.some(
    (favorite) =>
      (track.key && favorite.key === track.key) ||
      (favorite.name === track.name && favorite.artist === track.artist),
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
      await removeFavorite(track);
    } else {
      const response = await api.post<{ track?: Track }>("/music/favorites", {
        name: track.name,
        artist: track.artist,
        url: track.url,
        pic: track.pic,
        lrc: track.lrc,
      });
      if (response?.track) {
        favoriteTracks.value = [
          response.track,
          ...favoriteTracks.value.filter(
            (favorite) => favorite.key !== response.track?.key,
          ),
        ];
        if (playlistTab.value === "favorites") {
          queueTracks.value = [...favoriteTracks.value];
          totalTracks.value = queueTracks.value.length;
        }
      }
      toast.success("已收藏到我的歌单");
    }
  } catch {
    toast.error("歌曲收藏更新失败");
  }
}

async function removeFavorite(track: Track) {
  await api.delete(`/music/favorites/${encodeURIComponent(track.key || "")}`);
  favoriteTracks.value = favoriteTracks.value.filter(
    (favorite) => favorite.key !== track.key,
  );
  if (playlistTab.value === "favorites") {
    queueTracks.value = [...favoriteTracks.value];
    totalTracks.value = queueTracks.value.length;
  }
  toast.success("已从我的歌单移除");
}

async function preloadCovers(nextTracks: Track[]) {
  const urls = [
    ...new Set(nextTracks.map((track) => track.pic).filter(Boolean)),
  ];
  const results = await Promise.all(
    urls.map(async (url) => ({ url, loaded: await preloadImage(url) })),
  );
  const nextBroken = new Set(brokenCovers.value);
  for (const result of results) {
    if (result.loaded) nextBroken.delete(result.url);
    else nextBroken.add(result.url);
  }
  brokenCovers.value = nextBroken;
}

function observeQueueCover(element: HTMLElement, url: string | undefined) {
  if (!url || brokenCovers.value.has(url)) return;
  element.dataset.coverUrl = url;
  if (!coverObserver) {
    coverObserver = new IntersectionObserver(
      (entries) => {
        const newlyVisible = new Set(visibleQueueCovers.value);
        let changed = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const coverUrl = target.dataset.coverUrl;
          if (coverUrl && !newlyVisible.has(coverUrl)) {
            newlyVisible.add(coverUrl);
            changed = true;
          }
          coverObserver?.unobserve(target);
        }
        if (changed) visibleQueueCovers.value = newlyVisible;
      },
      { root: queueBodyRef.value, rootMargin: "36px 0px" },
    );
  }
  coverObserver.observe(element);
}

function isQueueCoverVisible(url: string | undefined) {
  return Boolean(url && visibleQueueCovers.value.has(url));
}

function preloadImage(url: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    let timer = 0;
    const finish = (loaded: boolean) => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        // A completed load is usable even when decode() is unavailable.
      }
      finish(true);
    };
    image.onerror = () => finish(false);
    timer = window.setTimeout(() => finish(false), 12_000);
    image.src = url;
  });
}

function hasCover(url: string | undefined) {
  return Boolean(url && !brokenCovers.value.has(url));
}

function markCoverBroken(url: string | undefined) {
  if (!url) return;
  brokenCovers.value = new Set([...brokenCovers.value, url]);
}

function locateCurrentTrack() {
  const active = queueBodyRef.value?.querySelector<HTMLElement>(
    ".queue-track.active",
  );
  active?.scrollIntoView({
    block: "center",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function resetProgress() {
  currentTime.value = 0;
  duration.value = 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
</script>

<style scoped>
.music-audio {
  display: none;
}

.music-capsule {
  --capsule-height: 34px;
  position: relative;
  display: flex;
  width: 166px;
  min-width: 166px;
  height: var(--capsule-height);
  flex: 0 0 166px;
  align-items: flex-end;
  opacity: 0;
  visibility: hidden;
  transform: translate3d(0, 9px, 0) scale(0.97);
  transition:
    width 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    flex-basis 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.32s ease,
    visibility 0.32s,
    transform 0.52s cubic-bezier(0.16, 1, 0.3, 1);
}

.music-capsule.is-ready {
  opacity: 1;
  visibility: visible;
  transform: none;
}

.music-capsule.is-expanded {
  width: 200px;
  min-width: 200px;
  flex-basis: 200px;
}

.music-capsule.has-auth.is-expanded {
  width: 223px;
  min-width: 223px;
  flex-basis: 223px;
}

.capsule-shell {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  min-width: 0;
  height: var(--capsule-height);
  box-sizing: border-box;
  align-items: center;
  gap: 2px;
  padding: 3px;
  overflow: visible;
  border: 0;
  border-radius: 18px;
  background: color-mix(in srgb, var(--ld-bg-card) 90%, transparent);
  box-shadow:
    0 10px 30px color-mix(in srgb, #000 12%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 68%, transparent) inset;
  backdrop-filter: blur(18px) saturate(1.28);
  -webkit-backdrop-filter: blur(18px) saturate(1.28);
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
}

.music-capsule.is-expanded .capsule-shell {
  box-shadow:
    0 12px 32px color-mix(in srgb, #000 14%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 72%, transparent) inset;
}

.control-button:focus-visible,
.cover-play:focus-visible,
.queue-track:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 58%, transparent);
  outline-offset: 2px;
}

.playlist-tab:focus,
.playlist-tab:focus-visible {
  border-color: transparent !important;
  outline: none !important;
  box-shadow: none !important;
}

.water-progress {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.water-level {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
  transition:
    height 0.45s linear,
    opacity 0.24s ease;
}

.water-level.is-empty {
  opacity: 0;
}

.water-wave {
  position: absolute;
  top: -5px;
  left: -14%;
  width: 128%;
  height: 10px;
  border-radius: 48% 52% 43% 57%;
  background: color-mix(in srgb, var(--c-primary) 13%, var(--ld-bg-card));
  opacity: 0.62;
  transform-origin: center;
  animation: water-wave 8s ease-in-out infinite alternate;
}

.water-wave-back {
  top: -3px;
  left: -20%;
  width: 140%;
  height: 8px;
  background: color-mix(in srgb, var(--c-primary) 15%, transparent);
  opacity: 0.42;
  animation-duration: 10s;
  animation-direction: alternate-reverse;
}

.water-level.active .water-wave-front {
  animation-duration: 3.4s;
}

.water-level.active .water-wave-back {
  animation-duration: 4.6s;
}

.water-level.is-full .water-wave {
  opacity: 0;
}

.cover-button,
.title-button,
.expand-button {
  position: relative;
  z-index: 2;
  display: grid;
  flex: 0 0 auto;
  height: 30px;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.cover-cluster {
  position: relative;
  z-index: 2;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
}

.cover-button {
  width: 28px;
  height: 28px;
  place-items: center;
}

.current-cover {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--c-bg-2);
  color: var(--c-primary);
  place-items: center;
  box-shadow: 0 2px 7px color-mix(in srgb, #000 15%, transparent);
}

.current-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.current-cover > svg {
  font-size: 0.74rem;
}

.cover-play {
  position: absolute;
  z-index: 3;
  top: 5px;
  left: 5px;
  display: grid;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, #111 54%, transparent);
  color: #fff;
  cursor: pointer;
  font-size: 0.52rem;
  place-items: center;
  box-shadow: 0 1px 5px color-mix(in srgb, #000 26%, transparent);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  transform: scale(0.78);
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    background-color 0.18s ease,
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.cover-cluster:hover .cover-play,
.cover-cluster:focus-within .cover-play {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.cover-play:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c-primary) 78%, #111);
  transform: scale(1.08);
}

.cover-play:disabled {
  cursor: default;
  opacity: 0.45;
}

.title-button {
  display: block;
  width: 110px;
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.64rem;
  font-weight: 660;
  line-height: 30px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: width 0.36s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-expanded .title-button {
  width: 76px;
}

.expand-button {
  width: 18px;
  color: var(--c-text-3);
  font-size: 0.62rem;
  place-items: center;
}

.expand-button > svg {
  transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-expanded .expand-button > svg {
  transform: rotate(180deg);
}

.cover-button:focus-visible,
.title-button:focus-visible,
.expand-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 58%, transparent);
  outline-offset: 1px;
}

.capsule-controls {
  position: relative;
  z-index: 2;
  display: flex;
  width: max-content;
  max-width: 0;
  height: 30px;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
  padding: 0;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-7px);
  white-space: nowrap;
  transition:
    max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease,
    visibility 0.2s,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.capsule-controls.is-visible {
  max-width: 66px;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
}

.has-auth .capsule-controls.is-visible {
  max-width: 89px;
}

.control-button,
.icon-button {
  display: grid;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  cursor: pointer;
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.control-button {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  color: var(--c-text-2);
  font-size: 0.77rem;
}

.control-button:hover:not(:disabled),
.control-button.active,
.icon-button:hover {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: translateY(-1px);
}

.control-button:disabled,
.cover-play:disabled {
  cursor: default;
  opacity: 0.36;
}

.favorite-control.active {
  background: color-mix(in srgb, #db6d87 12%, transparent);
  color: #d95f7c;
}

.queue-button {
  margin-left: 1px;
}

.queue-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 9px);
  z-index: 1;
  display: flex;
  width: 100%;
  max-height: min(348px, calc(100dvh - 110px));
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ld-bg-card) 94%, transparent);
  box-shadow:
    0 24px 60px color-mix(in srgb, #000 18%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 68%, transparent) inset;
  backdrop-filter: blur(22px) saturate(1.22);
  -webkit-backdrop-filter: blur(22px) saturate(1.22);
  transform-origin: bottom right;
}

.queue-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 7px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
}

.playlist-tabs {
  display: flex;
  min-width: 0;
  flex: 1;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
}

.playlist-tabs::-webkit-scrollbar {
  display: none;
}

.playlist-tab {
  display: inline-flex;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border: 0;
  border-radius: 14px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.64rem;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.playlist-tab:hover {
  color: var(--c-text);
}

.playlist-tab.active {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-weight: 680;
}

@media (hover: none) {
  .cover-play {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
}

.personal-tab > svg {
  color: #d95f7c;
}

.playlist-count {
  min-width: 16px;
  padding: 1px 4px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  text-align: center;
}

.queue-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 1px;
}

.icon-button {
  width: 27px;
  height: 27px;
  border-radius: 8px;
  color: var(--c-text-3);
  font-size: 0.74rem;
}

.queue-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px 6px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}

.queue-context span:first-child {
  overflow: hidden;
  color: var(--c-text-2);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-body {
  min-height: 80px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 3px 6px 8px;
  scrollbar-color: color-mix(in srgb, var(--c-text-3) 20%, transparent)
    transparent;
  scrollbar-width: thin;
}

.queue-track {
  display: grid;
  width: 100%;
  min-height: 48px;
  grid-template-columns: 24px 36px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 8px;
  padding: 5px 7px 5px 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    background-color 0.18s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.queue-track:hover {
  background: color-mix(in srgb, var(--c-bg-2) 82%, transparent);
}

.queue-track.active {
  background: var(--c-primary-soft);
}

.track-index {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  text-align: center;
}

.queue-track.active .track-index {
  color: var(--c-primary);
}

.track-index > svg {
  font-size: 0.84rem;
  animation: waveform-pulse 1.2s ease-in-out infinite;
}

.track-cover {
  display: grid;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  place-items: center;
}

.track-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-cover > svg {
  font-size: 0.8rem;
}

.track-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.track-copy strong,
.track-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-copy strong {
  color: var(--c-text);
  font-size: 0.7rem;
  font-weight: 640;
}

.track-copy small {
  color: var(--c-text-3);
  font-size: 0.57rem;
}

.track-favorite {
  display: grid;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  color: var(--c-text-3);
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.track-favorite:hover,
.track-favorite.active {
  background: color-mix(in srgb, #db6d87 12%, transparent);
  color: #d95f7c;
  transform: scale(1.05);
}

.queue-empty {
  display: grid;
  min-height: 150px;
  place-content: center;
  justify-items: center;
  gap: 7px;
  color: var(--c-text-3);
  font-size: 0.66rem;
}

.queue-empty > svg {
  color: var(--c-primary);
  font-size: 1.3rem;
  opacity: 0.72;
}

.queue-more {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}

.loading-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid color-mix(in srgb, var(--c-primary) 18%, transparent);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: cover-spin 0.8s linear infinite;
}

.queue-loading {
  position: absolute;
  z-index: 3;
  inset: 49px 0 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  color: var(--c-text-3);
  font-size: 0.63rem;
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
}

.loading-disc {
  display: grid;
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 20%, var(--border));
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  place-items: center;
  animation: cover-spin 1.8s linear infinite;
}

.queue-panel-enter-active,
.queue-panel-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1);
}

.queue-panel-enter-from,
.queue-panel-leave-to {
  opacity: 0;
  transform: translate3d(0, 12px, 0) scale(0.975);
}

.queue-loading-enter-active,
.queue-loading-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.queue-loading-enter-from,
.queue-loading-leave-to {
  opacity: 0;
}

@keyframes cover-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes water-wave {
  0% {
    transform: translate3d(-2%, 0, 0) rotate(-1deg) scaleY(0.88);
  }
  50% {
    transform: translate3d(1.5%, -1px, 0) rotate(1deg) scaleY(1.08);
  }
  100% {
    transform: translate3d(3%, 0, 0) rotate(-0.5deg) scaleY(0.94);
  }
}

@keyframes playing-pulse {
  50% {
    opacity: 0.55;
  }
}

@keyframes waveform-pulse {
  50% {
    transform: scaleY(0.72);
  }
}

@media (max-width: 640px) {
  .music-capsule {
    width: 166px;
    min-width: 166px;
    flex-basis: 166px;
  }

  .music-capsule.is-expanded,
  .music-capsule.has-auth.is-expanded {
    width: 194px;
    min-width: 194px;
    flex-basis: 194px;
  }

  .music-capsule.is-expanded .title-button {
    display: block;
    width: 70px;
  }

  .music-capsule.is-expanded .favorite-control {
    display: none;
  }

  .capsule-controls {
    padding: 0;
  }

  .queue-panel {
    right: 0;
    width: 100%;
    max-height: min(332px, calc(100dvh - 140px));
  }
}

@media (max-width: 390px) {
  .queue-track {
    grid-template-columns: 18px 30px minmax(0, 1fr) 24px;
    gap: 5px;
    padding-inline: 2px;
  }

  .track-cover {
    width: 30px;
    height: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-capsule,
  .capsule-shell,
  .queue-panel-enter-active,
  .queue-panel-leave-active,
  .water-wave,
  .track-index > svg,
  .loading-disc,
  .loading-spinner {
    animation: none !important;
  }
}
</style>
