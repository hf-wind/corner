<template>
  <Loading fullscreen title="正在打开文章预览" text="正在载入详情样式" />
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.query.slug || ""))

function redirectToDetailPreview() {
  if (!slug.value) {
    void router.replace("/admin/posts")
    return
  }
  void router.replace(`/article/${encodeURIComponent(slug.value)}?preview=1`)
}

onMounted(redirectToDetailPreview)
watch(slug, redirectToDetailPreview)
</script>
