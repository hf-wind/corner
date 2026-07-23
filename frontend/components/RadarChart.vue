<template>
  <div class="radar-card">
    <div class="radar-header">
      <span class="radar-title"><Icon name="ph:chart-bar-bold" /> 数据总览</span>
      <div class="radar-tabs">
        <button :class="{ active: mode === 'overview' }" @click="mode = 'overview'">总览</button>
        <button :class="{ active: mode === 'recent' }" @click="mode = 'recent'">近期</button>
      </div>
    </div>

    <div v-if="mode === 'overview'" class="radar-body" @mouseleave="hovered = null">
      <svg class="radar-svg" viewBox="0 0 240 240">
        <g transform="translate(120,120)">
          <polygon :points="ring(1)" class="radar-grid" fill="none" />
          <polygon :points="ring(0.75)" class="radar-grid" fill="none" />
          <polygon :points="ring(0.5)" class="radar-grid" fill="none" />
          <polygon :points="ring(0.25)" class="radar-grid" fill="none" />
          <line v-for="(g,i) in gridLines" :key="i" x1="0" y1="0" :x2="g.x2" :y2="g.y2" class="radar-line" />
          <polygon :points="fillPoints" class="radar-fill" />
          <g v-for="(d,i) in overviewData" :key="i">
            <circle :cx="d.x" :cy="d.y" r="4" class="radar-dot" @mouseenter="showPopup($event, i)" />
            <circle :cx="d.x" :cy="d.y" r="10" class="radar-dot-hit" @mouseenter="showPopup($event, i)" />
          </g>
          <text v-for="(l,i) in labels" :key="i"
            :x="labelPositions[i].x" :y="labelPositions[i].y"
            class="radar-label" text-anchor="middle" dominant-baseline="middle">{{ l }}</text>
        </g>
      </svg>
      <div v-if="tooltip.visible" class="radar-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
        <div class="tt-label">{{ labels[tooltip.index] }}</div>
        <div class="tt-value">{{ overviewData[tooltip.index].val }}%</div>
        <div class="tt-sub">排名第 {{ tooltip.index + 1 }}</div>
      </div>
    </div>

    <div v-if="mode === 'recent'" class="recent-body">
      <div class="bar-chart">
        <div v-for="(item,i) in recentBars" :key="i" class="bar-row" @mouseenter="barHover=i" @mouseleave="barHover=null">
          <span class="bar-label">{{ item.name }}</span>
          <div class="bar-track-bg">
            <div class="bar-fill" :style="{ width: item.pct + '%' }" :class="{ hovered: barHover === i }"></div>
          </div>
          <span class="bar-num">{{ item.count }}</span>
          <div v-if="barHover === i" class="bar-tip" :style="{ right: -16 + 'px' }">
            {{ item.name }} 近30天更新 {{ item.count }} 篇
          </div>
        </div>
      </div>
      <div class="bar-subtitle">近30天各维度更新频率</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const mode = ref('overview')
const hovered = ref<number | null>(null)
const barHover = ref<number | null>(null)
const tooltip = reactive({ visible: false, x: -999, y: -999, index: 0 })

const r = 90
const labelR = 112
const R3 = 3

const labels = ['文章', '评论', '分类', '标签', '浏览', '点赞']
const rawValues = ref([0, 0, 0, 0, 0, 0])
const recentBars = ref([
  { name: '文章', count: 0, pct: 0 },
  { name: '评论', count: 0, pct: 0 },
  { name: '分类', count: 0, pct: 0 },
  { name: '标签', count: 0, pct: 0 },
  { name: '浏览', count: 0, pct: 0 },
  { name: '点赞', count: 0, pct: 0 },
])

async function loadStats() {
  try {
    const d = await api.get<any>('/stats/radar')
    const maxVal = Math.max(d.posts, d.comments, d.categories, d.tags, d.views, d.likes, 1)
    rawValues.value = [
      Math.round((d.posts / maxVal) * 100),
      Math.round((d.comments / maxVal) * 100),
      Math.round((d.categories / maxVal) * 100),
      Math.round((d.tags / maxVal) * 100),
      Math.round((d.views / maxVal) * 100),
      Math.round((d.likes / maxVal) * 100),
    ]
    recentBars.value = [
      { name: '文章', count: d.posts, pct: Math.round((d.posts / maxVal) * 100) },
      { name: '评论', count: d.comments, pct: Math.round((d.comments / maxVal) * 100) },
      { name: '分类', count: d.categories, pct: Math.round((d.categories / maxVal) * 100) },
      { name: '标签', count: d.tags, pct: Math.round((d.tags / maxVal) * 100) },
      { name: '浏览', count: d.views, pct: Math.round((d.views / maxVal) * 100) },
      { name: '点赞', count: d.likes, pct: Math.round((d.likes / maxVal) * 100) },
    ]
  } catch { /* keep zeros */ }
}

