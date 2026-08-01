<template>
  <div ref="root" class="constellation-scene" :class="{ 'is-ready': ready, 'is-ambient': ambient }">
    <div ref="host" class="scene-host" />
    <div v-if="!ready && !failed" class="scene-awakening" aria-live="polite">
      <span class="awakening-core"><i /><i /><i /></span>
      <small>记忆正在沿时间轨道点亮</small>
    </div>
    <div ref="tooltip" class="scene-tooltip" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

type MemoryNode = {
  id: string
  type: string
  title: string
  excerpt?: string | null
  href?: string
  image?: string | null
  occurredAt?: string | null
  coordinateSeed?: number
  metadata?: Record<string, unknown>
}

type MemoryRelation = {
  id: string
  sourceId: string
  targetId: string
  type: string
  weight?: number
}

type CameraSnapshot = {
  position: THREE.Vector3
  target: THREE.Vector3
}

type CameraFlight = CameraSnapshot & {
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  startedAt: number
  duration: number
  arcHeight: number
}

const props = withDefaults(defineProps<{
  nodes: MemoryNode[]
  relations: MemoryRelation[]
  graphVersion: string
  selectedId?: string
  routeNodeIds?: string[]
  resolveImage?: (source: string) => string
  ambient?: boolean
}>(), {
  selectedId: '',
  routeNodeIds: () => [],
  resolveImage: (source: string) => source,
  ambient: false,
})

const emit = defineEmits<{
  select: [node: MemoryNode]
  clear: []
  ready: []
  fallback: [reason: 'webgl' | 'initialization']
}>()

const root = ref<HTMLElement | null>(null)
const host = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)
const reducedMotion = ref(false)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let idleSince = 0
let elapsed = 0
let lastFrame = 0
let lowQuality = false
let disposed = false
let core: THREE.Group | null = null
let sun: THREE.Group | null = null
let blackHole: THREE.Group | null = null
let meteor: THREE.Sprite | null = null
let meteorTrail: THREE.Line | null = null
let warpLines: THREE.LineSegments | null = null
let warpMaterial: THREE.LineBasicMaterial | null = null
let introStartedAt = 0
let introInterrupted = false
let cameraFlight: CameraFlight | null = null
let overviewSnapshot: CameraSnapshot | null = null
let activeSelectionId = ''
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2(2, 2)
const nodeObjects = new Map<string, THREE.Object3D>()
const nodePositions = new Map<string, THREE.Vector3>()
const nodeLookup = new Map<string, MemoryNode>()
const interactive: THREE.Object3D[] = []
const starLayers: THREE.Points[] = []
const cosmicBodies: THREE.Group[] = []
const disposables = new Set<{ dispose: () => void }>()
const typeColors: Record<string, number> = {
  memory: 0xe0a95b,
  post: 0xd97a58,
  moment: 0xd96776,
  album: 0x4fa69a,
  photo: 0x9985bd,
  place: 0x77a66a,
  library: 0x718ab6,
  journey: 0xd07943,
}
const typeLevels: Record<string, number> = { memory: 2, place: 0, journey: 6, album: -5, photo: -8, moment: 9, post: 3, library: -2 }

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch { return false }
}

function hash(value: string) {
  let result = 2166136261
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619)
  return result >>> 0
}

function randomFrom(seedValue: number) {
  let seed = seedValue || 1
  return () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
}

function yearOf(node: MemoryNode) {
  if (!node.occurredAt) return null
  const date = new Date(node.occurredAt)
  return Number.isNaN(date.getTime()) ? null : date.getFullYear()
}

function buildPosition(node: MemoryNode, years: number[]) {
  const random = randomFrom(Number(node.coordinateSeed) || hash(node.id))
  const date = node.occurredAt ? new Date(node.occurredAt) : null
  const year = date && !Number.isNaN(date.getTime()) ? date.getFullYear() : null
  const ringIndex = year == null ? years.length : Math.max(0, years.indexOf(year))
  const radius = 46 + ringIndex * 26
  const month = date && !Number.isNaN(date.getTime()) ? date.getMonth() : Math.floor(random() * 12)
  const day = date && !Number.isNaN(date.getTime()) ? date.getDate() : 1
  const angle = (month / 12 + day / 372) * Math.PI * 2 - Math.PI / 2 + (random() - .5) * .12
  const cluster = node.type === 'photo' || node.type === 'album' ? (random() - .5) * 9 : 0
  return new THREE.Vector3(
    Math.cos(angle) * (radius + cluster),
    (typeLevels[node.type] || 0) + (random() - .5) * 10,
    Math.sin(angle) * (radius + cluster) * .66,
  )
}

function track(resource: { dispose: () => void }) {
  disposables.add(resource)
  return resource
}

function spaceBackground() {
  return 0x05090c
}

function planetVariant(node: MemoryNode) {
  return hash(`${node.id}:variant`) % 5
}

