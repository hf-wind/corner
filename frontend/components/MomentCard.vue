<template>
  <NuxtLink :to="`/moments/${moment.slug}`" class="moment-card">
    <div class="moment-card__glow" />
    <div class="moment-card__head">
      <div>
        <p class="moment-card__eyebrow">Moment</p>
        <h3>{{ moment.title }}</h3>
      </div>
      <span class="moment-card__date">{{ dateText }}</span>
    </div>

    <p v-if="previewText" class="moment-card__text">{{ previewText }}</p>

    <div v-if="images.length" class="moment-card__gallery" :class="`count-${Math.min(images.length, 4)}`">
      <img v-for="(image, index) in images.slice(0, 4)" :key="`${image}-${index}`" :src="mediaUrl(image)" alt="">
      <span v-if="images.length > 4" class="moment-card__more">+{{ images.length - 4 }}</span>
    </div>

    <div class="moment-card__meta">
      <span><Icon name="ph:heart-straight-bold" /> {{ moment.likeCount ?? 0 }}</span>
      <span><Icon name="ph:chat-circle-dots-bold" /> {{ moment.commentCount ?? 0 }}</span>
      <span><Icon name="ph:eye-bold" /> {{ moment.viewCount ?? 0 }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { extractMomentImages, momentPreviewText } from '~/utils/moment'

const props = defineProps<{
  moment: {
    slug: string
    title: string
    content?: string
    excerpt?: string
    publishedAt?: string
    createdAt?: string
    likeCount?: number
    commentCount?: number
    viewCount?: number
  }
}>()

const { mediaUrl } = useMediaUrl()

const images = computed(() => extractMomentImages(props.moment.content))
const previewText = computed(() => props.moment.excerpt || momentPreviewText(props.moment.content, 118))
const dateText = computed(() => {
  const source = props.moment.publishedAt || props.moment.createdAt
  if (!source) return ''
  return source.slice(0, 10)
})
</script>

<style scoped>
.moment-card {
  position: relative;
  display: block;
  padding: 22px;
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--c-primary) 14%, transparent), transparent 42%),
    linear-gradient(145deg, color-mix(in srgb, var(--ld-bg-card) 98%, white 2%), color-mix(in srgb, var(--ld-bg-card) 88%, var(--c-bg-2) 12%));
  box-shadow: 0 22px 50px color-mix(in srgb, #000 10%, transparent);
  text-decoration: none;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.moment-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--c-primary) 34%, var(--border));
  box-shadow: 0 28px 60px color-mix(in srgb, #000 16%, transparent);
}

.moment-card__glow {
  position: absolute;
  inset: auto -18% -30% auto;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary) 18%, transparent);
  filter: blur(24px);
  pointer-events: none;
}

.moment-card__head,
.moment-card__text,
.moment-card__gallery,
.moment-card__meta {
  position: relative;
  z-index: 1;
}

.moment-card__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.moment-card__eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--c-text-3);
}

.moment-card__head h3 {
  margin: 0;
  color: var(--c-text);
  font-size: 1.08rem;
  line-height: 1.35;
}

.moment-card__date {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-bg) 74%, transparent);
  color: var(--c-text-3);
  font-size: 0.75rem;
}

.moment-card__text {
  margin: 16px 0 0;
  color: var(--c-text-2);
  line-height: 1.85;
}

.moment-card__gallery {
  position: relative;
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.moment-card__gallery.count-1,
.moment-card__gallery.count-3 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.moment-card__gallery.count-2,
.moment-card__gallery.count-4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.moment-card__gallery img {
  width: 100%;
  aspect-ratio: 1.15;
  border-radius: 18px;
  object-fit: cover;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.moment-card__more {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgb(17 24 39 / 72%);
  color: #fff;
  font-size: 0.76rem;
  backdrop-filter: blur(12px);
}

.moment-card__meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
  color: var(--c-text-3);
  font-size: 0.8rem;
}

.moment-card__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 640px) {
  .moment-card {
    padding: 18px;
    border-radius: 22px;
  }

  .moment-card__head {
    flex-direction: column;
  }

  .moment-card__date {
    padding-inline: 0;
    background: transparent;
  }
}
</style>
