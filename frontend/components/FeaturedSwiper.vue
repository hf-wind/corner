<template>
  <section
    v-if="!loading && featured.length"
    class="featured-swiper content-reveal"
    :class="{ mounted }"
    aria-labelledby="featured-title"
  >
    <SectionHead kicker="FEATURED" title="精选推荐" title-id="featured-title" />

    <Swiper
      class="featured-swiper-instance"
      :modules="swiperModules"
      effect="creative"
      :creative-effect="creativeEffect"
      :speed="860"
      :loop="featured.length > 1"
      :grab-cursor="featured.length > 1"
      :allow-touch-move="featured.length > 1"
      :watch-overflow="true"
      :prevent-clicks="true"
      :prevent-clicks-propagation="true"
      :autoplay="autoplayOptions"
      :pagination="paginationOptions"
      :keyboard="{ enabled: true, onlyInViewport: true }"
      :a11y="a11yOptions"
    >
      <SwiperSlide v-for="(item, index) in featured" :key="item.slug">
        <AppLink :to="'/article/' + item.slug" class="featured-card">
          <img
            :src="coverUrl(item.cover)"
            :alt="item.title"
            :loading="index < 2 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'low'"
            decoding="async"
            width="960"
            height="540"
          />
          <span class="featured-scrim" aria-hidden="true" />
          <div class="featured-copy">
            <span class="featured-sequence">{{ formatIndex(index + 1) }}</span>
            <div>
              <span class="featured-date">
                <Icon name="ph:calendar-blank-bold" />{{ item.date }}
              </span>
              <h3>{{ item.title }}</h3>
              <span class="featured-open">
                阅读全文 <Icon name="ph:arrow-up-right-bold" />
              </span>
            </div>
          </div>
        </AppLink>
      </SwiperSlide>
    </Swiper>
  </section>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from "swiper/vue";
import {
  A11y,
  Autoplay,
  EffectCreative,
  Keyboard,
  Pagination,
} from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-creative";
import "swiper/css/pagination";
import SectionHead from "~/components/SectionHead.vue";
import { getDisplayImageUrl } from "~/utils/imagePerformance";

const api = useApi();
const { state: homePreload } = useHomePreload();
const featured = ref<any[]>(mapFeatured(homePreload.value.featured || []));
const loading = ref(homePreload.value.featured === null);
const mounted = ref(false);
const reduceMotion = ref(false);
const swiperModules = [A11y, Autoplay, EffectCreative, Keyboard, Pagination];
const creativeEffect = {
  perspective: true,
  limitProgress: 2,
  prev: {
    translate: ["-94%", 0, -120],
    rotate: [0, 1.5, -1.2],
    opacity: 0.34,
    scale: 0.965,
  },
  next: {
    translate: ["94%", 0, -120],
    rotate: [0, -1.5, 1.2],
    opacity: 0.34,
    scale: 0.965,
  },
};
const autoplayOptions = computed(() =>
  reduceMotion.value || featured.value.length < 2
    ? false
    : {
        delay: 5200,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: true,
      },
);
const paginationOptions = computed(() => ({
  clickable: true,
  dynamicBullets: featured.value.length > 7,
  dynamicMainBullets: 5,
}));
const a11yOptions = {
  enabled: true,
  prevSlideMessage: "上一篇精选文章",
  nextSlideMessage: "下一篇精选文章",
  paginationBulletMessage: "前往第 {{index}} 篇精选文章",
};

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 960, 540);
}

function formatIndex(value: number) {
  return String(value).padStart(2, "0");
}

async function fetchFeatured() {
  try {
    const items = await api.get<any[]>("/posts/featured");
    featured.value = mapFeatured(items || []);
  } catch {
    featured.value = [];
  } finally {
    loading.value = false;
    await nextTick();
    requestAnimationFrame(() => {
      mounted.value = true;
    });
  }
}

function mapFeatured(items: any[]) {
  return items.map((post: any) => ({
    slug: post.slug,
    cover: post.coverImage,
    title: post.title,
    date: post.publishedAt?.slice(0, 10) ?? "",
  }));
}

