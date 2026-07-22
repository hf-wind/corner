<template>
  <div class="article-md-wrap" :class="{ dark: isDark }">
    <ClientOnly>
      <MdPreview :id="editorId" :model-value="content || ''" :theme="mdTheme" language="zh-CN" preview-theme="vuepress"
        class="article-md-preview" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

withDefaults(defineProps<{
  content?: string
  editorId?: string
}>(), {
  content: '',
  editorId: 'article-preview',
})

const isDark = ref(false)
const mdTheme = computed(() => (isDark.value ? 'dark' : 'light'))

let observer: MutationObserver | null = null

onMounted(() => {
  const sync = () => {
    isDark.value = document.documentElement.classList.contains('dark')
  }
  sync()
  observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.article-md-wrap {
  width: 100%;
}

.article-md-wrap :deep(.article-md-preview) {
  --md-bk-color: transparent;
  --md-bk-color-outstand: var(--c-bg-2);
  --md-bk-color-hover: var(--c-bg-2);
  --md-bk-color-block: var(--c-bg-1);
  --md-bk-color-code: var(--code-bg);
  --md-border-color: color-mix(in srgb, var(--border) 80%, transparent);
  --md-color: var(--c-text);
  --md-color-secondary: var(--c-text-2);
  --md-primary-color: var(--c-primary);
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0;
}

.article-md-wrap :deep(.md-editor-preview-wrapper) {
  padding: 0;
  background: transparent;
}

.article-md-wrap :deep(.md-editor-preview) {
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.9;
  color: var(--c-text);
}

.article-md-wrap :deep(.md-editor-preview h1),
.article-md-wrap :deep(.md-editor-preview h2),
.article-md-wrap :deep(.md-editor-preview h3),
.article-md-wrap :deep(.md-editor-preview h4),
.article-md-wrap :deep(.md-editor-preview h5),
.article-md-wrap :deep(.md-editor-preview h6) {
  scroll-margin-top: 24px;
  color: var(--c-text);
  font-weight: 700;
}

.article-md-wrap :deep(.md-editor-preview a) {
  color: var(--c-primary);
}

.article-md-wrap :deep(.md-editor-preview blockquote) {
  border-left-color: var(--c-primary);
  background: var(--c-primary-soft);
  border-radius: 0 10px 10px 0;
  color: var(--c-text-2);
}

.article-md-wrap :deep(.md-editor-preview img) {
  border-radius: 12px;
  box-shadow: 0 10px 28px var(--ld-shadow);
}

.article-md-wrap :deep(.md-editor-preview pre),
.article-md-wrap :deep(.md-editor-preview .md-editor-code) {
  border-radius: 12px;
  box-shadow: 0 8px 22px var(--ld-shadow);
  border: none;
}

.article-md-wrap :deep(.md-editor-preview table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 22px var(--ld-shadow);
}
</style>
