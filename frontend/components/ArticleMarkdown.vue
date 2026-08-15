<template>
  <div ref="wrapperRef" class="article-md-wrap" :class="{ dark: isDark }" @click.capture="onContentClick">
    <ClientOnly>
      <MdPreview v-if="editorReady" :id="editorId" :model-value="content || ''" :theme="mdTheme" language="zh-CN" preview-theme="vuepress"
        class="article-md-preview" />
      <div v-else class="article-md-loading" aria-label="正文渲染中">
        <i /><i /><i />
      </div>
    </ClientOnly>
    <ImageLightbox v-model="previewOpen" v-model:index="previewIndex" :images="previewImages" label="文章图片预览" />
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import ImageLightbox from '~/components/ImageLightbox.vue'
import { configureMarkdownEditor } from '~/utils/configureMarkdownEditor'

withDefaults(defineProps<{
  content?: string
  editorId?: string
}>(), {
  content: '',
  editorId: 'article-preview',
})

const isDark = ref(false)
const editorReady = ref(false)
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

onMounted(async () => {
  const sync = () => {
    isDark.value = document.documentElement.classList.contains('dark')
  }
  sync()
  observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  await configureMarkdownEditor()
  editorReady.value = true
})

onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.article-md-wrap {
  width: 100%;
  background: transparent !important;
  background-color: transparent !important;
}

.article-md-loading {
  display: grid;
  gap: 12px;
  padding: 12px 0;
}

.article-md-loading i {
  display: block;
  width: 100%;
  height: 14px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-text) 8%, transparent);
}

.article-md-loading i:nth-child(2) { width: 88%; }
.article-md-loading i:nth-child(3) { width: 72%; }

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
  counter-reset: article-h1 article-h2 article-h3;
  font-family: var(--font-rounded);
  font-size: 15px;
  font-weight: 410;
  line-height: 1.92;
  color: color-mix(in srgb, var(--c-text) 88%, var(--c-bg));
  background: transparent !important;
  background-color: transparent !important;
  text-wrap: pretty;
  word-break: break-word;
}

.article-md-wrap :deep(.md-editor-preview h1),
.article-md-wrap :deep(.md-editor-preview h2),
.article-md-wrap :deep(.md-editor-preview h3),
.article-md-wrap :deep(.md-editor-preview h4),
.article-md-wrap :deep(.md-editor-preview h5),
.article-md-wrap :deep(.md-editor-preview h6) {
  scroll-margin-top: 24px;
  color: var(--c-text);
  font-family: var(--font-system-rounded);
  font-weight: 680;
  line-height: 1.42;
  letter-spacing: 0;
  word-break: normal;
  overflow-wrap: anywhere;
}

.article-md-wrap :deep(.md-editor-preview h1) {
  counter-increment: article-h1;
  counter-reset: article-h2 article-h3;
  position: relative;
  margin: 2.75rem 0 1.15rem;
  padding: 0 0 12px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
  font-size: 26px;
}

.article-md-wrap :deep(.md-editor-preview h1::before) {
  display: none;
}

.article-md-wrap :deep(.md-editor-preview h1::after) {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 44px;
  height: 2px;
  border-radius: 2px;
  background: var(--c-primary);
  content: '';
}

.article-md-wrap :deep(.md-editor-preview h2) {
  counter-increment: article-h2;
  counter-reset: article-h3;
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 2.25rem 0 0.9rem;
  padding: 2px 0;
  border: 0;
  font-size: 21px;
}

.article-md-wrap :deep(.md-editor-preview h2::before) {
  display: block;
  width: 4px;
  height: 1.05em;
  flex: 0 0 4px;
  border: 0;
  border-radius: 999px;
  background: var(--c-primary);
  content: '';
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 10%, transparent);
}

.article-md-wrap :deep(.md-editor-preview h3) {
  counter-increment: article-h3;
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 1.8rem 0 0.75rem;
  font-size: 16.5px;
}

.article-md-wrap :deep(.md-editor-preview h3::before) {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--c-primary);
  content: '';
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 9%, transparent);
}

.article-md-wrap :deep(.md-editor-preview h4) {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 1.65rem 0 0.7rem;
  color: var(--c-text-1);
  font-size: 1.02rem;
}

.article-md-wrap :deep(.md-editor-preview h4::before) {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  background: color-mix(in srgb, var(--c-primary) 82%, var(--c-text));
  content: '';
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m9 5 7 7-7 7' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m9 5 7 7-7 7' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
}

.article-md-wrap :deep(.md-editor-preview h5),
.article-md-wrap :deep(.md-editor-preview h6) {
  margin: 1.45rem 0 0.65rem;
  padding-left: 11px;
  border-left: 3px solid color-mix(in srgb, var(--c-primary) 48%, var(--border));
  color: var(--c-text-2);
  font-size: 0.92rem;
}