function planetTexture(node: MemoryNode, colorValue: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')!
  const random = randomFrom(hash(`${node.id}:surface`))
  const variant = planetVariant(node)
  const color = new THREE.Color(colorValue)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  const hue = Math.round(hsl.h * 360)
  const saturation = Math.min(56, Math.max(26, Math.round(hsl.s * 82)))
  const base = context.createLinearGradient(0, 0, 0, canvas.height)
  base.addColorStop(0, `hsl(${hue} ${Math.min(64, saturation + 5)}% 58%)`)
  base.addColorStop(.48, `hsl(${hue} ${saturation}% 39%)`)
  base.addColorStop(1, `hsl(${(hue + 10) % 360} ${Math.max(20, saturation - 14)}% 19%)`)
  context.fillStyle = base
  context.fillRect(0, 0, canvas.width, canvas.height)

  const bandCount = variant === 1 ? 24 : 8 + Math.floor(random() * 7)
  for (let index = 0; index < bandCount; index++) {
    const y = random() * canvas.height
    const height = variant === 1 ? 1 + random() * 7 : 2 + random() * 10
    const lightness = 27 + random() * 32
    context.fillStyle = `hsla(${(hue + (random() - .5) * 18 + 360) % 360} ${saturation}% ${lightness}% / ${variant === 1 ? .16 + random() * .22 : .06 + random() * .16})`
    context.fillRect(0, y, canvas.width, height)
  }

  const landCount = variant === 2 || node.type === 'place' || node.type === 'journey' ? 18 : 7
  for (let index = 0; index < landCount; index++) {
    const x = random() * canvas.width
    const y = 12 + random() * (canvas.height - 24)
    const radiusX = 5 + random() * 25
    const radiusY = 2 + random() * 11
    context.beginPath()
    context.ellipse(x, y, radiusX, radiusY, (random() - .5) * .7, 0, Math.PI * 2)
    context.fillStyle = `hsla(${(hue + 28 + random() * 22) % 360} ${Math.max(24, saturation - 18)}% ${28 + random() * 24}% / ${.14 + random() * .24})`
    context.fill()
  }

  context.globalCompositeOperation = 'screen'
  for (let index = 0; index < 12; index++) {
    context.beginPath()
    context.ellipse(random() * canvas.width, random() * canvas.height, 10 + random() * 30, 1 + random() * 3.5, 0, 0, Math.PI * 2)
    context.fillStyle = `rgba(220, 242, 255, ${.035 + random() * .08})`
    context.fill()
  }
  context.globalCompositeOperation = 'source-over'

  if (variant === 0) {
    for (let index = 0; index < 22; index++) {
      const x = random() * canvas.width
      const y = 10 + random() * (canvas.height - 20)
      const radius = 1.2 + random() * 5.5
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fillStyle = `rgba(20, 24, 28, ${.08 + random() * .16})`
      context.fill()
      context.strokeStyle = `rgba(225, 224, 208, ${.05 + random() * .1})`
      context.lineWidth = .7
      context.stroke()
    }
  } else if (variant === 3) {
    const north = context.createLinearGradient(0, 0, 0, 35)
    north.addColorStop(0, 'rgba(230,241,239,.78)')
    north.addColorStop(1, 'rgba(184,213,216,0)')
    context.fillStyle = north
    context.fillRect(0, 0, canvas.width, 38)
    const south = context.createLinearGradient(0, canvas.height - 35, 0, canvas.height)
    south.addColorStop(0, 'rgba(184,213,216,0)')
    south.addColorStop(1, 'rgba(230,241,239,.7)')
    context.fillStyle = south
    context.fillRect(0, canvas.height - 38, canvas.width, 38)
  } else if (variant === 4) {
    context.globalCompositeOperation = 'screen'
    context.strokeStyle = 'rgba(255,128,58,.42)'
    context.lineWidth = 1.1
    for (let index = 0; index < 12; index++) {
      let x = random() * canvas.width
      let y = random() * canvas.height
      context.beginPath()
      context.moveTo(x, y)
      for (let segment = 0; segment < 5; segment++) {
        x += (random() - .5) * 22
        y += (random() - .5) * 15
        context.lineTo(x, y)
      }
      context.stroke()
    }
    context.globalCompositeOperation = 'source-over'
  }

  const texture = track(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() || 1)
  return texture
}

function drawLogoMark(context: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, opacity: number) {
  context.save()
  context.translate(centerX - 32 * scale, centerY - 32 * scale)
  context.scale(scale, scale)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = `rgba(225, 246, 255, ${opacity})`
  context.shadowColor = 'rgba(91, 193, 255, .75)'
  context.shadowBlur = 6
  const strokes = [
    { path: 'M15 14v35h35', width: 2.8, alpha: .32 },
    { path: 'M7 25c11 0 12-8 24-8 7 0 10 3 10 7 0 5-4 8-9 8', width: 3.2, alpha: 1 },
    { path: 'M7 36h37c7 0 11-3 11-8', width: 3.2, alpha: .82 },
    { path: 'M17 46h25c6 0 9 3 9 7', width: 3.2, alpha: .56 },
  ]
  for (const stroke of strokes) {
    context.globalAlpha = stroke.alpha
    context.lineWidth = stroke.width
    context.stroke(new Path2D(stroke.path))
  }
  context.globalAlpha = 1
  context.fillStyle = '#ffd095'
  context.shadowColor = 'rgba(255, 164, 82, .9)'
  context.shadowBlur = 7
  context.beginPath()
  context.arc(15, 14, 3, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function corePlanetTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 384
  const context = canvas.getContext('2d')!
  const random = randomFrom(hash('corner:core:surface'))
  const base = context.createLinearGradient(0, 0, 0, canvas.height)
  base.addColorStop(0, '#74bce7')
  base.addColorStop(.42, '#276b9e')
  base.addColorStop(.72, '#164b79')
  base.addColorStop(1, '#082943')
  context.fillStyle = base
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 42; index++) {
    const y = random() * canvas.height
    const height = 3 + random() * 24
    const wave = context.createLinearGradient(0, y, canvas.width, y + height)
    wave.addColorStop(0, `rgba(110, 204, 239, ${.03 + random() * .08})`)
    wave.addColorStop(.48, `rgba(11, 61, 104, ${.08 + random() * .14})`)
    wave.addColorStop(1, `rgba(129, 220, 239, ${.025 + random() * .07})`)
    context.fillStyle = wave
    context.fillRect(0, y, canvas.width, height)
  }

  context.globalCompositeOperation = 'screen'
  for (let index = 0; index < 24; index++) {
    context.beginPath()
    context.ellipse(random() * canvas.width, random() * canvas.height, 18 + random() * 72, 2 + random() * 8, (random() - .5) * .18, 0, Math.PI * 2)
    context.fillStyle = `rgba(130, 221, 244, ${.025 + random() * .07})`
    context.fill()
  }
  context.globalCompositeOperation = 'source-over'

  for (const x of [96, 288, 480, 672]) drawLogoMark(context, x, 192, 1.9, .92)

  const texture = track(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() || 1)
  return texture
}

function sunSurfaceTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const random = randomFrom(0x51a7face)
  const base = context.createLinearGradient(0, 0, 0, canvas.height)
  base.addColorStop(0, '#fffdf0')
  base.addColorStop(.35, '#ffef9e')
  base.addColorStop(.72, '#f9bd45')
  base.addColorStop(1, '#d86d20')
  context.fillStyle = base
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.globalCompositeOperation = 'screen'
  for (let index = 0; index < 1200; index++) {
    const radius = .4 + random() * 2.4
    context.beginPath()
    context.arc(random() * canvas.width, random() * canvas.height, radius, 0, Math.PI * 2)
    context.fillStyle = `rgba(255, 247, 183, ${.05 + random() * .23})`
    context.fill()
  }
  context.globalCompositeOperation = 'multiply'
  for (let index = 0; index < 16; index++) {
    context.beginPath()
    context.ellipse(random() * canvas.width, 24 + random() * (canvas.height - 48), 4 + random() * 16, 2 + random() * 7, random() * Math.PI, 0, Math.PI * 2)
    context.fillStyle = `rgba(116, 34, 17, ${.08 + random() * .2})`
    context.fill()
  }
  context.globalCompositeOperation = 'source-over'

  const texture = track(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() || 1)
  return texture
}

function coronaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const context = canvas.getContext('2d')!
  const random = randomFrom(0xc0a0a)
  context.translate(256, 256)
  const radial = context.createRadialGradient(0, 0, 48, 0, 0, 252)
  radial.addColorStop(0, 'rgba(255,239,169,.88)')
  radial.addColorStop(.18, 'rgba(255,197,63,.62)')
  radial.addColorStop(.43, 'rgba(255,126,35,.16)')
  radial.addColorStop(1, 'rgba(255,74,16,0)')
  context.fillStyle = radial
  context.fillRect(-256, -256, 512, 512)
  context.globalCompositeOperation = 'screen'
  for (let index = 0; index < 92; index++) {
    const angle = random() * Math.PI * 2
    const inner = 58 + random() * 22
    const length = 60 + Math.pow(random(), 2.2) * 150
    context.save()
    context.rotate(angle)
    const ray = context.createLinearGradient(inner, 0, inner + length, 0)
    ray.addColorStop(0, `rgba(255, 223, 128, ${.08 + random() * .16})`)
    ray.addColorStop(1, 'rgba(255, 112, 32, 0)')
    context.strokeStyle = ray
    context.lineWidth = .35 + random() * 1.5
    context.beginPath()
    context.moveTo(inner, (random() - .5) * 8)
    context.quadraticCurveTo(inner + length * .52, (random() - .5) * 18, inner + length, (random() - .5) * 32)
    context.stroke()
    context.restore()
  }
  return track(new THREE.CanvasTexture(canvas))
}

function atmosphereMaterial(colorValue: number, opacity: number) {
  const material = track(new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(colorValue) },
      glowOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float glowOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.4);
        gl_FragColor = vec4(glowColor, rim * glowOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  }))
  material.userData.baseGlowOpacity = opacity
  return material
}

function glowTexture(color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, color)
  gradient.addColorStop(.12, color)
  gradient.addColorStop(.38, `${color}66`)
  gradient.addColorStop(1, `${color}00`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  return track(new THREE.CanvasTexture(canvas))
}

function circleMaskTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(64, 64, 61, 0, Math.PI * 2)
  context.fill()
  return track(new THREE.CanvasTexture(canvas))
}

function addStarField() {
  if (!scene) return
  const random = randomFrom(20260731)
  const layerSettings = lowQuality
    ? [{ count: 850, near: 170, depth: 430, size: 1.28, opacity: .82 }]
    : [
        { count: 1700, near: 160, depth: 480, size: 1.12, opacity: .82 },
        { count: 760, near: 85, depth: 250, size: 1.9, opacity: .56 },
      ]
  for (const [layerIndex, settings] of layerSettings.entries()) {
    const positions = new Float32Array(settings.count * 3)
    for (let index = 0; index < settings.count; index++) {
      const radius = settings.near + random() * settings.depth
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[index * 3 + 1] = radius * Math.cos(phi)
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    const geometry = track(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = track(new THREE.PointsMaterial({
      color: layerIndex ? 0x8cbcff : 0xc4e4ff,
      map: glowTexture(layerIndex ? '#78aaff' : '#d9efff'),
      size: settings.size,
      transparent: true,
      opacity: settings.opacity,
      alphaTest: .02,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    }))
    const stars = new THREE.Points(geometry, material)
    stars.name = `star-field-${layerIndex}`
    starLayers.push(stars)
    scene.add(stars)
  }

  const streakCount = lowQuality ? 70 : 150
  const streakPositions = new Float32Array(streakCount * 6)
  for (let index = 0; index < streakCount; index++) {
    const x = (random() - .5) * 380
    const y = (random() - .5) * 220
    const z = -180 + random() * 620
    const length = 18 + random() * 48
    streakPositions[index * 6] = x
    streakPositions[index * 6 + 1] = y
    streakPositions[index * 6 + 2] = z
    streakPositions[index * 6 + 3] = x
    streakPositions[index * 6 + 4] = y
    streakPositions[index * 6 + 5] = z + length
  }
  const streakGeometry = track(new THREE.BufferGeometry())
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3))
  warpMaterial = track(new THREE.LineBasicMaterial({
    color: 0x6eb6ff,
    transparent: true,
    opacity: .48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }))
  warpLines = new THREE.LineSegments(streakGeometry, warpMaterial)
  warpLines.name = 'warp-lines'
  scene.add(warpLines)
}

function addCore() {
  if (!scene) return
  core = new THREE.Group()
  const coreTexture = corePlanetTexture()
  const orbMaterial = track(new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: coreTexture,
    emissiveMap: coreTexture,
    emissive: 0xd59a4f,
    emissiveIntensity: .32,
    roughness: .58,
    metalness: .12,
  }))
  const orb = new THREE.Mesh(track(new THREE.SphereGeometry(8, lowQuality ? 18 : 32, lowQuality ? 12 : 22)), orbMaterial)
  core.add(orb)
  const coreAtmosphere = new THREE.Mesh(orb.geometry, atmosphereMaterial(0xe5b967, .94))
  coreAtmosphere.scale.setScalar(1.16)
  coreAtmosphere.renderOrder = 4
  core.add(coreAtmosphere)
  const ringMaterial = track(new THREE.MeshBasicMaterial({ color: 0xd8a75b, transparent: true, opacity: .46, blending: THREE.AdditiveBlending, depthWrite: false }))
  for (const [scale, tilt] of [[16, .9], [21, -1.15]] as const) {
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(scale, .1, 5, 96)), ringMaterial)
    ring.rotation.set(tilt, .25, .12)
    core.add(ring)
  }
  scene.add(core)
}

