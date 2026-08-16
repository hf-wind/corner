<template>
  <div
    ref="root"
    class="constellation-scene"
    :class="{ 'is-ready': ready, 'is-ambient': ambient }"
  >
    <div ref="host" class="scene-host" />
    <div v-if="!ready && !failed" class="scene-awakening" aria-live="polite">
      <span class="awakening-core"><i /><i /><i /></span>
      <small>记忆正在沿时间轨道点亮</small>
    </div>
    <div ref="tooltip" class="scene-tooltip" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type MemoryNode = {
  id: string;
  type: string;
  title: string;
  excerpt?: string | null;
  href?: string;
  image?: string | null;
  occurredAt?: string | null;
  coordinateSeed?: number;
  metadata?: Record<string, unknown>;
};

type MemoryRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
};

type CameraSnapshot = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up?: THREE.Vector3;
};

type CameraFlight = CameraSnapshot & {
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  fromUp: THREE.Vector3;
  up: THREE.Vector3;
  startedAt: number;
  duration: number;
  arcHeight: number;
  completion?: "reset";
};

type DiscoveryId =
  | "planet"
  | "sun"
  | "black-hole"
  | "station"
  | "satellite"
  | "spacecraft";

type SceneHit =
  | { kind: "memory"; node: MemoryNode; label: string }
  | { kind: "discovery"; id: DiscoveryId; label: string };

type PlanetProfile = {
  surface: number;
  atmosphere: number;
  glow: number;
  accent: number;
  surfaceCss: string;
  accentCss: string;
};

const props = withDefaults(
  defineProps<{
    nodes: MemoryNode[];
    relations: MemoryRelation[];
    graphVersion: string;
    selectedId?: string;
    routeNodeIds?: string[];
    resolveImage?: (source: string) => string;
    ambient?: boolean;
    introDelayMs?: number;
    narrativeProgress?: number;
  }>(),
  {
    selectedId: "",
    routeNodeIds: () => [],
    resolveImage: (source: string) => source,
    ambient: false,
    introDelayMs: 0,
    narrativeProgress: -1,
  },
);

const emit = defineEmits<{
  select: [node: MemoryNode];
  discover: [id: DiscoveryId];
  clear: [];
  ready: [];
  fallback: [reason: "webgl" | "initialization"];
  focusCleared: [];
  immersiveChange: [active: boolean];
}>();

