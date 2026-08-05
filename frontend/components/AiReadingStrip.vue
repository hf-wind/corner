<template>
  <section v-if="insight" class="reading-strip" :class="{ 'is-ready': ready }">
    <header>
      <span class="reading-mark"><Icon name="ph:waveform-bold" /></span>
      <div>
        <small>AI READING</small>
        <strong>30 秒读懂</strong>
      </div>
      <span class="reading-signal" aria-hidden="true"
        ><i /><i /><i /><i
      /></span>
    </header>

    <div class="reading-overview" :class="{ 'has-image': primaryImage }">
      <figure v-if="primaryImage">
        <img
          :src="primaryImage"
          :alt="insight.card?.title || ''"
          loading="lazy"
        />
      </figure>
      <p>{{ insight.summary }}</p>
    </div>

    <details v-if="points.length" class="reading-points">
      <summary><span>核心观点</span><Icon name="ph:caret-down-bold" /></summary>
      <ul>
        <li
          v-for="(point, index) in points"
          :key="point"
          :style="{ '--point-index': index }"
        >
          {{ point }}
        </li>
      </ul>
    </details>

    <div v-if="related.length" class="reading-related">
      <small>继续阅读</small>
      <div>
        <NuxtLink
          v-for="card in related"
          :key="card.href"
          :to="card.href"
          @click="track(card)"
        >
          <span class="related-media">
            <img
              v-if="cardImage(card)"
              :src="cardImage(card)"
              :alt="card.title"
              loading="lazy"
            />
            <Icon v-else :name="typeIcon(card.type)" />
          </span>
          <strong>{{ card.title }}</strong>
          <Icon name="ph:arrow-up-right-bold" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AiContentCard } from "~/utils/aiContent";
import { aiCardImage } from "~/utils/aiContent";

const startedAt = Date.now();
const props = defineProps<{ type: string; slug: string }>();
const api = useApi();
const { mediaUrl } = useMediaUrl();
const insight = ref<any>(null);
const ready = ref(false);
let entranceFrame: number | null = null;

const points = computed<string[]>(() =>
  Array.isArray(insight.value?.keyPoints) ? insight.value.keyPoints : [],
);
const related = computed<AiContentCard[]>(() =>
  Array.isArray(insight.value?.related) ? insight.value.related : [],
);
const primaryImage = computed(() => {
  const source = aiCardImage(insight.value?.card);
  return source ? mediaUrl(source) : "";
});

const icons: Record<string, string> = {
  post: "ph:article-bold",
  moment: "ph:sparkle-bold",
  library: "ph:books-bold",
  place: "ph:map-pin-bold",
  album: "ph:images-square-bold",
  photo: "ph:image-bold",
  journey: "ph:path-bold",
  story: "ph:film-strip-bold",
};

function typeIcon(type: string) {
  return icons[type] || "ph:star-four-bold";
}

function cardImage(card: AiContentCard) {
  const source = aiCardImage(card);
  return source ? mediaUrl(source) : "";
}

async function load() {
  ready.value = false;
  try {
    insight.value = await api.get(
      `/ai/content/${props.type}/${props.slug}/insight`,
    );
    await nextTick();
    if (entranceFrame !== null) cancelAnimationFrame(entranceFrame);
    entranceFrame = requestAnimationFrame(() => {
      ready.value = true;
      entranceFrame = null;
    });
    void api
      .post("/ai/events", {
        scene: props.type === "post" ? "article" : props.type,
        action: "exposure",
        contentType: props.type,
        sourceId: insight.value?.sourceId,
      })
      .catch(() => undefined);
  } catch {
    insight.value = null;
  }
}

function track(card: AiContentCard) {
  void api
    .post("/ai/events", {
      scene: props.type === "post" ? "article" : props.type,
      action: "related_click",
      contentType: card.type,
      sourceId: card.sourceId,
      href: card.href,
      sourceClicked: true,
      continued: true,
    })
    .catch(() => undefined);
}

onMounted(load);
onUnmounted(() => {
  if (entranceFrame !== null) cancelAnimationFrame(entranceFrame);
  void api
    .post("/ai/events", {
      scene: props.type === "post" ? "article" : props.type,
      action: "reading_end",
      contentType: props.type,
      sourceId: insight.value?.sourceId,
      durationMs: Date.now() - startedAt,
    })
    .catch(() => undefined);
});
watch(() => props.slug, load);
</script>

