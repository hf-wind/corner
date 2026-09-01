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

        <div class="moment-context">
          <span v-if="moment.happenedAt"><Icon name="ph:clock-bold" />发生于 {{ happenedAtText }}</span>
          <AppLink v-if="moment.publicLocation?.slug" :to="`/places/${moment.publicLocation.slug}`">
            <Icon name="ph:map-pin-bold" />{{ moment.publicLocation.name }}
          </AppLink>
          <span v-else-if="moment.publicLocation"><Icon name="ph:map-pin-bold" />{{ moment.publicLocation.name }}</span>
          <AppLink v-if="moment.publicLocation?.latitude != null" :to="nearbyMapLink"><Icon name="ph:map-trifold-bold" />查看附近记忆</AppLink>
        </div>

        <aside class="moment-summary" aria-label="记录摘要">
          <span><Icon name="ph:notebook" />摘要</span>
          <p>{{ summary }}</p>
        </aside>

        <MomentContent v-if="bodyContent" class="moment-body" :content="bodyContent" />

        <div v-if="images.length" class="moment-gallery" :class="`gallery-${Math.min(images.length, 4)}`">
          <button
            v-for="(image, index) in images"
            :key="`${image}-${index}`"
            type="button"
            class="gallery-item"
            :aria-label="`预览第 ${index + 1} 张图片，共 ${images.length} 张`"
            @click="openPreview(index)"
          >
            <img
              :src="mediaUrl(image)"
              :alt="`${moment.title} · 图片 ${index + 1}`"
              loading="lazy"
            >
            <span class="gallery-zoom"><Icon name="ph:magnifying-glass-plus" /></span>
          </button>
        </div>
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
          <MomentComments
            :moment-id="moment.id"
            :focus-comment-id="focusCommentId"
            :focus-parent-id="focusParentId"
            :highlight-query="highlightQuery"
            @submitted="moment.commentCount = Math.max(0, moment.commentCount + $event)"
          />
        </div>
      </Transition>
    </div>

    <ImageLightbox
      v-model="previewOpen"
      v-model:index="previewIndex"
      :images="previewImages"
      :label="`${moment.title} 图片预览`"
    />
  </article>
</template>

<script setup lang="ts">
import { extractMomentImages, momentPreviewText, stripMomentImages } from '@/utils/moment'
import ImageLightbox from './ImageLightbox.vue'
import type { PublicLocation } from '@/types/place'

const props = withDefaults(defineProps<{
  moment: { id: string; slug: string; title: string; content?: string; excerpt?: string; happenedAt?: string; publicLocation?: PublicLocation | null; publishedAt?: string; createdAt?: string; likeCount: number; commentCount: number; liked?: boolean }
  initiallyExpandedComments?: boolean
  focusCommentId?: string
  focusParentId?: string
  highlightQuery?: string
}>(), { initiallyExpandedComments: false })

const api = useApi()
const toast = useToast()
const route = useRoute()
const { isLoggedIn } = useAuth()
const { mediaUrl } = useMediaUrl()
const commentsOpen = ref(props.initiallyExpandedComments)
const focusCommentId = computed(() => props.focusCommentId || '')
const focusParentId = computed(() => props.focusParentId || '')
const highlightQuery = computed(() => props.highlightQuery || '')
const previewOpen = ref(false)
const previewIndex = ref(0)
const images = computed(() => extractMomentImages(props.moment.content))
const previewImages = computed(() => images.value.map((source, index) => ({
  src: source,
  alt: `${props.moment.title} · 图片 ${index + 1}`,
  caption: props.moment.title,
})))
const bodyContent = computed(() => stripMomentImages(props.moment.content))
const summary = computed(() => {
  const explicit = String(props.moment.excerpt || '').trim()
  if (explicit) return explicit
  const generated = momentPreviewText(bodyContent.value, 110)
  if (generated) return generated
  if (images.value.length) return `一组关于「${props.moment.title}」的影像记录，共 ${images.value.length} 张图片。`
  return `关于「${props.moment.title}」的一段瞬间记录。`
})
const dateSource = computed(() => String(props.moment.happenedAt || props.moment.publishedAt || props.moment.createdAt || ''))
const happenedAtText = computed(() => {
  if (!props.moment.happenedAt) return ''
  const date = new Date(props.moment.happenedAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
})
const nearbyMapLink = computed(() => ({
  path: '/time/map',
  query: {
    lng: props.moment.publicLocation?.longitude,
    lat: props.moment.publicLocation?.latitude,
    cs: 'wgs84',
    place: props.moment.publicLocation?.slug || undefined,
    memory: `moment:${props.moment.id}`,
  },
}))
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
function openPreview(index: number) {
  previewIndex.value = index
  previewOpen.value = true
}

async function toggleLike() {
  if (!isLoggedIn.value) {
    toast.warning('登录后才能点赞瞬间')
    return routerNavigate({ path: '/login', query: { redirect: route.fullPath } })
  }
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

.moment-date strong { color: var(--c-text-2); font-size: .76rem; font-weight: 650; letter-spacing: 0; }
.moment-date span { margin-top: 3px; font-size: .64rem; }

.moment-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  padding: 16px 17px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 96%, transparent);
  box-shadow: 0 7px 24px color-mix(in srgb, var(--ld-shadow) 32%, transparent);
  transition: transform .2s ease, box-shadow .2s ease;
}

