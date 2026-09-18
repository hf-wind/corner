<template>
  <div class="book-loader">
    <div class="loader-scene">
      <div class="book" ref="bookRef">
        <div class="book-spine"></div>
        <div class="book-page-stack">
          <div class="page p5"><span class="page-text">{{ pageQuotes[4] }}</span></div>
          <div class="page p4"><span class="page-text">{{ pageQuotes[3] }}</span></div>
          <div class="page p3"><span class="page-text">{{ pageQuotes[2] }}</span></div>
          <div class="page p2"><span class="page-text">{{ pageQuotes[1] }}</span></div>
          <div class="page p1"><span class="page-text">{{ pageQuotes[0] }}</span></div>
        </div>
        <div class="book-cover">
          <div class="cover-label">{{ label }}</div>
        </div>
      </div>
    </div>
    <div class="loader-info">
      <p class="loader-label">{{ label }}</p>
      <Transition name="quote-fade" mode="out-in">
        <p class="loader-quote" :key="quoteIndex">「{{ quotes[quoteIndex] }}」</p>
      </Transition>
      <div class="loader-bar"><div class="loader-bar-fill"></div></div>
      <p v-if="stage" class="loader-stage">{{ stage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
const props = defineProps<{ label?: string; stage?: string }>();

// 翻页上轮播的真实阅读趣识：加载等待也值得一看
const QUOTES = [
  "全世界每年出版的书，把你余生读完都远远不够——所以只挑真心想读的。",
  "「书」这个词，最早刻在甲骨上的形状，就是一只手捧着竹简。",
  "阅读 6 分钟，大脑颞叶的紧张感就会开始下降，像深呼吸一样。",
  "世界上第一本「随身书」是口袋大小的禁书——为了躲过审查才被做小的。",
  "纸质书页的香气，一部分来自纸张缓慢分解出的香草醛——和香草是同款分子。",
  "企鹅出版社的平装书最初被设计成「香烟盒的大小」，为的是士兵能塞进军装口袋。",
  "中国古代的「册」字，就是一片片竹简用绳子串起来的样子。",
  "一本 300 页的书约 9 万字，中文阅读熟练者 4 个多小时就能读完一整个世界。",
  "博尔赫斯说：天堂应该是图书馆的模样。",
  "you are what you read——你翻过的每一页，都会悄悄变成你的一部分。",
];

const PAGE_SNIPPETS = [
  "书中自有…",
  "夜航的帆",
  "灯塔仍在",
  "风起青萍",
  "未完待续",
];

const quotes = ref<string[]>([]);
const pageQuotes = ref<string[]>([...PAGE_SNIPPETS]);
const quoteIndex = ref(0);
let quoteTimer: ReturnType<typeof setInterval> | null = null;

function reshuffle() {
  quotes.value = [...QUOTES].sort(() => Math.random() - 0.5).slice(0, 5);
  pageQuotes.value = [...PAGE_SNIPPETS].sort(() => Math.random() - 0.5);
  quoteIndex.value = 0;
}

onMounted(() => {
  reshuffle();
  quoteTimer = setInterval(() => {
    quoteIndex.value = (quoteIndex.value + 1) % quotes.value.length;
  }, 3000);
});

onBeforeUnmount(() => {
  if (quoteTimer) clearInterval(quoteTimer);
});

watch(
  () => props.label,
  () => reshuffle(),
);
</script>

<style scoped>
.book-loader {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  background: var(--reader-bg, #fbf7ee);
  z-index: 10;
}

/* ---- 3-D book ---- */
.loader-scene {
  perspective: 600px;
  width: 140px;
  height: 110px;
}

.book {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateX(-8deg) rotateY(-25deg);
  animation: book-bob 2.4s ease-in-out infinite;
}

@keyframes book-bob {
  0%, 100% { transform: rotateX(-8deg) rotateY(-25deg) translateY(0); }
  50%      { transform: rotateX(-8deg) rotateY(-25deg) translateY(-8px); }
}

/* spine */
.book-spine {
  position: absolute;
  left: 0; top: 0;
  width: 14px;
  height: 100%;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--c-primary) 62%, var(--reader-ink, #34332f)),
    color-mix(in srgb, var(--c-primary) 42%, var(--reader-bg, #fbf7ee))
  );
  transform: rotateY(90deg) translateZ(0px);
  transform-origin: left center;
  border-radius: 2px 0 0 2px;
}

/* stack of pages */
.book-page-stack {
  position: absolute;
  left: 14px; top: 4px;
  right: 4px; bottom: 4px;
  transform-style: preserve-3d;
}

.page {
  position: absolute;
  inset: 0;
  display: grid;
  align-items: start;
  padding: 10px 8px;
  background: color-mix(in srgb, var(--reader-bg, #fff) 82%, #fff);
  border-radius: 1px 3px 3px 1px;
  transform-origin: left center;
  backface-visibility: hidden;
  overflow: hidden;
}

.page::after {
  content: "";
  position: absolute;
  inset: 6px 7px;
  border: 1px solid color-mix(in srgb, var(--reader-ink, #34332f) 9%, transparent);
  border-radius: 2px;
}

.page-text {
  color: color-mix(in srgb, var(--reader-ink, #34332f) 62%, transparent);
  font-size: 9px;
  letter-spacing: 0.14em;
  line-height: 1.5;
}

/* each page flips at a staggered time */
.p1 { animation: page-flip 3s ease-in-out 0s infinite; }
.p2 { animation: page-flip 3s ease-in-out 0.25s infinite; }
.p3 { animation: page-flip 3s ease-in-out 0.5s infinite; }
.p4 { animation: page-flip 3s ease-in-out 0.75s infinite; }
.p5 { animation: page-flip 3s ease-in-out 1s infinite; }

@keyframes page-flip {
  0%   { transform: rotateY(0deg); }
  40%  { transform: rotateY(-160deg); }
  50%  { transform: rotateY(-160deg); }
  100% { transform: rotateY(0deg); }
}

/* cover */
.book-cover {
  position: absolute;
  left: 14px; top: 0;
  right: 0; bottom: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c-primary) 88%, var(--reader-ink, #34332f)) 0%,
    var(--c-primary) 52%,
    color-mix(in srgb, var(--c-primary) 82%, var(--reader-ink, #34332f)) 100%
  );
  border-radius: 0 6px 6px 0;
  transform: translateZ(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c-primary) 26%, transparent);
}

.cover-label {
  color: color-mix(in srgb, #fff 92%, var(--c-primary));
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.78;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- info ---- */
.loader-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
}

.loader-label {
  margin: 0;
  color: var(--reader-ink, #34332f);
  font-size: 13px;
  opacity: 0.55;
}

.loader-quote {
  margin: 0;
  max-width: min(320px, 76vw);
  color: color-mix(in srgb, var(--reader-ink, #34332f) 72%, transparent);
  font-size: 12px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  text-align: center;
}

.quote-fade-enter-active,
.quote-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.quote-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.quote-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.loader-stage {
  margin: 0;
  color: color-mix(in srgb, var(--reader-ink, #34332f) 46%, transparent);
  font-size: 10px;
  letter-spacing: 0.18em;
}

.loader-bar {
  width: 180px;
  height: 3px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--reader-ink, #34332f) 10%, transparent);
  overflow: hidden;
}

.loader-bar-fill {
  width: 40%;
  height: 100%;
  border-radius: 2px;
  background: var(--c-primary, #8B4513);
  animation: bar-slide 1.2s ease-in-out infinite;
}

@keyframes bar-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
</style>
