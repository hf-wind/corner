<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 标签云</div>

      <div class="tag-stats">
        <div class="tag-stat-card">
          <div class="tag-stat-num">42</div>
          <div class="tag-stat-label">总标签数</div>
        </div>
        <div class="tag-stat-card">
          <div class="tag-stat-num">128</div>
          <div class="tag-stat-label">总文章数</div>
        </div>
        <div class="tag-stat-card">
          <div class="tag-stat-num">8</div>
          <div class="tag-stat-label">最热标签</div>
        </div>
        <div class="tag-stat-card">
          <div class="tag-stat-num">1</div>
          <div class="tag-stat-label">最新标签</div>
        </div>
      </div>

      <div class="tag-cloud-section">
        <div class="tag-cloud">
          <span v-for="t in allTags" :key="t.name" class="tag-item" :class="'size-' + t.size" :class-name="t.active ? 'active' : ''">
            {{ t.name }}<span class="tag-count">({{ t.count }})</span>
          </span>
        </div>
      </div>

      <div class="tag-articles">
        <div class="tag-articles-title">
          标签 <span class="tag-badge">Rust</span> 下的文章
        </div>
        <div class="article-list">
          <NuxtLink to="#" v-for="a in rustArticles" :key="a.title" class="article-item">
            <div class="article-item-cover">
              <img :src="a.cover" alt="cover">
            </div>
            <div class="article-item-body">
              <div class="article-item-title">{{ a.title }}</div>
              <div class="article-item-meta">{{ a.date }} · 阅读 {{ a.read }} 分钟</div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">热门标签</div>
        <div class="hot-tags-list">
          <div v-for="t in hotTags" :key="t.name" class="hot-tag-row">
            <span>{{ t.name }}</span>
            <span style="font-size:0.68rem;color:var(--accent);">{{ t.count }} 篇</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">标签分布</div>
        <div class="dist-items">
          <div>
            <div class="dist-info"><span>10+ 篇</span><span>5 个</span></div>
            <div class="dist-bar"><div class="dist-fill" style="width:30%"></div></div>
          </div>
          <div>
            <div class="dist-info"><span>5-9 篇</span><span>12 个</span></div>
            <div class="dist-bar"><div class="dist-fill" style="width:60%"></div></div>
          </div>
          <div>
            <div class="dist-info"><span>1-4 篇</span><span>25 个</span></div>
            <div class="dist-bar"><div class="dist-fill" style="width:90%"></div></div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const allTags = [
  { name: 'Rust', size: 'lg', count: 12, active: true },
  { name: '前端', size: 'lg', count: 18, active: false },
  { name: 'TypeScript', size: 'md', count: 8, active: false },
  { name: 'Vue', size: 'md', count: 10, active: false },
  { name: 'Nuxt', size: 'md', count: 6, active: false },
  { name: 'WebAssembly', size: 'sm', count: 3, active: false },
  { name: 'Docker', size: 'sm', count: 5, active: false },
  { name: '随笔', size: 'lg', count: 15, active: false },
  { name: '旅行', size: 'md', count: 8, active: false },
  { name: '摄影', size: 'sm', count: 4, active: false },
  { name: '读书', size: 'sm', count: 6, active: false },
  { name: 'AI', size: 'md', count: 7, active: false },
  { name: '设计', size: 'sm', count: 4, active: false },
  { name: '音乐', size: 'sm', count: 3, active: false },
  { name: '生活', size: 'sm', count: 9, active: false },
  { name: 'Node.js', size: 'sm', count: 5, active: false },
  { name: 'PostgreSQL', size: 'sm', count: 3, active: false },
  { name: 'Redis', size: 'sm', count: 2, active: false },
]

const hotTags = [
  { name: 'Rust', count: 12 },
  { name: '前端', count: 18 },
  { name: '随笔', count: 15 },
  { name: 'Vue', count: 10 },
  { name: '生活', count: 9 },
]

const rustArticles = [
  { cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200&h=140&fit=crop', title: '用 Rust 重写我的个人博客系统', date: '2025-07-10', read: 12 },
  { cover: 'https://images.unsplash.com/photo-1515879218367-8466d910auj2?w=200&h=140&fit=crop', title: 'Rust 异步编程：从 Tokio 到 Async', date: '2025-05-18', read: 15 },
  { cover: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&h=140&fit=crop', title: 'Rust Web 全栈实战：Axum + SQLx', date: '2025-03-22', read: 20 },
]
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }

.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }

.section-title { font-size: 0.82rem; color: var(--c-text-2); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }

.tag-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
.tag-stat-card { background: var(--ld-bg-card); border-radius: 12px; padding: 16px; box-shadow: 0 2px 4px var(--ld-shadow); text-align: center; transition: all 0.2s; }
.tag-stat-card:hover { transform: translateY(-2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.tag-stat-num { font-size: 1.4rem; font-weight: 700; color: var(--c-primary); }
.tag-stat-label { font-size: 0.68rem; color: var(--c-text-2); margin-top: 4px; }

.tag-cloud-section { background: linear-gradient(135deg, var(--c-bg-1), var(--ld-bg-card)); border-radius: 14px; padding: 28px; box-shadow: 0 2px 4px var(--ld-shadow); margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.tag-item { padding: 8px 18px; border-radius: 24px; border: 1.5px solid var(--border); font-size: 0.82rem; color: var(--c-text-2); cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); background: var(--c-bg); }
.tag-item:hover { border-color: var(--c-primary); color: var(--c-primary); background: var(--c-primary-soft); transform: translateY(-2px); }
.tag-item.active { border-color: var(--c-primary); color: #fff; background: var(--c-primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 40%, transparent); }
.tag-item.size-lg { font-size: 1rem; padding: 10px 22px; font-weight: 700; }
.tag-item.size-md { font-size: 0.88rem; padding: 9px 20px; }
.tag-item.size-sm { font-size: 0.72rem; padding: 6px 14px; }
.tag-count { font-size: 0.65rem; opacity: 0.7; margin-left: 4px; }

.tag-articles { margin-top: 24px; }
.tag-articles-title { font-size: 0.92rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--c-text); }
.tag-articles-title .tag-badge { font-size: 0.68rem; padding: 3px 10px; border-radius: 20px; background: var(--c-primary); color: #fff; box-shadow: 0 2px 8px color-mix(in srgb, var(--c-primary) 30%, transparent); }

.article-list { display: flex; flex-direction: column; gap: 12px; }
.article-item { display: flex; gap: 16px; padding: 14px; background: var(--ld-bg-card); border-radius: 10px; box-shadow: 0 2px 4px var(--ld-shadow); cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; }
.article-item:hover { transform: translateX(2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.article-item-cover { width: 100px; height: 70px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.article-item-cover img { width: 100%; height: 100%; object-fit: cover; }
.article-item-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.article-item-title { font-size: 0.88rem; font-weight: 700; line-height: 1.4; color: var(--c-text); }
.article-item-meta { font-size: 0.68rem; color: var(--c-text-2); }

.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--ld-bg-card); border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px var(--ld-shadow); transition: all 0.2s; }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; color: var(--c-text); }

.hot-tags-list { display: flex; flex-direction: column; gap: 10px; }
.hot-tag-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--c-text); }

.dist-items { display: flex; flex-direction: column; gap: 8px; }
.dist-info { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--c-text-2); margin-bottom: 4px; }
.dist-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.dist-fill { height: 100%; background: var(--c-primary); border-radius: 3px; }
</style>