const root = ref<HTMLElement | null>(null);
const host = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null);
const ready = ref(false);
const failed = ref(false);
const reducedMotion = ref(false);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame = 0;
let elapsed = 0;
let lastFrame = 0;
let lowQuality = false;
let disposed = false;
let core: THREE.Group | null = null;
let sun: THREE.Group | null = null;
let blackHole: THREE.Group | null = null;
let spaceStation: THREE.Group | null = null;
let satellite: THREE.Group | null = null;
let spacecraft: THREE.Group | null = null;
let meteor: THREE.Sprite | null = null;
let meteorTrail: THREE.Line | null = null;
let warpLines: THREE.LineSegments | null = null;
let warpMaterial: THREE.LineBasicMaterial | null = null;
let introStartedAt = 0;
let introInterrupted = false;
let introCompleted = false;
let ambientOrbitPhase = -0.18;
let discoveryEffect: DiscoveryId | "" = "";
let discoveryEffectStartedAt = 0;
let spacecraftLaunchAt = -20;
let spacecraftLaunchActive = false;
let cameraFlight: CameraFlight | null = null;
let overviewSnapshot: CameraSnapshot | null = null;
let activeSelectionId = "";
let focusedDiscoveryId: DiscoveryId | "" = "";
let resettingDiscoveryId: DiscoveryId | "" = "";
const blackHoleResetFrom = new THREE.Vector3();
let blackHoleResetActive = false;
const sunResetFrom = new THREE.Vector3();
let sunResetActive = false;
let discoveryTourId: DiscoveryId | "" = "";
let pendingDiscoveryTourId: DiscoveryId | "" = "";
let cruisePausedUntil = 0;
let cruiseHeight = 68;
let cruiseOrbitRadius = 218;
let cruiseBobPhase = 0;
let cruiseBlendStartedAt = 0;
let discoveryTourPhase = 0;
let discoveryTourHeight = 0;
let stationOrbitPhase = -0.72;
let satelliteOrbitPhase = -2.28;
let spacecraftCruisePhase = -0.56;
let cameraFlightTrackingId: DiscoveryId | "" = "";
const focusedCameraPositionOffset = new THREE.Vector3();
const focusedCameraTargetOffset = new THREE.Vector3();
const narrativeCameraPosition = new THREE.Vector3();
const narrativeCameraTarget = new THREE.Vector3();
const spacecraftLaunchFrom = new THREE.Vector3();
const spacecraftLaunchControl = new THREE.Vector3();
const spacecraftLaunchTo = new THREE.Vector3();
const spacecraftFlightPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(118, 20, -72),
    new THREE.Vector3(32, 58, -132),
    new THREE.Vector3(-86, 30, -98),
    new THREE.Vector3(-138, -12, 6),
    new THREE.Vector3(-72, 42, 112),
    new THREE.Vector3(42, 18, 138),
    new THREE.Vector3(136, -20, 62),
  ],
  true,
  "catmullrom",
  0.42,
);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(2, 2);
const nodeObjects = new Map<string, THREE.Object3D>();
const nodePositions = new Map<string, THREE.Vector3>();
const nodeLookup = new Map<string, MemoryNode>();
const interactive: THREE.Object3D[] = [];
const discoveryInteractive: THREE.Object3D[] = [];
const discoveryObjects = new Map<DiscoveryId, THREE.Group>();
const starLayers: THREE.Points[] = [];
const cosmicBodies: THREE.Group[] = [];
const enginePlumeMaterials: THREE.ShaderMaterial[] = [];
const disposables = new Set<{ dispose: () => void }>();
const INTRO_DURATION = 3600;
const INTRO_START_PHASE = 0.2;
const INTRO_END_PHASE = -0.18;
const CRUISE_ANGULAR_SPEED = ((Math.PI * 2) / 60) * 0.18;
const NARRATIVE_PHASES = [-0.18, -0.52, -1.04, -0.25];
const NARRATIVE_RADII = [218, 188, 154, 214];
const NARRATIVE_HEIGHTS = [68, 48, 34, 64];
const NARRATIVE_TARGET_X = [-44, -30, -10, -44];
const NARRATIVE_TARGET_Y = [0, -5, 1, 0];
const planetProfiles: PlanetProfile[] = [
  {
    surface: 0x4679a8,
    atmosphere: 0x6fc8f0,
    glow: 0x56c5f1,
    accent: 0x91c5a6,
    surfaceCss: "#4679a8",
    accentCss: "#91c5a6",
  },
  {
    surface: 0xb75d49,
    atmosphere: 0xf18d67,
    glow: 0xeb8060,
    accent: 0xd2a06e,
    surfaceCss: "#b75d49",
    accentCss: "#d2a06e",
  },
  {
    surface: 0xb47d5d,
    atmosphere: 0xe4b892,
    glow: 0xe2a66e,
    accent: 0xf0d1ab,
    surfaceCss: "#b47d5d",
    accentCss: "#f0d1ab",
  },
  {
    surface: 0x3f63b8,
    atmosphere: 0x63a9ff,
    glow: 0x4d97ff,
    accent: 0x9cd9ff,
    surfaceCss: "#3f63b8",
    accentCss: "#9cd9ff",
  },
  {
    surface: 0x5ba8a7,
    atmosphere: 0x9ee9df,
    glow: 0x79e5dc,
    accent: 0xc1f3ec,
    surfaceCss: "#5ba8a7",
    accentCss: "#c1f3ec",
  },
  {
    surface: 0xc2965f,
    atmosphere: 0xf0cb8c,
    glow: 0xf0b972,
    accent: 0xf4ddb2,
    surfaceCss: "#c2965f",
    accentCss: "#f4ddb2",
  },
  {
    surface: 0xb48655,
    atmosphere: 0xeec788,
    glow: 0xe5b16e,
    accent: 0xebd5a7,
    surfaceCss: "#b48655",
    accentCss: "#ebd5a7",
  },
  {
    surface: 0x738ca8,
    atmosphere: 0xc4def7,
    glow: 0x91c4ff,
    accent: 0xdceafa,
    surfaceCss: "#738ca8",
    accentCss: "#dceafa",
  },
];
const typeLevels: Record<string, number> = {
  memory: 2,
  place: 0,
  journey: 6,
  album: -5,
  photo: -8,
  moment: 9,
  post: 3,
  library: -2,
};

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function hash(value: string) {
  let result = 2166136261;
  for (const char of value)
    result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

function randomFrom(seedValue: number) {
  let seed = seedValue || 1;
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function yearOf(node: MemoryNode) {
  if (!node.occurredAt) return null;
  const date = new Date(node.occurredAt);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

function buildPosition(
  node: MemoryNode,
  years: number[],
  ringSize: number,
  slot: number,
) {
  const random = randomFrom(Number(node.coordinateSeed) || hash(node.id));
  const date = node.occurredAt ? new Date(node.occurredAt) : null;
  const year =
    date && !Number.isNaN(date.getTime()) ? date.getFullYear() : null;
  const ringIndex =
    year == null ? years.length : Math.max(0, years.indexOf(year));
  const radius = 46 + ringIndex * 26 + (random() - 0.5) * 12;
  const angle =
    ringSize > 1
      ? (slot / ringSize) * Math.PI * 2 +
        (random() - 0.5) * ((Math.PI * 2) / ringSize) * 0.45
      : random() * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    (typeLevels[node.type] || 0) + (random() - 0.5) * 16,
    Math.sin(angle) * radius * 0.66,
  );
}

function track(resource: { dispose: () => void }) {
  disposables.add(resource);
  return resource;
}

function spaceBackground() {
  return 0x030817;
}

function planetVariant(node: MemoryNode) {
  return hash(`${node.id}:variant`) % 5;
}

function planetProfile(node: MemoryNode) {
  const typeOffset: Record<string, number> = {
    memory: 0,
    post: 1,
    moment: 4,
    album: 3,
    photo: 7,
    place: 0,
    library: 2,
    journey: 5,
  };
  const index =
    (hash(`${node.id}:planet-profile`) + (typeOffset[node.type] || 0)) %
    planetProfiles.length;
  return planetProfiles[index];
}

function planetTexture(node: MemoryNode, profile: PlanetProfile) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const random = randomFrom(hash(`${node.id}:surface`));
  const variant = planetVariant(node);
  const color = new THREE.Color(profile.surface);
  const accentColor = new THREE.Color(profile.accent);
  const hsl = { h: 0, s: 0, l: 0 };
  const accentHsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  accentColor.getHSL(accentHsl);
  const hue = Math.round(hsl.h * 360);
  const accentHue = Math.round(accentHsl.h * 360);
  const accentSaturation = Math.round(accentHsl.s * 100);
  const saturation = Math.min(56, Math.max(26, Math.round(hsl.s * 82)));
  const base = context.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, `hsl(${hue} ${Math.min(64, saturation + 5)}% 58%)`);
  base.addColorStop(0.48, `hsl(${hue} ${saturation}% 39%)`);
  base.addColorStop(
    1,
    `hsl(${(hue + 10) % 360} ${Math.max(20, saturation - 14)}% 19%)`,
  );
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const bandCount = variant === 1 ? 24 : 8 + Math.floor(random() * 7);
  for (let index = 0; index < bandCount; index++) {
    const y = random() * canvas.height;
    const height = variant === 1 ? 1 + random() * 7 : 2 + random() * 10;
    const lightness = 27 + random() * 32;
    context.fillStyle = `hsla(${(hue + (random() - 0.5) * 18 + 360) % 360} ${saturation}% ${lightness}% / ${variant === 1 ? 0.16 + random() * 0.22 : 0.06 + random() * 0.16})`;
    context.fillRect(0, y, canvas.width, height);
  }

  const landCount =
    variant === 2 || node.type === "place" || node.type === "journey" ? 18 : 7;
  for (let index = 0; index < landCount; index++) {
    const x = random() * canvas.width;
    const y = 12 + random() * (canvas.height - 24);
    const radiusX = 5 + random() * 25;
    const radiusY = 2 + random() * 11;
    context.beginPath();
    context.ellipse(
      x,
      y,
      radiusX,
      radiusY,
      (random() - 0.5) * 0.7,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `hsla(${(accentHue + (random() - 0.5) * 12 + 360) % 360} ${Math.max(18, accentSaturation)}% ${28 + random() * 24}% / ${0.16 + random() * 0.28})`;
    context.fill();
  }

  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 12; index++) {
    context.beginPath();
    context.ellipse(
      random() * canvas.width,
      random() * canvas.height,
      10 + random() * 30,
      1 + random() * 3.5,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `rgba(220, 242, 255, ${0.035 + random() * 0.08})`;
    context.fill();
  }
  context.globalCompositeOperation = "source-over";

  if (variant === 0) {
    for (let index = 0; index < 22; index++) {
      const x = random() * canvas.width;
      const y = 10 + random() * (canvas.height - 20);
      const radius = 1.2 + random() * 5.5;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(20, 24, 28, ${0.08 + random() * 0.16})`;
      context.fill();
      context.strokeStyle = `rgba(225, 224, 208, ${0.05 + random() * 0.1})`;
      context.lineWidth = 0.7;
      context.stroke();
    }
  } else if (variant === 3) {
    const north = context.createLinearGradient(0, 0, 0, 35);
    north.addColorStop(0, "rgba(230,241,239,.78)");
    north.addColorStop(1, "rgba(184,213,216,0)");
    context.fillStyle = north;
    context.fillRect(0, 0, canvas.width, 38);
    const south = context.createLinearGradient(
      0,
      canvas.height - 35,
      0,
      canvas.height,
    );
    south.addColorStop(0, "rgba(184,213,216,0)");
    south.addColorStop(1, "rgba(230,241,239,.7)");
    context.fillStyle = south;
    context.fillRect(0, canvas.height - 38, canvas.width, 38);
  } else if (variant === 4) {
    context.globalCompositeOperation = "screen";
    context.strokeStyle = "rgba(255,128,58,.42)";
    context.lineWidth = 1.1;
    for (let index = 0; index < 12; index++) {
      let x = random() * canvas.width;
      let y = random() * canvas.height;
      context.beginPath();
      context.moveTo(x, y);
      for (let segment = 0; segment < 5; segment++) {
        x += (random() - 0.5) * 22;
        y += (random() - 0.5) * 15;
        context.lineTo(x, y);
      }
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  }

  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(
    4,
    renderer?.capabilities.getMaxAnisotropy() || 1,
  );
  return texture;
}

function drawLogoMark(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  opacity: number,
) {
  context.save();
  context.translate(centerX - 32 * scale, centerY - 32 * scale);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = `rgba(225, 246, 255, ${opacity})`;
  context.shadowColor = "rgba(91, 193, 255, .75)";
  context.shadowBlur = 6;
  const strokes = [
    { path: "M15 14v35h35", width: 2.8, alpha: 0.32 },
    {
      path: "M7 25c11 0 12-8 24-8 7 0 10 3 10 7 0 5-4 8-9 8",
      width: 3.2,
      alpha: 1,
    },
    { path: "M7 36h37c7 0 11-3 11-8", width: 3.2, alpha: 0.82 },
    { path: "M17 46h25c6 0 9 3 9 7", width: 3.2, alpha: 0.56 },
  ];
  for (const stroke of strokes) {
    context.globalAlpha = stroke.alpha;
    context.lineWidth = stroke.width;
    context.stroke(new Path2D(stroke.path));
  }
  context.globalAlpha = 1;
  context.fillStyle = "#ffd095";
  context.shadowColor = "rgba(255, 164, 82, .9)";
  context.shadowBlur = 7;
  context.beginPath();
  context.arc(15, 14, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function corePlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  const random = randomFrom(hash("corner:core:surface"));
  const base = context.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, "#74bce7");
  base.addColorStop(0.42, "#276b9e");
  base.addColorStop(0.72, "#164b79");
  base.addColorStop(1, "#082943");
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 42; index++) {
    const y = random() * canvas.height;
    const height = 3 + random() * 24;
    const wave = context.createLinearGradient(0, y, canvas.width, y + height);
    wave.addColorStop(0, `rgba(110, 204, 239, ${0.03 + random() * 0.08})`);
    wave.addColorStop(0.48, `rgba(11, 61, 104, ${0.08 + random() * 0.14})`);
    wave.addColorStop(1, `rgba(129, 220, 239, ${0.025 + random() * 0.07})`);
    context.fillStyle = wave;
    context.fillRect(0, y, canvas.width, height);
  }

  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 24; index++) {
    context.beginPath();
    context.ellipse(
      random() * canvas.width,
      random() * canvas.height,
      18 + random() * 72,
      2 + random() * 8,
      (random() - 0.5) * 0.18,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `rgba(130, 221, 244, ${0.025 + random() * 0.07})`;
    context.fill();
  }
  context.globalCompositeOperation = "source-over";

  const landColors = [
    "rgba(73, 139, 122, .78)",
    "rgba(91, 154, 124, .7)",
    "rgba(65, 111, 105, .74)",
  ];
  for (let continent = 0; continent < 8; continent++) {
    const centerX = random() * canvas.width;
    const centerY = 52 + random() * (canvas.height - 104);
    const width = 34 + random() * 92;
    const height = 18 + random() * 48;
    context.save();
    context.translate(centerX, centerY);
    context.rotate((random() - 0.5) * 0.6);
    for (let lobe = 0; lobe < 9; lobe++) {
      context.beginPath();
      context.ellipse(
        (random() - 0.5) * width,
        (random() - 0.5) * height,
        width * (0.2 + random() * 0.34),
        height * (0.2 + random() * 0.38),
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fillStyle = landColors[(continent + lobe) % landColors.length];
      context.fill();
    }
    context.restore();
  }

  const northIce = context.createLinearGradient(0, 0, 0, 42);
  northIce.addColorStop(0, "rgba(231, 247, 250, .9)");
  northIce.addColorStop(1, "rgba(204, 235, 242, 0)");
  context.fillStyle = northIce;
  context.fillRect(0, 0, canvas.width, 42);
  const southIce = context.createLinearGradient(
    0,
    canvas.height - 42,
    0,
    canvas.height,
  );
  southIce.addColorStop(0, "rgba(204, 235, 242, 0)");
  southIce.addColorStop(1, "rgba(231, 247, 250, .84)");
  context.fillStyle = southIce;
  context.fillRect(0, canvas.height - 42, canvas.width, 42);

  for (const x of [96, 288, 480, 672])
    drawLogoMark(context, x, 192, 1.55, 0.32);

  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(
    8,
    renderer?.capabilities.getMaxAnisotropy() || 1,
  );
  return texture;
}

function coreCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = lowQuality ? 512 : 1024;
  canvas.height = canvas.width / 2;
  const context = canvas.getContext("2d")!;
  const random = randomFrom(hash("corner:core:clouds"));
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let system = 0; system < (lowQuality ? 38 : 72); system++) {
    const centerX = random() * canvas.width;
    const centerY = 18 + random() * (canvas.height - 36);
    const width = 18 + random() * 72;
    const height = 2 + random() * 9;
    context.save();
    context.translate(centerX, centerY);
    context.rotate((random() - 0.5) * 0.18);
    for (let puff = 0; puff < 5; puff++) {
      context.beginPath();
      context.ellipse(
        (random() - 0.5) * width,
        (random() - 0.5) * height * 2.4,
        width * (0.22 + random() * 0.34),
        height * (0.5 + random() * 0.9),
        (random() - 0.5) * 0.2,
        0,
        Math.PI * 2,
      );
      context.fillStyle = `rgba(238, 249, 255, ${0.08 + random() * 0.28})`;
      context.fill();
    }
    context.restore();
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(
    4,
    renderer?.capabilities.getMaxAnisotropy() || 1,
  );
  return texture;
}

function sunSurfaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const random = randomFrom(0x51a7face);
  const base = context.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, "#fffdf0");
  base.addColorStop(0.35, "#ffef9e");
  base.addColorStop(0.72, "#f9bd45");
  base.addColorStop(1, "#d86d20");
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 1200; index++) {
    const radius = 0.4 + random() * 2.4;
    context.beginPath();
    context.arc(
      random() * canvas.width,
      random() * canvas.height,
      radius,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `rgba(255, 247, 183, ${0.05 + random() * 0.23})`;
    context.fill();
  }
  context.globalCompositeOperation = "multiply";
  for (let index = 0; index < 16; index++) {
    context.beginPath();
    context.ellipse(
      random() * canvas.width,
      24 + random() * (canvas.height - 48),
      4 + random() * 16,
      2 + random() * 7,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `rgba(116, 34, 17, ${0.08 + random() * 0.2})`;
    context.fill();
  }
  context.globalCompositeOperation = "source-over";

  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(
    4,
    renderer?.capabilities.getMaxAnisotropy() || 1,
  );
  return texture;
}

function coronaTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const random = randomFrom(0xc0a0a);
  context.translate(256, 256);
  const radial = context.createRadialGradient(0, 0, 48, 0, 0, 252);
  radial.addColorStop(0, "rgba(255,239,169,.88)");
  radial.addColorStop(0.18, "rgba(255,197,63,.62)");
  radial.addColorStop(0.43, "rgba(255,126,35,.16)");
  radial.addColorStop(1, "rgba(255,74,16,0)");
  context.fillStyle = radial;
  context.fillRect(-256, -256, 512, 512);
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 92; index++) {
    const angle = random() * Math.PI * 2;
    const inner = 58 + random() * 22;
    const length = 60 + Math.pow(random(), 2.2) * 150;
    context.save();
    context.rotate(angle);
    const ray = context.createLinearGradient(inner, 0, inner + length, 0);
    ray.addColorStop(0, `rgba(255, 223, 128, ${0.08 + random() * 0.16})`);
    ray.addColorStop(1, "rgba(255, 112, 32, 0)");
    context.strokeStyle = ray;
    context.lineWidth = 0.35 + random() * 1.5;
    context.beginPath();
    context.moveTo(inner, (random() - 0.5) * 8);
    context.quadraticCurveTo(
      inner + length * 0.52,
      (random() - 0.5) * 18,
      inner + length,
      (random() - 0.5) * 32,
    );
    context.stroke();
    context.restore();
  }
  return track(new THREE.CanvasTexture(canvas));
}

function atmosphereMaterial(colorValue: number, opacity: number) {
  const material = track(
    new THREE.ShaderMaterial({
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
    }),
  );
  material.userData.baseGlowOpacity = opacity;
  return material;
}

function glowTexture(color = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.12, color);
  gradient.addColorStop(0.38, `${color}66`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return track(new THREE.CanvasTexture(canvas));
}

function circleMaskTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(64, 64, 61, 0, Math.PI * 2);
  context.fill();
  return track(new THREE.CanvasTexture(canvas));
}

function accretionDiskTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const random = randomFrom(0xb1ac4a1e);
  context.translate(256, 256);
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 360; index++) {
    const radius = 78 + Math.pow(random(), 0.68) * 166;
    const start = random() * Math.PI * 2;
    const length = 0.08 + random() * 0.72;
    const hot = radius < 136;
    context.beginPath();
    context.arc(0, 0, radius, start, start + length);
    context.lineWidth = 0.35 + random() * (hot ? 3.6 : 2.2);
    context.strokeStyle = hot
      ? `rgba(255, ${172 + Math.floor(random() * 72)}, ${72 + Math.floor(random() * 95)}, ${0.12 + random() * 0.58})`
      : `rgba(210, ${76 + Math.floor(random() * 80)}, ${28 + Math.floor(random() * 52)}, ${0.04 + random() * 0.24})`;
    context.stroke();
  }
  const veil = context.createRadialGradient(0, 0, 62, 0, 0, 252);
  veil.addColorStop(0, "rgba(255,228,185,0)");
  veil.addColorStop(0.27, "rgba(255,185,104,.42)");
  veil.addColorStop(0.48, "rgba(229,91,32,.16)");
  veil.addColorStop(1, "rgba(105,25,12,0)");
  context.fillStyle = veil;
  context.fillRect(-256, -256, 512, 512);
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addStarField() {
  if (!scene) return;
  const random = randomFrom(20260731);
  const layerSettings = lowQuality
    ? [
        {
          count: 920,
          near: 125,
          depth: 430,
          size: 1.45,
          opacity: 0.9,
          color: 0xd9efff,
        },
        {
          count: 90,
          near: 80,
          depth: 240,
          size: 3.2,
          opacity: 0.72,
          color: 0xffe3b0,
        },
      ]
    : [
        {
          count: 2400,
          near: 125,
          depth: 520,
          size: 1.26,
          opacity: 0.9,
          color: 0xd9efff,
        },
        {
          count: 980,
          near: 72,
          depth: 320,
          size: 2.05,
          opacity: 0.68,
          color: 0x87baff,
        },
        {
          count: 180,
          near: 58,
          depth: 240,
          size: 3.8,
          opacity: 0.7,
          color: 0xffdfaa,
        },
      ];
  for (const [layerIndex, settings] of layerSettings.entries()) {
    const positions = new Float32Array(settings.count * 3);
    for (let index = 0; index < settings.count; index++) {
      const radius = settings.near + random() * settings.depth;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = track(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = track(
      new THREE.PointsMaterial({
        color: settings.color,
        map: glowTexture(`#${settings.color.toString(16).padStart(6, "0")}`),
        size: settings.size,
        transparent: true,
        opacity: settings.opacity,
        alphaTest: 0.02,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      }),
    );
    const stars = new THREE.Points(geometry, material);
    stars.name = `star-field-${layerIndex}`;
    starLayers.push(stars);
    scene.add(stars);
  }

  const dustCount = lowQuality ? 320 : 960;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  const coolDust = new THREE.Color(0x527dc3);
  const warmDust = new THREE.Color(0xd8a66f);
  for (let index = 0; index < dustCount; index++) {
    const radius = 120 + Math.pow(random(), 0.72) * 430;
    const theta = random() * Math.PI * 2;
    const vertical = (random() - 0.5) * (18 + radius * 0.08);
    dustPositions[index * 3] = Math.cos(theta) * radius;
    dustPositions[index * 3 + 1] = vertical;
    dustPositions[index * 3 + 2] = Math.sin(theta) * radius;
    const shade = coolDust.clone().lerp(warmDust, random() * 0.7);
    dustColors[index * 3] = shade.r;
    dustColors[index * 3 + 1] = shade.g;
    dustColors[index * 3 + 2] = shade.b;
  }
  const dustGeometry = track(new THREE.BufferGeometry());
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustPositions, 3),
  );
  dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
  const dust = new THREE.Points(
    dustGeometry,
    track(
      new THREE.PointsMaterial({
        vertexColors: true,
        map: glowTexture("#d8e8ff"),
        size: lowQuality ? 1.05 : 1.25,
        transparent: true,
        opacity: 0.32,
        alphaTest: 0.015,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  dust.name = "galactic-dust";
  dust.rotation.set(0.18, 0, -0.12);
  starLayers.push(dust);
  scene.add(dust);

  const streakCount = lowQuality ? 40 : 150;
  const streakPositions = new Float32Array(streakCount * 6);
  for (let index = 0; index < streakCount; index++) {
    const x = (random() - 0.5) * 380;
    const y = (random() - 0.5) * 220;
    const z = -180 + random() * 620;
    const length = 18 + random() * 48;
    streakPositions[index * 6] = x;
    streakPositions[index * 6 + 1] = y;
    streakPositions[index * 6 + 2] = z;
    streakPositions[index * 6 + 3] = x;
    streakPositions[index * 6 + 4] = y;
    streakPositions[index * 6 + 5] = z + length;
  }
  const streakGeometry = track(new THREE.BufferGeometry());
  streakGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(streakPositions, 3),
  );
  warpMaterial = track(
    new THREE.LineBasicMaterial({
      color: 0x6eb6ff,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  warpLines = new THREE.LineSegments(streakGeometry, warpMaterial);
  warpLines.name = "warp-lines";
  scene.add(warpLines);
}

function addCore() {
  if (!scene) return;
  core = new THREE.Group();
  core.name = "corner-homeworld";
  const coreTexture = corePlanetTexture();
  const orbMaterial = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: coreTexture,
      emissiveMap: coreTexture,
      emissive: 0x2f83bd,
      emissiveIntensity: 0.24,
      roughness: 0.46,
      metalness: 0.08,
    }),
  );
  const orbGeometry = track(
    new THREE.SphereGeometry(10.2, lowQuality ? 24 : 64, lowQuality ? 16 : 40),
  );
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  orb.name = "core-surface";
  core.add(orb);
  const clouds = new THREE.Mesh(
    orbGeometry,
    track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: coreCloudTexture(),
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        roughness: 0.92,
        metalness: 0,
      }),
    ),
  );
  clouds.name = "core-clouds";
  clouds.scale.setScalar(1.018);
  clouds.rotation.y = 0.34;
  core.add(clouds);
  const coreAtmosphere = new THREE.Mesh(
    orbGeometry,
    atmosphereMaterial(0x69caff, 1.08),
  );
  coreAtmosphere.name = "core-atmosphere";
  coreAtmosphere.scale.setScalar(1.14);
  coreAtmosphere.renderOrder = 4;
  core.add(coreAtmosphere);
  const planetaryGlow = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture("#4aaee8"),
        color: 0x5dbdf0,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  planetaryGlow.scale.set(34, 34, 1);
  core.add(planetaryGlow);
  const ringMaterial = track(
    new THREE.MeshBasicMaterial({
      color: 0x67bdf2,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  for (const [scale, tilt] of [
    [18, 0.9],
    [24, -1.15],
  ] as const) {
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(scale, 0.1, 5, 96)),
      ringMaterial,
    );
    ring.rotation.set(tilt, 0.25, 0.12);
    core.add(ring);
  }
  const moonOrbit = new THREE.Group();
  moonOrbit.name = "core-moon-orbit";
  moonOrbit.rotation.set(0.42, 0, -0.16);
  const moon = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(1.25, lowQuality ? 12 : 24, lowQuality ? 8 : 16),
    ),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xaeb8c0,
        roughness: 0.9,
        metalness: 0.02,
        emissive: 0x18222b,
        emissiveIntensity: 0.18,
      }),
    ),
  );
  moon.position.set(20.5, 0, 0);
  moonOrbit.add(moon);
  core.add(moonOrbit);
  registerDiscovery("planet", "风隅星 · 记忆母星", core, 12.5);
  scene.add(core);
}

