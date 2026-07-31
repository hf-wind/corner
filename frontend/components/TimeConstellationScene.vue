<template>
  <div class="constellation-scene" :class="{ 'is-ready': ready }">
    <div ref="host" class="scene-host" />
    <div v-if="!ready && !failed" class="scene-loading" aria-live="polite">
      <Icon name="ph:circle-notch-bold" />
      <span>正在点亮星图</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForceGraph3DInstance, LinkObject, NodeObject } from '3d-force-graph'
import type { Material, Object3D, Texture } from 'three'

type MemoryNode = {
  id: string
  type: string
  title: string
  excerpt?: string | null
  href?: string
  image?: string | null
  coordinateSeed?: number
}

type MemoryRelation = {
  id: string
  sourceId: string
  targetId: string
  type: string
  weight?: number
}

type SceneNode = NodeObject & MemoryNode
type SceneLink = LinkObject<SceneNode> & MemoryRelation
type SceneGraph = ForceGraph3DInstance<SceneNode, SceneLink>

const props = withDefaults(defineProps<{
  nodes: MemoryNode[]
  relations: MemoryRelation[]
  graphVersion: string
  selectedId?: string
  routeNodeIds?: string[]
  resolveImage?: (source: string) => string
}>(), {
  selectedId: '',
  routeNodeIds: () => [],
  resolveImage: (source: string) => source,
})

const emit = defineEmits<{
  select: [node: MemoryNode]
  clear: []
  ready: []
  fallback: [reason: 'webgl' | 'reduced-motion' | 'initialization']
}>()

const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)
let graph: SceneGraph | null = null
let three: typeof import('three') | null = null
let resizeObserver: ResizeObserver | null = null
let disposed = false
let lowQuality = false
const customObjects = new Map<string, Object3D>()
const customMaterials = new Set<Material>()
const customTextures = new Set<Texture>()
const inputNodes = new Map<string, MemoryNode>()

const nodeColors: Record<string, number> = {
  post: 0x4f8bd6,
  moment: 0xe36b78,
  album: 0xe0a23a,
  photo: 0xbc7acb,
  place: 0x39ad82,
  library: 0x8c78cf,
  journey: 0xe47b48,
}

const relationColors: Record<string, string> = {
  same_place: '#49b892',
  same_album: '#e2aa48',
  same_tag: '#7997c5',
  time_adjacent: '#759089',
  reference: '#df7180',
  same_journey: '#e58455',
  story_sequence: '#efd06f',
  same_theme: '#9f87d6',
  custom: '#d6deda',
  story_route: '#ffd66f',
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function detectLowQuality() {
  const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8)
  return window.innerWidth < 720 || navigator.hardwareConcurrency <= 4 || memory <= 4
}

function seededPosition(node: MemoryNode) {
  let seed = (Number(node.coordinateSeed) || hash(node.id)) >>> 0
  const random = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  const band: Record<string, number> = { place: 72, journey: 88, album: 105, moment: 122, post: 138, library: 150, photo: 164 }
  const radius = (band[node.type] || 130) + (random() - 0.5) * 20
  const theta = random() * Math.PI * 2
  const phi = Math.acos(2 * random() - 1)
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi) * 0.82,
    z: radius * Math.sin(phi) * Math.sin(theta),
  }
}

function hash(value: string) {
  let result = 2166136261
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619)
  return result >>> 0
}

function layoutKey() {
  const version = props.graphVersion || String(hash(props.nodes.map(node => node.id).sort().join('|')))
  const route = props.routeNodeIds.length ? `:route-${hash(props.routeNodeIds.join('|'))}` : ''
  return `corner:constellation-layout:${version}${route}`
}

