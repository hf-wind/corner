<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 搜索</div>

      <div class="search-header">
        <input class="search-input-large" type="text" value="Rust 博客" placeholder="输入关键词搜索文章...">
        <div class="search-meta">
          <div class="search-result-count">找到 <strong>3</strong> 篇相关文章</div>
          <div class="search-filters">
            <button v-for="f in filters" :key="f.key" class="search-filter-btn" :class="{ active: f.active }">{{ f.label }}</button>
          </div>
        </div>
      </div>

      <div class="search-results">
        <NuxtLink to="#" v-for="r in results" :key="r.title" class="search-result-item">
          <div class="search-result-cover">
            <img :src="r.cover" alt="cover">
          </div>
          <div class="search-result-body">
            <div class="search-result-title" v-html="r.title"></div>
            <div class="search-result-desc" v-html="r.desc"></div>
            <div class="search-result-meta">
              <span class="search-result-tag">{{ r.tag }}</span>
              <span>{{ r.date }}</span>
              <span>·</span>
              <span>阅读 {{ r.read }} 分钟</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">搜索历史</div>
        <div class="history-list">
          <div v-for="h in history" :key="h.word" class="history-row">
            <span style="color:var(--text-secondary);cursor:pointer;">{{ h.word }}</span>
            <span style="font-size:0.65rem;color:var(--border);">{{ h.time }}</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">热门搜索</div>
        <div class="hot-search-cloud">
          <span class="hot-search-tag" v-for="s in hotSearches" :key="s">{{ s }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const filters = [
  { key: 'all', label: '全部', active: true },
  { key: 'title', label: '标题', active: false },
  { key: 'content', label: '内容', active: false },
  { key: 'tag', label: '标签', active: false },
]

const results = [
  { cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=280&h=200&fit=crop', title: '用<span class="highlight">Rust</span> 重写我的个人<span class="highlight">博客</span>系统', desc: '从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。这是一次充满挑战的技术旅程。', tag: '技术', date: '2025-07-10', read: 12 },
  { cover: 'https://images.unsplash.com/photo-1515879218367-8466d910auj2?w=280&h=200&fit=crop', title: '<span class="highlight">Rust</span> 异步编程：从 Tokio 到 Async', desc: '深入理解 Rust 的异步编程模型，从 Tokio 运行时到原生 async/await，探索高性能并发的奥秘。', tag: '技术', date: '2025-05-18', read: 15 },
  { cover: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=280&h=200&fit=crop', title: '<span class="highlight">Rust</span> Web 全栈实战：Axum + SQLx', desc: '使用 Axum 框架和 SQLx 构建高性能 Web 应用，从数据库设计到 API 实现的完整指南。', tag: '技术', date: '2025-03-22', read: 20 },
]

const history = [
  { word: 'Rust 博客', time: '3 分钟前' },
  { word: 'Vue 3', time: '1 小时前' },
  { word: 'Docker 部署', time: '昨天' },
]

const hotSearches = ['Rust', 'Nuxt', 'Docker', 'TypeScript', '旅行']
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }

.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }

.section-title { font-size: 0.82rem; color: var(--text-secondary); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }

.search-header { background: var(--card); border-radius: 14px; padding: 32px; box-shadow: var(--shadow); margin-bottom: 28px; }
.search-input-large { width: 100%; padding: 16px 20px; border: 2px solid var(--border); border-radius: 12px; background: var(--bg-secondary); color: var(--text); font-family: inherit; font-size: 1.05rem; outline: none; transition: border 0.25s; }
.search-input-large:focus { border-color: var(--accent); }
.search-input-large::placeholder { color: var(--text-secondary); }
.search-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.search-result-count { font-size: 0.82rem; color: var(--text-secondary); }
.search-result-count strong { color: var(--accent); }
.search-filters { display: flex; gap: 8px; }
.search-filter-btn { padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary); font-family: inherit; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
.search-filter-btn:hover, .search-filter-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

.search-results { display: flex; flex-direction: column; gap: 14px; }
.search-result-item { display: flex; gap: 16px; padding: 20px; background: var(--card); border-radius: 12px; box-shadow: var(--shadow); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; }
.search-result-item:hover { transform: translateX(4px); box-shadow: var(--shadow-md); }
.search-result-cover { width: 140px; height: 100px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.search-result-cover img { width: 100%; height: 100%; object-fit: cover; }
.search-result-body { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.search-result-title { font-size: 1rem; font-weight: 700; line-height: 1.4; }
.search-result-title :deep(.highlight) { background: rgba(59,130,246,0.2); padding: 0 2px; border-radius: 2px; }
.search-result-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.search-result-meta { display: flex; gap: 12px; font-size: 0.68rem; color: var(--text-secondary); margin-top: auto; }
.search-result-tag { padding: 2px 8px; border-radius: 12px; background: var(--accent-light); color: var(--accent); }

.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--card); border-radius: 12px; padding: 18px; box-shadow: var(--shadow); }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; }

.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; }

.hot-search-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.hot-search-tag { padding: 4px 12px; border-radius: 16px; border: 1px solid var(--border); font-size: 0.72rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.hot-search-tag:hover { border-color: var(--accent); color: var(--accent); }
</style>
