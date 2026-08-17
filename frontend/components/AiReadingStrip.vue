<template>
  <section
    v-if="insight"
    class="reading-strip"
    :class="{ 'is-ready': ready, 'is-expanded': expanded }"
  >
    <button
      type="button"
      class="reading-head"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="reading-mark"><Icon name="ph:waveform-bold" /></span>
      <span class="reading-title">
        <small>AI READING</small>
        <strong>30 秒读懂</strong>
      </span>
      <span class="reading-toggle">
        <span>{{ expanded ? "收起" : "展开" }}</span>
        <Icon name="ph:caret-down-bold" />
      </span>
    </button>

    <div class="reading-body-wrap" :aria-hidden="!expanded" :inert="!expanded">
      <div class="reading-body-clip">
        <div class="reading-body">
          <p>{{ insight.summary }}</p>
          <ul v-if="points.length">
            <li v-for="(point, index) in points" :key="point">
              <span>{{ String(index + 1).padStart(2, "0") }}</span
              >{{ point }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const startedAt = Date.now();
const props = defineProps<{ type: string; slug: string }>();
const api = useApi();
const insight = ref<any>(null);
const ready = ref(false);
const expanded = ref(false);
let entranceFrame: number | null = null;

const points = computed<string[]>(() =>
  Array.isArray(insight.value?.keyPoints) ? insight.value.keyPoints : [],
);
async function load() {
  ready.value = false;
  expanded.value = false;
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
  margin: 0 0 20px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 11%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft));
  box-shadow: 0 5px 16px color-mix(in srgb, var(--ld-shadow) 24%, transparent);
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
  height: 1px;
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
.reading-head {
  display: grid;
  width: 100%;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
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
.reading-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.reading-title small {
  color: var(--c-primary);
  font-size: 0.49rem;
  font-weight: 800;
  letter-spacing: 0;
}
.reading-title strong {
  color: var(--c-text);
  font-size: 0.78rem;
}
.reading-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--c-primary);
  font-size: 0.58rem;
}
.reading-toggle :deep(svg) {
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.reading-strip.is-expanded .reading-toggle :deep(svg) {
  transform: rotate(180deg);
}
.reading-body {
  display: grid;
  gap: 11px;
  padding: 0 13px 13px 55px;
}
.reading-body-wrap {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
}
.reading-body-clip {
  min-height: 0;
  overflow: hidden;
}
.reading-strip.is-expanded .reading-body-wrap {
  grid-template-rows: 1fr;
  opacity: 1;
}
.reading-body > p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.68rem;
  line-height: 1.75;
}
.reading-body ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 10px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  list-style: none;
}
.reading-body li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 7px;
  color: var(--c-text-2);
  font-size: 0.64rem;
  line-height: 1.65;
}
.reading-body li span {
  color: var(--c-primary);
  font-family: var(--font-accent);
  font-size: 0.53rem;
}
@keyframes reading-scan {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
@media (max-width: 620px) {
  .reading-head {
    grid-template-columns: 32px minmax(0, 1fr) auto;
  }
  .reading-body {
    padding-left: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .reading-strip {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .reading-strip.is-ready::before {
    animation: none;
  }
  .reading-body-wrap,
  .reading-toggle :deep(svg) {
    transition: none;
  }
}
</style>