function registerDiscovery(
  id: DiscoveryId,
  label: string,
  object: THREE.Group,
  hitRadius: number,
) {
  const hitTarget = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(
        hitRadius,
        lowQuality ? 10 : 16,
        lowQuality ? 8 : 12,
      ),
    ),
    track(
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
    ),
  );
  hitTarget.userData.discoveryId = id;
  hitTarget.userData.discoveryLabel = label;
  object.add(hitTarget);
  discoveryInteractive.push(hitTarget);
  discoveryObjects.set(id, object);
}

function addSun() {
  if (!scene) return;
  const mobile = window.innerWidth < 720;
  sun = new THREE.Group();
  sun.name = "day-sun";
  const horizontalOffset = mobile ? 0.08 : 0.28;
  sun.userData.viewOffset = new THREE.Vector3(
    horizontalOffset,
    0.28,
    -1,
  ).normalize();
  sun.position.set(mobile ? 32 : 112, mobile ? 92 : 64, -132);
  const surface = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(7.8, lowQuality ? 18 : 30, lowQuality ? 12 : 20),
    ),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: sunSurfaceTexture(),
        fog: false,
      }),
    ),
  );
  sun.add(surface);
  const corona = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: coronaTexture(),
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  corona.scale.set(82, 82, 1);
  sun.add(corona);
  const innerHalo = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture("#f7b941"),
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  innerHalo.scale.set(38, 38, 1);
  sun.add(innerHalo);
  const outerHalo = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture("#ef6c2e"),
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  outerHalo.scale.set(112, 112, 1);
  sun.add(outerHalo);
  const sunlight = new THREE.PointLight(0xffe6c8, 1500, 720, 1.32);
  sun.add(sunlight);
  registerDiscovery("sun", "日冕观测站", sun, 16);
  scene.add(sun);
}

function addBlackHole() {
  if (!scene) return;
  blackHole = new THREE.Group();
  blackHole.name = "distant-black-hole";
  const horizontalOffset = window.innerWidth < 720 ? -0.18 : -0.46;
  blackHole.userData.viewOffset = new THREE.Vector3(
    horizontalOffset,
    0.22,
    -1,
  ).normalize();
  blackHole.position.set(-112, 64, -164);
  blackHole.rotation.set(0.04, -0.16, -0.08);
  blackHole.scale.setScalar(1.12);
  const eventHorizon = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(
        13.6,
        lowQuality ? 24 : 48,
        lowQuality ? 16 : 32,
      ),
    ),
    track(new THREE.MeshBasicMaterial({ color: 0x000003, fog: false })),
  );
  eventHorizon.renderOrder = 12;
  blackHole.add(eventHorizon);

  const diskTexture = accretionDiskTexture();
  const diskMaterial = track(
    new THREE.MeshBasicMaterial({
      map: diskTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  for (const [name, inner, outer, tilt, opacity] of [
    ["black-hole-disk", 14.4, 49, 1.34, 0.98],
    ["black-hole-lensed-disk", 15.2, 42, -0.58, 0.42],
  ] as const) {
    const layerMaterial =
      name === "black-hole-disk" ? diskMaterial : track(diskMaterial.clone());
    layerMaterial.opacity = opacity;
    const layer = new THREE.Mesh(
      track(new THREE.RingGeometry(inner, outer, lowQuality ? 96 : 220, 1)),
      layerMaterial,
    );
    layer.name = name;
    layer.rotation.set(tilt, 0.06, -0.18);
    layer.renderOrder = name === "black-hole-disk" ? 10 : 6;
    blackHole.add(layer);
  }

  const photonRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(14.7, 0.28, 10, lowQuality ? 96 : 220)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffbd72,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    ),
  );
  photonRing.name = "black-hole-photon-ring";
  photonRing.rotation.set(0.12, 0.08, -0.18);
  photonRing.renderOrder = 14;
  blackHole.add(photonRing);

  const crescentMaterial = track(
    new THREE.MeshBasicMaterial({
      color: 0xff9a42,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  for (const [radius, tube, arc, rotationZ, opacity] of [
    [17.2, 0.75, Math.PI * 1.42, -0.82, 0.92],
    [21.4, 0.28, Math.PI * 1.18, 2.46, 0.48],
  ] as const) {
    const material = track(crescentMaterial.clone());
    material.opacity = opacity;
    const crescent = new THREE.Mesh(
      track(
        new THREE.TorusGeometry(radius, tube, 8, lowQuality ? 72 : 150, arc),
      ),
      material,
    );
    crescent.name = "black-hole-crescent";
    crescent.rotation.set(0.1, 0.04, rotationZ);
    crescent.renderOrder = 15;
    blackHole.add(crescent);
  }

  const halo = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture("#ff5d24"),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  halo.name = "black-hole-halo";
  halo.scale.set(92, 92, 1);
  blackHole.add(halo);

  registerDiscovery("black-hole", "玄渊 X-1 · 事件视界", blackHole, 30);
  scene.add(blackHole);
}

function stationOrbitPosition(phase: number, target = new THREE.Vector3()) {
  return target.set(
    Math.cos(phase) * 154,
    18 + Math.sin(phase * 2.1) * 12,
    Math.sin(phase) * 112,
  );
}

function addSpaceStation() {
  if (!scene) return;
  spaceStation = new THREE.Group();
  spaceStation.name = "memory-space-station";
  spaceStation.position.copy(stationOrbitPosition(stationOrbitPhase));
  spaceStation.rotation.set(0.18, -stationOrbitPhase + Math.PI / 2, -0.12);
  spaceStation.scale.setScalar(lowQuality ? 1.14 : 1.58);

  const hull = track(
    new THREE.MeshStandardMaterial({
      color: 0xa9bccb,
      roughness: 0.36,
      metalness: 0.76,
      emissive: 0x071421,
      emissiveIntensity: 0.24,
    }),
  );
  const darkHull = track(
    new THREE.MeshStandardMaterial({
      color: 0x263a4a,
      roughness: 0.48,
      metalness: 0.72,
    }),
  );
  const windowMaterial = track(
    new THREE.MeshBasicMaterial({
      color: 0x77d7ff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
    }),
  );
  const solarMaterial = track(
    new THREE.MeshStandardMaterial({
      color: 0x244f88,
      roughness: 0.38,
      metalness: 0.5,
      emissive: 0x12365d,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  const stationLight = new THREE.PointLight(0x85dcff, 34, 46, 1.8);
  stationLight.position.set(0, 8, 8);
  spaceStation.add(stationLight);

  const axis = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.15, 1.15, 15, lowQuality ? 10 : 18)),
    hull,
  );
  axis.rotation.z = Math.PI / 2;
  spaceStation.add(axis);
  const hub = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(2.35, lowQuality ? 12 : 22, lowQuality ? 8 : 14),
    ),
    darkHull,
  );
  spaceStation.add(hub);

  const habitatRing = new THREE.Mesh(
    track(
      new THREE.TorusGeometry(
        6.6,
        0.55,
        lowQuality ? 6 : 10,
        lowQuality ? 36 : 72,
      ),
    ),
    hull,
  );
  habitatRing.name = "station-habitat-ring";
  habitatRing.rotation.y = Math.PI / 2;
  spaceStation.add(habitatRing);
  const innerRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(5.7, 0.1, 4, lowQuality ? 32 : 64)),
    windowMaterial,
  );
  innerRing.rotation.copy(habitatRing.rotation);
  spaceStation.add(innerRing);

  for (const side of [-1, 1]) {
    const truss = new THREE.Mesh(
      track(new THREE.BoxGeometry(8, 0.28, 0.28)),
      darkHull,
    );
    truss.position.x = side * 10.5;
    spaceStation.add(truss);
    const panel = new THREE.Mesh(
      track(new THREE.BoxGeometry(8.4, 0.1, 4.4)),
      solarMaterial,
    );
    panel.position.x = side * 16;
    panel.rotation.x = side * 0.08;
    spaceStation.add(panel);
    for (let stripe = -3; stripe <= 3; stripe++) {
      const line = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.035, 0.12, 4.3)),
        windowMaterial,
      );
      line.position.set(side * 16 + stripe * 0.95, 0.08, 0);
      spaceStation.add(line);
    }
  }

  const antenna = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.08, 0.08, 7, 6)),
    hull,
  );
  antenna.position.y = 5.8;
  spaceStation.add(antenna);
  const dish = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(
        2.1,
        lowQuality ? 12 : 20,
        7,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
    ),
    hull,
  );
  dish.position.y = 9;
  dish.rotation.x = Math.PI;
  spaceStation.add(dish);

  for (const [x, y, z] of [
    [-6.6, 0, 0],
    [6.6, 0, 0],
    [0, 6.8, 0],
  ] as const) {
    const beacon = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glowTexture("#7bdcff"),
          color: 0x7bdcff,
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    beacon.position.set(x, y, z);
    beacon.scale.set(2.2, 2.2, 1);
    spaceStation.add(beacon);
  }
  registerDiscovery("station", "风隅轨道站 · FYOS-01", spaceStation, 16);
  const orbitPoints: THREE.Vector3[] = [];
  for (let index = 0; index <= 240; index++)
    orbitPoints.push(stationOrbitPosition((index / 240) * Math.PI * 2));
  const orbit = new THREE.Line(
    track(new THREE.BufferGeometry().setFromPoints(orbitPoints)),
    track(
      new THREE.LineBasicMaterial({
        color: 0x4f9fc8,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  orbit.name = "station-orbit-guide";
  scene.add(orbit);
  scene.add(spaceStation);
}

function addSatellite() {
  if (!scene) return;
  satellite = new THREE.Group();
  satellite.name = "signal-satellite";
  satellite.position.set(-72, -38, -86);
  satellite.rotation.set(0.18, 0.42, -0.12);

  const hull = track(
    new THREE.MeshStandardMaterial({
      color: 0xb7c7d2,
      roughness: 0.35,
      metalness: 0.76,
      emissive: 0x102235,
      emissiveIntensity: 0.28,
    }),
  );
  const panel = track(
    new THREE.MeshStandardMaterial({
      color: 0x285b9a,
      roughness: 0.42,
      metalness: 0.42,
      emissive: 0x0d3765,
      emissiveIntensity: 0.58,
      side: THREE.DoubleSide,
    }),
  );
  const signal = track(
    new THREE.MeshBasicMaterial({
      color: 0x76e6ff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const body = new THREE.Mesh(
    track(new THREE.BoxGeometry(5.8, 4.2, 4.2)),
    hull,
  );
  satellite.add(body);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      track(new THREE.BoxGeometry(8.5, 0.12, 3.8)),
      panel,
    );
    wing.position.x = side * 7.3;
    satellite.add(wing);
  }
  const mast = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 7)),
    hull,
  );
  mast.position.y = 4.2;
  satellite.add(mast);
  const dish = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(
        1.7,
        lowQuality ? 10 : 18,
        6,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
    ),
    hull,
  );
  dish.position.y = 7.1;
  dish.rotation.x = Math.PI;
  satellite.add(dish);
  for (const radius of [7.2, 10.5]) {
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(radius, 0.08, 4, lowQuality ? 36 : 72)),
      signal,
    );
    ring.name = "satellite-signal-ring";
    ring.rotation.x = Math.PI / 2;
    satellite.add(ring);
  }
  const beacon = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture("#7ceaff"),
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  beacon.name = "satellite-beacon";
  beacon.scale.set(5, 5, 1);
  satellite.add(beacon);
  registerDiscovery("satellite", "深空信标卫星", satellite, 10);
  scene.add(satellite);
}

