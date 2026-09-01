<template>
  <div class="moment-content" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { renderInlineEmoji } from '@/utils/commentContent'

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
  color: var(--c-text-2);
  font-size: 0.98rem;
  line-height: 1.9;
}

.moment-content :deep(p) {
  margin: 0;
}

.moment-content :deep(p + p) {
  margin-top: 14px;
}

.moment-content :deep(img) {
  display: block;
  width: 100%;
  max-width: 100%;
  margin-top: 16px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  box-shadow: 0 18px 38px color-mix(in srgb, #000 10%, transparent);
  object-fit: cover;
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

.moment-content :deep(a) {
  color: var(--c-primary);
  text-decoration: none;
}

.moment-content :deep(blockquote) {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-left: 3px solid var(--c-primary);
  border-radius: 0 14px 14px 0;
  background: color-mix(in srgb, var(--c-primary) 8%, transparent);
}
</style>