.article-md-wrap :deep(.md-editor-preview h6) {
  border-left-style: dotted;
  font-size: 0.86rem;
}

.article-md-wrap :deep(.md-editor-preview p) {
  margin: 1.05em 0;
  line-height: inherit;
  text-indent: 0;
  word-spacing: 0;
}

.article-md-wrap :deep(.md-editor-preview h1 + p),
.article-md-wrap :deep(.md-editor-preview h2 + p),
.article-md-wrap :deep(.md-editor-preview h3 + p),
.article-md-wrap :deep(.md-editor-preview h4 + p) {
  margin-top: 0.7em;
}

.article-md-wrap :deep(.md-editor-preview strong) {
  color: var(--c-text-1);
  font-weight: 720;
}

.article-md-wrap :deep(.md-editor-preview ::selection) {
  background: color-mix(in srgb, var(--c-primary) 24%, transparent);
}

.article-md-wrap :deep(.md-editor-preview a) {
  color: var(--c-primary);
}

.article-md-wrap :deep(.md-editor-preview p a),
.article-md-wrap :deep(.md-editor-preview li a),
.article-md-wrap :deep(.md-editor-preview blockquote a),
.article-md-wrap :deep(.md-editor-preview td a) {
  background-image: linear-gradient(color-mix(in srgb, var(--c-primary) 42%, transparent), color-mix(in srgb, var(--c-primary) 42%, transparent));
  background-position: 0 100%;
  background-repeat: no-repeat;
  background-size: 100% 1px;
  font-weight: 600;
  text-decoration: none;
  transition: background-size 0.18s ease, color 0.18s ease;
}

.article-md-wrap :deep(.md-editor-preview p a:hover),
.article-md-wrap :deep(.md-editor-preview li a:hover),
.article-md-wrap :deep(.md-editor-preview blockquote a:hover),
.article-md-wrap :deep(.md-editor-preview td a:hover) {
  background-size: 100% 5px;
}

.article-md-wrap :deep(.md-editor-preview blockquote) {
  position: relative;
  margin: 1.7rem 0;
  padding: 16px 20px 16px 46px;
  border: 0;
  border-left: 3px solid var(--c-primary);
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--c-primary-soft) 42%, var(--c-bg-1));
  color: var(--c-text-2);
}

.article-md-wrap :deep(.md-editor-preview blockquote::before) {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 18px;
  height: 18px;
  background: var(--c-primary);
  content: '';
  opacity: 0.72;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.5 6C6.5 7.5 5 9.8 5 13.2V18h6v-6H7.6c.2-1.8 1.2-3.2 3-4.2L9.5 6Zm9 0c-3 1.5-4.5 3.8-4.5 7.2V18h6v-6h-3.4c.2-1.8 1.2-3.2 3-4.2L18.5 6Z' fill='black'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.5 6C6.5 7.5 5 9.8 5 13.2V18h6v-6H7.6c.2-1.8 1.2-3.2 3-4.2L9.5 6Zm9 0c-3 1.5-4.5 3.8-4.5 7.2V18h6v-6h-3.4c.2-1.8 1.2-3.2 3-4.2L18.5 6Z' fill='black'/%3E%3C/svg%3E") center / contain no-repeat;
}

.article-md-wrap :deep(.md-editor-preview blockquote p:first-child) {
  margin-top: 0;
}

.article-md-wrap :deep(.md-editor-preview blockquote p:last-child) {
  margin-bottom: 0;
}

.article-md-wrap :deep(.md-editor-preview ul),
.article-md-wrap :deep(.md-editor-preview ol) {
  margin: 1.15em 0;
  padding-left: 1.65em;
  line-height: 1.82;
}

.article-md-wrap :deep(.md-editor-preview li) {
  margin: 0.48em 0;
  padding-left: 0.25em;
}

.article-md-wrap :deep(.md-editor-preview li::marker) {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.82em;
  font-weight: 750;
}

.article-md-wrap :deep(.md-editor-preview input[type='checkbox']) {
  accent-color: var(--c-primary);
}