function enginePlumeMaterial(inner: boolean, phase: number) {
  const material = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBoost: { value: 0 },
        uPhase: { value: phase },
        uInner: { value: inner ? 1 : 0 },
      },
      vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uBoost;
      uniform float uPhase;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float turbulence = sin(uTime * 13.0 + uv.y * 22.0 + uPhase) * (0.035 + uBoost * 0.055);
        transformed.xz *= 1.0 + turbulence * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
      fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uBoost;
      uniform float uPhase;
      uniform float uInner;
      void main() {
        float axial = clamp(vUv.y, 0.0, 1.0);
        float flicker = 0.88 + sin(uTime * 17.0 + axial * 29.0 + uPhase) * 0.08
          + sin(uTime * 31.0 - axial * 17.0) * 0.04;
        float edge = pow(max(0.0, sin(vUv.x * 3.14159265)), 0.45);
        vec3 hot = vec3(1.0, 0.93, 0.72);
        vec3 plasma = vec3(0.28, 0.82, 1.0);
        vec3 cold = vec3(0.12, 0.32, 0.92);
        vec3 color = mix(hot, plasma, smoothstep(0.02, 0.34, axial));
        color = mix(color, cold, smoothstep(0.42, 1.0, axial));
        color = mix(color, vec3(0.92, 0.98, 1.0), uInner * (1.0 - axial) * 0.72);
        float tailFade = pow(max(0.0, 1.0 - axial), 0.38);
        float alpha = edge * tailFade * flicker * mix(0.42, 0.78, uInner) * (0.72 + uBoost * 0.7);
        gl_FragColor = vec4(color, alpha);
      }
    `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  enginePlumeMaterials.push(material);
  return material;
}

function addSpacecraft() {
  if (!scene) return;
  spacecraft = new THREE.Group();
  spacecraft.name = "wind-corner-starship";
  spacecraft.position.set(92, 18, -42);
  const ceramic = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9e2e8,
      roughness: 0.2,
      metalness: 0.82,
      emissive: 0x10263a,
      emissiveIntensity: 0.22,
    }),
  );
  const titanium = track(
    new THREE.MeshStandardMaterial({
      color: 0x31485a,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x07131d,
      emissiveIntensity: 0.3,
    }),
  );
  const carbon = track(
    new THREE.MeshStandardMaterial({
      color: 0x101c26,
      roughness: 0.5,
      metalness: 0.7,
    }),
  );
  const armor = track(
    new THREE.MeshStandardMaterial({
      color: 0x8397a6,
      roughness: 0.24,
      metalness: 0.88,
      emissive: 0x0b2334,
      emissiveIntensity: 0.28,
    }),
  );
  const accent = track(
    new THREE.MeshStandardMaterial({
      color: 0x87dff7,
      roughness: 0.14,
      metalness: 0.72,
      emissive: 0x1687b5,
      emissiveIntensity: 1.15,
    }),
  );
  const canopy = track(
    new THREE.MeshStandardMaterial({
      color: 0x4dbbe8,
      roughness: 0.08,
      metalness: 0.68,
      emissive: 0x1475a4,
      emissiveIntensity: 0.82,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const engineGlow = track(
    new THREE.SpriteMaterial({
      map: glowTexture("#63dcff"),
      color: 0x85e9ff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const navigationGlow = track(
    new THREE.MeshBasicMaterial({
      color: 0x78e9ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const shipLight = new THREE.PointLight(0x9bdfff, 42, 52, 1.6);
  shipLight.position.set(3, 8, 10);
  spacecraft.add(shipLight);

  const spine = new THREE.Mesh(
    track(
      new THREE.CapsuleGeometry(
        2.45,
        11.5,
        lowQuality ? 5 : 9,
        lowQuality ? 10 : 20,
      ),
    ),
    ceramic,
  );
  spine.rotation.z = -Math.PI / 2;
  spacecraft.add(spine);
  const aftBody = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3.05, 3.7, 6.2, lowQuality ? 12 : 24)),
    titanium,
  );
  aftBody.position.x = -6.1;
  aftBody.rotation.z = Math.PI / 2;
  spacecraft.add(aftBody);
  const nose = new THREE.Mesh(
    track(new THREE.ConeGeometry(2.38, 7.2, lowQuality ? 12 : 28)),
    ceramic,
  );
  nose.position.x = 10.8;
  nose.rotation.z = -Math.PI / 2;
  spacecraft.add(nose);
  const noseBlade = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.42, 3.6, lowQuality ? 8 : 16)),
    accent,
  );
  noseBlade.position.x = 15.3;
  noseBlade.rotation.z = -Math.PI / 2;
  spacecraft.add(noseBlade);
  const keel = new THREE.Mesh(
    track(new THREE.BoxGeometry(13.8, 0.72, 1.2)),
    titanium,
  );
  keel.position.set(-0.5, -2.15, 0);
  spacecraft.add(keel);

  const cockpitFrame = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(2.58, lowQuality ? 14 : 28, lowQuality ? 8 : 16),
    ),
    titanium,
  );
  cockpitFrame.position.set(4.8, 1.2, 0);
  cockpitFrame.scale.set(1.38, 0.57, 0.82);
  spacecraft.add(cockpitFrame);
  const cockpit = new THREE.Mesh(
    track(
      new THREE.SphereGeometry(
        2.4,
        lowQuality ? 14 : 28,
        lowQuality ? 8 : 16,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.72,
      ),
    ),
    canopy,
  );
  cockpit.position.set(4.9, 1.25, 0);
  cockpit.scale.set(1.35, 0.54, 0.78);
  cockpit.rotation.z = -0.08;
  spacecraft.add(cockpit);
  for (const x of [2.8, 4.5, 6.2]) {
    const canopyRib = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.12, 0.2, 4)),
      accent,
    );
    canopyRib.position.set(x, 1.55, 0);
    canopyRib.rotation.z = -0.08;
    spacecraft.add(canopyRib);
  }

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      track(new THREE.BoxGeometry(8.4, 0.48, 2.3)),
      armor,
    );
    shoulder.position.set(-0.5, 0.15, side * 2.5);
    shoulder.rotation.y = side * -0.09;
    spacecraft.add(shoulder);
    const shoulderLight = new THREE.Mesh(
      track(new THREE.BoxGeometry(6.6, 0.12, 0.12)),
      accent,
    );
    shoulderLight.position.set(0.1, 0.45, side * 3.7);
    shoulderLight.rotation.y = side * -0.09;
    spacecraft.add(shoulderLight);
  }

  const wingGeometry = track(new THREE.BufferGeometry());
  wingGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        3, 0, 0, -4.5, 0, 0, -8.5, 0, 8.8, 3, -0.38, 0, -4.5, -0.38, 0, -8.5,
        -0.38, 8.8,
      ],
      3,
    ),
  );
  wingGeometry.setIndex([
    0, 1, 2, 5, 4, 3, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0,
  ]);
  wingGeometry.computeVertexNormals();
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeometry, carbon);
    wing.scale.z = side;
    wing.position.y = -0.3;
    spacecraft.add(wing);
    const edge = new THREE.Mesh(
      track(new THREE.BoxGeometry(9.8, 0.16, 0.26)),
      navigationGlow,
    );
    edge.position.set(-3.1, -0.25, side * 5.2);
    edge.rotation.y = side * -0.49;
    spacecraft.add(edge);
    const wingArmor = new THREE.Mesh(
      track(new THREE.BoxGeometry(7.6, 0.3, 2.7)),
      armor,
    );
    wingArmor.position.set(-3.1, -0.08, side * 5.25);
    wingArmor.rotation.y = side * -0.34;
    wingArmor.scale.z = 0.72;
    spacecraft.add(wingArmor);
    const wingTip = new THREE.Mesh(
      track(
        new THREE.CapsuleGeometry(
          0.48,
          3.4,
          lowQuality ? 3 : 6,
          lowQuality ? 8 : 14,
        ),
      ),
      titanium,
    );
    wingTip.position.set(-6.9, -0.2, side * 8.25);
    wingTip.rotation.z = Math.PI / 2;
    spacecraft.add(wingTip);
    const wingBeacon = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glowTexture(side < 0 ? "#ff657b" : "#69e7ff"),
          transparent: true,
          opacity: 0.86,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    wingBeacon.position.set(-8.7, 0, side * 8.3);
    wingBeacon.scale.set(2.4, 2.4, 1);
    spacecraft.add(wingBeacon);
  }

  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(
      track(new THREE.ConeGeometry(1.05, 5.2, 3)),
      ceramic,
    );
    tail.position.set(-7.4, 2.7, side * 2.35);
    tail.rotation.set(0.08, 0, side * -0.24);
    tail.scale.set(0.5, 1, 0.82);
    spacecraft.add(tail);
  }

  const reactorRing = new THREE.Mesh(
    track(
      new THREE.TorusGeometry(
        2.72,
        0.18,
        lowQuality ? 8 : 12,
        lowQuality ? 28 : 56,
      ),
    ),
    accent,
  );
  reactorRing.position.x = -3.45;
  reactorRing.rotation.y = Math.PI / 2;
  spacecraft.add(reactorRing);

  for (const z of [-2.15, 0, 2.15]) {
    const nacelle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.02, 1.35, 4.1, lowQuality ? 12 : 24)),
      titanium,
    );
    nacelle.position.set(-8.1, 0, z);
    nacelle.rotation.z = Math.PI / 2;
    spacecraft.add(nacelle);
    const nacelleArmor = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.12, 1.12, 1.5, lowQuality ? 12 : 24)),
      armor,
    );
    nacelleArmor.position.set(-7.15, 0, z);
    nacelleArmor.rotation.z = Math.PI / 2;
    spacecraft.add(nacelleArmor);
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.02, 0.16, 8, lowQuality ? 24 : 48)),
      navigationGlow,
    );
    ring.name = "spacecraft-drive-ring";
    ring.position.set(-10.18, 0, z);
    ring.rotation.y = Math.PI / 2;
    spacecraft.add(ring);
    const exhaust = new THREE.Sprite(engineGlow);
    exhaust.name = "spacecraft-exhaust";
    exhaust.position.set(-10.7, 0, z);
    exhaust.scale.set(3.8, 3.8, 1);
    spacecraft.add(exhaust);
  }

  for (const [engineIndex, z] of [-2.15, 0, 2.15].entries()) {
    const outerPlume = new THREE.Mesh(
      track(new THREE.ConeGeometry(1.35, 18, lowQuality ? 12 : 24, 1, true)),
      enginePlumeMaterial(false, engineIndex * 2.17),
    );
    outerPlume.name = "spacecraft-engine-plume";
    outerPlume.position.set(-19.15, 0, z);
    outerPlume.rotation.z = Math.PI / 2;
    outerPlume.userData.baseLength = 1;
    spacecraft.add(outerPlume);

    const hotCore = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.62, 11.5, lowQuality ? 10 : 18, 1, true)),
      enginePlumeMaterial(true, engineIndex * 1.73 + 0.8),
    );
    hotCore.name = "spacecraft-engine-plume";
    hotCore.position.set(-15.9, 0, z);
    hotCore.rotation.z = Math.PI / 2;
    hotCore.userData.baseLength = 0.72;
    spacecraft.add(hotCore);

    const particleCount = lowQuality ? 14 : 30;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const random = randomFrom(hash(`spacecraft:plume:${engineIndex}`));
    for (let index = 0; index < particleCount; index++) {
      particlePositions[index * 3] = -10.8 - random() * 34;
      particlePositions[index * 3 + 1] =
        (random() - 0.5) * (1 + random() * 1.4);
      particlePositions[index * 3 + 2] =
        z + (random() - 0.5) * (1 + random() * 1.2);
      particleSpeeds[index] = 11 + random() * 19;
    }
    const particleGeometry = track(new THREE.BufferGeometry());
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    const particles = new THREE.Points(
      particleGeometry,
      track(
        new THREE.PointsMaterial({
          color: engineIndex === 1 ? 0xffe6b8 : 0x83dcff,
          map: glowTexture(engineIndex === 1 ? "#ffe6b8" : "#76cfff"),
          size: lowQuality ? 0.46 : 0.62,
          transparent: true,
          opacity: 0.64,
          alphaTest: 0.03,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    particles.name = "spacecraft-exhaust-particles";
    particles.userData.speeds = particleSpeeds;
    spacecraft.add(particles);
  }

  const trailGeometry = track(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -0.3, -7),
      new THREE.Vector3(-38, -0.3, -9.5),
      new THREE.Vector3(-5, -0.3, 7),
      new THREE.Vector3(-38, -0.3, 9.5),
    ]),
  );
  const sideTrails = new THREE.LineSegments(
    trailGeometry,
    track(
      new THREE.LineBasicMaterial({
        color: 0x78dfff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  sideTrails.name = "spacecraft-ion-trails";
  spacecraft.add(sideTrails);

  const markingCanvas = document.createElement("canvas");
  markingCanvas.width = 384;
  markingCanvas.height = 96;
  const markingContext = markingCanvas.getContext("2d")!;
  markingContext.fillStyle = "rgba(6,18,28,.86)";
  markingContext.fillRect(0, 0, 384, 96);
  markingContext.fillStyle = "#9de8ff";
  markingContext.font = "700 42px sans-serif";
  markingContext.textAlign = "center";
  markingContext.textBaseline = "middle";
  markingContext.fillText("风隅号  FY-01", 192, 48);
  const markingTexture = track(new THREE.CanvasTexture(markingCanvas));
  markingTexture.colorSpace = THREE.SRGBColorSpace;
  const marking = new THREE.Mesh(
    track(new THREE.PlaneGeometry(7.4, 1.85)),
    track(
      new THREE.MeshBasicMaterial({
        map: markingTexture,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      }),
    ),
  );
  marking.position.set(-0.5, 0.2, 2.46);
  spacecraft.add(marking);

  spacecraft.scale.setScalar(lowQuality ? 0.62 : 0.8);
  registerDiscovery("spacecraft", "风隅号 · FY-01", spacecraft, 10);
  scene.add(spacecraft);
}

function addOrbit(radius: number, year: number | null) {
  if (!scene) return;
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 180; index++) {
    const angle = (index / 180) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius * 0.66,
      ),
    );
  }
  const geometry = track(new THREE.BufferGeometry().setFromPoints(points));
  const material = track(
    new THREE.LineBasicMaterial({
      color: year == null ? 0x27445d : 0x477da5,
      transparent: true,
      opacity: year == null ? 0.16 : 0.27,
      blending: THREE.AdditiveBlending,
    }),
  );
  const line = new THREE.Line(geometry, material);
  line.userData.year = year;
  scene.add(line);
}

function nodeRadius(type: string, featured: boolean, variant: number) {
  const base = featured
    ? 3.6
    : type === "memory"
      ? 2.65
      : type === "place"
        ? 2.45
        : type === "photo"
          ? 1.8
          : 2.1;
  return base * (variant === 1 ? 1.16 : variant === 0 ? 0.92 : 1);
}

function nodeGeometry(type: string, featured: boolean, variant: number) {
  return track(
    new THREE.SphereGeometry(
      nodeRadius(type, featured, variant),
      lowQuality ? 14 : 24,
      lowQuality ? 10 : 16,
    ),
  );
}

function rememberOpacity(material: THREE.Material, opacity?: number) {
  if (opacity !== undefined && "opacity" in material)
    material.opacity = opacity;
  material.userData.baseOpacity = "opacity" in material ? material.opacity : 1;
  return material;
}

function addCosmicBodies() {
  if (!scene) return;
  const random = randomFrom(0x6c756d65);
  const bodyTypes = ["place", "library", "album", "journey", "photo"];
  const targetCount = Math.max(
    lowQuality ? 16 : 22,
    (lowQuality ? 26 : 42) - props.nodes.length,
  );
  for (let index = 0; index < targetCount; index++) {
    const orbitIndex = index % 4;
    const angle = random() * Math.PI * 2 + orbitIndex * 0.31;
    const orbitRadius = 48 + orbitIndex * 28 + (random() - 0.5) * 12;
    const radius = 0.9 + random() * 1.45;
    const seedNode: MemoryNode = {
      id: `cosmic-seed:${index}`,
      type: bodyTypes[index % bodyTypes.length],
      title: "",
      coordinateSeed: index * 11939 + 701,
    };
    const group = new THREE.Group();
    group.name = "cosmic-seed";
    group.position.set(
      Math.cos(angle) * orbitRadius,
      (random() - 0.5) * 28 - 3,
      Math.sin(angle) * orbitRadius * 0.68,
    );
    group.rotation.set(random() * 0.5, random() * Math.PI * 2, random() * 0.35);
    group.userData.spin = 0.025 + random() * 0.055;
    const profile = planetProfile(seedNode);
    const geometry = track(
      new THREE.SphereGeometry(
        radius,
        lowQuality ? 10 : 18,
        lowQuality ? 8 : 12,
      ),
    );
    const material = rememberOpacity(
      track(
        new THREE.MeshStandardMaterial({
          color: 0xe0d1ba,
          map: planetTexture(seedNode, profile),
          emissive: profile.glow,
          emissiveIntensity: 0.08,
          roughness: 0.86,
          metalness: 0.01,
          transparent: true,
          opacity: 0.84 + random() * 0.14,
        }),
      ),
    );
    group.add(new THREE.Mesh(geometry, material));
    if (index % 7 === 2) {
      const ringMaterial = rememberOpacity(
        track(
          new THREE.MeshBasicMaterial({
            color: profile.accent,
            transparent: true,
            opacity: 0.28,
            depthWrite: false,
          }),
        ),
      );
      const ring = new THREE.Mesh(
        track(
          new THREE.TorusGeometry(
            radius * 1.65,
            radius * 0.035,
            4,
            lowQuality ? 24 : 42,
          ),
        ),
        ringMaterial,
      );
      ring.rotation.set(1.12, 0.12, -0.18);
      group.add(ring);
    }
    cosmicBodies.push(group);
    scene.add(group);
  }
}

function addNode(node: MemoryNode, position: THREE.Vector3) {
  if (!scene) return;
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.nodeId = node.id;
  const featured = Boolean(node.metadata?.featured);
  const variant = planetVariant(node);
  const profile = planetProfile(node);
  const color = profile.glow;
  const radius = nodeRadius(node.type, featured, variant);
  const geometry = nodeGeometry(node.type, featured, variant);
  const material = rememberOpacity(
    track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: planetTexture(node, profile),
        emissive: profile.glow,
        emissiveIntensity: featured ? 0.32 : 0.18,
        roughness: variant === 3 ? 0.82 : 0.72,
        metalness: 0.04,
        transparent: true,
        opacity: 0.98,
      }),
    ),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.nodeId = node.id;
  group.add(mesh);
  interactive.push(mesh);
  const hitTarget = new THREE.Mesh(
    track(new THREE.SphereGeometry(radius * 1.7, 10, 8)),
    track(
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
    ),
  );
  hitTarget.userData.nodeId = node.id;
  group.add(hitTarget);
  interactive.push(hitTarget);
  const atmosphere = new THREE.Mesh(
    geometry,
    atmosphereMaterial(profile.atmosphere, featured ? 0.84 : 0.64),
  );
  atmosphere.scale.setScalar(1.16);
  atmosphere.userData.nodeId = node.id;
  group.add(atmosphere);
  const signalMaterial = rememberOpacity(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture(`#${profile.glow.toString(16).padStart(6, "0")}`),
        color: profile.glow,
        transparent: true,
        opacity: featured ? 0.46 : 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  const signal = new THREE.Sprite(signalMaterial);
  signal.name = "memory-signal";
  signal.scale.setScalar(radius * (featured ? 6.4 : 5.2));
  signal.userData.baseScale = signal.scale.x;
  group.add(signal);
  if (variant === 1 || hash(node.id) % 9 === 0) {
    const ringGroup = new THREE.Group();
    const ringColor = new THREE.Color(profile.accent).lerp(
      new THREE.Color(0xd8e4ed),
      0.22,
    );
    for (const [ringRadius, thickness, opacity] of [
      [1.38, 0.035, 0.28],
      [1.53, 0.06, 0.34],
      [1.7, 0.028, 0.2],
    ] as const) {
      ringGroup.add(
        new THREE.Mesh(
          track(
            new THREE.TorusGeometry(
              radius * ringRadius,
              radius * thickness,
              5,
              lowQuality ? 32 : 64,
            ),
          ),
          rememberOpacity(
            track(
              new THREE.MeshBasicMaterial({
                color: ringColor,
                transparent: true,
                opacity,
                depthWrite: false,
              }),
            ),
          ),
        ),
      );
    }
    ringGroup.rotation.set(1.12, 0.18, -0.18);
    group.add(ringGroup);
  }
  if (variant === 2 || hash(node.id) % 11 === 0) {
    const moon = new THREE.Mesh(
      track(
        new THREE.SphereGeometry(
          radius * 0.17,
          lowQuality ? 8 : 14,
          lowQuality ? 6 : 10,
        ),
      ),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x9ea6aa,
          roughness: 0.92,
          metalness: 0,
        }),
      ),
    );
    moon.position.set(radius * 1.95, radius * 0.22, 0);
    group.add(moon);
    const moonOrbit = new THREE.Mesh(
      track(
        new THREE.TorusGeometry(radius * 1.95, 0.025, 4, lowQuality ? 28 : 48),
      ),
      rememberOpacity(
        track(
          new THREE.MeshBasicMaterial({
            color: 0x9db1bd,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          }),
        ),
      ),
    );
    moonOrbit.rotation.x = Math.PI / 2;
    group.add(moonOrbit);
  }
  nodeObjects.set(node.id, group);
  scene.add(group);
}

