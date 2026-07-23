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
        'is-bar': barOpen,
        'is-list': listOpen,
        'is-playing': playing,
        'is-ready': ready,
      }"
    >
      <Transition name="smp-list">
        <div v-if="listOpen" class="smp-list" role="listbox" aria-label="播放列表">
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
            </div>
            <button type="button" class="smp-icon-btn" title="关闭" @click="listOpen = false">
              <Icon name="ph:caret-down-bold" />
            </button>
          </div>
          <div class="smp-list-body">
            <button
              v-for="(t, i) in tracks"
              :key="`${t.url}-${i}`"
              type="button"
              class="smp-track"
              :class="{ active: i === index }"
              @click="playAt(i)"
            >
              <span class="smp-track-idx">{{ i + 1 }}</span>
              <span class="smp-track-meta">
                <span class="smp-track-name">{{ t.name }}</span>
                <span class="smp-track-artist">{{ t.artist }}</span>
              </span>
              <Icon v-if="i === index && playing" name="ph:waveform-bold" class="smp-track-wave" />
            </button>
            <div v-if="!tracks.length" class="smp-empty">{{ loading ? '加载中…' : '暂无歌曲' }}</div>
          </div>
        </div>
      </Transition>

      <div class="smp-shell">
        <button
          type="button"
          class="smp-cover-btn"
          :title="listOpen ? '收起歌单' : '展开歌单'"
          @click="toggleList"
        >
          <span class="smp-cover" :style="coverStyle">
            <Icon v-if="!current?.pic" name="ph:music-notes-fill" class="smp-cover-fallback" />
          </span>
          <span v-if="playing" class="smp-eq" aria-hidden="true">
            <i /><i /><i />
          </span>
        </button>

        <div class="smp-bar">
          <div class="smp-info" @click="toggleList">
            <div class="smp-title" :title="current?.name">{{ current?.name || '未选择歌曲' }}</div>
            <div class="smp-artist">{{ current?.artist || '—' }}</div>
          </div>

          <div class="smp-controls">
            <button type="button" class="smp-icon-btn" :title="modeTitle" @click="cycleMode">
              <Icon :name="modeIcon" />
            </button>
            <button type="button" class="smp-icon-btn" title="上一首" @click="prev">
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
            <button type="button" class="smp-icon-btn" title="下一首" @click="next">
              <Icon name="ph:skip-forward-fill" />
            </button>
            <button type="button" class="smp-icon-btn" title="静音" @click="toggleMute">
              <Icon :name="muted || volume <= 0 ? 'ph:speaker-slash-fill' : 'ph:speaker-high-fill'" />
            </button>
            <button type="button" class="smp-icon-btn" title="收起" @click="collapseBar">
              <Icon name="ph:caret-left-bold" />
            </button>
          </div>

          <div class="smp-progress" @click="seek">
            <div class="smp-progress-fill" :style="{ width: `${progress}%` }" />
          </div>
        </div>

        <button
          v-show="!barOpen"
          type="button"
          class="smp-mini-play"
          :title="playing ? '暂停 · 展开' : '播放 · 展开'"
          @click="onMiniPlay"
        >
          <Icon :name="playing ? 'ph:pause-fill' : 'ph:play-fill'" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
type Track = { name: string; artist: string; url: string; pic: string; lrc?: string }
type PlaylistMeta = { index: number; name: string; server: string; type: string; id: string }
type PlayMode = 'order' | 'loop' | 'shuffle'

const api = useApi()
const rootRef = ref<HTMLElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const { setPlaying } = useMusicPlayerState()
const { slotEl } = useMusicPlayerSlot()
const slotKey = ref(0)

const enabled = ref(false)
const ready = ref(false)
const loading = ref(false)
const autoplay = ref(false)
const volume = ref(0.55)
const muted = ref(false)
const playing = ref(false)

watch(playing, (v) => setPlaying(v), { immediate: true })
watch(slotEl, (el) => {
  if (el) slotKey.value += 1
})
const barOpen = ref(false)
const listOpen = ref(false)
const tracks = ref<Track[]>([])
const playlists = ref<PlaylistMeta[]>([])
const playlistIndex = ref(0)
const index = ref(0)
const progress = ref(0)
const duration = ref(0)
const mode = ref<PlayMode>('order')
const userInteracted = ref(false)

const current = computed(() => tracks.value[index.value] || null)
const coverStyle = computed(() => {
  if (!current.value?.pic) return {}
  return {
    backgroundImage: `url(${current.value.pic})`,
  }
})
const modeIcon = computed(() => {
  if (mode.value === 'loop') return 'ph:repeat-once-bold'
  if (mode.value === 'shuffle') return 'ph:shuffle-bold'
  return 'ph:repeat-bold'
})
const modeTitle = computed(() => {
  if (mode.value === 'loop') return '单曲循环'
  if (mode.value === 'shuffle') return '随机播放'
  return '列表循环'
})

let autoCollapseTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  await bootstrap()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  if (autoCollapseTimer) clearTimeout(autoCollapseTimer)
  setPlaying(false)
  const a = audioRef.value
  if (a) {
    a.pause()
    a.src = ''
  }
})

function onDocClick(e: MouseEvent) {
  if (!rootRef.value) return
  if (rootRef.value.contains(e.target as Node)) return
  listOpen.value = false
}

async function bootstrap() {
  try {
    const cfg = await api.get<{
      enabled: boolean
      autoplay: boolean
      volume: number
      playlists: PlaylistMeta[]
    }>('/music/config')
    enabled.value = !!cfg?.enabled
    if (!enabled.value) return
    autoplay.value = !!cfg.autoplay
    volume.value = typeof cfg.volume === 'number' ? Math.min(1, Math.max(0, cfg.volume)) : 0.55
    playlists.value = Array.isArray(cfg.playlists) ? cfg.playlists : []
    await loadPlaylist(0, false)
    applyVolume()
    ready.value = true
    if (autoplay.value) {
      // browsers block autoplay with sound; try muted-first then unmute after play
      await tryAutoplay()
    }
  } catch {
    enabled.value = false
  }
}

async function loadPlaylist(i: number, refresh = false) {
  loading.value = true
  try {
    const res = await api.get<{
      enabled: boolean
      tracks: Track[]
      source?: { name: string }
    }>('/music/playlist', {
      index: i,
      refresh: refresh ? '1' : undefined,
    })
    if (!res?.enabled) {
      enabled.value = false
      return
    }
    playlistIndex.value = i
    tracks.value = res.tracks || []
    index.value = 0
    progress.value = 0
    await nextTick()
    const a = audioRef.value
    if (a) {
      a.load()
      if (playing.value) await a.play().catch(() => { playing.value = false })
    }
  } catch {
    tracks.value = []
  } finally {
    loading.value = false
  }
}

async function switchPlaylist(i: number) {
  if (i === playlistIndex.value) return
  const wasPlaying = playing.value
  playing.value = wasPlaying
  await loadPlaylist(i)
  if (wasPlaying) await play()
}

function applyVolume() {
  const a = audioRef.value
  if (!a) return
  a.volume = muted.value ? 0 : volume.value
}

async function tryAutoplay() {
  const a = audioRef.value
  if (!a || !current.value) return
  try {
    a.muted = true
    await a.play()
    playing.value = true
    barOpen.value = true
    scheduleBarCollapse()
    // keep muted unless user interacts — policy
    a.muted = false
    muted.value = false
    applyVolume()
  } catch {
    playing.value = false
    a.muted = false
  }
}

function onMiniPlay() {
  userInteracted.value = true
  barOpen.value = true
  togglePlay()
  scheduleBarCollapse()
}

function togglePlay() {
  userInteracted.value = true
  if (!current.value) return
  if (!barOpen.value) barOpen.value = true
  if (playing.value) pause()
  else play()
  scheduleBarCollapse()
}

async function play() {
  const a = audioRef.value
  if (!a || !current.value) return
  try {
    await a.play()
    playing.value = true
  } catch {
    playing.value = false
  }
}

function pause() {
  audioRef.value?.pause()
  playing.value = false
}

function prev() {
  if (!tracks.value.length) return
  if (mode.value === 'shuffle') {
    index.value = Math.floor(Math.random() * tracks.value.length)
  } else {
    index.value = (index.value - 1 + tracks.value.length) % tracks.value.length
  }
  reloadAndPlay()
}

function next() {
  if (!tracks.value.length) return
  if (mode.value === 'shuffle') {
    let n = index.value
    if (tracks.value.length > 1) {
      while (n === index.value) n = Math.floor(Math.random() * tracks.value.length)
    }
    index.value = n
  } else {
    index.value = (index.value + 1) % tracks.value.length
  }
  reloadAndPlay()
}

function playAt(i: number) {
  index.value = i
  barOpen.value = true
  reloadAndPlay()
}

async function reloadAndPlay() {
  progress.value = 0
  await nextTick()
  const a = audioRef.value
  if (!a) return
  a.load()
  await play()
}

function onEnded() {
  if (mode.value === 'loop') {
    const a = audioRef.value
    if (a) {
      a.currentTime = 0
      play()
    }
    return
  }
  next()
}

function onTime() {
  const a = audioRef.value
  if (!a || !a.duration) return
  duration.value = a.duration
  progress.value = (a.currentTime / a.duration) * 100
}

function onMeta() {
  duration.value = audioRef.value?.duration || 0
}

function onAudioError() {
  // skip broken track
  if (tracks.value.length > 1) next()
  else playing.value = false
}