.article-md-wrap :deep(.md-editor-preview code:not(pre code)) {
  margin: 0 0.12em;
  padding: 0.16em 0.42em;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  border-radius: 5px;
  background: color-mix(in srgb, var(--c-primary-soft) 42%, var(--code-bg));
  color: color-mix(in srgb, var(--c-primary) 76%, var(--c-text));
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.article-md-wrap :deep(.md-editor-preview mark) {
  padding: 0.08em 0.28em;
  border-radius: 3px;
  background: color-mix(in srgb, #f6c453 40%, transparent);
  color: inherit;
}

.article-md-wrap :deep(.md-editor-preview img) {
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 8px;
  box-shadow: 0 12px 30px color-mix(in srgb, var(--ld-shadow) 72%, transparent);
  cursor: zoom-in;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

@media (hover: hover) {
  .article-md-wrap :deep(.md-editor-preview img:hover) {
    box-shadow: 0 16px 36px color-mix(in srgb, var(--ld-shadow) 92%, transparent);
    transform: translateY(-2px);
  }
}

.article-md-wrap :deep(.md-editor-preview figcaption) {
  margin-top: 8px;
  color: var(--c-text-3);
  font-size: 0.78rem;
  line-height: 1.6;
}

.article-md-wrap :deep(.md-editor-preview .md-editor-code) {
  font-family: var(--font-mono);
  margin: 1.6rem 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 8px;
  box-shadow: 0 9px 24px color-mix(in srgb, var(--ld-shadow) 65%, transparent);
}

.article-md-wrap :deep(.md-editor-preview pre) {
  border-radius: 0;
  box-shadow: none;
  border: none;
}

.article-md-wrap :deep(.md-editor-preview table) {
  margin: 1.6rem 0;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--ld-shadow) 55%, transparent);
  border-collapse: separate;
  border-spacing: 0;
}

.article-md-wrap :deep(.md-editor-preview table th) {
  background: color-mix(in srgb, var(--c-primary-soft) 54%, var(--c-bg-1));
  color: var(--c-text-1);
  font-weight: 700;
  text-align: left;
}

.article-md-wrap :deep(.md-editor-preview table th),
.article-md-wrap :deep(.md-editor-preview table td) {
  padding: 0.72em 1em;
  border-color: color-mix(in srgb, var(--border) 80%, transparent);
}

.article-md-wrap :deep(.md-editor-preview table tr:nth-child(2n)) {
  background: color-mix(in srgb, var(--c-bg-1) 78%, transparent);
}

.article-md-wrap :deep(.md-editor-preview hr) {
  height: 1px;
  margin: 2.7rem 0;
  border: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c-primary) 38%, var(--border)) 18%, color-mix(in srgb, var(--c-primary) 38%, var(--border)) 82%, transparent);
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

@keyframes article-block-reveal {
  from {
    opacity: 0;
    filter: blur(10px);
    transform: translateY(20px) scale(0.92);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }
}

@supports (animation-timeline: view()) {
  .article-md-wrap :deep(.md-editor-preview > *) {
    animation-name: article-block-reveal;
    animation-duration: auto;
    animation-fill-mode: both;
    animation-timing-function: linear;
    animation-timeline: view();
    animation-range: entry 0% entry 128px;
    transform-origin: 50% center;
    will-change: opacity, filter, transform;
  }
}

@media (max-width: 640px) {
  .article-md-wrap :deep(.md-editor-preview) {
    font-size: 0.9rem;
    line-height: 1.9;
    text-wrap: wrap;
  }

  .article-md-wrap :deep(.md-editor-preview h1) {
    margin-top: 2.35rem;
    font-size: 1.42rem;
  }

  .article-md-wrap :deep(.md-editor-preview h2) {
    gap: 10px;
    margin-top: 2rem;
    font-size: 1.18rem;
  }

  .article-md-wrap :deep(.md-editor-preview h3) {
    font-size: 1.06rem;
  }

  .article-md-wrap :deep(.md-editor-preview h2::before) {
    width: 3px;
    height: 1em;
    flex-basis: 3px;
  }

  .article-md-wrap :deep(.md-editor-preview blockquote) {
    margin-right: 0;
    margin-left: 0;
    padding: 14px 14px 14px 42px;
  }

  .article-md-wrap :deep(.md-editor-preview blockquote::before) {
    top: 16px;
    left: 14px;
  }

  .article-md-wrap :deep(.md-editor-preview ul),
  .article-md-wrap :deep(.md-editor-preview ol) {
    padding-left: 1.35em;
  }

  .article-md-wrap :deep(.md-editor-preview pre),
  .article-md-wrap :deep(.md-editor-preview .md-editor-code),
  .article-md-wrap :deep(.md-editor-preview img),
  .article-md-wrap :deep(.md-editor-preview table) {
    border-radius: 7px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-md-wrap :deep(.md-editor-preview > *) {
    animation: none;
    filter: none;
    opacity: 1;
    transform: none;
  }

  .article-md-wrap :deep(.md-editor-preview img),
  .article-md-wrap :deep(.md-editor-preview a) {
    transition: none;
  }
}
</style>
