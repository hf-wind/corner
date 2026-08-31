<template>
  <AppLink :to="'/article/' + slug" class="article-card ui-hover-surface" @mouseenter="prefetchArticle" @focus="prefetchArticle" @pointerdown="prefetchArticle" @click="saveScroll">
    <div class="card-cover">
      <img
        v-if="coverUrl"
        :src="coverUrl"
        :alt="title"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'low'"
        decoding="async"
        height="220"
      >
    </div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-tag" :style="{ color: categoryColor || undefined }"><Icon :name="categoryIcon || 'ph:folder-open-bold'" />{{ tag || '随笔' }}</span>
        <span class="card-date"><Icon name="ph:calendar-blank-bold" />{{ date }}</span>
      </div>
      <h3 class="card-title">{{ title }}</h3>
      <p v-if="desc" class="card-desc">{{ desc }}</p>
      <div class="card-footer">
        <div v-if="author" class="card-author">
          <img
            class="author-avatar"
            :src="avatarUrl"
            alt=""
            loading="lazy"
            fetchpriority="low"
            decoding="async"
            width="36"
            height="36"
          >
          <span class="author-name">{{ author.name }}</span>
        </div>
        <div class="card-stats">
          <span v-if="views !== undefined"><Icon name="ph:eye-bold" />{{ views }}</span>
          <span v-if="comments !== undefined"><Icon name="ph:chat-circle-dots-bold" />{{ comments }}</span>
          <span v-if="readingTime"><Icon name="ph:clock-bold" />{{ readingTime }} min</span>
        </div>
      </div>
    </div>
  </AppLink>
</template>

<script setup lang="ts">
import avatarFallback from '~/assets/images/avatar.jpg'
import { getDisplayImageUrl } from '~/utils/imagePerformance'

interface Author {
  name: string
  avatar?: string
}

const props = withDefaults(defineProps<{
  slug: string
  cover: string
  title: string
  desc: string
  tag: string
  categoryIcon?: string
  categoryColor?: string
  tags?: string[]
  tagItems?: Array<{ name: string; icon?: string; color?: string }>
  date: string
  author?: Author
  views?: number
  comments?: number
  readingTime?: number
  eager?: boolean
  priority?: boolean
}>(), {
  eager: false,
  priority: false,
})

const coverUrl = computed(() => getDisplayImageUrl(props.cover, 280, 220))
const avatarUrl = computed(() => getDisplayImageUrl(props.author?.avatar || avatarFallback, 48, 48))
function saveScroll() {
  const el = document.querySelector('.main-content')
  if (el) useClientState().setSession('homeScroll', el.scrollTop)
}

let articlePrefetched = false
function prefetchArticle() {
  if (articlePrefetched) return
  articlePrefetched = true
  void import("~/pages/article/[slug].vue")
}
</script>

<style scoped>
.article-card {
  position: relative;
  display: flex;
  height: 116px;
  overflow: hidden;
  border-radius: 11px;
  background: var(--ld-bg-card);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ld-shadow) 34%, transparent);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  contain: layout paint;
  isolation: isolate;
  transform-origin: 50% 100%;
  animation: article-card-enter 0.54s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--article-index, 0) * 44ms);
}
.article-card:active {
  transform: translate3d(0, -1px, 0) scale(1);
  transition-duration: .12s;
}
.article-card:focus-visible { outline: 2px solid var(--c-primary); outline-offset: 3px; }

.card-cover {
  position: absolute;
  z-index: 0;
  inset: 0 0 0 auto;
  width: 46%;
  overflow: hidden;
  background: var(--ld-bg-card);
}
.card-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgb(0 0 0 / 8%) 12%,
    rgb(0 0 0 / 62%) 38%,
    #000 62%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgb(0 0 0 / 8%) 12%,
    rgb(0 0 0 / 62%) 38%,
    #000 62%
  );
  filter: saturate(.96);
  transition: transform .55s cubic-bezier(.22, .61, .36, 1), filter .4s ease;
}

.article-card:hover .card-cover img {
  transform: scale(1.02);
  filter: saturate(1.12) brightness(1.04);
}

.article-card:hover .card-title { color: var(--c-primary); }

@keyframes article-card-enter {
  from { opacity: 0; transform: translate3d(0, 12px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

.card-body {
  position: relative;
  z-index: 2;
  width: 75%;
  padding: 10px 8px 9px 15px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
  min-width: 0;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 5px 0;
}
.card-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.58rem;
  font-weight: 700;
  color: var(--c-primary);
  white-space: nowrap;
}
.card-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.59rem;
  color: var(--c-text-3);
}

.card-title {
  font-size: .9rem;
  font-weight: 720;
  line-height: 1.4;
  color: var(--c-text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.18s ease;
}

.card-desc {
  font-size: .66rem;
  color: var(--c-text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin-top: auto;
  padding-top: 1px;
}
.card-author {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.author-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--c-bg-2);
  flex-shrink: 0;
}
.author-name {
  font-size: 0.6rem;
  color: var(--c-text-2);
  font-weight: 500;
}
.card-stats {
  display: flex;
  gap: 8px;
  font-size: .56rem;
  color: var(--c-text-3);
  white-space: nowrap;
}
.card-stats span { display: inline-flex; align-items: center; gap: 3px; }

@media (prefers-reduced-motion: reduce) {
  .article-card,
  .card-title,
  .card-cover img {
    transition: none;
    animation: none;
  }
  .article-card:hover .card-cover img {
    transform: none;
    filter: saturate(.96);
  }
}

@media (max-width: 640px) {
  .article-card {
    height: 108px;
    border-radius: 10px;
  }

  .card-cover {
    width: 43%;
  }

  .card-body {
    width: 72%;
    padding: 9px 4px 8px 11px;
    gap: 3px;
  }

  .card-title {
    font-size: .82rem;
    line-height: 1.45;
    -webkit-line-clamp: 2;
  }

  .card-desc {
    display: none;
  }
  .card-date .icon { display: none; }

  .card-footer {
    margin-top: auto;
  }

  .card-stats {
    gap: 5px;
    font-size: 0.56rem;
  }

  .card-stats span:nth-child(2) {
    display: none;
  }
}

@media (max-width: 380px) {
  .author-name,
  .card-stats span:not(:first-child) {
    display: none;
  }
}
</style>