function addImageSprite(node: MemoryNode, group: THREE.Group) {
  if (!node.image) return;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  loader.load(
    props.resolveImage(node.image),
    (texture) => {
      if (disposed || !nodeObjects.has(node.id)) {
        texture.dispose();
        return;
      }
      track(texture);
      texture.colorSpace = THREE.SRGBColorSpace;
      const image = texture.image as { width?: number; height?: number };
      const aspect = Math.max(
        0.62,
        Math.min(1.65, Number(image.width || 1) / Number(image.height || 1)),
      );
      const sprite = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: texture,
            alphaMap: circleMaskTexture(),
            transparent: true,
            alphaTest: 0.04,
            opacity: 0.94,
          }),
        ),
      );
      sprite.scale.set(7.2 * aspect, 7.2, 1);
      sprite.position.set(0, 0, 3.2);
      sprite.userData.nodeId = node.id;
      group.add(sprite);
      interactive.push(sprite);
    },
    undefined,
    () => undefined,
  );
}

function addMeteor() {
  if (!scene || reducedMotion.value) return;
  const latest = [...props.nodes]
    .filter((node) => node.occurredAt)
    .sort(
      (a, b) =>
        new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime(),
    )[0];
  const target = latest ? nodePositions.get(latest.id) : null;
  meteor = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTexture("#e5f7ff"),
        color: 0xe5f7ff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  meteor.scale.set(2.2, 2.2, 1);
  meteor.userData.target = target?.clone() || new THREE.Vector3(26, -8, 0);
  scene.add(meteor);
  const trailPoints = 34;
  const trailGeometry = track(new THREE.BufferGeometry());
  trailGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(trailPoints * 3), 3),
  );
  const trailColors = new Float32Array(trailPoints * 3);
  const dim = new THREE.Color(0x16466d);
  const bright = new THREE.Color(0xbdeaff);
  for (let index = 0; index < trailPoints; index++) {
    const shade = dim.clone().lerp(bright, index / (trailPoints - 1));
    trailColors[index * 3] = shade.r;
    trailColors[index * 3 + 1] = shade.g;
    trailColors[index * 3 + 2] = shade.b;
  }
  trailGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(trailColors, 3),
  );
  meteorTrail = new THREE.Line(
    trailGeometry,
    track(
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  scene.add(meteorTrail);
}

function clearSceneContent() {
  if (!scene) return;
  for (const child of [...scene.children])
    if (!["ambient-light", "key-light"].includes(child.name))
      scene.remove(child);
  for (const resource of disposables) resource.dispose();
  disposables.clear();
  nodeObjects.clear();
  nodePositions.clear();
  nodeLookup.clear();
  interactive.length = 0;
  discoveryInteractive.length = 0;
  discoveryObjects.clear();
  starLayers.length = 0;
  cosmicBodies.length = 0;
  enginePlumeMaterials.length = 0;
  core = null;
  sun = null;
  blackHole = null;
  spaceStation = null;
  satellite = null;
  spacecraft = null;
  meteor = null;
  meteorTrail = null;
  warpLines = null;
  warpMaterial = null;
}

function buildScene() {
  if (!scene) return;
  clearSceneContent();
  addStarField();
  addSun();
  addBlackHole();
  addSpaceStation();
  addSatellite();
  addSpacecraft();
  addCore();
  const years = [
    ...new Set(
      props.nodes.map(yearOf).filter((year): year is number => year != null),
    ),
  ].sort((a, b) => b - a);
  if (years.length) {
    years.forEach((year, index) => addOrbit(46 + index * 26, year));
    addOrbit(46 + years.length * 26, null);
  } else {
    for (let index = 0; index < 3; index++) addOrbit(46 + index * 28, null);
  }
  addCosmicBodies();
  const ringNodes = new Map<number, MemoryNode[]>();
  for (const node of props.nodes) {
    const year = yearOf(node);
    const ringIndex =
      year == null ? years.length : Math.max(0, years.indexOf(year));
    const group = ringNodes.get(ringIndex);
    if (group) group.push(node);
    else ringNodes.set(ringIndex, [node]);
  }
  for (const [ringIndex, group] of ringNodes) {
    group.sort(
      (a, b) =>
        (Number(a.coordinateSeed) || hash(a.id)) -
        (Number(b.coordinateSeed) || hash(b.id)),
    );
    group.forEach((node, slot) => {
      nodeLookup.set(node.id, node);
      const position = buildPosition(node, years, group.length, slot);
      nodePositions.set(node.id, position);
      addNode(node, position);
    });
  }
  addMeteor();
  applySelection(false);
}

function resize() {
  if (!renderer || !camera || !host.value) return;
  const width = Math.max(1, host.value.clientWidth);
  const height = Math.max(1, host.value.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function pointerPosition(event: PointerEvent) {
  const rect = host.value?.getBoundingClientRect();
  if (!rect) return;
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function hitScene(): SceneHit | null {
  if (!camera) return null;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(
    [...interactive, ...discoveryInteractive],
    false,
  )[0];
  const nodeId = String(hit?.object.userData.nodeId || "");
  const node = nodeId ? nodeLookup.get(nodeId) : null;
  if (node) return { kind: "memory", node, label: node.title };
  const discoveryId = String(
    hit?.object.userData.discoveryId || "",
  ) as DiscoveryId;
  if (discoveryId && discoveryObjects.has(discoveryId)) {
    return {
      kind: "discovery",
      id: discoveryId,
      label: String(hit.object.userData.discoveryLabel || ""),
    };
  }
  return null;
}

function onPointerMove(event: PointerEvent) {
  if (discoveryTourId) {
    if (host.value) host.value.style.cursor = "default";
    tooltip.value?.classList.remove("visible");
    return;
  }
  pointerPosition(event);
  const hit = hitScene();
  if (host.value)
    host.value.style.cursor = props.ambient
      ? "default"
      : hit
        ? "pointer"
        : "grab";
  if (!tooltip.value || props.ambient) return;
  tooltip.value.textContent = hit?.label || "";
  tooltip.value.classList.toggle("visible", !!hit);
  if (hit) {
    tooltip.value.style.left = `${event.clientX + 14}px`;
    tooltip.value.style.top = `${event.clientY + 12}px`;
  }
}

function onPointerDown() {
  if (props.ambient || cameraFlight) return;
  introInterrupted = true;
  introCompleted = true;
  if (camera) {
    camera.fov = 48;
    camera.updateProjectionMatrix();
  }
}

function syncCruiseFromCamera() {
  if (!camera || !controls) return;
  const offset = camera.position.clone().sub(controls.target);
  ambientOrbitPhase = Math.atan2(offset.x, offset.z);
  cruiseOrbitRadius = Math.max(38, Math.hypot(offset.x, offset.z));
  cruiseHeight = offset.y;
  cruiseBobPhase = 0;
}

function onControlsStart() {
  cruisePausedUntil = Number.POSITIVE_INFINITY;
}

function onControlsEnd() {
  if (focusedDiscoveryId && camera && controls) {
    const object = discoveryObjects.get(focusedDiscoveryId);
    if (object) {
      const target = object.getWorldPosition(new THREE.Vector3());
      focusedCameraPositionOffset.copy(camera.position).sub(target);
      focusedCameraTargetOffset.copy(controls.target).sub(target);
    }
  }
  syncCruiseFromCamera();
  cruisePausedUntil = performance.now() + 1600;
}
function onClick(event: PointerEvent) {
  if (props.ambient) return;
  pointerPosition(event);
  const hit = hitScene();
  if (hit?.kind === "memory") emit("select", hit.node);
  else if (hit?.kind === "discovery") {
    focusDiscovery(hit.id);
    emit("discover", hit.id);
  } else emit("clear");
}

function sceneTarget() {
  const mobile = window.innerWidth < 720;
  return new THREE.Vector3(
    props.ambient && !mobile ? -44 : 0,
    mobile ? -42 : 0,
    0,
  );
}

function cruiseRadius() {
  return window.innerWidth < 720 ? 238 : 218;
}

function overviewPose(): CameraSnapshot {
  const mobile = window.innerWidth < 720;
  const target = sceneTarget();
  const radius = cruiseRadius();
  return {
    target,
    position: new THREE.Vector3(
      target.x + Math.sin(INTRO_END_PHASE) * radius,
      mobile ? 62 : 68,
      target.z + Math.cos(INTRO_END_PHASE) * radius,
    ),
  };
}

function hermite(
  start: number,
  end: number,
  startTangent: number,
  endTangent: number,
  progress: number,
) {
  const squared = progress * progress;
  const cubed = squared * progress;
  return (
    (2 * cubed - 3 * squared + 1) * start +
    (cubed - 2 * squared + progress) * startTangent +
    (-2 * cubed + 3 * squared) * end +
    (cubed - squared) * endTangent
  );
}

function applyIntroCamera(now: number) {
  if (!camera || !controls) return 0;
  const progress = Math.max(
    0,
    Math.min(1, (now - introStartedAt) / INTRO_DURATION),
  );
  const arrival = 1 - Math.pow(1 - progress, 4);
  const mobile = window.innerWidth < 720;
  const target = sceneTarget();
  const radius = THREE.MathUtils.lerp(
    mobile ? 620 : 720,
    cruiseRadius(),
    arrival,
  );
  const phase = hermite(
    INTRO_START_PHASE,
    INTRO_END_PHASE,
    -0.62,
    -CRUISE_ANGULAR_SPEED * (INTRO_DURATION / 1000),
    progress,
  );
  camera.position.set(
    target.x + Math.sin(phase) * radius,
    THREE.MathUtils.lerp(mobile ? 8 : 12, mobile ? 62 : 68, arrival),
    target.z + Math.cos(phase) * radius,
  );
  controls.target.copy(target);
  ambientOrbitPhase = phase;
  camera.fov =
    THREE.MathUtils.lerp(76, 48, arrival) - Math.sin(progress * Math.PI) * 4.5;
  camera.updateProjectionMatrix();
  if (progress >= 1 && !introCompleted) {
    introCompleted = true;
    cruiseOrbitRadius = radius;
    cruiseHeight = mobile ? 62 : 68;
    cruiseBobPhase = 0;
    cruiseBlendStartedAt = now;
    cruisePausedUntil = 0;
  }
  return progress;
}

function startCameraFlight(
  destination: CameraSnapshot,
  duration = 1250,
  arcHeight = 12,
  completion?: CameraFlight["completion"],
  trackingId: DiscoveryId | "" = "",
) {
  if (!camera || !controls) return;
  introInterrupted = true;
  introCompleted = true;
  camera.fov = 48;
  camera.updateProjectionMatrix();
  controls.enabled = false;
  discoveryTourId = "";
  cameraFlightTrackingId = trackingId;
  cameraFlight = {
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromUp: camera.up.clone(),
    position: destination.position.clone(),
    target: destination.target.clone(),
    up: destination.up?.clone() || new THREE.Vector3(0, 1, 0),
    startedAt: performance.now(),
    duration: reducedMotion.value ? 0 : duration,
    arcHeight,
    completion,
  };
}

function focusDiscovery(id: DiscoveryId) {
  if (!camera || !controls) return;
  const object = discoveryObjects.get(id);
  if (!object) return;
  discoveryTourId = "";
  pendingDiscoveryTourId = "";
  focusedDiscoveryId = id;
  if (id === "spacecraft") spacecraftLaunchActive = false;
  const target = object.getWorldPosition(new THREE.Vector3());
  const direction = camera.position.clone().sub(controls.target).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const sideOffset = right.multiplyScalar(window.innerWidth < 700 ? 0 : 10);
  const distance =
    id === "black-hole"
      ? 118
      : id === "sun"
        ? 108
        : id === "station"
          ? 78
          : id === "spacecraft"
            ? 82
            : id === "planet"
              ? 64
              : 58;
  const destination = {
    target: target.clone().add(sideOffset),
    position: target
      .clone()
      .add(direction.multiplyScalar(distance))
      .add(sideOffset.clone().multiplyScalar(0.65)),
  };
  focusedCameraPositionOffset.copy(destination.position).sub(target);
  focusedCameraTargetOffset.copy(destination.target).sub(target);
  startCameraFlight(
    destination,
    id === "black-hole" ? 1750 : 1450,
    id === "black-hole" ? 18 : 12,
    undefined,
    id,
  );
}

function resumeDiscoveryFocus(id: DiscoveryId) {
  if (!camera || !controls) return;
  const object = discoveryObjects.get(id);
  if (!object) return;
  focusedDiscoveryId = id;
  discoveryTourId = "";
  pendingDiscoveryTourId = "";
  cameraFlightTrackingId = cameraFlight ? id : "";
  controls.enabled = !props.ambient && !cameraFlight;
}

function triggerDiscoveryEffect(id: DiscoveryId) {
  discoveryEffect = id;
  discoveryEffectStartedAt = performance.now();
  if (id === "spacecraft") spacecraftLaunchActive = false;
}

function startDiscoveryTour(id: DiscoveryId) {
  if (id !== "station" && id !== "spacecraft") return;
  if (!camera || !controls) return;
  const object = discoveryObjects.get(id);
  if (!object) return;
  const target = object.getWorldPosition(new THREE.Vector3());
  const offset = camera.position.clone().sub(target);
  discoveryTourPhase = Math.atan2(offset.z, offset.x);
  discoveryTourHeight = offset.y;
  focusedDiscoveryId = id;
  if (id === "spacecraft") spacecraftLaunchActive = false;
  pendingDiscoveryTourId = id;
  const destination = discoveryTourPose(id);
  if (!destination) return;
  startCameraFlight(destination, 1900, 6);
}

function activateDiscoveryTour(id: DiscoveryId) {
  if (!camera || !controls) return;
  const object = discoveryObjects.get(id);
  if (!object) return;
  discoveryTourId = id;
  pendingDiscoveryTourId = "";
  controls.enabled = false;
  emit("immersiveChange", true);
}

function discoveryTourPose(id: DiscoveryId): CameraSnapshot | null {
  const object = discoveryObjects.get(id);
  if (!object) return null;
  const target = object.getWorldPosition(new THREE.Vector3());
  if (id === "station") {
    const coreTarget =
      core?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3();
    const radial = target.clone().sub(coreTarget).setY(0).normalize();
    const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
    return {
      position: target
        .clone()
        .addScaledVector(radial, 72)
        .addScaledVector(tangent, Math.sin(discoveryTourPhase) * 18)
        .add(new THREE.Vector3(0, 24 + Math.sin(elapsed * 0.34) * 1.6, 0)),
      target: target
        .clone()
        .lerp(coreTarget, 0.46)
        .add(new THREE.Vector3(0, 5, 0)),
      up: new THREE.Vector3(0, 1, 0),
    };
  }
  if (id === "spacecraft" && spacecraft) {
    return {
      // 舰首沿本地 +X：相机位于尾焰之后并略微抬高、偏舷侧，稳定保留舰体和引擎尾流。
      position: target
        .clone()
        .add(
          new THREE.Vector3(-62, 26, 22).applyQuaternion(spacecraft.quaternion),
        ),
      target: target
        .clone()
        .add(
          new THREE.Vector3(12, 2.5, 0).applyQuaternion(spacecraft.quaternion),
        ),
      up: new THREE.Vector3(0, 1, 0)
        .applyQuaternion(spacecraft.quaternion)
        .normalize(),
    };
  }
  return null;
}

function updateDiscoveryTour(delta: number) {
  if (!camera || !controls || !discoveryTourId || cameraFlight) return;
  if (discoveryTourId === "station") {
    discoveryTourPhase -= delta * 0.085;
  }
  const pose = discoveryTourPose(discoveryTourId);
  if (!pose) return;
  const positionDamping = discoveryTourId === "spacecraft" ? 3.15 : 1.9;
  const targetDamping = discoveryTourId === "spacecraft" ? 4.2 : 2.5;
  const upDamping = discoveryTourId === "spacecraft" ? 2.4 : 3.2;
  camera.position.lerp(pose.position, 1 - Math.exp(-delta * positionDamping));
  controls.target.lerp(pose.target, 1 - Math.exp(-delta * targetDamping));
  camera.up
    .lerp(
      pose.up || new THREE.Vector3(0, 1, 0),
      1 - Math.exp(-delta * upDamping),
    )
    .normalize();
  camera.lookAt(controls.target);
}

function updateFocusedDiscoveryCamera(delta: number) {
  if (
    !camera ||
    !controls ||
    cameraFlight ||
    discoveryTourId ||
    !focusedDiscoveryId
  )
    return;
  if (focusedDiscoveryId !== "spacecraft" && focusedDiscoveryId !== "station")
    return;
  const object = discoveryObjects.get(focusedDiscoveryId);
  if (!object) return;
  const target = object.getWorldPosition(new THREE.Vector3());
  const desiredPosition = target.clone().add(focusedCameraPositionOffset);
  const desiredTarget = target.clone().add(focusedCameraTargetOffset);
  camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 4.8));
  controls.target.lerp(desiredTarget, 1 - Math.exp(-delta * 6.2));
  camera.lookAt(controls.target);
}

function updateCameraFlight(now: number) {
  if (!cameraFlight || !camera || !controls) return;
  if (pendingDiscoveryTourId) {
    const pose = discoveryTourPose(pendingDiscoveryTourId);
    if (pose) {
      cameraFlight.position.copy(pose.position);
      cameraFlight.target.copy(pose.target);
      cameraFlight.up.copy(pose.up || new THREE.Vector3(0, 1, 0));
    }
  } else if (cameraFlightTrackingId) {
    const object = discoveryObjects.get(cameraFlightTrackingId);
    if (object) {
      const target = object.getWorldPosition(new THREE.Vector3());
      cameraFlight.position.copy(target).add(focusedCameraPositionOffset);
      cameraFlight.target.copy(target).add(focusedCameraTargetOffset);
    }
  }
  const progress = cameraFlight.duration
    ? Math.min(1, (now - cameraFlight.startedAt) / cameraFlight.duration)
    : 1;
  const eased =
    progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  camera.position.lerpVectors(
    cameraFlight.fromPosition,
    cameraFlight.position,
    eased,
  );
  camera.position.y += Math.sin(progress * Math.PI) * cameraFlight.arcHeight;
  controls.target.lerpVectors(
    cameraFlight.fromTarget,
    cameraFlight.target,
    eased,
  );
  camera.up
    .lerpVectors(cameraFlight.fromUp, cameraFlight.up, eased)
    .normalize();
  camera.lookAt(controls.target);
  if (progress < 1) return;
  const completion = cameraFlight.completion;
  camera.position.copy(cameraFlight.position);
  controls.target.copy(cameraFlight.target);
  camera.up.copy(cameraFlight.up);
  cameraFlight = null;
  cameraFlightTrackingId = "";
  if (pendingDiscoveryTourId) activateDiscoveryTour(pendingDiscoveryTourId);
  else controls.enabled = !props.ambient;
  syncCruiseFromCamera();
  cruisePausedUntil = now;
  if (completion === "reset") emit("focusCleared");
  if (completion === "reset") resettingDiscoveryId = "";
}

function focusPose(target: THREE.Vector3): CameraSnapshot | null {
  if (!camera || !controls) return null;
  const direction = camera.position.clone().sub(controls.target).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const offset = window.innerWidth < 700 ? 0 : 12;
  const sideOffset = right.clone().multiplyScalar(offset);
  const lookTarget = target.clone().add(sideOffset);
  return {
    target: lookTarget,
    position: target
      .clone()
      .add(direction.multiplyScalar(44))
      .add(sideOffset.clone().multiplyScalar(0.7)),
  };
}

function applySelection(animate = true) {
  const selected = props.selectedId;
  if (selected) focusedDiscoveryId = "";
  for (const [id, object] of nodeObjects) {
    const active = !selected || id === selected;
    const targetScale = id === selected ? 1.34 : selected ? 0.86 : 1;
    object.userData.selectionScale = animate
      ? Number(object.userData.selectionScale || object.scale.x || 1)
      : targetScale;
    object.userData.targetSelectionScale = targetScale;
    object.traverse((child) => {
      const material = (child as THREE.Mesh).material as THREE.Material & {
        opacity?: number;
        uniforms?: Record<string, { value: number }>;
      };
      if (!material) return;
      const baseOpacity = Number(material.userData.baseOpacity);
      if ("opacity" in material && Number.isFinite(baseOpacity)) {
        const boost =
          id === selected && child.name === "memory-signal" ? 1.65 : 1;
        const targetOpacity = Math.min(1, baseOpacity * (active ? boost : 0.2));
        material.userData.targetOpacity = targetOpacity;
        if (!animate) material.opacity = targetOpacity;
      }
      const baseGlow = Number(material.userData.baseGlowOpacity);
      if (Number.isFinite(baseGlow) && material.uniforms?.glowOpacity) {
        const targetGlow =
          baseGlow * (id === selected ? 1.42 : active ? 1 : 0.22);
        material.userData.targetGlowOpacity = targetGlow;
        if (!animate) material.uniforms.glowOpacity.value = targetGlow;
      }
    });
  }
  if (!camera || !controls) return;
  if (!selected) {
    if (activeSelectionId) {
      const destination = overviewSnapshot || overviewPose();
      if (animate) startCameraFlight(destination, 1350, 10);
      else {
        camera.position.copy(destination.position);
        controls.target.copy(destination.target);
      }
    }
    activeSelectionId = "";
    overviewSnapshot = null;
    return;
  }
  const target = nodePositions.get(selected);
  if (!target) return;
  if (!activeSelectionId)
    overviewSnapshot = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };
  activeSelectionId = selected;
  const destination = focusPose(target);
  if (!destination) return;
  if (!animate || reducedMotion.value) {
    controls.target.copy(destination.target);
    camera.position.copy(destination.position);
    controls.update();
    return;
  }
  startCameraFlight(destination, 1450, 14);
}

function resetView() {
  if (!camera || !controls) return;
  resettingDiscoveryId = focusedDiscoveryId;
  blackHoleResetActive =
    resettingDiscoveryId === "black-hole" && Boolean(blackHole);
  if (blackHoleResetActive && blackHole)
    blackHoleResetFrom.copy(blackHole.position);
  sunResetActive = resettingDiscoveryId === "sun" && Boolean(sun);
  if (sunResetActive && sun) sunResetFrom.copy(sun.position);
  activeSelectionId = "";
  focusedDiscoveryId = "";
  cameraFlightTrackingId = "";
  spacecraftLaunchActive = false;
  discoveryTourId = "";
  pendingDiscoveryTourId = "";
  overviewSnapshot = null;
  controls.enabled = !props.ambient;
  emit("immersiveChange", false);
  startCameraFlight(overviewPose(), 1550, 12, "reset");
}

function narrativeValue(values: number[], progress: number) {
  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * (values.length - 1);
  const index = Math.min(values.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const eased = local * local * (3 - 2 * local);
  return THREE.MathUtils.lerp(values[index], values[index + 1], eased);
}

function applyCruiseCamera(now: number, delta: number) {
  if (
    !camera ||
    !controls ||
    !introCompleted ||
    cameraFlight ||
    discoveryTourId ||
    props.selectedId ||
    focusedDiscoveryId
  )
    return;
  if (!props.ambient && now < cruisePausedUntil) return;
  if (props.ambient && props.narrativeProgress >= 0) {
    const mobile = window.innerWidth < 720;
    const phase = narrativeValue(NARRATIVE_PHASES, props.narrativeProgress);
    const radius =
      narrativeValue(NARRATIVE_RADII, props.narrativeProgress) *
      (mobile ? 1.08 : 1);
    const height = narrativeValue(NARRATIVE_HEIGHTS, props.narrativeProgress);
    const targetX = mobile
      ? 0
      : narrativeValue(NARRATIVE_TARGET_X, props.narrativeProgress);
    const targetY = mobile
      ? -42 + narrativeValue(NARRATIVE_TARGET_Y, props.narrativeProgress) * 0.55
      : narrativeValue(NARRATIVE_TARGET_Y, props.narrativeProgress);
    narrativeCameraTarget.set(targetX, targetY, 0);
    narrativeCameraPosition.set(
      targetX + Math.sin(phase) * radius,
      targetY + height + Math.sin(elapsed * 0.34) * 1.2,
      Math.cos(phase) * radius,
    );
    const damping = 1 - Math.exp(-delta * 5.2);
    camera.position.lerp(narrativeCameraPosition, damping);
    controls.target.lerp(narrativeCameraTarget, damping);
    camera.lookAt(controls.target);
    return;
  }
  ambientOrbitPhase -= delta * CRUISE_ANGULAR_SPEED;
  cruiseBobPhase += delta * 0.18;
  const cruiseBlend = cruiseBlendStartedAt
    ? Math.min(1, (now - cruiseBlendStartedAt) / 900)
    : 1;
  const easedBlend = cruiseBlend * cruiseBlend * (3 - 2 * cruiseBlend);
  const target = sceneTarget();
  const bob = Math.sin(cruiseBobPhase) * (props.ambient ? 7 : 2.4) * easedBlend;
  camera.position.set(
    target.x + Math.sin(ambientOrbitPhase) * cruiseOrbitRadius,
    target.y + cruiseHeight + bob,
    target.z + Math.cos(ambientOrbitPhase) * cruiseOrbitRadius,
  );
  controls.target.copy(target);
  camera.lookAt(target);
}

function animate(now = performance.now()) {
  if (!renderer || !scene || !camera || !controls || disposed) return;
  animationFrame = requestAnimationFrame(animate);
  const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  elapsed += delta;
  if (!reducedMotion.value) {
    const effectAge = discoveryEffect
      ? (now - discoveryEffectStartedAt) / 1000
      : Number.POSITIVE_INFINITY;
    const effectDuration = discoveryEffect === "spacecraft" ? 4.2 : 2.8;
    const effectPulse =
      effectAge < effectDuration
        ? Math.sin(Math.min(1, effectAge / effectDuration) * Math.PI)
        : 0;
    if (effectAge >= effectDuration) discoveryEffect = "";
    if (core) {
      core.rotation.y += delta * 0.18;
      core.rotation.z = Math.sin(elapsed * 0.3) * 0.08;
      core.scale.setScalar(
        1 + (discoveryEffect === "planet" ? effectPulse * 0.09 : 0),
      );
      const clouds = core.getObjectByName("core-clouds");
      if (clouds) clouds.rotation.y += delta * 0.055;
      const moonOrbit = core.getObjectByName("core-moon-orbit");
      if (moonOrbit) moonOrbit.rotation.y -= delta * 0.16;
    }
    if (sun) {
      sun.rotation.y += delta * 0.035;
      const pulse =
        1 +
        Math.sin(elapsed * 0.55) * 0.025 +
        (discoveryEffect === "sun" ? effectPulse * 0.18 : 0);
      sun.scale.setScalar(pulse);
    }
    if (blackHole) {
      const disk = blackHole.getObjectByName("black-hole-disk");
      if (disk)
        disk.rotation.z +=
          delta *
          (0.12 + (discoveryEffect === "black-hole" ? effectPulse * 1.05 : 0));
      const lensedDisk = blackHole.getObjectByName("black-hole-lensed-disk");
      if (lensedDisk)
        lensedDisk.rotation.z -=
          delta *
          (0.045 + (discoveryEffect === "black-hole" ? effectPulse * 0.32 : 0));
      const halo = blackHole.getObjectByName("black-hole-halo");
      if (halo)
        halo.scale.setScalar(
          92 +
            Math.sin(elapsed * 0.7) * 3.5 +
            (discoveryEffect === "black-hole" ? effectPulse * 22 : 0),
        );
    }
    if (spaceStation) {
      stationOrbitPhase -= (delta * Math.PI * 2) / 86;
      spaceStation.position.copy(stationOrbitPosition(stationOrbitPhase));
      spaceStation.rotation.set(
        0.18 + Math.sin(stationOrbitPhase * 1.7) * 0.04,
        -stationOrbitPhase + Math.PI / 2,
        -0.12 + Math.cos(stationOrbitPhase * 2.1) * 0.05,
      );
      const habitatRing = spaceStation.getObjectByName("station-habitat-ring");
      if (habitatRing)
        habitatRing.rotation.z +=
          delta *
          (0.22 + (discoveryEffect === "station" ? effectPulse * 1.8 : 0));
    }
    if (satellite) {
      if (focusedDiscoveryId !== "satellite") {
        satelliteOrbitPhase -= delta * 0.032;
        satellite.position.set(
          Math.cos(satelliteOrbitPhase) * 92,
          -34 + Math.sin(satelliteOrbitPhase * 4.2) * 4,
          Math.sin(satelliteOrbitPhase) * 68,
        );
      }
      satellite.rotation.y += delta * 0.12;
      satellite.traverse((child) => {
        if (child.name !== "satellite-signal-ring") return;
        const ringScale =
          1 +
          Math.sin(elapsed * 1.4) * 0.06 +
          (discoveryEffect === "satellite" ? effectPulse * 0.44 : 0);
        child.scale.setScalar(ringScale);
      });
    }
    if (spacecraft) {
      const launchAge = elapsed - spacecraftLaunchAt;
      if (spacecraftLaunchActive && launchAge >= 0 && launchAge < 4.2) {
        const progress = Math.min(1, launchAge / 4.2);
        const eased = progress * progress * (3 - 2 * progress);
        spacecraft.position.copy(
          new THREE.QuadraticBezierCurve3(
            spacecraftLaunchFrom,
            spacecraftLaunchControl,
            spacecraftLaunchTo,
          ).getPoint(eased),
        );
        const tangent = new THREE.QuadraticBezierCurve3(
          spacecraftLaunchFrom,
          spacecraftLaunchControl,
          spacecraftLaunchTo,
        ).getTangent(eased);
        spacecraft.rotation.set(0.08, -Math.atan2(tangent.z, tangent.x), -0.12);
        spacecraft.scale.setScalar(
          (lowQuality ? 0.62 : 0.8) * (1 + Math.sin(progress * Math.PI) * 0.22),
        );
      } else {
        spacecraftCruisePhase += (delta * Math.PI * 2) / 42;
        const pathProgress =
          (((spacecraftCruisePhase / (Math.PI * 2)) % 1) + 1) % 1;
        const pathPosition = spacecraftFlightPath.getPointAt(pathProgress);
        const pathTangent = spacecraftFlightPath
          .getTangentAt(pathProgress)
          .normalize();
        spacecraft.position.copy(pathPosition);
        spacecraft.rotation.set(
          Math.asin(THREE.MathUtils.clamp(pathTangent.y, -0.8, 0.8)) * 0.5,
          -Math.atan2(pathTangent.z, pathTangent.x),
          Math.sin(pathProgress * Math.PI * 2) * 0.12,
        );
        spacecraft.scale.setScalar(lowQuality ? 0.62 : 0.8);
      }
      spacecraft.traverse((child) => {
        const boost =
          discoveryTourId === "spacecraft"
            ? 1
            : discoveryEffect === "spacecraft"
              ? effectPulse
              : 0;
        if (child.name === "spacecraft-drive-ring") {
          child.scale.setScalar(
            1 + Math.sin(elapsed * 3.6) * 0.08 + boost * 0.38,
          );
        } else if (child.name === "spacecraft-exhaust") {
          const pulse = 1 + Math.sin(elapsed * 21 + child.position.z) * 0.08;
          child.scale.setScalar((3.8 + boost * 2.4) * pulse);
        } else if (child.name === "spacecraft-engine-plume") {
          const baseLength = Number(child.userData.baseLength || 1);
          child.scale.set(
            1 + boost * 0.32,
            baseLength *
              (1 +
                boost * 0.62 +
                Math.sin(elapsed * 18 + child.position.z) * 0.045),
            1 + boost * 0.32,
          );
        } else if (child.name === "spacecraft-exhaust-particles") {
          const points = child as THREE.Points<
            THREE.BufferGeometry,
            THREE.PointsMaterial
          >;
          const positions = points.geometry.attributes
            .position as THREE.BufferAttribute;
          const speeds = points.userData.speeds as Float32Array;
          for (let index = 0; index < positions.count; index++) {
            let x =
              positions.getX(index) - speeds[index] * delta * (1 + boost * 1.8);
            if (x < -47) x = -10.8;
            positions.setX(index, x);
          }
          positions.needsUpdate = true;
          points.material.opacity = 0.48 + boost * 0.42;
        } else if (child.name === "spacecraft-ion-trails") {
          const material = (child as THREE.LineSegments)
            .material as THREE.LineBasicMaterial;
          material.opacity = 0.045 + boost * 0.32;
        }
      });
      for (const material of enginePlumeMaterials) {
        material.uniforms.uTime.value = elapsed;
        material.uniforms.uBoost.value =
          discoveryTourId === "spacecraft"
            ? 1
            : discoveryEffect === "spacecraft"
              ? effectPulse
              : 0;
      }
    }
    starLayers.forEach((stars, index) => {
      stars.rotation.y += delta * (0.004 + index * 0.006);
      stars.rotation.x = Math.sin(elapsed * (0.018 + index * 0.007)) * 0.018;
    });
    cosmicBodies.forEach((body, index) => {
      body.rotation.y += delta * Number(body.userData.spin || 0.04);
      body.position.y += Math.sin(elapsed * 0.18 + index) * delta * 0.018;
    });
    for (const [id, object] of nodeObjects) {
      const seed = hash(id) % 100;
      object.rotation.y += delta * (0.08 + seed / 900);
      const selected = id === props.selectedId;
      const pulse =
        1 + Math.sin(elapsed * 1.5 + seed) * (selected ? 0.08 : 0.025);
      const currentScale = Number(object.userData.selectionScale || 1);
      const targetScale = Number(object.userData.targetSelectionScale || 1);
      const base = THREE.MathUtils.lerp(
        currentScale,
        targetScale,
        1 - Math.exp(-delta * 5.2),
      );
      object.userData.selectionScale = base;
      object.scale.setScalar(base * pulse);
      object.traverse((child) => {
        const material = (child as THREE.Mesh).material as THREE.Material & {
          opacity?: number;
          uniforms?: Record<string, { value: number }>;
        };
        if (!material) return;
        const targetOpacity = Number(material.userData.targetOpacity);
        if ("opacity" in material && Number.isFinite(targetOpacity)) {
          material.opacity = THREE.MathUtils.lerp(
            Number(material.opacity),
            targetOpacity,
            1 - Math.exp(-delta * 6),
          );
        }
        const targetGlow = Number(material.userData.targetGlowOpacity);
        if (Number.isFinite(targetGlow) && material.uniforms?.glowOpacity) {
          material.uniforms.glowOpacity.value = THREE.MathUtils.lerp(
            material.uniforms.glowOpacity.value,
            targetGlow,
            1 - Math.exp(-delta * 6),
          );
        }
      });
    }
    if (meteor && meteorTrail) {
      const target = meteor.userData.target as THREE.Vector3;
      const cycle = (elapsed % 7.6) / 7.6;
      const visible = cycle < 0.3;
      const progress = Math.min(1, cycle / 0.3);
      const start = target.clone().add(new THREE.Vector3(-170, 92, 90));
      const end = target.clone().add(new THREE.Vector3(70, -32, -24));
      const control = target.clone().add(new THREE.Vector3(-35, 78, 48));
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      meteor.position.copy(curve.getPoint(progress));
      const positions = meteorTrail.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let index = 0; index < positions.count; index++) {
        const trailProgress = Math.max(
          0,
          progress - (positions.count - 1 - index) * 0.009,
        );
        const point = curve.getPoint(trailProgress);
        positions.setXYZ(index, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
      meteor.visible = visible;
      meteorTrail.visible = visible;
    }

    let introProgress = 1;
    if (!introInterrupted && !introCompleted)
      introProgress = applyIntroCamera(now);
    if (warpMaterial) {
      const introWarp =
        introProgress < 1
          ? 0.04 + 0.9 * Math.pow(1 - introProgress, 1.45)
          : 0.035;
      const effectWarp =
        discoveryEffect === "black-hole"
          ? effectPulse * 0.18
          : discoveryEffect === "spacecraft"
            ? effectPulse * 0.72
            : 0;
      warpMaterial.opacity = Math.min(0.96, introWarp + effectWarp);
    }
  }
  updateCameraFlight(now);
  if (!reducedMotion.value) {
    applyCruiseCamera(now, delta);
    updateDiscoveryTour(delta);
    updateFocusedDiscoveryCamera(delta);
  }
  controls.update(delta);
  if (sun && camera && focusedDiscoveryId !== "sun") {
    const viewOffset = (sun.userData.viewOffset as THREE.Vector3)
      .clone()
      .multiplyScalar(320)
      .applyQuaternion(camera.quaternion);
    const anchoredPosition = camera.position.clone().add(viewOffset);
    if (resettingDiscoveryId === "sun" && sunResetActive && cameraFlight) {
      const progress = cameraFlight.duration
        ? Math.min(1, (now - cameraFlight.startedAt) / cameraFlight.duration)
        : 1;
      const eased =
        progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      sun.position.lerpVectors(sunResetFrom, anchoredPosition, eased);
    } else {
      sun.position.copy(anchoredPosition);
      sunResetActive = false;
    }
  }
  if (blackHole && camera && focusedDiscoveryId !== "black-hole") {
    const viewOffset = (blackHole.userData.viewOffset as THREE.Vector3)
      .clone()
      .multiplyScalar(370)
      .applyQuaternion(camera.quaternion);
    const anchoredPosition = camera.position.clone().add(viewOffset);
    if (
      resettingDiscoveryId === "black-hole" &&
      blackHoleResetActive &&
      cameraFlight
    ) {
      const progress = cameraFlight.duration
        ? Math.min(1, (now - cameraFlight.startedAt) / cameraFlight.duration)
        : 1;
      const eased =
        progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      blackHole.position.lerpVectors(
        blackHoleResetFrom,
        anchoredPosition,
        eased,
      );
    } else {
      blackHole.position.copy(anchoredPosition);
      blackHoleResetActive = false;
    }
  }
  renderer.render(scene, camera);
  lastFrame = now;
}

async function initialize() {
  if (!host.value) return;
  if (!supportsWebGL()) {
    failed.value = true;
    emit("fallback", "webgl");
    return;
  }
  reducedMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  lowQuality =
    window.innerWidth < 720 ||
    navigator.hardwareConcurrency <= 4 ||
    Number(
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8,
    ) <= 4;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !lowQuality,
      alpha: false,
      powerPreference: lowQuality ? "low-power" : "high-performance",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, lowQuality ? 1 : 1.6),
    );
    renderer.setClearColor(spaceBackground(), 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.dataset.constellationCanvas = "true";
    renderer.domElement.setAttribute("aria-label", "可交互的三维时光星图");
    host.value.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(spaceBackground(), 0.0016);
    const skipIntro = reducedMotion.value || Boolean(props.selectedId);
    camera = new THREE.PerspectiveCamera(skipIntro ? 48 : 76, 1, 0.1, 1400);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 38;
    controls.maxDistance = 480;
    controls.autoRotate = false;
    controls.enableRotate = !props.ambient;
    controls.enableZoom = !props.ambient;
    controls.enabled = !props.ambient;
    introStartedAt = 0;
    introInterrupted = skipIntro;
    introCompleted = skipIntro;
    ambientOrbitPhase = skipIntro ? INTRO_END_PHASE : INTRO_START_PHASE;
    cruiseOrbitRadius = cruiseRadius();
    cruiseHeight = window.innerWidth < 720 ? 62 : 68;
    cruiseBobPhase = 0;
    const initialPose = overviewPose();
    if (skipIntro) {
      camera.position.copy(initialPose.position);
      controls.target.copy(initialPose.target);
    } else {
      const target = sceneTarget();
      const radius = window.innerWidth < 720 ? 620 : 720;
      camera.position.set(
        target.x + Math.sin(INTRO_START_PHASE) * radius,
        window.innerWidth < 720 ? 8 : 12,
        target.z + Math.cos(INTRO_START_PHASE) * radius,
      );
      controls.target.copy(target);
    }
    const ambientLight = new THREE.AmbientLight(0x8caed2, 0.56);
    ambientLight.name = "ambient-light";
    scene.add(ambientLight);
    const keyLight = new THREE.PointLight(0xbad7f5, 620, 420);
    keyLight.name = "key-light";
    keyLight.position.set(0, 18, 28);
    scene.add(keyLight);
    buildScene();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host.value);
    host.value.addEventListener("pointermove", onPointerMove);
    host.value.addEventListener("pointerdown", onPointerDown);
    host.value.addEventListener("click", onClick);
    controls.addEventListener("start", onControlsStart);
    controls.addEventListener("end", onControlsEnd);
    lastFrame = 0;
    resize();
    renderer.render(scene, camera);
    introStartedAt = performance.now() + Math.max(0, props.introDelayMs);
    ready.value = true;
    emit("ready");
    animate();
  } catch {
    failed.value = true;
    emit("fallback", "initialization");
    destroy();
  }
}