onMounted(() => {
  reduceMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (homePreload.value.featured === null) void fetchFeatured();
  else {
    nextTick(() =>
      requestAnimationFrame(() => {
        mounted.value = true;
      }),
    );
  }
});
</script>

<style scoped>
.featured-swiper {
  position: relative;
  padding: 10px 0 12px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.58s ease,
    transform 0.72s cubic-bezier(0.16, 1, 0.3, 1);
}

.featured-swiper.mounted {
  opacity: 1;
  transform: none;
}

.featured-swiper-instance {
  width: 100%;
  padding-bottom: 31px;
  overflow: hidden;
}

.featured-swiper-instance :deep(.swiper-wrapper) {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.featured-swiper-instance :deep(.swiper-slide) {
  height: 238px;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

.featured-card {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 8px;
  background: var(--c-bg-2);
  box-shadow: 0 16px 38px color-mix(in srgb, var(--ld-shadow) 45%, transparent);
  color: #fff;
  user-select: none;
  -webkit-user-drag: none;
}

.featured-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  transform: scale(1.025);
  transition: transform 5.8s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.featured-swiper-instance :deep(.swiper-slide-active) .featured-card img {
  transform: scale(1.075);
}

.featured-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgb(4 8 14 / 2%) 12%,
    rgb(4 8 14 / 14%) 45%,
    rgb(4 8 14 / 88%) 100%
  );
}

.featured-copy {
  position: absolute;
  inset: auto 0 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: end;
  gap: 12px;
  padding: 20px;
  opacity: 0;
  transform: translate3d(0, 10px, 0);
  transition:
    opacity 0.38s ease 0.12s,
    transform 0.62s cubic-bezier(0.16, 1, 0.3, 1) 0.08s;
}

.featured-swiper-instance :deep(.swiper-slide-active) .featured-copy {
  opacity: 1;
  transform: none;
}

.featured-sequence {
  align-self: stretch;
  padding-top: 3px;
  border-right: 1px solid rgb(255 255 255 / 28%);
  color: rgb(255 255 255 / 68%);
  font-family: var(--font-mono);
  font-size: 0.64rem;
}

.featured-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  color: rgb(255 255 255 / 72%);
  font-size: 0.55rem;
}

.featured-copy h3 {
  display: -webkit-box;
  max-width: 92%;
  margin: 0;
  overflow: hidden;
  font-size: 1.02rem;
  line-height: 1.42;
  text-shadow: 0 2px 12px rgb(0 0 0 / 38%);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.featured-open {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 9px;
  color: rgb(255 255 255 / 84%);
  font-size: 0.56rem;
  font-weight: 700;
}

.featured-swiper-instance :deep(.swiper-pagination) {
  bottom: 5px;
  display: flex;
  min-height: 16px;
  align-items: center;
  justify-content: center;
}

.featured-swiper-instance :deep(.swiper-pagination-bullet) {
  width: 5px;
  height: 5px;
  margin: 0 4px !important;
  border-radius: 50%;
  background: var(--c-text-3);
  opacity: 0.32;
  transition:
    width 0.34s cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 0.34s ease,
    background-color 0.25s ease,
    opacity 0.25s ease;
}

.featured-swiper-instance :deep(.swiper-pagination-bullet-active) {
  width: 20px;
  border-radius: 3px;
  background: var(--c-primary);
  opacity: 1;
}

@media (max-width: 640px) {
  .featured-swiper {
    margin-inline: -4px;
    padding: 0 4px 8px;
  }

  .featured-swiper-instance {
    padding-bottom: 27px;
  }

  .featured-swiper-instance :deep(.swiper-slide) {
    height: 190px;
  }

  .featured-copy {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 9px;
    padding: 15px;
  }

  .featured-copy h3 {
    max-width: 100%;
    font-size: 0.9rem;
  }

  .featured-open {
    margin-top: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .featured-swiper,
  .featured-card img,
  .featured-copy,
  .featured-swiper-instance :deep(.swiper-wrapper),
  .featured-swiper-instance :deep(.swiper-pagination-bullet) {
    transition: none !important;
  }
}
</style>
