<template>
  <section class="ai-discovery" aria-labelledby="ai-discovery-title">
    <div class="ai-discovery-copy">
      <span>AI DISCOVERY</span>
      <h2 id="ai-discovery-title">从一个问题开始探索</h2>
      <p>按主题、时间、地点或心情，发现文章、瞬间、书影、相册与故事。</p>
    </div>
    <form @submit.prevent="explore">
      <input
        v-model="query"
        maxlength="500"
        placeholder="例如：最近关于旅行和阅读的内容"
      /><button :disabled="loading || !query.trim()">
        <Icon name="ph:sparkle-bold" />{{ loading ? "寻找中" : "开始探索" }}
      </button>
    </form>
    <div v-if="answer" class="ai-answer">{{ answer }}</div>
    <div v-if="cards.length" class="ai-cards">
      <NuxtLink
        v-for="card in cards"
        :key="`${card.type}:${card.sourceId}`"
        :to="card.href"
        @click="track(card)"
        ><span>{{ labels[card.type] || card.type }}</span
        ><strong>{{ card.title }}</strong>
        <p>{{ card.excerpt }}</p>
        <Icon name="ph:arrow-up-right-bold"
      /></NuxtLink>
    </div>
  </section>
</template>
<script setup lang="ts">
type Card = {
  type: string;
  sourceId: string;
  title: string;
  href: string;
  excerpt: string;
};
const api = useApi();
const query = ref("");
const loading = ref(false);
const answer = ref("");
const cards = ref<Card[]>([]);
const labels: Record<string, string> = {
  post: "文章",
  moment: "瞬间",
  library: "书影",
  place: "地点",
  album: "相册",
  photo: "照片",
  journey: "旅程",
  story: "故事",
};
async function explore() {
  if (!query.value.trim()) return;
  loading.value = true;
  try {
    const result = await api.post<{ answer: string; cards: Card[] }>(
      "/ai/explore",
      { query: query.value.trim(), limit: 6 },
    );
    answer.value = result.answer;
    cards.value = result.cards || [];
  } finally {
    loading.value = false;
  }
}
function track(card: Card) {
  void api
    .post("/ai/events", {
      scene: "home",
      action: "recommend_click",
      contentType: card.type,
      sourceId: card.sourceId,
      href: card.href,
      sourceClicked: true,
    })
    .catch(() => undefined);
}
onMounted(async () => {
  void api
    .post("/ai/events", {
      scene: "home",
      action: "exposure",
      metadata: { component: "discovery" },
    })
    .catch(() => undefined);
  try {
    const personalized = await api.get<Card[]>("/ai/personalized", {
      limit: 6,
    });
    if (personalized.length) {
      cards.value = personalized;
      answer.value = "根据你最近的阅读与点击，为你整理了一条个性化探索路线。";
    }
  } catch {
    /* optional personalization */
  }
});
</script>
<style scoped>
.ai-discovery {
  display: grid;
  gap: 14px;
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 25%, var(--border));
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    var(--ld-bg-card),
    color-mix(in srgb, var(--c-primary-soft) 55%, var(--ld-bg-card))
  );
  box-shadow: 0 12px 32px var(--ld-shadow);
}
.ai-discovery-copy span {
  color: var(--c-primary);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.ai-discovery-copy h2 {
  margin: 5px 0 3px;
  color: var(--c-text);
  font-size: 1.05rem;
}
.ai-discovery-copy p {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.68rem;
}
.ai-discovery form {
  display: flex;
  gap: 8px;
}
.ai-discovery input {
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--c-bg);
  color: var(--c-text);
  outline: none;
}
.ai-discovery button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 15px;
  border: 0;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
}
.ai-answer {
  padding: 11px 13px;
  border-left: 3px solid var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-text-2);
  font-size: 0.72rem;
  line-height: 1.7;
}
.ai-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}
.ai-cards a {
  position: relative;
  display: flex;
  min-height: 118px;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--ld-bg-card);
  color: inherit;
  text-decoration: none;
}
.ai-cards a > span {
  color: var(--c-primary);
  font-size: 0.53rem;
}
.ai-cards strong {
  margin-top: 5px;
  color: var(--c-text);
  font-size: 0.72rem;
}
.ai-cards p {
  display: -webkit-box;
  overflow: hidden;
  margin: 6px 0 0;
  color: var(--c-text-3);
  font-size: 0.6rem;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.ai-cards svg {
  position: absolute;
  right: 10px;
  bottom: 10px;
  color: var(--c-primary);
}
@media (max-width: 760px) {
  .ai-cards {
    grid-template-columns: 1fr;
  }
  .ai-discovery form {
    flex-direction: column;
  }
  .ai-discovery button {
    justify-content: center;
    min-height: 40px;
  }
}
</style>
