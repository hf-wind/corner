<template>
  <div>
    <a-card :bordered="false" class="section-card" size="small" title="基本设置" style="max-width:500px">
      <a-form labelAlign="left" size="middle">
        <a-form-item label="标题">
          <a-input v-model:value="settings.site_title" @blur="saveSetting('site_title')" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="settings.site_description" :rows="3" @blur="saveSetting('site_description')" />
        </a-form-item>
        <a-form-item label="关键词">
          <a-input v-model:value="keywordText" placeholder="逗号分隔" @blur="saveKeywords" />
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const settings = ref({ site_title: '', site_description: '', site_keywords: '' as any })
const keywordText = ref('')

onMounted(loadSettings)

async function loadSettings() {
  try {
    const res = await api.get<any>('/settings')
    if (res) {
      settings.value.site_title = res.site_title || ''
      settings.value.site_description = res.site_description || ''
      const kw = res.site_keywords
      settings.value.site_keywords = Array.isArray(kw) ? kw : []
      keywordText.value = Array.isArray(kw) ? kw.join(', ') : (kw || '')
    }
  } catch {}
}

async function saveSetting(key: string) {
  try { await api.put('/settings', { key, value: (settings.value as any)[key] }); message.success('已保存') }
  catch { message.error('保存失败') }
}

async function saveKeywords() {
  const arr = keywordText.value.split(/[,，]\s*/).filter(Boolean)
  settings.value.site_keywords = arr
  try { await api.put('/settings', { key: 'site_keywords', value: arr }); message.success('已保存') }
  catch { message.error('保存失败') }
}
</script>

<style scoped>
.section-card { border-radius:8px; }
</style>
