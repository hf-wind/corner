<template>
  <NuxtLink :to="'/article/' + slug" class="article-card" @click="saveScroll">
    <div class="card-cover">
      <img
        v-if="coverUrl"
        :src="coverUrl"
        :alt="title"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'low'"
        decoding="async"
        width="280"
        height="220"
      >
    </div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-tag" :style="{ color: categoryColor || undefined }"><Icon :name="categoryIcon || 'ph:folder-open-bold'" />{{ tag }}</span>
        <span class="card-date">{{ date }}</span>
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
          <span v-if="views !== undefined">{{ views }} 阅读</span>
          <span v-if="comments !== undefined">{{ comments }} 评论</span>
          <span v-if="readingTime">{{ readingTime }} min</span>
        </div>
      </div>
      <div v-if="resolvedTags.length" class="card-tags">
        <span v-for="t in resolvedTags" :key="t.name" :style="{ '--tag-color': t.color || 'var(--c-primary)' }"><Icon :name="t.icon || 'ph:tag-bold'" />{{ t.name }}</span>
      </div>
    </div>
  </NuxtLink>
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
const resolvedTags = computed(() => props.tagItems?.length
  ? props.tagItems
  : (props.tags || []).map(name => ({ name })))

function saveScroll() {
  const el = document.querySelector('.main-content')
  if (el) sessionStorage.setItem('home-scroll', String(el.scrollTop))
}
</script>

<style scoped>
.article-card {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  background: var(--ld-bg-card);
  border: 1px solid transparent;
  box-shadow: 0 1px 3px var(--ld-shadow);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  contain: layout paint;
  transition: border-color 0.18s ease, background-color 0.18s ease;
  animation: article-card-enter 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--article-index, 0) * 36ms);
}
.article-card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 28%, transparent);
  background: color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft));
}

.card-cover {
  width: 140px;
  aspect-ratio: 140 / 110;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: var(--c-bg-2);
}
.card-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to right, transparent calc(100% - 30px), var(--ld-bg-card));
}
.card-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.article-card:hover .card-title { color: var(--c-primary); }

@keyframes article-card-enter {
  from { opacity: 0; transform: translate3d(0, 12px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

.card-body {
  flex: 1;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
  min-width: 0;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.card-date {
  font-size: 0.65rem;
  color: var(--c-text-3);
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--c-text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.18s ease;
}

.card-desc {
  font-size: 0.72rem;
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
  justify-content: space-between;
  gap: 8px;
  margin-top: 1px;
}
.card-author {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.author-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--c-bg-2);
  flex-shrink: 0;
}
.author-name {
  font-size: 0.65rem;
  color: var(--c-text-2);
  font-weight: 500;
}
.card-stats {
  display: flex;
  gap: 8px;
  font-size: 0.6rem;
  color: var(--c-text-3);
  white-space: nowrap;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.card-tags span {
  --tag-color: var(--c-primary);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.58rem;
  padding: 1px 6px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--tag-color) 10%, transparent);
  color: var(--tag-color);
}

@media (prefers-reduced-motion: reduce) {
  .article-card,
  .card-title {
    transition: none;
    animation: none;
  }
}

@media (max-width: 640px) {
  .article-card {
    min-height: 112px;
    border-radius: 12px;
  }

  .article-card:hover {
    transform: none;
  }

  .card-cover {
    width: clamp(96px, 29vw, 112px);
    min-height: 112px;
    aspect-ratio: auto;
  }

  .card-cover::after {
    background: linear-gradient(to right, transparent 76%, var(--ld-bg-card));
  }

  .card-body {
    padding: 10px 10px 10px 8px;
    gap: 4px;
  }

  .card-title {
    font-size: 0.86rem;
    line-height: 1.45;
    -webkit-line-clamp: 2;
  }

  .card-desc,
  .card-tags {
    display: none;
  }

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