function addSun() {
  if (!scene) return
  const mobile = window.innerWidth < 720
  sun = new THREE.Group()
  sun.name = 'day-sun'
  const horizontalOffset = mobile ? .08 : .28
  sun.userData.viewOffset = new THREE.Vector3(horizontalOffset, .28, -1).normalize()
  sun.position.set(
    mobile ? 32 : 112,
    mobile ? 92 : 64,
    -132,
  )
  const surface = new THREE.Mesh(
    track(new THREE.SphereGeometry(7.8, lowQuality ? 18 : 30, lowQuality ? 12 : 20)),
    track(new THREE.MeshBasicMaterial({ color: 0xffffff, map: sunSurfaceTexture(), fog: false })),
  )
  sun.add(surface)
  const corona = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: coronaTexture(), transparent: true, opacity: .48, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })))
  corona.scale.set(82, 82, 1)
  sun.add(corona)
  const innerHalo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture('#f7b941'), transparent: true, opacity: .34, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })))
  innerHalo.scale.set(38, 38, 1)
  sun.add(innerHalo)
  const outerHalo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture('#ef6c2e'), transparent: true, opacity: .1, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })))
  outerHalo.scale.set(112, 112, 1)
  sun.add(outerHalo)
  const sunlight = new THREE.PointLight(0xffb76a, 2600, 720, 1.32)
  sun.add(sunlight)
  scene.add(sun)
}

function addBlackHole() {
  if (!scene) return
  blackHole = new THREE.Group()
  blackHole.name = 'distant-black-hole'
  blackHole.position.set(-176, 78, -286)
  blackHole.add(new THREE.Mesh(track(new THREE.SphereGeometry(12.5, lowQuality ? 18 : 32, lowQuality ? 12 : 20)), track(new THREE.MeshBasicMaterial({ color: 0x000106, fog: false }))))
  const photonRing = track(new THREE.MeshBasicMaterial({ color: 0xf1a35a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
  const ringA = new THREE.Mesh(track(new THREE.TorusGeometry(16, .72, 8, 128)), photonRing)
  ringA.rotation.set(1.15, .18, -.28)
  blackHole.add(ringA)
  const ringB = new THREE.Mesh(track(new THREE.TorusGeometry(21, .28, 6, 128)), track(new THREE.MeshBasicMaterial({ color: 0x5f9df4, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })))
  ringB.rotation.set(1.16, .2, -.28)
  blackHole.add(ringB)
  const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture('#7346d8'), transparent: true, opacity: .42, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })))
  halo.scale.set(68, 68, 1)
  blackHole.add(halo)
  scene.add(blackHole)
}

function addOrbit(radius: number, year: number | null) {
  if (!scene) return
  const points: THREE.Vector3[] = []
  for (let index = 0; index <= 180; index++) {
    const angle = index / 180 * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * .66))
  }
  const geometry = track(new THREE.BufferGeometry().setFromPoints(points))
  const material = track(new THREE.LineBasicMaterial({
    color: year == null ? 0x554a3c : 0xa57d4a,
    transparent: true,
    opacity: year == null ? .2 : .34,
    blending: THREE.AdditiveBlending,
  }))
  const line = new THREE.Line(geometry, material)
  line.userData.year = year
  scene.add(line)
}

function nodeRadius(type: string, featured: boolean, variant: number) {
  const base = featured ? 3.6 : type === 'memory' ? 2.65 : type === 'place' ? 2.45 : type === 'photo' ? 1.8 : 2.1
  return base * (variant === 1 ? 1.16 : variant === 0 ? .92 : 1)
}

function nodeGeometry(type: string, featured: boolean, variant: number) {
  return track(new THREE.SphereGeometry(nodeRadius(type, featured, variant), lowQuality ? 14 : 24, lowQuality ? 10 : 16))
}

function rememberOpacity(material: THREE.Material, opacity?: number) {
  if (opacity !== undefined && 'opacity' in material) material.opacity = opacity
  material.userData.baseOpacity = 'opacity' in material ? material.opacity : 1
  return material
}

function addCosmicBodies() {
  if (!scene) return
  const random = randomFrom(0x6c756d65)
  const bodyTypes = ['place', 'library', 'album', 'journey', 'photo']
  const targetCount = Math.max(lowQuality ? 16 : 22, (lowQuality ? 26 : 42) - props.nodes.length)
  for (let index = 0; index < targetCount; index++) {
    const orbitIndex = index % 4
    const angle = random() * Math.PI * 2 + orbitIndex * .31
    const orbitRadius = 48 + orbitIndex * 28 + (random() - .5) * 12
    const radius = .9 + random() * 1.45
    const seedNode: MemoryNode = {
      id: `cosmic-seed:${index}`,
      type: bodyTypes[index % bodyTypes.length],
      title: '',
      coordinateSeed: index * 11939 + 701,
    }
    const group = new THREE.Group()
    group.name = 'cosmic-seed'
    group.position.set(
      Math.cos(angle) * orbitRadius,
      (random() - .5) * 28 - 3,
      Math.sin(angle) * orbitRadius * .68,
    )
    group.rotation.set(random() * .5, random() * Math.PI * 2, random() * .35)
    group.userData.spin = .025 + random() * .055
    const mutedColor = [0x987452, 0x527d73, 0x7d675f, 0x68739a, 0x667d51][index % 5]
    const geometry = track(new THREE.SphereGeometry(radius, lowQuality ? 10 : 18, lowQuality ? 8 : 12))
    const material = rememberOpacity(track(new THREE.MeshStandardMaterial({
      color: 0xe0d1ba,
      map: planetTexture(seedNode, mutedColor),
      emissive: mutedColor,
      emissiveIntensity: .12,
      roughness: .86,
      metalness: .01,
      transparent: true,
      opacity: .84 + random() * .14,
    })))
    group.add(new THREE.Mesh(geometry, material))
    if (index % 7 === 2) {
      const ringMaterial = rememberOpacity(track(new THREE.MeshBasicMaterial({
        color: 0xb79a70,
        transparent: true,
        opacity: .28,
        depthWrite: false,
      })))
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(radius * 1.65, radius * .035, 4, lowQuality ? 24 : 42)), ringMaterial)
      ring.rotation.set(1.12, .12, -.18)
      group.add(ring)
    }
    cosmicBodies.push(group)
    scene.add(group)
  }
}