onMounted(loadStats)

function a(i: number) { return (i * 60 - 60) * Math.PI / 180 }
function n(v: number) { return +v.toFixed(R3) }

const overviewData = computed(() =>
  rawValues.value.map((v, i) => ({
    val: v,
    x: n(r * (v / 100) * Math.cos(a(i + 1))),
    y: n(r * (v / 100) * Math.sin(a(i + 1)))
  }))
)

const fillPoints = computed(() =>
  overviewData.value.map(d => `${d.x},${d.y}`).join(' ')
)

const gridLines = computed(() =>
  Array.from({ length: 6 }, (_, i) => ({
    x2: n(r * Math.cos(a(i + 1))),
    y2: n(r * Math.sin(a(i + 1)))
  }))
)

const labelPositions = computed(() =>
  labels.map((l, i) => ({
    x: n(labelR * Math.cos(a(i))),
    y: n(labelR * Math.sin(a(i)))
  }))
)

function ring(scale: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const x = n(r * scale * Math.cos(a(i + 1)))
    const y = n(r * scale * Math.sin(a(i + 1)))
    return `${x},${y}`
  }).join(' ')
}

function showPopup(ev: MouseEvent, i: number) {
  const rect = (ev.target as HTMLElement).closest('.radar-card')!.getBoundingClientRect()
  tooltip.visible = true
  tooltip.x = ev.clientX - rect.left + 12
  tooltip.y = ev.clientY - rect.top - 10
  tooltip.index = i
}
</script>

<style scoped>
.radar-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 4px var(--ld-shadow);
  transition: all 0.2s;
  position: relative;
}
.radar-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5em 1em var(--ld-shadow);
}
.radar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.radar-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--c-text-2);
  letter-spacing: 0.05em;
}
.radar-tabs {
  display: flex;
  gap: 2px;
  background: var(--c-bg-2);
  border-radius: 0.5rem;
  padding: 2px;
}
.radar-tabs button {
  padding: 2px 7px;
  border: none;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.15s;
}
.radar-tabs button.active {
  background: var(--ld-bg-card);
  color: var(--c-text);
  box-shadow: 0.05em 0.1em 0.3em var(--ld-shadow);
}
.radar-body {
  position: relative;
}
.radar-svg {
  width: 100%;
  height: auto;
  display: block;
}
.radar-grid {
  stroke: var(--border);
  stroke-width: 1;
}
.radar-line {
  stroke: var(--border);
  stroke-width: 0.5;
}
.radar-fill {
  fill: var(--c-primary-soft);
  stroke: var(--c-primary);
  stroke-width: 1.5;
  transition: all 0.4s;
}
.radar-dot {
  fill: var(--c-primary);
  cursor: pointer;
  transition: r 0.15s;
}
.radar-dot-hit {
  fill: transparent;
  cursor: pointer;
}
.radar-label {
  fill: var(--c-text-2);
  font-size: 8px;
  font-family: var(--font-body);
}
.radar-tooltip {
  position: absolute;
  background: var(--ld-bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 8px;
  box-shadow: 0 4px 12px var(--ld-shadow);
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
}
.tt-label {
  font-size: 0.6rem;
  color: var(--c-text-2);
}
.tt-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-primary);
}
.tt-sub {
  font-size: 0.55rem;
  color: var(--c-text-3);
}

.recent-body {
  padding: 2px 0;
}
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.bar-label {
  width: 28px;
  font-size: 0.6rem;
  color: var(--c-text-2);
  flex-shrink: 0;
  text-align: right;
}
.bar-track-bg {
  flex: 1;
  height: 8px;
  background: var(--c-bg-2);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 75%, #fff));
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.bar-fill.hovered {
  background: linear-gradient(90deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 85%, #fff));
}
.bar-num {
  width: 14px;
  font-size: 0.6rem;
  color: var(--c-text-2);
  text-align: right;
  flex-shrink: 0;
}
.bar-tip {
  position: absolute;
  top: -18px;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.55rem;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 3;
  pointer-events: none;
}
.bar-subtitle {
  margin-top: 6px;
  font-size: 0.55rem;
  color: var(--c-text-3);
  text-align: center;
}
</style>
