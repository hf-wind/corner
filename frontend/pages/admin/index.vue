<template>
  <div>
    <div class="page-title">仪表盘</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-label">文章总数</div>
        <div class="stat-card-value">128</div>
        <div class="stat-card-change">+3 本月</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">总访问量</div>
        <div class="stat-card-value">56,234</div>
        <div class="stat-card-change">+12.3% 较上月</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">评论总数</div>
        <div class="stat-card-value">2,340</div>
        <div class="stat-card-change">+28 待审核</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">运行天数</div>
        <div class="stat-card-value">365</div>
        <div class="stat-card-change">稳定运行中</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <h3>文章管理</h3>
        <div class="table-actions">
          <button class="btn">筛选</button>
          <NuxtLink to="/admin/posts/create" class="btn btn-primary">新建文章</NuxtLink>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>封面</th>
            <th>标题</th>
            <th>分类</th>
            <th>状态</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td><img class="table-thumb" :src="post.cover" alt=""></td>
            <td>{{ post.title }}</td>
            <td>{{ post.category }}</td>
            <td><span class="status-badge" :class="post.statusClass">{{ post.statusText }}</span></td>
            <td>{{ post.date }}</td>
            <td>
              <a class="action-link" href="#">编辑</a>
              <NuxtLink class="action-link" :to="`/article/${post.slug}`">查看</NuxtLink>
              <a class="action-link danger" href="#">删除</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const posts = [
  { id: 1, cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=96&h=64&fit=crop', title: '用 Rust 重写我的个人博客系统', category: '技术', statusText: '已发布', statusClass: 'status-published', date: '2025-07-10', slug: 'rewrite-blog-with-rust' },
  { id: 2, cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=96&h=64&fit=crop', title: '深夜写代码时的那些胡思乱想', category: '随笔', statusText: '已发布', statusClass: 'status-published', date: '2025-07-05', slug: 'midnight-coding-thoughts' },
  { id: 3, cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=96&h=64&fit=crop', title: '云南行记：在丽江古城寻找慢生活', category: '旅行', statusText: '已发布', statusClass: 'status-published', date: '2025-06-22', slug: 'yunnan-lijiang-travel' },
  { id: 4, cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=96&h=64&fit=crop', title: 'WebAssembly 实战：浏览器中的高性能计算', category: '技术', statusText: '草稿', statusClass: 'status-draft', date: '2025-06-15', slug: 'webassembly-practice' },
  { id: 5, cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=96&h=64&fit=crop', title: 'AI 时代的创作者：工具还是伙伴？', category: '思考', statusText: '已发布', statusClass: 'status-published', date: '2025-06-01', slug: 'ai-creator-tool-or-partner' },
  { id: 6, cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=96&h=64&fit=crop', title: '星空下的代码：程序员的浪漫夜晚', category: '随笔', statusText: '草稿', statusClass: 'status-draft', date: '2025-05-28', slug: 'starry-code-romantic-night' },
]
</script>

<style scoped>
.page-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card {
  background: var(--card); border-radius: 12px; padding: 20px; box-shadow: var(--shadow);
}
.stat-card-label { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px; }
.stat-card-value { font-size: 1.6rem; font-weight: 700; color: var(--accent); }
.stat-card-change { font-size: 0.7rem; color: #10b981; margin-top: 4px; }
.table-card {
  background: var(--card); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden;
}
.table-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.table-header h3 { font-size: 0.9rem; font-weight: 700; }
.table-actions { display: flex; gap: 8px; }
.btn {
  padding: 7px 16px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); color: var(--text-secondary);
  font-family: inherit; font-size: 0.78rem; cursor: pointer; transition: all 0.2s;
}
.btn:hover { border-color: var(--accent); color: var(--accent); }
.btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn-primary:hover { opacity: 0.9; color: #fff; }
table { width: 100%; border-collapse: collapse; }
thead th {
  text-align: left; padding: 12px 20px; font-size: 0.72rem; font-weight: 700;
  color: var(--text-secondary); letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border); background: var(--bg-secondary);
}
tbody td { padding: 14px 20px; font-size: 0.82rem; border-bottom: 1px solid var(--border); }
tbody tr:hover { background: var(--accent-light); }
tbody tr:last-child td { border-bottom: none; }
.status-badge {
  display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.68rem;
}
.status-published { background: rgba(16,185,129,0.1); color: #10b981; }
.status-draft { background: rgba(245,158,11,0.1); color: #f59e0b; }
.table-thumb { width: 48px; height: 32px; border-radius: 6px; object-fit: cover; }
.action-link { color: var(--accent); font-size: 0.78rem; margin-right: 12px; transition: opacity 0.2s; }
.action-link:hover { opacity: 0.7; }
.action-link.danger { color: #ef4444; }
</style>
