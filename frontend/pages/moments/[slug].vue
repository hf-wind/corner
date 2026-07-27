<template>
  <div class="moment-detail-page">
    <div v-if="loading" class="detail-loading">
      <div class="loading-card" />
      <div class="loading-card short" />
      <div class="loading-card tall" />
    </div>

    <template v-else-if="moment.title">
      <section class="detail-hero">
        <NuxtLink to="/moments" class="detail-back">
          <Icon name="ph:arrow-left-bold" />
          返回瞬间流
        </NuxtLink>

        <div class="hero-head">
          <div>
            <p class="hero-eyebrow">Moment Detail</p>
            <h1>{{ moment.title }}</h1>
          </div>

          <button
            type="button"
            class="detail-like"
            :class="{ liked: moment.liked }"
            @click="toggleLike"
          >
            <Icon :name="moment.liked ? 'ph:heart-fill' : 'ph:heart-straight-bold'" />
            <span>{{ moment.likeCount }}</span>
          </button>
        </div>

        <p v-if="moment.excerpt" class="detail-excerpt">{{ moment.excerpt }}</p>

        <div class="detail-meta">
          <span><Icon name="ph:calendar-dots-bold" /> {{ moment.date }}</span>
          <span><Icon name="ph:eye-bold" /> {{ moment.viewCount }} 阅读</span>
          <span><Icon name="ph:chat-circle-dots-bold" /> {{ moment.commentCount }} 评论</span>
        </div>
      </section>

      <article class="detail-card">
        <MomentContent :content="moment.content" />
      </article>

      <section class="comment-shell">
        <MomentComments :moment-id="moment.id" />
      </section>
    </template>

    <div v-else class="detail-empty">
      <Icon name="ph:shooting-star-bold" />
      <strong>这条瞬间不见了</strong>
      <span>可能还没发布，或者已经悄悄被收起来了。</span>
      <NuxtLink to="/moments">返回瞬间页</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { isLoggedIn } = useAuth()

const slug = computed(() => String(route.params.slug || ''))
const loading = ref(true)
const moment = ref<any>({})

async function loadMoment() {
  loading.value = true
  try {
    const data = await api.get<any>(`/moments/${slug.value}`)
    moment.value = {
      id: data.id,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content || '',
      date: (data.publishedAt || data.createdAt || '').slice(0, 10),
      viewCount: data.viewCount ?? 0,
      likeCount: data.likeCount ?? 0,
      commentCount: data.commentCount ?? data._count?.comments ?? 0,
      liked: !!data.liked,
    }
  } catch {
    moment.value = {}
  } finally {
    loading.value = false
  }
}

async function toggleLike() {
  if (!moment.value?.id) return
  if (!isLoggedIn.value) {
    toast.warning('登录后才能点赞瞬间')
    await router.push('/login')
    return
  }

  try {
    const result = await api.post<any>(`/moments/${slug.value}/like`)
    moment.value.liked = !!result.liked
    moment.value.likeCount = result.likeCount ?? moment.value.likeCount
  } catch {
    toast.error('点赞失败')
  }
}

watch(slug, () => {
  void loadMoment()
})

onMounted(() => {
  void loadMoment()
})

useHead(() => ({
  title: moment.value?.title ? `${moment.value.title} - 瞬间` : '瞬间详情',
}))
</script>

<style scoped>
.moment-detail-page {
  width: min(900px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 42px;
}

.detail-hero,
.detail-card,
.comment-shell,
.detail-empty {
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, #ffd56b 16%, transparent), transparent 36%),
    linear-gradient(145deg, color-mix(in srgb, var(--ld-bg-card) 98%, white 2%), color-mix(in srgb, var(--c-bg-2) 84%, transparent));
  box-shadow: 0 22px 50px color-mix(in srgb, var(--ld-shadow) 18%, transparent);
}

.detail-hero {
  padding: 28px;
  border-radius: 30px;
}

.detail-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-2);
  text-decoration: none;
  font-size: 0.82rem;
}

.hero-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-top: 18px;
}

.hero-eyebrow {
  margin: 0 0 8px;
  color: var(--c-text-3);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-head h1 {
  margin: 0;
  color: var(--c-text);
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 1.08;
}

.detail-like {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 74%);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  backdrop-filter: blur(12px);
}

.detail-like.liked {
  color: #e05b75;
}

.detail-excerpt {
  margin: 16px 0 0;
  padding: 16px 18px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--c-primary) 8%, transparent);
  color: var(--c-text-2);
  line-height: 1.8;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 18px;
  color: var(--c-text-3);
  font-size: 0.84rem;
}

.detail-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.detail-card {
  margin-top: 18px;
  padding: 24px;
  border-radius: 28px;
}

.comment-shell {
  margin-top: 18px;
  padding: 22px;
  border-radius: 28px;
}

.detail-empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  border-radius: 30px;
  color: var(--c-text-3);
}

.detail-empty strong {
  color: var(--c-text);
}

.detail-empty a {
  color: var(--c-primary);
  text-decoration: none;
}

.detail-loading {
  display: grid;
  gap: 14px;
}

.loading-card {
  height: 160px;
  border-radius: 28px;
  background: linear-gradient(90deg, var(--c-bg-2), color-mix(in srgb, var(--ld-bg-card) 72%, white 28%), var(--c-bg-2));
  background-size: 220% 100%;
  animation: skeleton-wave 1.2s linear infinite;
}

.loading-card.short {
  height: 110px;
}

.loading-card.tall {
  height: 280px;
}

@keyframes skeleton-wave {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

@media (max-width: 860px) {
  .moment-detail-page {
    width: min(100%, calc(100% - 24px));
    padding-top: max(76px, calc(env(safe-area-inset-top) + 64px));
  }

  .detail-hero,
  .detail-card,
  .comment-shell {
    padding: 20px;
    border-radius: 24px;
  }

  .hero-head {
    flex-direction: column;
  }
}
</style>