function addNode(node: MemoryNode, position: THREE.Vector3) {
  if (!scene) return
  const group = new THREE.Group()
  group.position.copy(position)
  group.userData.nodeId = node.id
  const featured = Boolean(node.metadata?.featured)
  const variant = planetVariant(node)
  const color = typeColors[node.type] || 0x9fb0b5
  const radius = nodeRadius(node.type, featured, variant)
  const geometry = nodeGeometry(node.type, featured, variant)
  const material = rememberOpacity(track(new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: planetTexture(node, color),
    emissive: color,
    emissiveIntensity: featured ? .48 : .3,
    roughness: variant === 3 ? .82 : .72,
    metalness: .04,
    transparent: true,
    opacity: .98,
  })))
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.nodeId = node.id
  group.add(mesh)
  interactive.push(mesh)
  const hitTarget = new THREE.Mesh(
    track(new THREE.SphereGeometry(radius * 1.7, 10, 8)),
    track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })),
  )
  hitTarget.userData.nodeId = node.id
  group.add(hitTarget)
  interactive.push(hitTarget)
  const atmosphere = new THREE.Mesh(geometry, atmosphereMaterial(color, featured ? .78 : .58))
  atmosphere.scale.setScalar(1.16)
  atmosphere.userData.nodeId = node.id
  group.add(atmosphere)
  const signalMaterial = rememberOpacity(track(new THREE.SpriteMaterial({
    map: glowTexture('#79caff'),
    color,
    transparent: true,
    opacity: featured ? .38 : .28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })))
  const signal = new THREE.Sprite(signalMaterial)
  signal.name = 'memory-signal'
  signal.scale.setScalar(radius * (featured ? 6.4 : 5.2))
  signal.userData.baseScale = signal.scale.x
  group.add(signal)
  if (variant === 1 || hash(node.id) % 9 === 0) {
    const ringGroup = new THREE.Group()
    const ringColor = new THREE.Color(color).lerp(new THREE.Color(0xb9b2a2), .34)
    for (const [ringRadius, thickness, opacity] of [[1.38, .035, .28], [1.53, .06, .34], [1.7, .028, .2]] as const) {
      ringGroup.add(new THREE.Mesh(
        track(new THREE.TorusGeometry(radius * ringRadius, radius * thickness, 5, lowQuality ? 32 : 64)),
        rememberOpacity(track(new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity, depthWrite: false }))),
      ))
    }
    ringGroup.rotation.set(1.12, .18, -.18)
    group.add(ringGroup)
  }
  if (variant === 2 || hash(node.id) % 11 === 0) {
    const moon = new THREE.Mesh(
      track(new THREE.SphereGeometry(radius * .17, lowQuality ? 8 : 14, lowQuality ? 6 : 10)),
      track(new THREE.MeshStandardMaterial({ color: 0x9ea6aa, roughness: .92, metalness: 0 })),
    )
    moon.position.set(radius * 1.95, radius * .22, 0)
    group.add(moon)
    const moonOrbit = new THREE.Mesh(
      track(new THREE.TorusGeometry(radius * 1.95, .025, 4, lowQuality ? 28 : 48)),
      rememberOpacity(track(new THREE.MeshBasicMaterial({ color: 0x9db1bd, transparent: true, opacity: .18, depthWrite: false }))),
    )
    moonOrbit.rotation.x = Math.PI / 2
    group.add(moonOrbit)
  }
  nodeObjects.set(node.id, group)
  scene.add(group)
}

function addImageSprite(node: MemoryNode, group: THREE.Group) {
  if (!node.image) return
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  loader.load(props.resolveImage(node.image), (texture) => {
    if (disposed || !nodeObjects.has(node.id)) { texture.dispose(); return }
    track(texture)
    texture.colorSpace = THREE.SRGBColorSpace
    const image = texture.image as { width?: number; height?: number }
    const aspect = Math.max(.62, Math.min(1.65, Number(image.width || 1) / Number(image.height || 1)))
    const sprite = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: texture, alphaMap: circleMaskTexture(), transparent: true, alphaTest: .04, opacity: .94 })))
    sprite.scale.set(7.2 * aspect, 7.2, 1)
    sprite.position.set(0, 0, 3.2)
    sprite.userData.nodeId = node.id
    group.add(sprite)
    interactive.push(sprite)
  }, undefined, () => undefined)
}

function addRelations() {
  if (!scene) return
  const routeIds = new Set(props.routeNodeIds)
  for (const relation of props.relations.slice(0, lowQuality ? 300 : 900)) {
    const from = nodePositions.get(relation.sourceId)
    const to = nodePositions.get(relation.targetId)
    if (!from || !to) continue
    const midpoint = from.clone().add(to).multiplyScalar(.5)
    midpoint.y += Math.min(18, from.distanceTo(to) * .08)
    const curve = new THREE.QuadraticBezierCurve3(from, midpoint, to)
    const geometry = track(new THREE.BufferGeometry().setFromPoints(curve.getPoints(lowQuality ? 8 : 18)))
    const routed = routeIds.has(relation.sourceId) && routeIds.has(relation.targetId)
    const color = relation.type === 'same_place' ? 0x64d8ef : relation.type === 'same_album' ? 0x72b9ff : routed ? 0xa9d7ff : 0x4d7fa8
    const material = track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: routed ? .75 : .17 + Math.min(.2, Number(relation.weight || 0) * .16), blending: THREE.AdditiveBlending }))
    scene.add(new THREE.Line(geometry, material))
  }
}