function destroy() {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  resizeObserver = null;
  host.value?.removeEventListener("pointermove", onPointerMove);
  host.value?.removeEventListener("pointerdown", onPointerDown);
  host.value?.removeEventListener("click", onClick);
  controls?.removeEventListener("start", onControlsStart);
  controls?.removeEventListener("end", onControlsEnd);
  controls?.dispose();
  clearSceneContent();
  renderer?.dispose();
  renderer?.domElement.remove();
  controls = null;
  renderer = null;
  camera = null;
  scene = null;
}

watch(
  () => [
    props.graphVersion,
    props.nodes,
    props.relations,
    props.routeNodeIds.join("|"),
  ],
  () => {
    if (!scene || !renderer) return;
    renderer.setClearColor(spaceBackground(), 1);
    renderer.toneMappingExposure = 1.02;
    scene.fog = new THREE.FogExp2(spaceBackground(), 0.0016);
    const ambientLight = scene.getObjectByName("ambient-light") as
      | THREE.AmbientLight
      | undefined;
    if (ambientLight) {
      ambientLight.color.setHex(0x8caed2);
      ambientLight.intensity = 0.56;
    }
    const keyLight = scene.getObjectByName("key-light") as
      | THREE.PointLight
      | undefined;
    if (keyLight) {
      keyLight.color.setHex(0xbad7f5);
      keyLight.intensity = 620;
    }
    buildScene();
  },
);
watch(
  () => props.selectedId,
  () => applySelection(),
);
onMounted(initialize);
onBeforeUnmount(() => {
  disposed = true;
  destroy();
});

