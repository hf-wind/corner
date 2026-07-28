<template>
  <article :id="`moment-${moment.slug}`" class="moment-row">
    <time class="moment-date" :datetime="dateSource">
      <strong>{{ dateParts.month }}.{{ dateParts.day }}</strong>
      <span>{{ dateParts.year }}</span>
    </time>

    <div class="moment-main">
      <div class="moment-copy">
        <header class="moment-head">
          <h3>{{ moment.title }}</h3>
          <time :datetime="dateSource">{{ dateParts.full }}</time>
        </header>
        <p v-if="summary" class="moment-summary">{{ summary }}</p>
      </div>

      <div v-if="images.length" class="image-strip" :class="`count-${Math.min(images.length, 3)}`">
        <img
          v-for="(image, index) in images.slice(0, 3)"
          :key="`${image}-${index}`"
          :src="mediaUrl(image)"
          :alt="`${moment.title} · 图片 ${index + 1}`"
          loading="lazy"
        >
        <span v-if="images.length > 3">+{{ images.length - 3 }}</span>
      </div>

      <footer class="moment-actions">
        <button
          type="button"
          :class="{ liked: moment.liked }"
          :aria-pressed="!!moment.liked"
          title="点赞"
          @click="toggleLike"
        >
          <Icon :name="moment.liked ? 'ph:heart-fill' : 'ph:heart-straight'" />
          <span>{{ moment.likeCount || '喜欢' }}</span>
        </button>
        <button
          type="button"
          :class="{ active: commentsOpen }"
          :aria-expanded="commentsOpen"
          @click="commentsOpen = !commentsOpen"
        >
          <Icon name="ph:chat-circle" />
          <span>{{ moment.commentCount || '评论' }}</span>
        </button>
      </footer>

      <Transition name="comment-drop">
        <div v-if="commentsOpen" class="comments-slot">
          <MomentComments :moment-id="moment.id" @submitted="moment.commentCount += 1" />
        </div>
      </Transition>
    </div>
  </article>
</template>

<script setup lang="ts">
import { extractMomentImages, momentPreviewText } from '~/utils/moment'

const props = withDefaults(defineProps<{
  moment: { id: string; slug: string; title: string; content?: string; excerpt?: string; publishedAt?: string; createdAt?: string; likeCount: number; commentCount: number; liked?: boolean }
  initiallyExpandedComments?: boolean
}>(), { initiallyExpandedComments: false })

const api = useApi()
const toast = useToast()
const { isLoggedIn } = useAuth()
const { mediaUrl } = useMediaUrl()
const commentsOpen = ref(props.initiallyExpandedComments)
const images = computed(() => extractMomentImages(props.moment.content))
const summary = computed(() => props.moment.excerpt || momentPreviewText(props.moment.content, 140))
const dateSource = computed(() => String(props.moment.publishedAt || props.moment.createdAt || ''))
const dateParts = computed(() => {
  const date = new Date(dateSource.value)
  if (Number.isNaN(date.getTime())) return { day: '--', month: '--', year: '', full: '' }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
    full: new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(date),
  }
})

watch(() => props.initiallyExpandedComments, (value) => { if (value) commentsOpen.value = true })

async function toggleLike() {
  if (!isLoggedIn.value) { toast.warning('登录后才能点赞瞬间'); return navigateTo('/login') }
  try {
    const result = await api.post<any>(`/moments/${props.moment.slug}/like`)
    props.moment.liked = !!result.liked
    props.moment.likeCount = result.likeCount ?? props.moment.likeCount
  } catch { toast.error('点赞失败') }
}
</script>

<style scoped>
.moment-row {
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr);
  gap: 12px;
  scroll-margin-top: 20px;
}

.moment-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: 15px;
  color: var(--c-text-3);
  font-variant-numeric: tabular-nums;
}

.moment-date strong {
  color: var(--c-text-2);
  font-size: .76rem;
  font-weight: 650;
  letter-spacing: .04em;
}

.moment-date span { margin-top: 3px; font-size: .64rem; }

.moment-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 18px;
  min-width: 0;
  padding: 15px 16px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 15px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, transparent);
  box-shadow: 0 7px 24px color-mix(in srgb, var(--ld-shadow) 32%, transparent);
  transition: transform .2s ease, box-shadow .2s ease;
}

.moment-main:hover { transform: translateY(-2px); box-shadow: 0 11px 28px color-mix(in srgb, var(--ld-shadow) 48%, transparent); }

.moment-copy { min-width: 0; }

.moment-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.moment-head h3 {
  margin: 0;
  overflow: hidden;
  color: var(--c-text);
  font-size: .98rem;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.moment-head time { display: none; color: var(--c-text-3); font-size: .66rem; white-space: nowrap; }

.moment-summary {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--c-text-2);
  font-size: .82rem;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.image-strip {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 48px);
  gap: 5px;
  align-self: start;
  overflow: hidden;
  border-radius: 9px;
}

.image-strip.count-1 { grid-template-columns: 108px; }
.image-strip.count-2 { grid-template-columns: repeat(2, 64px); }

.image-strip img {
  width: 100%;
  height: 72px;
  background: var(--c-bg-2);
  object-fit: cover;
}

.image-strip.count-1 img { height: 78px; }

.image-strip > span {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 2px 5px;
  border-radius: 5px;
  background: rgb(10 14 24 / 62%);
  color: #fff;
  font-size: .58rem;
}

.moment-actions {
  display: flex;
  grid-column: 1 / -1;
  gap: 2px;
  margin-top: 9px;
}

.moment-actions button {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font: inherit;
  font-size: .7rem;
  transition: color .18s ease, background-color .18s ease;
}

.moment-actions button:hover,
.moment-actions button.active,
.moment-actions button.liked {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

.comments-slot {
  grid-column: 1 / -1;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.comment-drop-enter-active,
.comment-drop-leave-active { transition: opacity .18s ease, transform .18s ease; }
.comment-drop-enter-from,
.comment-drop-leave-to { opacity: 0; transform: translateY(-5px); }

@media (max-width: 640px) {
  .moment-row { grid-template-columns: 1fr; gap: 0; }
  .moment-date { display: none; }
  .moment-head time { display: block; }
  .moment-main { column-gap: 12px; padding: 14px 14px 9px; border-radius: 13px; }
  .image-strip { grid-template-columns: repeat(3, 42px); }
  .image-strip.count-1 { grid-template-columns: 76px; }
  .image-strip.count-2 { grid-template-columns: repeat(2, 48px); }
  .image-strip img,
  .image-strip.count-1 img { height: 66px; }
}

@media (max-width: 420px) {
  .moment-summary { -webkit-line-clamp: 3; }
  .image-strip.count-2 { grid-template-columns: repeat(2, 42px); }
}

@media (prefers-reduced-motion: reduce) {
  .moment-actions button,
  .comment-drop-enter-active,
  .comment-drop-leave-active { transition: none; }
}
</style>