function addMeteor() {
  if (!scene || reducedMotion.value) return
  const latest = [...props.nodes].filter(node => node.occurredAt).sort((a, b) => new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime())[0]
  const target = latest ? nodePositions.get(latest.id) : null
  meteor = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture('#e5f7ff'), color: 0xe5f7ff, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending })))
  meteor.scale.set(2.2, 2.2, 1)
  meteor.userData.target = target?.clone() || new THREE.Vector3(26, -8, 0)
  scene.add(meteor)
  const trailPoints = 34
  const trailGeometry = track(new THREE.BufferGeometry())
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailPoints * 3), 3))
  const trailColors = new Float32Array(trailPoints * 3)
  const dim = new THREE.Color(0x16466d)
  const bright = new THREE.Color(0xbdeaff)
  for (let index = 0; index < trailPoints; index++) {
    const shade = dim.clone().lerp(bright, index / (trailPoints - 1))
    trailColors[index * 3] = shade.r
    trailColors[index * 3 + 1] = shade.g
    trailColors[index * 3 + 2] = shade.b
  }
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
  meteorTrail = new THREE.Line(trailGeometry, track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .88, depthWrite: false, blending: THREE.AdditiveBlending })))
  scene.add(meteorTrail)
}

function clearSceneContent() {
  if (!scene) return
  for (const child of [...scene.children]) if (!['ambient-light', 'key-light'].includes(child.name)) scene.remove(child)
  for (const resource of disposables) resource.dispose()
  disposables.clear()
  nodeObjects.clear()
  nodePositions.clear()
  nodeLookup.clear()
  interactive.length = 0
  starLayers.length = 0
  cosmicBodies.length = 0
  core = null
  sun = null
  blackHole = null
  meteor = null
  meteorTrail = null
  warpLines = null
  warpMaterial = null
}

function buildScene() {
  if (!scene) return
  clearSceneContent()
  addStarField()
  addSun()
  addBlackHole()
  addCore()
  const years = [...new Set(props.nodes.map(yearOf).filter((year): year is number => year != null))].sort((a, b) => b - a)
  if (years.length) {
    years.forEach((year, index) => addOrbit(46 + index * 26, year))
    addOrbit(46 + years.length * 26, null)
  } else {
    for (let index = 0; index < 3; index++) addOrbit(46 + index * 28, null)
  }
  addCosmicBodies()
  for (const node of props.nodes) {
    nodeLookup.set(node.id, node)
    const position = buildPosition(node, years)
    nodePositions.set(node.id, position)
    addNode(node, position)
  }
  addRelations()
  addMeteor()
  applySelection(false)
}

