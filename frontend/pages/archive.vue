<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 文章归档</div>

      <div class="archive-stats">
        <div class="stat-card">
          <div class="stat-num">{{ stats.posts }}</div>
          <div class="stat-label">篇文章</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.tags }}</div>
          <div class="stat-label">个标签</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.categories }}</div>
          <div class="stat-label">个分类</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ archiveTotal }}</div>
          <div class="stat-label">天</div>
        </div>
      </div>

      <div v-if="loading" class="loading-tip">加载中...</div>
      <template v-else>
        <div v-for="(yearItems, year) in grouped" :key="year" class="year-group">
          <div class="year-header">
            <span class="year-badge">{{ year }}</span>
            <div class="year-line"></div>
            <span class="year-count">{{ yearItems.length }} 篇</span>
          </div>
          <div class="timeline">
            <NuxtLink :to="'/article/' + item.slug" class="timeline-item" v-for="item in yearItems" :key="item.slug">
              <div class="timeline-date">{{ item.date }}</div>
              <div class="timeline-title">{{ item.title }}</div>
              <div class="timeline-desc">{{ item.desc }}</div>
              <div class="timeline-meta">
                <span class="timeline-tag">{{ item.tag }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </template>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">归档统计</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div v-for="(count, yr) in yearCounts" :key="yr">
            <div class="progress-info"><span>{{ yr }}</span><span>{{ count }} 篇</span></div>
            <div class="progress-bar"><div class="progress-fill" :style="{ width: (count / maxYearCount * 100) + '%' }"></div></div>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">月度分布</div>
        <div class="month-grid">
          <div v-for="m in monthList" :key="m.label" class="month-cell">
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
const api = useApi()
const posts = ref<any[]>([])
const tags = ref<any[]>([])
const loading = ref(true)
const stats = ref({ posts: 0, tags: 0, categories: 0 })
const archiveTotal = ref(365)

onMounted(async () => {
  try {
    const [postRes, tagRes, radar] = await Promise.all([
      api.get<any>('/posts', { limit: 100, sort: 'latest' }),
      api.get<any>('/tags'),
      api.get<any>('/stats/radar'),
    ])
    posts.value = (postRes.items ?? []).map((p: any) => ({
      slug: p.slug,
      title: p.title,
      date: p.publishedAt?.slice(0, 10) ?? '',
      desc: p.excerpt ?? '',
      tag: p.category?.name ?? p.tags?.[0]?.name ?? '',
    }))
    tags.value = (tagRes ?? []).map((t: any) => t.name)
    stats.value = { posts: radar.posts ?? 0, tags: radar.tags ?? 0, categories: radar.categories ?? 0 }
  } catch { /* keep empty */ }
  loading.value = false
})

const grouped = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const p of posts.value) {
    const year = p.date.slice(0, 4)
    if (!groups[year]) groups[year] = []
    groups[year].push(p)
  }
  return groups
})

const yearCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const [year, items] of Object.entries(grouped.value)) {
    counts[year] = items.length
  }
  return counts
})

const maxYearCount = computed(() => Math.max(...Object.values(yearCounts.value), 1))

const monthList = computed(() => {
  const months: Record<string, number> = {}
  for (const p of posts.value) {
    const m = p.date.slice(0, 7)
    months[m] = (months[m] || 0) + 1
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }))
    .slice(0, 12)
})

const hotTags = computed(() => tags.value.slice(0, 8))
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
.loading-tip {
  text-align: center;
  color: var(--c-text-2);
  padding: 32px;
  font-size: 0.85rem;
}
.archive-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 4px var(--ld-shadow);
}
.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--c-primary);
}
.stat-label {
  font-size: 0.75rem;
  color: var(--c-text-2);
  margin-top: 2px;
}
.year-group {
  margin-bottom: 20px;
}
.year-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.year-badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-primary);
  background: var(--c-primary-soft);
  padding: 2px 10px;
  border-radius: 6px;
}
.year-line {
  flex: 1;
  height: 1.5px;
  background: var(--border);
}
.year-count {
  font-size: 0.7rem;
  color: var(--c-text-2);
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}
.timeline-item:hover {
  background: var(--c-bg-2);
}
.timeline-date {
  font-size: 0.7rem;
  color: var(--c-text-2);
  width: 80px;
  flex-shrink: 0;
}
.timeline-title {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
}
.timeline-desc {
  display: none;
}
.timeline-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}
.timeline-tag {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
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
.right-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 4px var(--ld-shadow);
}
.right-card-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--c-text-2);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--c-text-2);
  margin-bottom: 4px;
}
.progress-bar {
  height: 4px;
  background: var(--c-bg-2);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--c-primary);
  border-radius: 2px;
  transition: width 0.3s;
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.month-cell {
  text-align: center;
  padding: 6px;
  border-radius: 6px;
  background: var(--c-bg-2);
}
.month-num {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-primary);
}
.month-label {
  font-size: 0.6rem;
  color: var(--c-text-2);
  margin-top: 2px;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-item {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
}
</style>