.moment-main:hover { transform: translateY(-2px); box-shadow: 0 11px 28px color-mix(in srgb, var(--ld-shadow) 48%, transparent); }
.moment-copy { min-width: 0; }
.moment-head { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; }

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
.moment-context { display:flex; flex-wrap:wrap; gap:7px 12px; margin-top:7px; }.moment-context span,.moment-context a { display:inline-flex; align-items:center; gap:4px; color:var(--c-text-3); font-size:.62rem; text-decoration:none; }.moment-context a { color:var(--c-primary); }.moment-context a:hover { text-decoration:underline; }

.moment-summary {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  margin-top: 10px;
  padding: 9px 11px;
  border-left: 3px solid var(--c-primary);
  border-radius: 0 6px 6px 0;
  background: color-mix(in srgb, var(--c-primary-soft) 52%, var(--c-bg));
}

.moment-summary > span { display: inline-flex; align-items: center; gap: 4px; color: var(--c-primary); font-size: .68rem; font-weight: 650; }
.moment-summary p { margin: 0; color: var(--c-text-2); font-size: .75rem; line-height: 1.65; }
.moment-body { margin-top: 12px; color: var(--c-text-2); font-size: .82rem; line-height: 1.75; }

.moment-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 142px));
  gap: 7px;
  margin-top: 12px;
}

.moment-gallery.gallery-1 { grid-template-columns: minmax(140px, 220px); }
.gallery-item { position: relative; width: 100%; aspect-ratio: 4 / 3; overflow: hidden; padding: 0; border: 1px solid color-mix(in srgb, var(--border) 78%, transparent); border-radius: 7px; background: var(--c-bg-2); cursor: zoom-in; }
.gallery-item img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .22s ease, filter .22s ease; }
.gallery-item:hover img { transform: scale(1.035); filter: brightness(.9); }
.gallery-zoom { position: absolute; right: 6px; bottom: 6px; display: grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: rgb(10 14 24 / 68%); color: #fff; font-size: .82rem; opacity: 0; transition: opacity .18s ease; }
.gallery-item:hover .gallery-zoom, .gallery-item:focus-visible .gallery-zoom { opacity: 1; }
.gallery-item:focus-visible { outline: 2px solid var(--c-primary); outline-offset: 2px; }

.moment-actions { display: flex; gap: 2px; margin-top: 10px; }
.moment-actions button { display: inline-flex; min-height: 28px; align-items: center; gap: 5px; padding: 4px 7px; border: 0; border-radius: 7px; background: transparent; color: var(--c-text-3); cursor: pointer; font: inherit; font-size: .7rem; transition: color .18s ease, background-color .18s ease; }
.moment-actions button:hover, .moment-actions button.active, .moment-actions button.liked { background: var(--c-primary-soft); color: var(--c-primary); }
.comments-slot { margin-top: 10px; padding-top: 12px; border-top: 1px dashed var(--border); }

.comment-drop-enter-active, .comment-drop-leave-active { transition: opacity .18s ease, transform .18s ease; }
.comment-drop-enter-from, .comment-drop-leave-to { opacity: 0; transform: translateY(-5px); }

@media (max-width: 640px) {
  .moment-row { grid-template-columns: 1fr; gap: 0; }
  .moment-date { display: none; }
  .moment-head time { display: block; }
  .moment-main { padding: 14px 14px 9px; }
  .moment-summary { grid-template-columns: 1fr; gap: 4px; }
  .moment-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .moment-gallery.gallery-1 { grid-template-columns: minmax(140px, 210px); }
  .moment-gallery.gallery-2 { grid-template-columns: repeat(2, minmax(0, 130px)); }
}

@media (prefers-reduced-motion: reduce) {
  .moment-main, .moment-actions button, .gallery-item img, .comment-drop-enter-active, .comment-drop-leave-active { transition: none; }
}
</style>
