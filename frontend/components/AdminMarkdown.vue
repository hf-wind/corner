<template>
  <div class="admin-markdown" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'

const props = defineProps<{ content?: string }>()
const md = new MarkdownIt({ html: false, breaks: true, linkify: true, typographer: true })
const html = computed(() => md.render(String(props.content || '')))
</script>

<style scoped>
.admin-markdown { color: var(--c-text-2); font-size: .82rem; line-height: 1.8; overflow-wrap: anywhere; }
.admin-markdown :deep(p) { margin: 0 0 10px; }
.admin-markdown :deep(p:last-child) { margin-bottom: 0; }
.admin-markdown :deep(pre) { overflow-x: auto; margin: 10px 0; padding: 12px 14px; border-radius: 6px; background: var(--code-bg); }
.admin-markdown :deep(code) { padding: 2px 4px; border-radius: 4px; background: var(--code-bg); font-size: .78em; }
.admin-markdown :deep(pre code) { padding: 0; background: transparent; }
.admin-markdown :deep(blockquote) { margin: 10px 0; padding: 8px 12px; border-left: 3px solid var(--c-primary); background: var(--c-primary-soft); }
.admin-markdown :deep(ul), .admin-markdown :deep(ol) { margin: 8px 0; padding-left: 22px; }
.admin-markdown :deep(table) { width: 100%; margin: 10px 0; border-collapse: collapse; }
.admin-markdown :deep(th), .admin-markdown :deep(td) { padding: 7px 9px; border: 1px solid var(--border); text-align: left; }
.admin-markdown :deep(a) { color: var(--c-primary); }
</style>
