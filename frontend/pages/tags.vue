<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 标签云</div>

      <div v-if="loading" class="loading-tip">加载中...</div>
      <template v-else>
        <div class="tag-stats">
          <div class="tag-stat-card">
            <div class="tag-stat-num">{{ allTags.length }}</div>
            <div class="tag-stat-label">总标签数</div>
          </div>
          <div class="tag-stat-card">
            <div class="tag-stat-num">{{ totalPosts }}</div>
            <div class="tag-stat-label">总文章数</div>
          </div>
          <div class="tag-stat-card">
            <div class="tag-stat-num">{{ hotTagsCount }}</div>
            <div class="tag-stat-label">最热标签</div>
          </div>
          <div class="tag-stat-card">
            <div class="tag-stat-num">{{ latestTag }}</div>
            <div class="tag-stat-label">最新标签</div>
          </div>
        </div>

        <div class="tag-cloud-section">
          <div class="tag-cloud">
            <span
              v-for="t in tagCloud"
              :key="t.name"
              class="tag-item"
              :class="[t.size, { active: activeTag === t.name }]"
              @click="selectTag(t.name)"
            >
              {{ t.name }}<span class="tag-count">({{ t.count }})</span>
            </span>
          </div>
        </div>

        <div v-if="activeTag" class="tag-articles">
          <div class="tag-articles-title">
            标签 <span class="tag-badge">{{ activeTag }}</span> 下的文章
          </div>
          <div class="article-list">
            <NuxtLink v-for="a in tagPosts" :key="a.slug" :to="'/article/' + a.slug" class="article-item">
              <div class="article-item-cover">
                <img :src="coverUrl(a.cover)" alt="cover">
              </div>
              <div class="article-item-body">
                <div class="article-item-title">{{ a.title }}</div>
                <div class="article-item-meta">{{ a.date?.slice(0, 10) }}</div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </template>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">热门标签</div>
        <div class="hot-tags-list">
          <div v-for="t in hotTagsList" :key="t.name" class="hot-tag-row">
            <span>{{ t.name }}</span>
            <span style="font-size:0.68rem;color:var(--accent);">{{ t.count }} 篇</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">标签分布</div>
        <div class="dist-items">
          <div>
            <div class="dist-info"><span>10+ 篇</span><span>{{ distCounts.high }} 个</span></div>
            <div class="dist-bar"><div class="dist-fill" :style="{ width: (distCounts.high / Math.max(...Object.values(distCounts), 1) * 100) + '%' }"></div></div>
          </div>
          <div>
            <div class="dist-info"><span>5-9 篇</span><span>{{ distCounts.medium }} 个</span></div>
            <div class="dist-bar"><div class="dist-fill" :style="{ width: (distCounts.medium / Math.max(...Object.values(distCounts), 1) * 100) + '%' }"></div></div>
          </div>
          <div>
            <div class="dist-info"><span>1-4 篇</span><span>{{ distCounts.low }} 个</span></div>
            <div class="dist-bar"><div class="dist-fill" :style="{ width: (distCounts.low / Math.max(...Object.values(distCounts), 1) * 100) + '%' }"></div></div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { getDisplayImageUrl } from '~/utils/imagePerformance'

const api = useApi()
const allTags = ref<any[]>([])
const tagPosts = ref<any[]>([])
const loading = ref(true)
const activeTag = ref('')
const totalPosts = ref(0)
const latestTag = ref('')

onMounted(async () => {
  try {
    const [tagRes, postRes] = await Promise.all([
      api.get<any>('/tags'),
      api.get<any>('/posts', { limit: 1 }),
    ])
    const tags = Array.isArray(tagRes) ? tagRes : []
    allTags.value = tags
    totalPosts.value = postRes.total ?? 0
    latestTag.value = tags.length ? tags[tags.length - 1].name : '0'
  } catch { /* ignore */ }
  loading.value = false
})

const tagCloud = computed(() => {
  const counts = allTags.value.map((t: any) => t._count?.posts ?? 0)
  const max = Math.max(...counts, 1)
  return allTags.value.map((t: any) => ({
    name: t.name,
    count: t._count?.posts ?? 0,
    size: (t._count?.posts ?? 0) / max > 0.6 ? 'size-lg' : (t._count?.posts ?? 0) / max > 0.3 ? 'size-md' : 'size-sm',
  }))
})

const hotTagsCount = computed(() => tagCloud.value.filter((t: any) => t.size === 'size-lg').length)

const hotTagsList = computed(() => tagCloud.value.slice(0, 5))

const distCounts = computed(() => {
  const high = allTags.value.filter((t: any) => (t._count?.posts ?? 0) >= 10).length
  const medium = allTags.value.filter((t: any) => (t._count?.posts ?? 0) >= 5 && (t._count?.posts ?? 0) < 10).length
  const low = allTags.value.filter((t: any) => (t._count?.posts ?? 0) >= 1 && (t._count?.posts ?? 0) < 5).length
  return { high, medium, low }
})

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 200, 140)
}

async function selectTag(name: string) {
  activeTag.value = name === activeTag.value ? '' : name
  if (activeTag.value) {
    const res = await api.get<any>('/posts', { tag: activeTag.value, limit: 20 })
    tagPosts.value = (res.items ?? []).map((p: any) => ({
      slug: p.slug,
      title: p.title,
      date: p.publishedAt,
      cover: p.coverImage || '',
    }))
  }
}
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }
.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }
.loading-tip { text-align: center; color: var(--c-text-2); padding: 32px; font-size: 0.85rem; }
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

@media (max-width: 640px) {
  .tag-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-bottom: 22px;
  }

  .tag-stat-card {
    padding: 13px 8px;
  }

  .tag-stat-num {
    font-size: 1.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag-cloud-section {
    padding: 18px 12px;
    margin-bottom: 24px;
  }

  .tag-cloud {
    gap: 8px;
  }

  .tag-item,
  .tag-item.size-sm,
  .tag-item.size-md,
  .tag-item.size-lg {
    padding: 6px 12px;
    font-size: 0.76rem;
  }

  .article-item {
    gap: 10px;
    padding: 10px;
  }

  .article-item-cover {
    width: 88px;
    height: 64px;
  }
}
</style>
