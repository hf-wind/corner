<template>
  <div ref="wrapperRef" class="article-md-wrap" :class="{ dark: isDark }" @click.capture="onContentClick">
    <ClientOnly>
      <MdPreview :id="editorId" :model-value="content || ''" :theme="mdTheme" language="zh-CN" preview-theme="vuepress"
        class="article-md-preview" />
    </ClientOnly>
    <ImageLightbox v-model="previewOpen" v-model:index="previewIndex" :images="previewImages" label="文章图片预览" />
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import ImageLightbox from '~/components/ImageLightbox.vue'

withDefaults(defineProps<{
  content?: string
  editorId?: string
}>(), {
  content: '',
  editorId: 'article-preview',
})

const isDark = ref(false)
const mdTheme = computed(() => (isDark.value ? 'dark' : 'light'))
const wrapperRef = ref<HTMLElement | null>(null)
const previewOpen = ref(false)
const previewIndex = ref(0)
const previewImages = ref<Array<{ src: string; alt: string; caption?: string }>>([])

let observer: MutationObserver | null = null

function onContentClick(event: MouseEvent) {
  if (event.button !== 0) return
  const image = (event.target as HTMLElement).closest<HTMLImageElement>('.md-editor-preview img')
  if (!image || !wrapperRef.value?.contains(image)) return

  const images = Array.from(wrapperRef.value.querySelectorAll<HTMLImageElement>('.md-editor-preview img'))
    .filter(item => Boolean(item.currentSrc || item.src))
    .map((item, index) => ({
      src: item.currentSrc || item.src,
      alt: item.alt || `文章图片 ${index + 1}`,
      caption: item.alt || undefined,
    }))
  const index = images.findIndex(item => item.src === (image.currentSrc || image.src))
  if (index < 0) return

  event.preventDefault()
  event.stopPropagation()
  previewImages.value = images
  previewIndex.value = index
  previewOpen.value = true
}

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
  background: transparent !important;
  background-color: transparent !important;
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
  background: transparent !important;
  background-color: transparent !important;
}

.article-md-wrap :deep(.md-editor-preview) {
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.9;
  color: var(--c-text);
  background: transparent !important;
  background-color: transparent !important;
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
  font-family: var(--font-heading);
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
  cursor: zoom-in;
}

.article-md-wrap :deep(.md-editor-preview .md-editor-code) {
  font-family: var(--font-mono);
  border-radius: 12px;
  box-shadow: 0 8px 22px var(--ld-shadow);
  border: none;
}

.article-md-wrap :deep(.md-editor-preview pre) {
  border-radius: 0;
  box-shadow: none;
  border: none;
}

.article-md-wrap :deep(.md-editor-preview table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 22px var(--ld-shadow);
}

.article-md-wrap :deep(.md-editor-preview) {
  min-width: 0;
  overflow-wrap: anywhere;
}

.article-md-wrap :deep(.md-editor-preview img),
.article-md-wrap :deep(.md-editor-preview video),
.article-md-wrap :deep(.md-editor-preview iframe) {
  max-width: 100%;
}

.article-md-wrap :deep(.md-editor-preview pre),
.article-md-wrap :deep(.md-editor-preview .md-editor-code) {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.article-md-wrap :deep(.md-editor-preview table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

@media (max-width: 640px) {
  .article-md-wrap :deep(.md-editor-preview) {
    font-size: 0.9rem;
    line-height: 1.8;
  }

  .article-md-wrap :deep(.md-editor-preview h1) {
    font-size: 1.55rem;
  }

  .article-md-wrap :deep(.md-editor-preview h2) {
    font-size: 1.3rem;
  }

  .article-md-wrap :deep(.md-editor-preview h3) {
    font-size: 1.12rem;
  }

  .article-md-wrap :deep(.md-editor-preview blockquote) {
    margin-right: 0;
    margin-left: 0;
    padding: 10px 12px;
  }

  .article-md-wrap :deep(.md-editor-preview pre),
  .article-md-wrap :deep(.md-editor-preview .md-editor-code),
  .article-md-wrap :deep(.md-editor-preview img),
  .article-md-wrap :deep(.md-editor-preview table) {
    border-radius: 10px;
  }
}
</style>