function readLayout() {
  try {
    const parsed = JSON.parse(localStorage.getItem(layoutKey()) || '{}') as Record<string, { x: number; y: number; z: number }>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveLayout() {
  if (!graph) return
  try {
    const cached = readLayout()
    for (const node of graph.graphData().nodes) {
      if ([node.x, node.y, node.z].every(Number.isFinite)) cached[node.id] = { x: node.x!, y: node.y!, z: node.z! }
    }
    localStorage.setItem(layoutKey(), JSON.stringify(cached))
  } catch {
    // Layout persistence is optional when storage is unavailable.
  }
}

function sceneData() {
  const cached = readLayout()
  let fullyCached = props.nodes.length > 0
  inputNodes.clear()
  const nodes: SceneNode[] = props.nodes.map((node) => {
    inputNodes.set(node.id, node)
    const saved = cached[node.id]
    if (!saved || ![saved.x, saved.y, saved.z].every(Number.isFinite)) fullyCached = false
    const position = saved || seededPosition(node)
    return {
      ...node,
      ...position,
      ...(saved ? { fx: position.x, fy: position.y, fz: position.z } : {}),
    }
  })
  const nodeIds = new Set(nodes.map(node => node.id))
  const links: SceneLink[] = props.relations
    .filter(link => nodeIds.has(link.sourceId) && nodeIds.has(link.targetId))
    .map(link => ({ ...link, source: link.sourceId, target: link.targetId }))
  for (let index = 1; index < props.routeNodeIds.length; index += 1) {
    const sourceId = props.routeNodeIds[index - 1]
    const targetId = props.routeNodeIds[index]
    if (!sourceId || !targetId || sourceId === targetId || !nodeIds.has(sourceId) || !nodeIds.has(targetId)) continue
    links.push({ id: `story-route:${index}:${sourceId}:${targetId}`, sourceId, targetId, source: sourceId, target: targetId, type: 'story_route', weight: 1 })
  }
  return { nodes, links, fullyCached }
}

function geometryFor(type: string) {
  if (!three) throw new Error('Three.js is not ready')
  if (type === 'post') return new three.OctahedronGeometry(4.7, 0)
  if (type === 'album') return new three.BoxGeometry(7.5, 5.5, 2.4)
  if (type === 'photo') return new three.BoxGeometry(6.4, 6.4, 1.4)
  if (type === 'place') return new three.ConeGeometry(4.2, 8, 8)
  if (type === 'library') return new three.TorusGeometry(4.2, 1.5, 8, 20)
  if (type === 'journey') return new three.IcosahedronGeometry(5.2, 0)
  return new three.SphereGeometry(4.5, lowQuality ? 10 : 16, lowQuality ? 8 : 12)
}

function createNodeObject(node: SceneNode) {
  if (!three) throw new Error('Three.js is not ready')
  const group = new three.Group()
  const color = nodeColors[node.type] || 0x8ba39c
  const material = new three.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.16,
    metalness: 0.12,
    roughness: 0.56,
    transparent: true,
  })
  customMaterials.add(material)
  const mesh = new three.Mesh(geometryFor(node.type), material)
  mesh.userData.primaryMaterial = material
  group.add(mesh)

  const selectedRingMaterial = new three.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  customMaterials.add(selectedRingMaterial)
  const selectedRing = new three.Mesh(new three.TorusGeometry(7.2, 0.42, 8, 32), selectedRingMaterial)
  selectedRing.visible = false
  group.add(selectedRing)

  const routeRingMaterial = new three.MeshBasicMaterial({ color: 0xffd66f, transparent: true, opacity: 0.82 })
  customMaterials.add(routeRingMaterial)
  const routeRing = new three.Mesh(new three.TorusGeometry(6.1, 0.25, 6, 24), routeRingMaterial)
  routeRing.rotation.x = Math.PI / 2
  routeRing.visible = false
  group.add(routeRing)
  group.userData = { primaryMaterial: material, selectedRing, routeRing }
  customObjects.set(node.id, group)

  if (node.image && !lowQuality) loadNodeTexture(node, group)
  return group
}