function resize() {
  if (!renderer || !camera || !host.value) return
  const width = Math.max(1, host.value.clientWidth)
  const height = Math.max(1, host.value.clientHeight)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function pointerPosition(event: PointerEvent) {
  const rect = host.value?.getBoundingClientRect()
  if (!rect) return
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function hitNode() {
  if (!camera) return null
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(interactive, false)[0]
  const id = String(hit?.object.userData.nodeId || '')
  return id ? nodeLookup.get(id) || null : null
}

function onPointerMove(event: PointerEvent) {
  pointerPosition(event)
  const node = hitNode()
  if (host.value) host.value.style.cursor = props.ambient ? 'default' : node ? 'pointer' : 'grab'
  if (!tooltip.value || props.ambient) return
  tooltip.value.textContent = node?.title || ''
  tooltip.value.classList.toggle('visible', !!node)
  if (node) {
    tooltip.value.style.left = `${event.clientX + 14}px`
    tooltip.value.style.top = `${event.clientY + 12}px`
  }
}

function onPointerDown() {
  if (props.ambient || cameraFlight) return
  idleSince = performance.now()
  introInterrupted = true
}
function onClick(event: PointerEvent) {
  if (props.ambient) return
  pointerPosition(event)
  const node = hitNode()
  if (node) emit('select', node)
  else emit('clear')
}

function overviewPose(): CameraSnapshot {
  const mobile = window.innerWidth < 720
  return {
    target: new THREE.Vector3(props.ambient && !mobile ? -44 : 0, mobile ? -42 : 0, 0),
    position: new THREE.Vector3(0, mobile ? 62 : 68, mobile ? 238 : 218),
  }
}

function startCameraFlight(destination: CameraSnapshot, duration = 1250, arcHeight = 12) {
  if (!camera || !controls) return
  introInterrupted = true
  controls.autoRotate = false
  controls.enabled = false
  cameraFlight = {
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    position: destination.position.clone(),
    target: destination.target.clone(),
    startedAt: performance.now(),
    duration: reducedMotion.value ? 0 : duration,
    arcHeight,
  }
}

function updateCameraFlight(now: number) {
  if (!cameraFlight || !camera || !controls) return
  const progress = cameraFlight.duration ? Math.min(1, (now - cameraFlight.startedAt) / cameraFlight.duration) : 1
  const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10)
  camera.position.lerpVectors(cameraFlight.fromPosition, cameraFlight.position, eased)
  camera.position.y += Math.sin(progress * Math.PI) * cameraFlight.arcHeight
  controls.target.lerpVectors(cameraFlight.fromTarget, cameraFlight.target, eased)
  if (progress < 1) return
  camera.position.copy(cameraFlight.position)
  controls.target.copy(cameraFlight.target)
  cameraFlight = null
  controls.enabled = !props.ambient
  controls.autoRotate = !props.selectedId && !props.ambient && !reducedMotion.value
}

function focusPose(target: THREE.Vector3): CameraSnapshot | null {
  if (!camera || !controls) return null
  const direction = camera.position.clone().sub(controls.target).normalize()
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const offset = window.innerWidth < 700 ? 0 : 12
  const sideOffset = right.clone().multiplyScalar(offset)
  const lookTarget = target.clone().add(sideOffset)
  return {
    target: lookTarget,
    position: target.clone().add(direction.multiplyScalar(44)).add(sideOffset.clone().multiplyScalar(.7)),
  }
}

function applySelection(animate = true) {
  const selected = props.selectedId
  if (controls) controls.autoRotate = !selected && !props.ambient && !reducedMotion.value
  for (const [id, object] of nodeObjects) {
    const active = !selected || id === selected
    object.scale.setScalar(id === selected ? 1.34 : selected ? .86 : 1)
    object.traverse((child) => {
      const material = (child as THREE.Mesh).material as THREE.Material & { opacity?: number; uniforms?: Record<string, { value: number }> }
      if (!material) return
      const baseOpacity = Number(material.userData.baseOpacity)
      if ('opacity' in material && Number.isFinite(baseOpacity)) {
        const boost = id === selected && child.name === 'memory-signal' ? 1.65 : 1
        material.opacity = Math.min(1, baseOpacity * (active ? boost : .2))
      }
      const baseGlow = Number(material.userData.baseGlowOpacity)
      if (Number.isFinite(baseGlow) && material.uniforms?.glowOpacity) {
        material.uniforms.glowOpacity.value = baseGlow * (id === selected ? 1.42 : active ? 1 : .22)
      }
    })
  }
  if (!camera || !controls) return
  if (!selected) {
    if (activeSelectionId) {
      const destination = overviewSnapshot || overviewPose()
      if (animate) startCameraFlight(destination, 1350, 10)
      else {
        camera.position.copy(destination.position)
        controls.target.copy(destination.target)
      }
    }
    activeSelectionId = ''
    overviewSnapshot = null
    return
  }
  const target = nodePositions.get(selected)
  if (!target) return
  if (!activeSelectionId) overviewSnapshot = { position: camera.position.clone(), target: controls.target.clone() }
  activeSelectionId = selected
  const destination = focusPose(target)
  if (!destination) return
  if (!animate || reducedMotion.value) {
    controls.target.copy(destination.target)
    camera.position.copy(destination.position)
    controls.update()
    return
  }
  startCameraFlight(destination, 1450, 14)
}

function resetView() {
  if (!camera || !controls) return
  activeSelectionId = ''
  overviewSnapshot = null
  startCameraFlight(overviewPose(), 1400, 12)
}

function animate(now = performance.now()) {
  if (!renderer || !scene || !camera || !controls || disposed) return
  animationFrame = requestAnimationFrame(animate)
  const delta = lastFrame ? Math.min(.05, (now - lastFrame) / 1000) : 0
  elapsed += delta
  if (!reducedMotion.value) {
    if (core) {
      core.rotation.y += delta * .18
      core.rotation.z = Math.sin(elapsed * .3) * .08
    }
    if (sun) {
      sun.rotation.y += delta * .035
      const pulse = 1 + Math.sin(elapsed * .55) * .025
      sun.scale.setScalar(pulse)
    }
    if (blackHole) {
      blackHole.rotation.y -= delta * .045
      blackHole.rotation.z = Math.sin(elapsed * .18) * .025
      const halo = blackHole.children[3]
      if (halo) halo.scale.setScalar(68 + Math.sin(elapsed * .7) * 2.5)
    }
    starLayers.forEach((stars, index) => {
      stars.rotation.y += delta * (.004 + index * .006)
      stars.rotation.x = Math.sin(elapsed * (.018 + index * .007)) * .018
    })
    cosmicBodies.forEach((body, index) => {
      body.rotation.y += delta * Number(body.userData.spin || .04)
      body.position.y += Math.sin(elapsed * .18 + index) * delta * .018
    })
    for (const [id, object] of nodeObjects) {
      const seed = hash(id) % 100
      object.rotation.y += delta * (.08 + seed / 900)
      const selected = id === props.selectedId
      const pulse = 1 + Math.sin(elapsed * 1.5 + seed) * (selected ? .08 : .025)
      const base = selected ? 1.34 : props.selectedId ? .86 : 1
      object.scale.setScalar(base * pulse)
    }
    if (meteor && meteorTrail) {
      const target = meteor.userData.target as THREE.Vector3
      const cycle = (elapsed % 7.6) / 7.6
      const visible = cycle < .3
      const progress = Math.min(1, cycle / .3)
      const start = target.clone().add(new THREE.Vector3(-170, 92, 90))
      const end = target.clone().add(new THREE.Vector3(70, -32, -24))
      const control = target.clone().add(new THREE.Vector3(-35, 78, 48))
      const curve = new THREE.QuadraticBezierCurve3(start, control, end)
      meteor.position.copy(curve.getPoint(progress))
      const positions = meteorTrail.geometry.attributes.position as THREE.BufferAttribute
      for (let index = 0; index < positions.count; index++) {
        const trailProgress = Math.max(0, progress - (positions.count - 1 - index) * .009)
        const point = curve.getPoint(trailProgress)
        positions.setXYZ(index, point.x, point.y, point.z)
      }
      positions.needsUpdate = true
      meteor.visible = visible
      meteorTrail.visible = visible
    }

    const introProgress = Math.min(1, (now - introStartedAt) / 3200)
    if (!introInterrupted && introProgress < 1) {
      const eased = 1 - Math.pow(1 - introProgress, 4)
      const mobile = window.innerWidth < 720
      camera.position.set(
        Math.sin(introProgress * Math.PI) * -26,
        THREE.MathUtils.lerp(20, mobile ? 62 : 68, eased),
        THREE.MathUtils.lerp(mobile ? 390 : 500, mobile ? 238 : 218, eased),
      )
      controls.target.set(props.ambient && !mobile ? -44 : 0, mobile ? -42 : 0, 0)
      if (warpMaterial) warpMaterial.opacity = .52 * Math.pow(1 - introProgress, 1.6)
    } else if (warpMaterial) {
      warpMaterial.opacity = .035
    }

    if (props.ambient && introProgress >= 1 && performance.now() - idleSince > 2500) {
      const mobile = window.innerWidth < 720
      const radius = mobile ? 225 : 205
      camera.position.x = Math.sin(elapsed * .035) * radius
      camera.position.z = Math.cos(elapsed * .035) * radius
      camera.position.y = 72 + Math.sin(elapsed * .018) * 18
      controls.target.set(!mobile ? -44 : 0, mobile ? -42 : 0, 0)
      camera.lookAt(controls.target)
    }
  }
  updateCameraFlight(now)
  controls.update()
  if (sun && camera) {
    const viewOffset = (sun.userData.viewOffset as THREE.Vector3).clone()
      .multiplyScalar(320)
      .applyQuaternion(camera.quaternion)
    sun.position.copy(camera.position).add(viewOffset)
  }
  renderer.render(scene, camera)
  lastFrame = now
}

async function initialize() {
  if (!host.value) return
  if (!supportsWebGL()) { failed.value = true; emit('fallback', 'webgl'); return }
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  lowQuality = window.innerWidth < 720 || navigator.hardwareConcurrency <= 4 || Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8) <= 4
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: lowQuality ? 'low-power' : 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQuality ? 1 : 1.6))
    renderer.setClearColor(spaceBackground(), 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.02
    renderer.domElement.dataset.constellationCanvas = 'true'
    renderer.domElement.setAttribute('aria-label', '可交互的三维时光星图')
    host.value.appendChild(renderer.domElement)
    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(spaceBackground(), .0016)
    camera = new THREE.PerspectiveCamera(48, 1, .1, 1400)
    camera.position.set(0, 20, window.innerWidth < 720 ? 390 : 500)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = .055
    controls.enablePan = false
    controls.minDistance = 38
    controls.maxDistance = 480
    controls.autoRotate = !props.ambient && !reducedMotion.value
    controls.autoRotateSpeed = .18
    controls.enableRotate = !props.ambient
    controls.enableZoom = !props.ambient
    controls.enabled = !props.ambient
    const ambientLight = new THREE.AmbientLight(0xb9a98b, .72); ambientLight.name = 'ambient-light'; scene.add(ambientLight)
    const keyLight = new THREE.PointLight(0xf0b76b, 880, 420); keyLight.name = 'key-light'; keyLight.position.set(0, 18, 28); scene.add(keyLight)
    buildScene()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    host.value.addEventListener('pointermove', onPointerMove)
    host.value.addEventListener('pointerdown', onPointerDown)
    host.value.addEventListener('click', onClick)
    idleSince = performance.now()
    introStartedAt = performance.now()
    introInterrupted = Boolean(props.selectedId)
    lastFrame = 0
    resize()
    renderer.render(scene, camera)
    ready.value = true
    emit('ready')
    animate()
  } catch {
    failed.value = true
    emit('fallback', 'initialization')
    destroy()
  }
}

