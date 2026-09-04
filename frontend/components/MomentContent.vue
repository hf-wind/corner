<template>
  <div class="moment-content md-moment">
    <MarkdownBase mode="preview" variant="moment" :content="markdownContent" :editor-id="editorId" />
  </div>
</template>

<script setup lang="ts">
import MarkdownBase from '@/components/MarkdownBase.vue'

const props = defineProps<{
  content?: string
  editorId?: string
}>()

const { mediaUrl } = useMediaUrl()
const editorId = computed(() => props.editorId || "moment-content-preview")

const markdownContent = computed(() => String(props.content || '')
  .replace(/\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, url, label) => {
    const source = mediaUrl(String(url || '').trim())
    return `![moment-emoji:${String(label || '表情').trim()}](${source})`
  })
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `![${alt}](${mediaUrl(String(url || '').trim())})`))
</script>

<style scoped>
.moment-content {
  min-width: 0;
}

.moment-content :deep(.md-base-wrap) {
  min-width: 0;
}

.moment-content :deep(.md-editor-preview img[alt^="moment-emoji:"]) {
  display: inline-block;
  width: 2em;
  height: 2em;
  margin: 0 0.08em;
  vertical-align: -0.42em;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  cursor: default;
}
</style>
