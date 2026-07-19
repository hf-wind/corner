<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 文章分类</div>

      <div class="category-grid">
        <NuxtLink to="#" v-for="c in categories" :key="c.name" class="category-card" :class="{ active: c.active }">
          <div class="category-icon">{{ c.icon }}</div>
          <div class="category-name">{{ c.name }}</div>
          <div class="category-desc">{{ c.desc }}</div>
          <div class="category-meta">
            <span>{{ c.count }} 篇</span>
            <span>·</span>
            <span>最近更新 {{ c.updated }}</span>
          </div>
        </NuxtLink>
      </div>

      <div class="section-title">· 技术分类下的文章</div>
      <div class="article-list">
        <NuxtLink to="#" v-for="a in techArticles" :key="a.title" class="article-item">
          <div class="article-item-cover">
            <img :src="a.cover" alt="cover">
          </div>
          <div class="article-item-body">
            <div class="article-item-title">{{ a.title }}</div>
            <div class="article-item-desc">{{ a.desc }}</div>
            <div class="article-item-meta">
              <span>{{ a.date }}</span>
              <span>·</span>
              <span>阅读 {{ a.read }} 分钟</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">分类统计</div>
        <div class="cat-stats-list">
          <div v-for="c in categories" :key="c.name" class="cat-stat-row">
            <span class="cat-stat-name">{{ c.icon }} {{ c.name }}</span>
            <span class="cat-stat-count">{{ c.count }} 篇</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">热门标签</div>
        <div class="tag-cloud">
          <span class="tag-item" v-for="t in hotTags" :key="t">{{ t }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const categories = [
  { icon: '💻', name: '技术', desc: '前端、后端、架构设计、开源项目分享', count: 48, updated: '3 天前', active: true },
  { icon: '✍️', name: '随笔', desc: '生活感悟、深夜思考、日常碎念', count: 32, updated: '5 天前', active: false },
  { icon: '🌍', name: '旅行', desc: '城市漫步、山野徒步、人文记录', count: 18, updated: '2 周前', active: false },
  { icon: '📚', name: '读书', desc: '书评、笔记、阅读清单', count: 15, updated: '1 月前', active: false },
  { icon: '🎨', name: '设计', desc: 'UI/UX、配色、排版、设计思路', count: 8, updated: '1 周前', active: false },
  { icon: '🤔', name: '思考', desc: '技术之外的思考、行业观察、人生哲学', count: 7, updated: '2 周前', active: false },
]

const techArticles = [
  { cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=240&h=160&fit=crop', title: '用 Rust 重写我的个人博客系统', desc: '从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。', date: '2025-07-10', read: 12 },
  { cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=240&h=160&fit=crop', title: 'WebAssembly 实战：浏览器中的高性能计算', desc: '探索 WASM 在前端的无限可能，从图像处理到实时音视频，性能提升令人惊叹。', date: '2025-06-15', read: 18 },
  { cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=240&h=160&fit=crop', title: 'TypeScript 5.0 深度解析', desc: '新版本带来了装饰器、const 类型参数等重磅特性，让我们深入了解这些变化。', date: '2024-11-15', read: 20 },
]

const hotTags = ['Rust', '前端', 'TypeScript', 'WebAssembly', 'Nuxt', 'Vue']
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }

.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }

.section-title { font-size: 0.82rem; color: var(--text-secondary); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }

.category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
.category-card { background: var(--card); border-radius: 14px; padding: 24px; box-shadow: var(--shadow); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 12px; }
.category-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.category-card.active { border: 2px solid var(--accent); background: var(--accent-light); }
.category-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: var(--accent-light); }
.category-name { font-size: 1rem; font-weight: 700; }
.category-desc { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.6; }
.category-meta { display: flex; gap: 12px; font-size: 0.7rem; color: var(--text-secondary); margin-top: auto; }

.article-list { display: flex; flex-direction: column; gap: 14px; }
.article-item { display: flex; gap: 16px; padding: 16px; background: var(--card); border-radius: 12px; box-shadow: var(--shadow); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; }
.article-item:hover { transform: translateX(4px); box-shadow: var(--shadow-md); }
.article-item-cover { width: 120px; height: 80px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.article-item-cover img { width: 100%; height: 100%; object-fit: cover; }
.article-item-body { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.article-item-title { font-size: 0.92rem; font-weight: 700; line-height: 1.4; }
.article-item-desc { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.article-item-meta { display: flex; gap: 12px; font-size: 0.68rem; color: var(--text-secondary); margin-top: auto; }

.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--card); border-radius: 12px; padding: 18px; box-shadow: var(--shadow); }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; }

.cat-stats-list { display: flex; flex-direction: column; gap: 10px; }
.cat-stat-row { display: flex; justify-content: space-between; align-items: center; }
.cat-stat-name { font-size: 0.78rem; }
.cat-stat-count { font-size: 0.72rem; color: var(--accent); }

.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); font-size: 0.72rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.tag-item:hover { border-color: var(--accent); color: var(--accent); }
</style>