function loadNodeTexture(node: SceneNode, group: Object3D) {
  if (!three || !node.image) return
  const loader = new three.TextureLoader()
  loader.setCrossOrigin('anonymous')
  loader.load(props.resolveImage(node.image), (texture) => {
    if (disposed || !three || !customObjects.has(node.id)) {
      texture.dispose()
      return
    }
    texture.colorSpace = three.SRGBColorSpace
    customTextures.add(texture)
    const material = new three.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    customMaterials.add(material)
    const sprite = new three.Sprite(material)
    const image = texture.image as { width?: number; height?: number }
    const aspect = Math.max(0.55, Math.min(1.8, Number(image.width || 1) / Number(image.height || 1)))
    sprite.scale.set(12 * aspect, 12, 1)
    sprite.position.z = 5.2
    sprite.userData.imageMaterial = material
    group.add(sprite)
    refreshNodeAppearance()
  }, undefined, () => undefined)
}

function endpointId(value: string | SceneNode) {
  return typeof value === 'string' ? value : value?.id
}

function touches(link: SceneLink, id: string) {
  return endpointId(link.source as string | SceneNode) === id || endpointId(link.target as string | SceneNode) === id
}

function isRouteLink(link: SceneLink) {
  return link.type === 'story_route'
}

function linkColor(link: SceneLink) {
  if (props.selectedId && !touches(link, props.selectedId) && !isRouteLink(link)) return '#27363a'
  return relationColors[link.type] || '#8fa29c'
}

function refreshNodeAppearance() {
  const selected = props.selectedId
  const neighbors = new Set<string>()
  if (selected && graph) {
    for (const link of graph.graphData().links) {
      if (!touches(link, selected)) continue
      neighbors.add(endpointId(link.source as string | SceneNode))
      neighbors.add(endpointId(link.target as string | SceneNode))
    }
  }
  const routeIds = new Set(props.routeNodeIds)
  for (const [id, object] of customObjects) {
    const active = !selected || id === selected || neighbors.has(id) || routeIds.has(id)
    object.scale.setScalar(id === selected ? 1.34 : 1)
    object.traverse((child) => {
      const candidate = child as Object3D & { material?: Material & { opacity?: number; emissiveIntensity?: number } }
      if (!candidate.material) return
      candidate.material.opacity = active ? 1 : 0.14
      if ('emissiveIntensity' in candidate.material) candidate.material.emissiveIntensity = id === selected ? 0.75 : 0.16
    })
    object.userData.selectedRing.visible = id === selected
    object.userData.routeRing.visible = routeIds.has(id)
  }
  if (graph) {
    graph
      .linkColor(linkColor)
      .linkWidth(link => isRouteLink(link) ? 0.85 : props.selectedId && touches(link, props.selectedId) ? 0.68 : 0.28)
      .linkDirectionalParticles(link => lowQuality ? 0 : isRouteLink(link) ? 2 : props.selectedId && touches(link, props.selectedId) ? 1 : 0)
  }
}

function focusNode(id: string, animate = true) {
  if (!graph || !id) return
  const node = graph.graphData().nodes.find(item => item.id === id)
  if (!node || ![node.x, node.y, node.z].every(Number.isFinite)) return
  const target = { x: node.x!, y: node.y!, z: node.z! }
  const length = Math.hypot(target.x, target.y, target.z)
  const camera = length < 1
    ? { x: 0, y: 0, z: 82 }
    : { x: target.x * (1 + 72 / length), y: target.y * (1 + 72 / length), z: target.z * (1 + 72 / length) }
  graph.cameraPosition(camera, target, animate ? 850 : 0)
}

function disposeCustomResources() {
  for (const object of customObjects.values()) {
    object.traverse((child) => {
      const candidate = child as Object3D & { geometry?: { dispose: () => void } }
      candidate.geometry?.dispose()
    })
  }
  customMaterials.forEach(material => material.dispose())
  customTextures.forEach(texture => texture.dispose())
  customObjects.clear()
  customMaterials.clear()
  customTextures.clear()
}

function applyData() {
  if (!graph) return
  disposeCustomResources()
  const { nodes, links, fullyCached } = sceneData()
  graph.warmupTicks(fullyCached ? 0 : lowQuality ? 12 : 24).cooldownTicks(fullyCached ? 0 : lowQuality ? 36 : 72)
  graph.graphData({ nodes, links })
  refreshNodeAppearance()
  if (props.selectedId) requestAnimationFrame(() => focusNode(props.selectedId, false))
  else requestAnimationFrame(() => graph?.zoomToFit(500, 48))
}

