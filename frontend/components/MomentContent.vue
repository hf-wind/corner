<template>
  <div class="moment-content md-moment" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { renderInlineEmoji } from '@/utils/commentContent'
import '@/assets/styles/moment-markdown.css'

const props = defineProps<{
  content?: string
}>()

const { mediaUrl } = useMediaUrl()

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

const html = computed(() => {
  const emojis: Array<{ url: string; label: string }> = []
  const tokenized = String(props.content || '').replace(
    /\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\]/g,
    (_, url, label) => {
      const index = emojis.push({
        url: String(url || '').trim(),
        label: String(label || 'emoji').trim(),
      }) - 1
      return `MOMENT_EMOJI_${index}`
    },
  )

  const normalized = tokenized.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) => `![${alt}](${mediaUrl(String(url || '').trim())})`,
  )

  return md
    .render(normalized)
    .replace(/MOMENT_EMOJI_(\d+)/g, (_, rawIndex) => {
      const emoji = emojis[Number(rawIndex)]
      if (!emoji?.url) return ''
      return renderInlineEmoji(emoji.url, emoji.label, mediaUrl, 'moment-inline-emoji')
    })
})
</script>

<style scoped>
.moment-content {
  min-width: 0;
}

.moment-content :deep(.moment-inline-emoji) {
  display: inline-block;
  width: 2em;
  height: 2em;
  margin: 0 0.08em;
  vertical-align: -0.42em;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
</style>
