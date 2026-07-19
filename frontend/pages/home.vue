<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 精选推荐</div>
      <div class="swiper-3d-wrap" ref="swiperRef">
        <div class="swiper-3d-track" :style="{ transform: `translateX(${-currentIndex * cardWidth}px)` }" :class="{ transitioning: isTransitioning }">
          <NuxtLink
            v-for="(item, i) in featured"
            :key="i"
            :to="'/article/' + item.slug"
            class="swiper-card-3d"
            :class="{ active: i === currentIndex, prev: i === currentIndex - 1, next: i === currentIndex + 1 }"
          >
            <img :src="item.cover" alt="">
            <div class="swiper-overlay">
              <h3>{{ item.title }}</h3>
              <span>{{ item.date }}</span>
            </div>
          </NuxtLink>
        </div>
        <div class="swiper-dots">
          <span v-for="(item, i) in featured" :key="i" class="dot" :class="{ active: i === currentIndex }" @click="goTo(i)"></span>
        </div>
      </div>

      <div class="section-title">· 最新文章</div>
      <div class="article-list">
        <NuxtLink v-for="article in articles" :key="article.slug" :to="'/article/' + article.slug" class="article-card">
          <div class="article-cover">
            <img :src="article.cover" :alt="article.title">
          </div>
          <div class="article-body">
            <span class="article-tag">{{ article.tag }}</span>
            <div class="article-title">{{ article.title }}</div>
            <div class="article-date">{{ article.date }}</div>
            <div class="article-desc">{{ article.desc }}</div>
          </div>
        </NuxtLink>
      </div>

      <div class="pagination">
        <button class="page-btn">‹</button>
        <button class="page-btn active">1</button>
        <button class="page-btn">2</button>
        <button class="page-btn">3</button>
        <button class="page-btn">4</button>
        <button class="page-btn">›</button>
      </div>
    </main>

    <aside class="sidebar-right">
      <WeatherClock />
      <RadarChart />
    </aside>
  </div>
</template>

<script setup lang="ts">
const featured = [
  { slug: 'starry-night-code', cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=300&fit=crop', title: '星空下的代码：程序员的浪漫夜晚', date: '2025-06-28' },
  { slug: 'morning-mountain-tea', cover: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=300&fit=crop', title: '山间晨雾与一杯清茶的对话', date: '2025-06-15' },
  { slug: 'spring-walk', cover: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=300&fit=crop', title: '春日漫步：从代码到自然的出走', date: '2025-05-20' },
  { slug: 'deep-learning', cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=300&fit=crop', title: '深度学习：从零到一的思维转变', date: '2025-04-10' },
]

const articles = [
  { slug: 'rust-blog', cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop', tag: '技术', title: '用 Rust 重写我的个人博客系统', date: '2025-07-10', desc: '从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。' },
  { slug: 'late-night-coding', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop', tag: '随笔', title: '深夜写代码时的那些胡思乱想', date: '2025-07-05', desc: '凌晨三点的屏幕光映在脸上，思绪却飘向了远方。关于创造、关于意义。' },
  { slug: 'yunnan-travel', cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=250&fit=crop', tag: '旅行', title: '云南行记：在丽江古城寻找慢生活', date: '2025-06-22', desc: '放下键盘，背上行囊。在古城的石板路上，时间似乎变得很慢很慢。' },
  { slug: 'wasm-practice', cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=250&fit=crop', tag: '技术', title: 'WebAssembly 实战：浏览器中的高性能计算', date: '2025-06-15', desc: '探索 WASM 在前端的无限可能，从图像处理到实时音视频。' },
  { slug: 'ai-creator', cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop', tag: '思考', title: 'AI 时代的创作者：工具还是伙伴？', date: '2025-06-01', desc: '当 AI 可以写诗、作画、编程，人类创作者的独特价值究竟在哪里？' },
]

const currentIndex = ref(0)
const cardWidth = ref(260)
const isTransitioning = ref(false)
const swiperRef = ref<HTMLElement>()
let autoTimer: ReturnType<typeof setInterval>

function goTo(index: number) {
  isTransitioning.value = true
  currentIndex.value = index
}

function nextSlide() {
  if (currentIndex.value >= featured.length - 1) {
    clearInterval(autoTimer)
    return
  }
  isTransitioning.value = true
  currentIndex.value++
}

onMounted(() => {
  cardWidth.value = swiperRef.value ? (swiperRef.value.clientWidth - 48) / 3 : 220
  if (cardWidth.value < 180) cardWidth.value = 180
  autoTimer = setInterval(nextSlide, 10000)
})

onUnmounted(() => {
  clearInterval(autoTimer)
})
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  min-width: 0;
}

.section-title {
  font-size: 0.8rem;
  color: var(--c-text-2);
  letter-spacing: 0.12em;
  margin-bottom: 12px;
  padding-left: 4px;
}

.swiper-3d-wrap {
  position: relative;
  overflow: hidden;
  padding: 16px 0 28px;
  margin-bottom: 20px;
  perspective: 800px;
  user-select: none;
}

.swiper-3d-track {
  display: flex;
  gap: 16px;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 8px;
}

.swiper-3d-track.transitioning {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.swiper-card-3d {
  flex: 0 0 calc((100% - 32px) / 3);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
  background: var(--c-bg-2);
  transform: scale(0.88) translateZ(-40px);
  filter: brightness(0.7);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.5s ease;
  opacity: 0.7;
}

.swiper-card-3d.active {
  transform: scale(1) translateZ(0);
  filter: brightness(1);
  opacity: 1;
  box-shadow: 0 8px 24px var(--ld-shadow);
}

.swiper-card-3d.prev,
.swiper-card-3d.next {
  transform: scale(0.92) translateZ(-20px);
  filter: brightness(0.85);
  opacity: 0.85;
}

.swiper-card-3d img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.swiper-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  color: #fff;
}

.swiper-overlay h3 {
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 3px;
}

.swiper-overlay span {
  font-size: 0.68rem;
  opacity: 0.8;
}

.swiper-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  cursor: pointer;
  transition: all 0.3s;
}

.dot.active {
  width: 18px;
  border-radius: 3px;
  background: var(--c-primary);
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.article-card {
  display: flex;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ld-bg-card);
  box-shadow: 0 2px 4px var(--ld-shadow);
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5em 1em var(--ld-shadow);
}

.article-cover {
  width: 180px;
  min-height: 130px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  mask-image: linear-gradient(to right, black calc(100% - 60px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 60px), transparent 100%);
}

.article-body {
  flex: 1;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.article-tag {
  display: inline-block;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  width: fit-content;
  letter-spacing: 0.06em;
}

.article-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--c-text);
}

.article-date {
  font-size: 0.7rem;
  color: var(--c-text-2);
}

.article-desc {
  font-size: 0.8rem;
  color: var(--c-text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 28px;
}

.page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

.page-btn.active {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
}

.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