function resize() {
  if (!graph || !host.value) return
  graph.width(Math.max(1, host.value.clientWidth)).height(Math.max(1, host.value.clientHeight))
}

function handleVisibility() {
  if (!graph) return
  if (document.hidden) graph.pauseAnimation()
  else graph.resumeAnimation()
}

async function initialize() {
  if (!host.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    failed.value = true
    emit('fallback', 'reduced-motion')
    return
  }
  if (!supportsWebGL()) {
    failed.value = true
    emit('fallback', 'webgl')
    return
  }
  lowQuality = detectLowQuality()
  try {
    const [forceGraphModule, threeModule] = await Promise.all([import('3d-force-graph'), import('three')])
    if (disposed || !host.value) return
    three = threeModule
    graph = new forceGraphModule.default<SceneNode, SceneLink>(host.value, {
      rendererConfig: { antialias: !lowQuality, alpha: false, powerPreference: lowQuality ? 'low-power' : 'high-performance' },
    })
    graph
      .backgroundColor('#10161b')
      .showNavInfo(false)
      .nodeId('id')
      .nodeLabel((node) => {
        const label = document.createElement('span')
        label.textContent = node.title
        return label
      })
      .nodeThreeObject(createNodeObject)
      .linkColor(linkColor)
      .linkOpacity(0.62)
      .linkWidth(0.28)
      .linkDirectionalParticleColor(link => relationColors[link.type] || '#dce6e2')
      .linkDirectionalParticleSpeed(link => isRouteLink(link) ? 0.0045 : 0.006)
      .linkDirectionalParticleWidth(link => isRouteLink(link) ? 1.15 : 0.9)
      .linkDirectionalParticleResolution(lowQuality ? 3 : 5)
      .d3AlphaDecay(0.045)
      .d3VelocityDecay(0.36)
      .cooldownTime(4500)
      .enableNodeDrag(false)
      .onNodeClick((node) => {
        const original = inputNodes.get(node.id)
        if (original) emit('select', original)
      })
      .onBackgroundClick(() => emit('clear'))
      .onEngineStop(saveLayout)
    graph.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQuality ? 1 : 1.6))
    const canvas = graph.renderer().domElement
    canvas.dataset.constellationCanvas = 'true'
    canvas.setAttribute('aria-label', '三维时光星图')
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    document.addEventListener('visibilitychange', handleVisibility)
    resize()
    applyData()
    ready.value = true
    emit('ready')
  } catch {
    failed.value = true
    emit('fallback', 'initialization')
    destroy()
  }
}

function destroy() {
  resizeObserver?.disconnect()
  resizeObserver = null
  document.removeEventListener('visibilitychange', handleVisibility)
  if (graph) {
    graph.pauseAnimation()
    disposeCustomResources()
    graph._destructor()
    graph = null
  }
  three = null
}

watch(() => [props.graphVersion, props.nodes, props.relations, props.routeNodeIds.join('|')], () => {
  if (graph) applyData()
})
watch(() => props.selectedId, (id) => {
  refreshNodeAppearance()
  if (id) focusNode(id)
})

onMounted(initialize)
onBeforeUnmount(() => {
  disposed = true
  destroy()
})

defineExpose({ focusNode })
</script>

<style scoped>
.constellation-scene { position:absolute; inset:0; min-width:0; min-height:0; overflow:hidden; background:#10161b; }
.scene-host { position:absolute; inset:0; min-width:0; min-height:0; }
.constellation-scene :deep(canvas) { display:block; width:100%; height:100%; outline:none; }
.scene-loading { position:absolute; z-index:2; inset:0; display:grid; align-content:center; justify-items:center; gap:10px; color:#8fa19b; font-size:.72rem; pointer-events:none; }
.scene-loading svg { font-size:1.8rem; animation:scene-spin 1s linear infinite; }
@keyframes scene-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion:reduce) { .scene-loading svg { animation:none; } }
</style>
