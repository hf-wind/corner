<template>
  <div class="page-layout article-page admin-preview">
    <main id="main-content" ref="articleMainRef" class="article-main" :class="{ 'article-ready': articleReady }">
      <template v-if="!loading && article.title">
        <NuxtLink to="/admin/posts" class="back-btn">
          <Icon name="ph:arrow-left-bold" />
          返回列表
        </NuxtLink>

        <div class="post-header article-anim" :class="{ 'has-cover': article.hero }">
          <img
            v-if="article.hero"
            :src="coverUrl(article.hero)"
            class="post-cover"
            :alt="article.title"
            decoding="async"
            fetchpriority="high"
          />

          <div class="post-nav">
            <div class="post-info">
              <a href="#" class="author-capsule" @click.prevent>
                <img :src="avatarImg" alt="作者" loading="lazy" />
                <span>{{ article.author || '作者' }}</span>
              </a>
              <span>
                <Icon name="ph:calendar-dots-bold" />
                <time>{{ article.date }}</time>
              </span>
              <span>
                <Icon name="ph:folder-bold" />
                <a>{{ article.tag }}</a>
              </span>
              <span>
                <Icon name="ph:eye-bold" />
                <span>{{ article.views }}</span> 阅读
              </span>
            </div>
          </div>

          <h1 class="post-title text-creative">{{ article.title }}</h1>
        </div>

        <div v-if="article.excerpt" class="md-excerpt gradient-card article-anim">
          <Icon name="ph:highlighter-bold" />
          <span>{{ article.excerpt }}</span>
        </div>

        <div class="article-shell article-anim">
          <ArticleMarkdown :content="article.content" :editor-id="editorId" />
        </div>

        <div class="post-footer article-anim">
          <section class="tags-section">
            <div class="title text-creative">文章标签</div>
            <div class="content tags-list">
              <a v-for="tag in article.tags" :key="tag" href="#" class="tag-item" @click.prevent>#{{ tag }}</a>
            </div>
          </section>

          <section class="license">
            <div class="title text-creative">许可协议</div>
            <div class="content">
              本文采用
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank">
                署名-非商业性使用-相同方式共享 4.0 国际
              </a>
              许可协议，转载请注明出处。
            </div>
          </section>
        </div>
      </template>

      <a-empty v-else description="文章不存在" />
    </main>
  </div>
</template>

<script setup lang="ts">
import avatarImg from '~/assets/images/avatar.jpg'
import { getDisplayImageUrl } from '~/utils/imagePerformance'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const route = useRoute()
const editorId = 'admin-article-preview'
const loading = ref(true)
const articleReady = ref(false)
const article = ref<any>({})
const articleMainRef = ref<HTMLElement | null>(null)

const slug = computed(() => String(route.query.slug || ''))

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 800, 300)
}

async function load() {
  if (!slug.value) {
    loading.value = false
    article.value = {}
    return
  }
  loading.value = true
  articleReady.value = false
  try {
    const p = await api.get<any>(`/posts/${slug.value}/preview`)
    article.value = {
      author: p.author?.username ?? '作者',
      tag: p.category?.name ?? '',
      title: p.title,
      date: (p.publishedAt || p.createdAt || '').slice(0, 10),
      comments: 0,
      views: p.viewCount ?? 0,
      hero: p.coverImage,
      excerpt: p.excerpt ?? '',
      content: p.content,
      tags: (p.tags ?? []).map((t: any) => t.name || t),
      id: p.id,
    }
  } catch {
    article.value = {}
  }
  loading.value = false
  await nextTick()
  requestAnimationFrame(() => { articleReady.value = true })
}

onMounted(load)
watch(slug, load)
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.article-main {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  min-width: 0;
  scrollbar-gutter: stable;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--c-text-2);
  text-decoration: none;
  margin-bottom: 18px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--c-primary);
}

.post-header {
  margin-bottom: 24px;
}

.post-cover {
  width: 100%;
  border-radius: 16px;
  margin-bottom: 20px;
  max-height: 360px;
  object-fit: cover;
  display: block;
  box-shadow: 0 14px 36px var(--ld-shadow);
}

.post-nav {
  margin-bottom: 16px;
}

.post-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 0.72rem;
  color: var(--c-text-2);
}

.post-info span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.post-info a {
  color: var(--c-text-2);
  text-decoration: none;
}

.author-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: var(--c-text-1);
  font-weight: 600;
}

.author-capsule img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.post-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--c-text);
  margin: 0;
}

.md-excerpt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 16px;
  margin-bottom: 20px;
  border-radius: 14px;
  font-size: 0.78rem;
  line-height: 1.7;
  color: var(--c-text-2);
  position: relative;
  overflow: hidden;
  background: var(--ld-bg-card);
  box-shadow: 0 8px 22px var(--ld-shadow);
}

.md-excerpt::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--c-primary-soft), transparent 60%);
  opacity: 0.55;
  pointer-events: none;
}

.md-excerpt :deep(.icon),
.md-excerpt > span {
  position: relative;
  z-index: 0;
}

.md-excerpt :deep(.icon) {
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--c-primary);
}

@keyframes article-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.article-anim {
  opacity: 0;
}

.article-ready .article-anim {
  animation: article-fade-up 0.5s ease both;
}

.article-anim:nth-child(2) { animation-delay: 0.05s; }
.article-anim:nth-child(3) { animation-delay: 0.1s; }
.article-anim:nth-child(4) { animation-delay: 0.15s; }
.article-anim:nth-child(5) { animation-delay: 0.2s; }

.article-shell {
  border-radius: 18px;
  padding: 8px 2px 4px;
}

.post-footer {
  margin-top: 32px;
  padding: 18px;
  border-radius: 16px;
  background: var(--ld-bg-card);
  box-shadow: 0 8px 24px var(--ld-shadow);
}

.title.text-creative {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 10px;
  letter-spacing: 0.03em;
}

.tags-section {
  margin-bottom: 20px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--c-text-2);
  text-decoration: none;
  background: var(--c-bg-2);
}

.license .content {
  font-size: 0.75rem;
  color: var(--c-text-2);
  line-height: 1.6;
}

.license a {
  color: var(--c-primary);
  text-decoration: none;
}

@media (max-width: 640px) {
  .article-main {
    padding: 18px 14px;
  }

  .post-cover {
    max-height: 240px;
    border-radius: 12px;
  }

  .post-title {
    font-size: clamp(1.25rem, 6vw, 1.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-loading-state { animation: none; }
  .article-anim { opacity: 1; }
  .article-ready .article-anim { animation: none; }
}
</style>
