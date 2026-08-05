<template>
  <section v-if="insight" class="reading-strip">
    <header><span>AI READING</span><strong>30 秒读懂</strong></header>
    <p>{{ insight.summary }}</p>
    <details>
      <summary>核心观点</summary>
      <ul>
        <li v-for="point in points" :key="point">{{ point }}</li>
      </ul>
    </details>
    <div v-if="related.length">
      <small>相关内容</small
      ><NuxtLink
        v-for="card in related"
        :key="card.href"
        :to="card.href"
        @click="track(card)"
        >{{ card.title }}<Icon name="ph:arrow-up-right-bold"
      /></NuxtLink>
    </div>
  </section>
</template>
<script setup lang="ts">
const startedAt = Date.now();
const props = defineProps<{ type: string; slug: string }>();
const api = useApi();
const insight = ref<any>(null);
const points = computed(() =>
  Array.isArray(insight.value?.keyPoints) ? insight.value.keyPoints : [],
);
const related = computed(() =>
  Array.isArray(insight.value?.related) ? insight.value.related : [],
);
async function load() {
  try {
    insight.value = await api.get(
      `/ai/content/${props.type}/${props.slug}/insight`,
    );
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
function track(card: any) {
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
onUnmounted(
  () =>
    void api
      .post("/ai/events", {
        scene: props.type === "post" ? "article" : props.type,
        action: "reading_end",
        contentType: props.type,
        sourceId: insight.value?.sourceId,
        durationMs: Date.now() - startedAt,
      })
      .catch(() => undefined),
);
watch(() => props.slug, load);
</script>
<style scoped>
.reading-strip {
  display: grid;
  gap: 10px;
  margin: 0 0 20px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
  border-radius: 14px;
  background: linear-gradient(135deg, var(--ld-bg-card), var(--c-primary-soft));
}
.reading-strip header {
  display: flex;
  align-items: center;
  gap: 9px;
}
.reading-strip header span {
  color: var(--c-primary);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.reading-strip header strong {
  color: var(--c-text);
  font-size: 0.78rem;
}
.reading-strip p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.7rem;
  line-height: 1.75;
}
.reading-strip summary,
.reading-strip small {
  color: var(--c-primary);
  font-size: 0.61rem;
  cursor: pointer;
}
.reading-strip ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--c-text-2);
  font-size: 0.65rem;
  line-height: 1.7;
}
.reading-strip > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}
.reading-strip a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 7px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  font-size: 0.6rem;
  text-decoration: none;
}
</style>
