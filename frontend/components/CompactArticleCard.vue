<template>
  <AppLink :to="`/article/${article.slug}`" class="compact-article">
    <div class="article-cover">
      <img v-if="article.cover" :src="coverUrl" alt="" loading="lazy">
      <span v-else><Icon name="ph:article" /></span>
    </div>
    <div class="article-copy">
      <div class="article-topline"><span v-if="article.tag" :style="{ color: article.tagColor || undefined }"><Icon :name="article.tagIcon || 'ph:folder-open-bold'" />{{ article.tag }}</span><time>{{ date }}</time></div>
      <h3>{{ article.title }}</h3>
      <p v-if="article.excerpt">{{ article.excerpt }}</p>
      <span class="read-link">阅读全文 <Icon name="ph:arrow-right-bold" /></span>
    </div>
  </AppLink>
</template>

<script setup lang="ts">
import { getDisplayImageUrl } from '@/utils/imagePerformance'
const props = defineProps<{ article: { slug: string; title: string; cover?: string; excerpt?: string; date?: string; publishedAt?: string; tag?: string; tagIcon?: string; tagColor?: string } }>()
const coverUrl = computed(() => getDisplayImageUrl(props.article.cover || '', 300, 190))
const date = computed(() => (props.article.date || props.article.publishedAt || '').slice(0, 10))
</script>

<style scoped>
.compact-article { display:grid; height:128px; min-height:0; grid-template-columns:128px minmax(0,1fr); overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 68%,transparent); border-radius:11px; background:var(--ld-bg-card); box-shadow:0 2px 8px color-mix(in srgb,var(--ld-shadow) 34%,transparent); color:inherit; text-decoration:none; transition:border-color .2s ease,box-shadow .5s cubic-bezier(.22,.61,.36,1),transform .5s cubic-bezier(.22,.61,.36,1); }.compact-article:hover { border-color:color-mix(in srgb,var(--c-primary) 35%,var(--border)); box-shadow:0 20px 40px color-mix(in srgb,var(--ld-shadow) 64%,transparent),0 6px 16px color-mix(in srgb,var(--ld-shadow) 34%,transparent); transform:translate3d(0,-4px,0); }
.article-cover { height:100%; min-height:0; overflow:hidden; background:linear-gradient(145deg,var(--c-bg-2),var(--c-primary-soft)); }.article-cover img { display:block; width:100%; height:100%; object-fit:cover; transition:transform .45s ease; }.compact-article:hover img { transform:scale(1.04); }.article-cover span { display:grid; height:100%; color:var(--c-primary); font-size:1.8rem; opacity:.5; place-items:center; }
.article-copy { position:relative; display:flex; min-width:0; flex-direction:column; padding:14px 16px 12px; }.article-topline { display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--c-text-3); font-size:.56rem; }.article-topline>span { display:inline-flex; align-items:center; gap:4px; color:var(--c-primary); font-weight:650; }.article-copy h3 { overflow:hidden; margin:6px 0 0; color:var(--c-text); font-size:.86rem; line-height:1.45; text-overflow:ellipsis; white-space:nowrap; }.article-copy p { display:-webkit-box; overflow:hidden; margin:5px 0 0; color:var(--c-text-2); font-size:.66rem; line-height:1.55; -webkit-box-orient:vertical; -webkit-line-clamp:1; }.read-link { display:inline-flex; align-items:center; gap:4px; margin-top:auto; padding-top:7px; color:var(--c-primary); font-size:.56rem; opacity:.8; }.read-link :deep(svg) { transition:transform .2s; }.compact-article:hover .read-link :deep(svg) { transform:translateX(3px); }
@media (max-width:520px) { .compact-article { height:104px; grid-template-columns:92px minmax(0,1fr); }.article-copy { padding:11px 12px; }.article-copy p { display:none; }.read-link { padding-top:5px; } }
</style>
