<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 文章归档</div>

      <div class="archive-stats">
        <div class="stat-card">
          <div class="stat-num">128</div>
          <div class="stat-label">篇文章</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">42</div>
          <div class="stat-label">个标签</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">8</div>
          <div class="stat-label">个分类</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">365</div>
          <div class="stat-label">天</div>
        </div>
      </div>

      <div class="year-header">
        <span class="year-badge">2025</span>
        <div class="year-line"></div>
        <span class="year-count">42 篇</span>
      </div>
      <div class="timeline">
        <NuxtLink to="#" class="timeline-item" v-for="item in timeline2025" :key="item.date">
          <div class="timeline-date">{{ item.date }}</div>
          <div class="timeline-title">{{ item.title }}</div>
          <div class="timeline-desc">{{ item.desc }}</div>
          <div class="timeline-meta">
            <span class="timeline-tag">{{ item.tag }}</span>
            <span class="timeline-read">阅读 {{ item.read }} 分钟</span>
          </div>
        </NuxtLink>
      </div>

      <div class="year-header">
        <span class="year-badge">2024</span>
        <div class="year-line"></div>
        <span class="year-count">56 篇</span>
      </div>
      <div class="timeline">
        <NuxtLink to="#" class="timeline-item" v-for="item in timeline2024" :key="item.date">
          <div class="timeline-date">{{ item.date }}</div>
          <div class="timeline-title">{{ item.title }}</div>
          <div class="timeline-desc">{{ item.desc }}</div>
          <div class="timeline-meta">
            <span class="timeline-tag">{{ item.tag }}</span>
            <span class="timeline-read">阅读 {{ item.read }} 分钟</span>
          </div>
        </NuxtLink>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">归档统计</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <div class="progress-info"><span>2025</span><span>42 篇</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:75%"></div></div>
          </div>
          <div>
            <div class="progress-info"><span>2024</span><span>56 篇</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>
          </div>
          <div>
            <div class="progress-info"><span>2023</span><span>30 篇</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:54%"></div></div>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">月度分布</div>
        <div class="month-grid">
          <div v-for="m in months" :key="m.label" class="month-cell">
            <div class="month-num">{{ m.count }}</div>
            <div class="month-label">{{ m.label }}</div>
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
const timeline2025 = [
  { date: '07-10', title: '用 Rust 重写我的个人博客系统', desc: '从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。', tag: '技术', read: 12 },
  { date: '07-05', title: '深夜写代码时的那些胡思乱想', desc: '凌晨三点的屏幕光映在脸上，思绪却飘向了远方。关于创造、关于意义、关于那些代码之外的东西。', tag: '随笔', read: 8 },
  { date: '06-28', title: '星空下的代码：程序员的浪漫夜晚', desc: '在山间小屋写下最后一行代码，抬头便是漫天繁星。这是属于程序员独有的浪漫。', tag: '随笔', read: 6 },
  { date: '06-22', title: '云南行记：在丽江古城寻找慢生活', desc: '放下键盘，背上行囊。在古城的石板路上，时间似乎变得很慢很慢。这里的每一个角落都有故事。', tag: '旅行', read: 15 },
  { date: '06-15', title: 'WebAssembly 实战：浏览器中的高性能计算', desc: '探索 WASM 在前端的无限可能，从图像处理到实时音视频，性能提升令人惊叹。', tag: '技术', read: 18 },
  { date: '06-01', title: 'AI 时代的创作者：工具还是伙伴？', desc: '当 AI 可以写诗、作画、编程，人类创作者的独特价值究竟在哪里？一些深夜的思考碎片。', tag: '思考', read: 10 },
]

const timeline2024 = [
  { date: '12-20', title: '年终总结：写代码的第三年', desc: '回顾这一年的成长与收获，从技术到生活，从迷茫到坚定。', tag: '随笔', read: 12 },
  { date: '11-15', title: 'TypeScript 5.0 深度解析', desc: '新版本带来了装饰器、const 类型参数等重磅特性，让我们深入了解这些变化。', tag: '技术', read: 20 },
  { date: '10-08', title: '从零搭建个人知识管理系统', desc: '分享我如何用 Obsidian + Zotero + Logseq 构建自己的第二大脑。', tag: '效率', read: 14 },
]

const months = [
  { label: '1月', count: 18 },
  { label: '2月', count: 12 },
  { label: '3月', count: 15 },
  { label: '4月', count: 9 },
  { label: '5月', count: 22 },
  { label: '6月', count: 28 },
]

const hotTags = ['Rust', '前端', '随笔', '旅行', 'AI', '设计']
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }

.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }

.section-title { font-size: 0.82rem; color: var(--c-text-2); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }

.archive-stats { display: flex; gap: 16px; margin-bottom: 32px; }
.stat-card { flex: 1; background: var(--ld-bg-card); border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px var(--ld-shadow); text-align: center; transition: all 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.stat-num { font-size: 1.8rem; font-weight: 700; color: var(--c-primary); line-height: 1; }
.stat-label { font-size: 0.72rem; color: var(--c-text-2); margin-top: 6px; }

.year-header { display: flex; align-items: center; gap: 12px; margin: 28px 0 16px; padding-left: 4px; }
.year-badge { font-size: 1.3rem; font-weight: 700; color: var(--c-primary); }
.year-line { flex: 1; height: 1px; background: var(--border); }
.year-count { font-size: 0.72rem; color: var(--c-text-2); }

.timeline { position: relative; padding-left: 28px; }
.timeline::before { content: ''; position: absolute; left: 6px; top: 0; bottom: 0; width: 2px; background: var(--border); }
.timeline-item { position: relative; margin-bottom: 20px; padding: 16px 20px; background: var(--ld-bg-card); border-radius: 12px; box-shadow: 0 2px 4px var(--ld-shadow); cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; display: block; }
.timeline-item:hover { transform: translateX(2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.timeline-item::before { content: ''; position: absolute; left: -24px; top: 22px; width: 10px; height: 10px; border-radius: 50%; background: var(--c-primary); border: 2px solid var(--c-bg); box-shadow: 0 0 0 2px var(--c-primary); }
.timeline-date { font-size: 0.68rem; color: var(--c-primary); margin-bottom: 6px; font-weight: 700; }
.timeline-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; line-height: 1.5; color: var(--c-text); }
.timeline-desc { font-size: 0.8rem; color: var(--c-text-2); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.timeline-meta { display: flex; gap: 12px; margin-top: 10px; }
.timeline-tag { font-size: 0.66rem; padding: 2px 8px; border-radius: 20px; background: var(--c-primary-soft); color: var(--c-primary); }
.timeline-read { font-size: 0.66rem; color: var(--c-text-2); }

.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--ld-bg-card); border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px var(--ld-shadow); transition: all 0.2s; }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; color: var(--c-text); }

.progress-bar { width: 100%; height: 4px; background: var(--border); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 2px; background: var(--c-primary); transition: width 0.6s ease; }
.progress-info { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--c-text-2); margin-top: 6px; }

.month-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.month-cell { text-align: center; padding: 8px; background: var(--c-primary-soft); border-radius: 8px; transition: background 0.2s; }
.month-cell:hover { background: color-mix(in srgb, var(--c-primary) 20%, transparent); }
.month-num { font-size: 1rem; font-weight: 700; color: var(--c-primary); }
.month-label { font-size: 0.65rem; color: var(--c-text-2); }

.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); font-size: 0.72rem; color: var(--c-text-2); cursor: pointer; transition: all 0.2s; }
.tag-item:hover { border-color: var(--c-primary); color: var(--c-primary); }
</style>