<style scoped>
.reading-strip {
  position: relative;
  display: grid;
  gap: 12px;
  margin: 0 0 20px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 95%, var(--c-primary-soft));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 52%, transparent);
  opacity: 0;
  transform: translateY(15px);
  transition:
    opacity 0.55s ease,
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.35s ease;
}
.reading-strip::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--c-primary),
    transparent
  );
  content: "";
  opacity: 0.55;
  transform: translateX(-100%);
}
.reading-strip.is-ready {
  opacity: 1;
  transform: none;
}
.reading-strip.is-ready::before {
  animation: reading-scan 1.1s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.reading-strip header {
  display: flex;
  align-items: center;
  gap: 9px;
}
.reading-mark {
  display: grid;
  width: 32px;
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 25%, var(--border));
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  place-items: center;
}
.reading-strip header > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.reading-strip header small,
.reading-related > small {
  color: var(--c-primary);
  font-size: 0.49rem;
  font-weight: 800;
  letter-spacing: 0;
}
.reading-strip header strong {
  color: var(--c-text);
  font-size: 0.78rem;
}
.reading-signal {
  display: flex;
  height: 20px;
  align-items: center;
  gap: 3px;
  margin-left: auto;
}
.reading-signal i {
  width: 2px;
  height: 5px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--c-primary) 55%, var(--border));
  animation: reading-wave 1.2s ease-in-out infinite alternate;
}
.reading-signal i:nth-child(2) {
  height: 12px;
  animation-delay: -0.7s;
}
.reading-signal i:nth-child(3) {
  height: 8px;
  animation-delay: -0.32s;
}
.reading-signal i:nth-child(4) {
  height: 15px;
  animation-delay: -0.9s;
}
.reading-overview {
  min-width: 0;
}
.reading-overview.has-image {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: stretch;
  gap: 13px;
}
.reading-overview figure {
  min-height: 82px;
  overflow: hidden;
  border-radius: 7px;
  background: var(--c-bg-2);
}
.reading-overview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.reading-strip:hover .reading-overview img {
  transform: scale(1.04);
}
.reading-overview p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.7rem;
  line-height: 1.78;
}
.reading-points {
  padding-top: 9px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.reading-points summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--c-primary);
  font-size: 0.61rem;
  cursor: pointer;
  list-style: none;
}
.reading-points summary::-webkit-details-marker {
  display: none;
}
.reading-points summary :deep(svg) {
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.reading-points[open] summary :deep(svg) {
  transform: rotate(180deg);
}
.reading-points ul {
  display: grid;
  gap: 6px;
  margin: 9px 0 0;
  padding-left: 18px;
  color: var(--c-text-2);
  font-size: 0.65rem;
  line-height: 1.68;
}
.reading-points[open] li {
  animation: point-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--point-index) * 45ms);
}
.reading-points li::marker {
  color: var(--c-primary);
}
.reading-related {
  display: grid;
  gap: 7px;
  padding-top: 9px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.reading-related > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.reading-related a {
  display: grid;
  min-width: 0;
  grid-template-columns: 34px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 7px;
  min-height: 42px;
  padding: 4px 7px 4px 4px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 7px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.reading-related a:hover {
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--border));
  transform: translateY(-2px);
}
.related-media {
  display: grid;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  place-items: center;
}
.related-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.reading-related strong {
  overflow: hidden;
  font-size: 0.59rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reading-related a > svg {
  color: var(--c-primary);
  font-size: 0.66rem;
}
@keyframes reading-scan {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
@keyframes reading-wave {
  to {
    height: 18px;
    background: var(--c-primary);
  }
}
@keyframes point-in {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 620px) {
  .reading-overview.has-image {
    grid-template-columns: 88px minmax(0, 1fr);
  }
  .reading-related > div {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .reading-strip {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .reading-strip.is-ready::before,
  .reading-signal i,
  .reading-points[open] li {
    animation: none;
  }
  .reading-overview img,
  .reading-points summary :deep(svg),
  .reading-related a {
    transition: none;
  }
}
</style>
