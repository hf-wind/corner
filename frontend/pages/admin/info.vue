<template>
  <div>
    <a-spin :spinning="loading" class="table-spin">
      <a-card :bordered="false" class="info-card" size="small">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="框架" :span="2">{{ info.framework }}</a-descriptions-item>
          <a-descriptions-item label="Node 版本" :span="2">{{ info.nodeVersion }}</a-descriptions-item>
          <a-descriptions-item label="运行时间">{{ info.uptime }}</a-descriptions-item>
          <a-descriptions-item label="平台">{{ info.platform }}</a-descriptions-item>
          <a-descriptions-item label="内存使用">{{ info.memoryUsage }}</a-descriptions-item>
        </a-descriptions>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const loading = ref(true)
const info = ref({ framework: 'NestJS + Nuxt 3', nodeVersion: '', uptime: '', platform: '', memoryUsage: '' })

onMounted(async () => {
  try {
    const sys = await api.get<any>('/stats/system').catch(() => ({}))
    info.value.nodeVersion = sys.nodeVersion || ''
    info.value.uptime = sys.uptime || ''
    info.value.platform = sys.platform || ''
    info.value.memoryUsage = sys.memoryUsage || ''
  } catch { /* empty */ }
  loading.value = false
})
</script>

<style scoped>
.info-card { border-radius:8px; max-width:600px; }
</style>
