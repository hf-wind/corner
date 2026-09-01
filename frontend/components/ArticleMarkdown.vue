<template>
  <div ref="wrapperRef" class="article-md-wrap">
    <MarkdownBase
      mode="preview"
      :content="content"
      :editor-id="editorId"
      :article-title="articleTitle"
      @rendered="emit('rendered')"
    />
  </div>
</template>

<script setup lang="ts">
import MarkdownBase from "@/components/MarkdownBase.vue";

const props = withDefaults(
  defineProps<{
    content?: string;
    editorId?: string;
    articleTitle?: string;
  }>(),
  {
    content: "",
    editorId: "article-preview",
    articleTitle: "",
  },
);

const emit = defineEmits<{ rendered: [] }>();

const wrapperRef = ref<HTMLElement | null>(null);
</script>

<style scoped>
.article-md-wrap {
  position: relative;
  min-width: 0;
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

@media (prefers-reduced-motion: reduce) {
  .article-md-wrap :deep(.md-editor-preview > *) {
    animation: none;
    filter: none;
    opacity: 1;
    transform: none;
  }
}
</style>
