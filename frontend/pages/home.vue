<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 精选推荐</div>
      <div class="swiper-wrap">
        <NuxtLink v-for="item in featured" :key="item.slug" :to="'/article/' + item.slug" class="swiper-card">
          <img :src="item.cover" alt="">
          <div class="overlay">
            <h3>{{ item.title }}</h3>
            <span>{{ item.date }}</span>
          </div>
        </NuxtLink>
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
      <div class="right-card">
        <div class="right-card-title">公告</div>
        <div class="notice-item" v-for="(notice, i) in notices" :key="i">
          <span class="notice-dot"></span>
          <span>{{ notice }}</span>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">标签</div>
        <div class="tag-cloud">
          <NuxtLink v-for="tag in tags" :key="tag.name" :to="'/tags' + tag.query" class="tag-item">{{ tag.name }}</NuxtLink>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">友链</div>
        <NuxtLink v-for="friend in friends" :key="friend.name" :to="friend.url" class="friend-item">
          <img class="friend-avatar" :src="friend.avatar" :alt="friend.name">
          <div>
            <div class="friend-name">{{ friend.name }}</div>
            <div class="friend-desc">{{ friend.desc }}</div>
          </div>
        </NuxtLink>
      </div>

      <div class="right-card">
        <div class="right-card-title">站点统计</div>
        <div class="stats-wrap">
          <div v-for="stat in stats" :key="stat.label">
            <div class="progress-info"><span>{{ stat.label }}</span><span>{{ stat.value }}</span></div>
            <div class="progress-bar"><div class="progress-fill" :style="{ width: stat.pct }"></div></div>
          </div>
        </div>
      </div>
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
  { slug: 'rust-blog', cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop', tag: '技术', title: '用 Rust 重写我的个人博客系统', date: '2025-07-10', desc: '从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。这是一次充满挑战的技术旅程。' },
  { slug: 'late-night-coding', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop', tag: '随笔', title: '深夜写代码时的那些胡思乱想', date: '2025-07-05', desc: '凌晨三点的屏幕光映在脸上，思绪却飘向了远方。关于创造、关于意义、关于那些代码之外的东西。' },
  { slug: 'yunnan-travel', cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=250&fit=crop', tag: '旅行', title: '云南行记：在丽江古城寻找慢生活', date: '2025-06-22', desc: '放下键盘，背上行囊。在古城的石板路上，时间似乎变得很慢很慢。这里的每一个角落都有故事。' },
  { slug: 'wasm-practice', cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=250&fit=crop', tag: '技术', title: 'WebAssembly 实战：浏览器中的高性能计算', date: '2025-06-15', desc: '探索 WASM 在前端的无限可能，从图像处理到实时音视频，性能提升令人惊叹。' },
  { slug: 'ai-creator', cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop', tag: '思考', title: 'AI 时代的创作者：工具还是伙伴？', date: '2025-06-01', desc: '当 AI 可以写诗、作画、编程，人类创作者的独特价值究竟在哪里？一些深夜的思考碎片。' },
]

const notices = [
  '博客已升级至 v3.0，全新设计上线！',
  '每周三、周六定期更新',
]

const tags = [
  { name: 'Rust', query: '?tag=rust' },
  { name: '前端', query: '?tag=frontend' },
  { name: '随笔', query: '?tag=essay' },
  { name: '旅行', query: '?tag=travel' },
  { name: '摄影', query: '?tag=photo' },
  { name: '读书', query: '?tag=reading' },
  { name: 'AI', query: '?tag=ai' },
  { name: '设计', query: '?tag=design' },
  { name: '音乐', query: '?tag=music' },
  { name: '生活', query: '?tag=life' },
]

const friends = [
  { name: '林间小径', url: '/friends', desc: '自然笔记', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face' },
  { name: '数字花园', url: '/friends', desc: '技术探索', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face' },
  { name: '光影手记', url: '/friends', desc: '摄影日记', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face' },
]

const stats = [
  { label: '文章', value: '128 篇', pct: '64%' },
  { label: '标签', value: '42 个', pct: '42%' },
  { label: '运行天数', value: '365 天', pct: '90%' },
]
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
  padding: 24px 32px;
  min-width: 0;
}

.section-title {
  font-size: 0.82rem;
  color: var(--text-secondary);
  letter-spacing: 0.12em;
  margin-bottom: 14px;
  padding-left: 4px;
}

.swiper-wrap {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 8px;
  margin-bottom: 28px;
}

.swiper-card {
  flex: 0 0 280px;
  scroll-snap-align: start;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.swiper-card:hover {
  transform: translateY(-3px);
}

.swiper-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

.overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.65));
  color: #fff;
}

.overlay h3 {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 4px;
}

.overlay span {
  font-size: 0.7rem;
  opacity: 0.8;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.article-card {
  display: flex;
  gap: 0;
  border-radius: 14px;
  overflow: hidden;
  background: var(--card);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  text-decoration: none;
  color: inherit;
}

.article-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.article-cover {
  width: 220px;
  min-height: 150px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.article-cover::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 60px;
  background: linear-gradient(to right, transparent, var(--card));
  pointer-events: none;
}

:global(.dark) .article-cover::after {
  background: linear-gradient(to right, transparent, #2a2d35);
}

.article-body {
  flex: 1;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.article-tag {
  display: inline-block;
  font-size: 0.68rem;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--accent-light);
  color: var(--accent);
  width: fit-content;
  letter-spacing: 0.06em;
}

.article-title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.5;
}

.article-date {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.article-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.7;
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
  margin-top: 32px;
}

.page-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.page-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-card {
  background: var(--card);
  border-radius: 12px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.right-card-title {
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0.05em;
}

.notice-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.notice-item + .notice-item {
  border-top: 1px solid var(--border);
}

.notice-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 6px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  font-size: 0.72rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.tag-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  text-decoration: none;
  color: inherit;
}

.friend-item + .friend-item {
  border-top: 1px solid var(--border);
}

.friend-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.friend-name {
  font-size: 0.8rem;
  font-weight: 400;
}

.friend-desc {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.stats-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.6s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 6px;
}
</style>