function seek(e: MouseEvent) {
  const a = audioRef.value
  const el = e.currentTarget as HTMLElement
  if (!a || !a.duration || !el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  a.currentTime = ratio * a.duration
  progress.value = ratio * 100
}

function cycleMode() {
  mode.value = mode.value === 'order' ? 'loop' : mode.value === 'loop' ? 'shuffle' : 'order'
}

function toggleMute() {
  muted.value = !muted.value
  applyVolume()
}

function toggleList() {
  listOpen.value = !listOpen.value
  if (listOpen.value) barOpen.value = true
}

function collapseBar() {
  listOpen.value = false
  barOpen.value = false
}

function scheduleBarCollapse() {
  if (autoCollapseTimer) clearTimeout(autoCollapseTimer)
  autoCollapseTimer = setTimeout(() => {
    if (!listOpen.value) barOpen.value = false
  }, 10000)
}

watch(volume, applyVolume)
watch(muted, applyVolume)
watch(listOpen, (v) => {
  if (v) barOpen.value = true
})
</script>

<style scoped>
.smp {
  --smp-h: 44px;
  --smp-r: 14px;
  --smp-expand-w: min(318px, calc(100vw - 28px));
  position: relative;
  z-index: 40;
  width: var(--smp-h);
  height: var(--smp-h);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: none;
}

.smp.is-bar,
.smp.is-list {
  width: var(--smp-expand-w);
}

.smp > * {
  pointer-events: auto;
}

.smp-shell {
  position: relative;
  display: flex;
  align-items: center;
  height: var(--smp-h);
  border-radius: var(--smp-r);
  background: color-mix(in srgb, var(--ld-bg-card) 94%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, #000 10%, var(--ld-shadow));
  backdrop-filter: blur(12px);
  overflow: hidden;
  transition:
    width 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease,
    border-color 0.2s ease;
  width: var(--smp-h);
  z-index: 2;
}

.smp.is-bar .smp-shell,
.smp.is-list .smp-shell {
  width: var(--smp-expand-w);
  box-shadow: 0 12px 32px color-mix(in srgb, #000 14%, var(--ld-shadow));
}

.smp-cover-btn {
  position: relative;
  width: var(--smp-h);
  height: var(--smp-h);
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.smp-cover {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background:
    center / cover no-repeat,
    linear-gradient(135deg, var(--c-primary-soft), var(--c-bg-2));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #fff 12%, transparent);
  transition: transform 0.35s ease;
}

.smp.is-playing .smp-cover {
  animation: smp-spin 12s linear infinite;
  border-radius: 50%;
}

.smp-cover-fallback {
  color: var(--c-primary);
  font-size: 1rem;
}

.smp-eq {
  position: absolute;
  right: 4px;
  bottom: 5px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 10px;
  padding: 2px 3px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ld-bg-card) 80%, transparent);
}

.smp-eq i {
  display: block;
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: var(--c-primary);
  animation: smp-eq 0.9s ease-in-out infinite;
  transform-origin: bottom;
}

.smp-eq i:nth-child(2) { animation-delay: 0.15s; height: 70%; }
.smp-eq i:nth-child(3) { animation-delay: 0.3s; height: 90%; }

.smp-mini-play {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.62rem;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-primary) 40%, transparent);
  transition: transform 0.15s ease, opacity 0.2s ease;
}

.smp-mini-play:hover {
  transform: scale(1.08);
}

.smp.is-bar .smp-mini-play,
.smp.is-list .smp-mini-play {
  opacity: 0;
  pointer-events: none;
}

.smp-bar {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: 1fr auto;
  align-items: center;
  column-gap: 4px;
  padding: 4px 8px 4px 0;
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition:
    opacity 0.22s ease 0.05s,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.smp.is-bar .smp-bar,
.smp.is-list .smp-bar {
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
  gap: 0;
  justify-content: flex-end;
}

.smp-icon-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--c-text-2);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.85rem;
  transition: color 0.15s, background 0.15s;
}

.smp-icon-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.smp-play {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 35%, transparent);
  transition: transform 0.15s ease, opacity 0.15s;
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
  background: linear-gradient(90deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 60%, #fff));
  transition: width 0.1s linear;
}

.smp-list {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: var(--smp-expand-w);
  max-height: 240px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  box-shadow: 0 16px 40px color-mix(in srgb, #000 16%, var(--ld-shadow));
  backdrop-filter: blur(14px);
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

.smp-list-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.smp-list-tabs::-webkit-scrollbar { display: none; }

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

.smp-empty {
  padding: 20px 8px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--c-text-3);
}

.smp-list-enter-active,
.smp-list-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.smp-list-enter-from,
.smp-list-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

@keyframes smp-spin {
  to { transform: rotate(360deg); }
}

@keyframes smp-eq {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .smp.is-playing .smp-cover,
  .smp-eq i {
    animation: none !important;
  }
  .smp-shell,
  .smp-bar,
  .smp-list-enter-active,
  .smp-list-leave-active {
    transition: none !important;
  }
}
</style>
