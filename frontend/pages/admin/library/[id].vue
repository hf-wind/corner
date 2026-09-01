<template>
  <a-spin :spinning="loading" class="edit-loading">
    <LibraryEntryForm v-if="item" :item="item" />
    <a-empty v-else-if="!loading" description="记录不存在" />
  </a-spin>
</template>

<script setup lang="ts">
import type { LibraryItem } from '@/types/library'

const api = useApi()
const route = useRoute()
const toast = useToast()
const loading = ref(true)
const item = ref<LibraryItem | null>(null)

onMounted(async () => {
  try { item.value = await api.get<LibraryItem>(`/library/admin/${route.params.id}`) }
  catch (error: any) { toast.error(error?.message || '记录加载失败') }
  finally { loading.value = false }
})
useHead({ title: computed(() => item.value ? `编辑 ${item.value.title}` : '编辑书影') })
</script>

<style scoped>.edit-loading { min-height:400px; }</style>