function destroy() {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  resizeObserver = null
  host.value?.removeEventListener('pointermove', onPointerMove)
  host.value?.removeEventListener('pointerdown', onPointerDown)
  host.value?.removeEventListener('click', onClick)
  controls?.dispose()
  clearSceneContent()
  renderer?.dispose()
  renderer?.domElement.remove()
  controls = null
  renderer = null
  camera = null
  scene = null
}

watch(() => [props.graphVersion, props.nodes, props.relations, props.routeNodeIds.join('|')], () => {
  if (!scene || !renderer) return
  renderer.setClearColor(spaceBackground(), 1)
  renderer.toneMappingExposure = 1.02
  scene.fog = new THREE.FogExp2(spaceBackground(), .0016)
  const ambientLight = scene.getObjectByName('ambient-light') as THREE.AmbientLight | undefined
  if (ambientLight) { ambientLight.color.setHex(0xb9a98b); ambientLight.intensity = .72 }
  const keyLight = scene.getObjectByName('key-light') as THREE.PointLight | undefined
  if (keyLight) { keyLight.color.setHex(0xf0b76b); keyLight.intensity = 880 }
  buildScene()
})
watch(() => props.selectedId, () => applySelection())
onMounted(initialize)
onBeforeUnmount(() => { disposed = true; destroy() })

defineExpose({
  focusNode: (id: string) => { const node = nodeLookup.get(id); if (node) emit('select', node) },
  resetView,
})
</script>

<style scoped>
.constellation-scene { position:absolute; inset:0; min-width:0; min-height:0; overflow:hidden; background:#05090c; transition:background-color .45s ease; }
.scene-host { position:absolute; inset:0; min-width:0; min-height:0; touch-action:none; }
.constellation-scene :deep(canvas) { display:block; width:100%; height:100%; outline:none; opacity:0; transform:scale(1.04); transition:opacity 1.2s ease,transform 1.8s cubic-bezier(.16,1,.3,1); }.constellation-scene.is-ready :deep(canvas){opacity:1;transform:scale(1)}
.scene-awakening { position:absolute; z-index:2; inset:0; display:grid; align-content:center; justify-items:center; gap:20px; background:#05090c; color:#b9ad95; pointer-events:none; }
.awakening-core { position:relative; display:grid; width:72px; height:72px; border:1px solid rgb(221 173 91/.42); border-radius:50%; place-items:center; animation:awakening-turn 6s linear infinite; }.awakening-core::before { width:13px; height:13px; border-radius:50%; background:#e1b362; box-shadow:0 0 28px #d89a45; content:''; }.awakening-core i { position:absolute; inset:8px; border:1px solid rgb(203 177 127/.3); border-radius:50%; transform:rotate(62deg); }.awakening-core i:nth-child(2){inset:-9px;transform:rotate(-28deg)}.awakening-core i:nth-child(3){inset:24px -14px;transform:rotate(18deg)}.scene-awakening small{font-size:.62rem;letter-spacing:.12em}
.scene-tooltip { position:fixed; z-index:20; max-width:220px; padding:7px 9px; border:1px solid rgb(118 185 246/.2); border-radius:6px; background:rgb(5 15 30/.9); box-shadow:0 8px 24px rgb(0 0 0/.28); color:#edf6ff; font-size:.66rem; opacity:0; pointer-events:none; transform:translateY(4px); transition:opacity .15s ease,transform .15s ease; }.scene-tooltip.visible{opacity:1;transform:none}
@keyframes awakening-turn{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.constellation-scene :deep(canvas),.scene-tooltip{transition:none}.awakening-core{animation:none}}
</style>