defineExpose({
  focusNode: (id: string) => {
    const node = nodeLookup.get(id);
    if (node) emit("select", node);
  },
  focusDiscovery,
  resumeDiscoveryFocus,
  triggerDiscoveryEffect,
  startDiscoveryTour,
  resetView,
});
</script>

<style scoped>
.constellation-scene {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #05090c;
  transition: background-color 0.45s ease;
}
.scene-host {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  touch-action: none;
}
.constellation-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
  opacity: 0;
  transform: scale(1.04);
  transition:
    opacity 1.2s ease,
    transform 1.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.constellation-scene.is-ready :deep(canvas) {
  opacity: 1;
  transform: scale(1);
}
.scene-awakening {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 20px;
  background: #05090c;
  color: #b9ad95;
  pointer-events: none;
}
.awakening-core {
  position: relative;
  display: grid;
  width: 72px;
  height: 72px;
  border: 1px solid rgb(221 173 91/0.42);
  border-radius: 50%;
  place-items: center;
  animation: awakening-turn 6s linear infinite;
}
.awakening-core::before {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #e1b362;
  box-shadow: 0 0 28px #d89a45;
  content: "";
}
.awakening-core i {
  position: absolute;
  inset: 8px;
  border: 1px solid rgb(203 177 127/0.3);
  border-radius: 50%;
  transform: rotate(62deg);
}
.awakening-core i:nth-child(2) {
  inset: -9px;
  transform: rotate(-28deg);
}
.awakening-core i:nth-child(3) {
  inset: 24px -14px;
  transform: rotate(18deg);
}
.scene-awakening small {
  font-size: 0.62rem;
  letter-spacing: 0.12em;
}
.scene-tooltip {
  position: fixed;
  z-index: 20;
  max-width: 220px;
  padding: 7px 9px;
  border: 1px solid rgb(118 185 246/0.2);
  border-radius: 6px;
  background: rgb(5 15 30/0.9);
  box-shadow: 0 8px 24px rgb(0 0 0/0.28);
  color: #edf6ff;
  font-size: 0.66rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.scene-tooltip.visible {
  opacity: 1;
  transform: none;
}
@keyframes awakening-turn {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .constellation-scene :deep(canvas),
  .scene-tooltip {
    transition: none;
  }
  .awakening-core {
    animation: none;
  }
}
</style>
