<template>
  <div class="graph-preview" :class="{ empty: !nodes.length }">
    <svg v-if="nodes.length" viewBox="0 0 900 560" role="img" aria-label="记忆关系二维预览">
      <g class="links">
        <line
          v-for="link in visibleRelations"
          :key="link.id"
          :x1="position(link.sourceId).x"
          :y1="position(link.sourceId).y"
          :x2="position(link.targetId).x"
          :y2="position(link.targetId).y"
          :class="[`link-${link.type}`, { muted: selectedId && !touches(link, selectedId) }]"
          :style="{ opacity: Math.max(.18, Number(link.weight) || .5) }"
        >
          <title>{{ relationText(link.type) }}</title>
        </line>
      </g>
      <g
        v-for="node in nodes"
        :key="node.id"
        class="node"
        :class="[`node-${node.type}`, { selected: node.id === selectedId, muted: selectedId && node.id !== selectedId && !neighborIds.has(node.id) }]"
        :transform="`translate(${position(node.id).x} ${position(node.id).y})`"
        tabindex="0"
        role="button"
        @click="$emit('select', node)"
        @keydown.enter="$emit('select', node)"
      >
        <circle :r="node.id === selectedId ? 11 : 8" />
        <text v-if="node.id === selectedId || nodes.length <= 36" x="12" y="4">{{ shortTitle(node.title) }}</text>
        <title>{{ typeText(node.type) }} · {{ node.title }}</title>
      </g>
    </svg>
    <div v-else class="empty-copy"><Icon name="ph:graph-bold" /><span>重建图谱后在这里检查关系</span></div>
  </div>
</template>

<script setup lang="ts">
type NodeItem = { id: string; type: string; title: string; coordinateSeed?: number }
type RelationItem = { id: string; sourceId: string; targetId: string; type: string; weight?: number }

const props = defineProps<{ nodes: NodeItem[]; relations: RelationItem[]; selectedId?: string }>()
defineEmits<{ select: [node: NodeItem] }>()

const positions = computed(() => {
  const result = new Map<string, { x: number; y: number }>()
  const typeBands: Record<string, number> = { memory: 180, journey: 130, place: 105, album: 170, moment: 205, post: 225, library: 240, photo: 255 }
  for (const node of props.nodes) {
    const seed = Number(node.coordinateSeed) || hash(node.id)
    const angle = ((seed % 100000) / 100000) * Math.PI * 2
    const jitter = ((seed >>> 8) % 31) - 15
    const radius = (typeBands[node.type] || 215) + jitter
    result.set(node.id, { x: 450 + Math.cos(angle) * radius, y: 280 + Math.sin(angle) * radius * .9 })
  }
  return result
})

const visibleRelations = computed(() => props.relations.filter(link => positions.value.has(link.sourceId) && positions.value.has(link.targetId)))
const neighborIds = computed(() => {
  const ids = new Set<string>()
  if (!props.selectedId) return ids
  for (const link of visibleRelations.value) {
    if (link.sourceId === props.selectedId) ids.add(link.targetId)
    if (link.targetId === props.selectedId) ids.add(link.sourceId)
  }
  return ids
})

function position(id: string) { return positions.value.get(id) || { x: 450, y: 280 } }
function touches(link: RelationItem, id: string) { return link.sourceId === id || link.targetId === id }
function shortTitle(value: string) { return value.length > 10 ? `${value.slice(0, 9)}…` : value }
function hash(value: string) { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return result >>> 0 }
function typeText(type: string) { return ({ memory: '时光记忆', post: '文章', moment: '瞬间', album: '相册', photo: '照片', place: '地点', library: '书影', journey: '旅行' } as Record<string, string>)[type] || type }
function relationText(type: string) { return ({ same_place: '同一地点', same_album: '同一相册', same_tag: '共同标签', time_adjacent: '时间相邻', reference: '内容引用', same_journey: '同一旅行', journey_sequence: '旅行轨迹', contains: '包含内容' } as Record<string, string>)[type] || type }
</script>

<style scoped>
.graph-preview { min-height:360px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:color-mix(in srgb,var(--c-bg) 90%,#17213a); }
svg { display:block; width:100%; min-height:360px; }
.links line { stroke:color-mix(in srgb,var(--c-text-3) 45%,transparent); stroke-width:1.2; transition:opacity .2s; }
.links .link-same-place { stroke:#3aa780; }.links .link-same-album { stroke:#d99a35; }.links .link-reference { stroke:#d76072; }
.node { cursor:pointer; outline:none; transition:opacity .2s; }.node circle { fill:#7893b8; stroke:var(--ld-bg-card); stroke-width:2.5; transition:r .2s; }
.node text { fill:var(--c-text-2); font-size:11px; paint-order:stroke; stroke:var(--c-bg); stroke-width:3px; stroke-linejoin:round; }
.node-memory circle{fill:#58a8e8}.node-place circle{fill:#36a27d}.node-moment circle{fill:#df6b79}.node-album circle{fill:#d99a35}.node-photo circle{fill:#b77bc5}.node-post circle{fill:#4f83cc}.node-library circle{fill:#8a78c7}.node-journey circle{fill:#df7847}
.node.selected circle { stroke:var(--c-text); stroke-width:3; }.muted { opacity:.1!important; }
.empty-copy { min-height:360px; display:grid; align-content:center; justify-items:center; gap:10px; color:var(--c-text-3); }.empty-copy svg{font-size:2rem}
@media(max-width:700px){.graph-preview,svg{min-height:280px}}
</style>
