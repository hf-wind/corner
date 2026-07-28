<template>
  <div class="dashboard">
    <a-spin :spinning="loading" class="table-spin">
      <div class="stat-grid">
        <div v-for="s in statCards" :key="s.label" class="stat-item">
          <div class="stat-icon" :style="{ background: s.color }"><component :is="s.icon" style="font-size:20px;color:#fff" /></div>
          <div class="stat-info">
            <div class="stat-num">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>
      <div class="chart-section">
        <a-card :bordered="false" class="section-card" size="small">
          <template #title><span class="section-title">内容概览</span></template>
          <div class="overview-grid">
            <div v-for="o in overview" :key="o.label" class="overview-item">
              <span class="ov-label">{{ o.label }}</span>
              <span class="ov-value" :style="{ color: o.color }">{{ o.value }}</span>
            </div>
          </div>
        </a-card>
        <a-card :bordered="false" class="section-card" size="small">
          <template #title><span class="section-title">快速入口</span></template>
          <div class="quick-grid">
            <a-button type="text" class="quick-btn" @click="$router.push('/admin/moments/create')">
              <EditOutlined /> 写瞬间
            </a-button>
            <a-button type="text" class="quick-btn" @click="$router.push('/admin/posts/create')">
              <EditOutlined /> 写文章
            </a-button>
            <a-button type="text" class="quick-btn" @click="$router.push('/admin/media')">
              <UploadOutlined /> 上传文件
            </a-button>
            <a-button type="text" class="quick-btn" @click="$router.push('/admin/comments')">
              <MessageOutlined /> 审核评论
            </a-button>
            <a-button type="text" class="quick-btn" @click="$router.push('/admin/settings')">
              <SettingOutlined /> 站点设置
            </a-button>
          </div>
        </a-card>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const loading = ref(true)
const statCards = ref<any[]>([])
const overview = ref<any[]>([])

onMounted(async () => {
  try {
    const radar = await api.get<any>('/stats/radar')
    const days = Math.floor((Date.now() - new Date('2025-01-01').getTime()) / 86400000)
    statCards.value = [
      { label: '文章', value: radar.posts ?? 0, icon: 'FileTextOutlined', color: '#6366f1' },
      { label: '访问', value: radar.views ?? 0, icon: 'EyeOutlined', color: '#10b981' },
      { label: '评论', value: radar.comments ?? 0, icon: 'MessageOutlined', color: '#f59e0b' },
      { label: '运行', value: `${days}天`, icon: 'ClockCircleOutlined', color: '#6366f1' },
    ]
    overview.value = [
      { label: '分类', value: radar.categories ?? 0, color: '#6366f1' },
      { label: '标签', value: radar.tags ?? 0, color: '#10b981' },
      { label: '点赞', value: radar.likes ?? 0, color: '#f59e0b' },
    ]
  } catch { /* empty */ }
  loading.value = false
})
</script>

<style scoped>
.dashboard { max-width:900px; }
.stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
.stat-item { display:flex; align-items:center; gap:14px; background:var(--ld-bg-card); border:1px solid var(--border); border-radius:10px; padding:16px; }
.stat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.stat-num { font-size:1.3rem; font-weight:700; color:var(--c-text); line-height:1.2; }
.stat-label { font-size:0.75rem; color:var(--c-text-3); }
.chart-section { display:flex; gap:14px; }
.chart-section > * { flex:1; }
.section-card { border-radius:10px; }
.section-title { font-size:0.82rem; font-weight:600; color:var(--c-text-2); }
.overview-grid { display:flex; flex-direction:column; gap:10px; }
.overview-item { display:flex; justify-content:space-between; align-items:center; padding:4px 0; }
.ov-label { font-size:0.82rem; color:var(--c-text-2); }
.ov-value { font-size:1rem; font-weight:700; }
.quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.quick-btn { justify-content:flex-start !important; padding:8px 12px !important; border-radius:8px !important; font-size:0.82rem; height:auto !important; color:var(--c-text-2) !important; }
.quick-btn:hover { background:var(--c-primary-soft) !important; color:var(--c-primary) !important; }
</style>
