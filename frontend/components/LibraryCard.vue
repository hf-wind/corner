<template>
  <AppLink :to="`/library/${item.slug}`" class="library-card" :class="item.type">
    <div class="cover-wrap">
      <img v-if="item.coverImage && !coverFailed" :src="coverSrc" :alt="`${item.title}封面`" loading="lazy" @error="coverFailed = true">
      <div v-else class="cover-placeholder">
        <Icon :name="item.type === 'book' ? 'ph:book-open-text' : 'ph:film-strip'" />
        <span>{{ item.title }}</span>
      </div>
      <span v-if="item.type === 'film' && item.rank" class="rank-badge"><small>MY</small> #{{ item.rank }}</span>
      <span v-else-if="item.recommended" class="recommend-badge"><Icon name="ph:bookmark-simple-fill" /> 私藏推荐</span>
      <div class="cover-shade"><span>打开记录</span><Icon name="ph:arrow-up-right-bold" /></div>
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="type-label"><Icon :name="item.type === 'book' ? 'ph:book-open' : 'ph:film-slate'" />{{ item.type === 'book' ? '阅读' : '观影' }}</span>
        <span v-if="item.rating != null" class="score"><Icon name="ph:star-fill" />{{ Number(item.rating).toFixed(1) }}</span>
      </div>
      <h2>{{ item.title }}</h2>
      <p class="creator">{{ creator }}</p>
      <p class="reflection">{{ item.reflection || item.summary || '这份收藏正在等待补上一段属于它的故事。' }}</p>
      <div class="genre-row"><span v-for="genre in (item.genres || []).slice(0, 3)" :key="genre">{{ genre }}</span></div>
      <div class="card-foot">
        <span>{{ experienceDate }}</span>
        <span class="read-more">{{ item.type === 'book' ? '翻开' : '回看' }} <Icon name="ph:arrow-right-bold" /></span>
      </div>
      <button v-if="item.type === 'book' && item.epubMediaPath" type="button" class="epub-link" @click.stop="router.push(`/library/${item.slug}/read`)"><Icon name="ph:book-open-text-bold" /> 在线阅读</button>
    </div>
  </AppLink>
</template>

<script setup lang="ts">
import type { LibraryItem } from '@/types/library'
const props = defineProps<{ item: LibraryItem }>()
const { mediaUrl } = useMediaUrl()
const router = useRouter()
const coverFailed = ref(false)
const coverSrc = computed(() => mediaUrl(props.item.coverImage))
const creator = computed(() => props.item.type === 'book'
  ? (props.item.creator ? `著 · ${props.item.creator}` : '作者未记')
  : (props.item.director ? `导演 · ${props.item.director}` : '导演未记'))
const experienceDate = computed(() => {
  const value = props.item.experienceDate || props.item.publishedAt || props.item.createdAt
  if (!value) return props.item.type === 'book' ? '阅读手记' : '观影手记'
  const date = new Date(value)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
})
</script>

<style scoped>
.library-card { position:relative; display:grid; grid-template-columns:148px minmax(0,1fr); min-height:238px; overflow:hidden; border:0; border-radius:14px; background:var(--ld-bg-card); box-shadow:0 2px 8px color-mix(in srgb,var(--ld-shadow) 34%,transparent); color:inherit; text-decoration:none; contain:layout paint; animation:library-card-enter .54s cubic-bezier(.16,1,.3,1) backwards; transition:transform .28s cubic-bezier(.16,1,.3,1),box-shadow .28s ease; }
.library-card:hover { box-shadow:0 10px 24px color-mix(in srgb,var(--ld-shadow) 50%,transparent); transform:translate3d(0,-3px,0); }
.cover-wrap { position:relative; min-height:100%; overflow:hidden; background:var(--c-bg-2); }
.cover-wrap>img { width:100%; height:100%; min-height:238px; object-fit:cover; transition:transform .6s cubic-bezier(.16,1,.3,1); }
.library-card:hover .cover-wrap>img { transform:scale(1.045); }
.cover-placeholder { display:flex; height:100%; min-height:238px; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:20px; background:radial-gradient(circle at 30% 20%,var(--c-primary-soft),transparent 45%),linear-gradient(155deg,var(--c-bg-2),var(--ld-bg-card)); color:var(--c-text-2); text-align:center; }
.cover-placeholder :deep(svg) { color:var(--c-primary); font-size:2.5rem; opacity:.65; }.cover-placeholder span { font-family:var(--font-heading); font-size:.85rem; line-height:1.7; }
.rank-badge,.recommend-badge { position:absolute; top:12px; left:11px; display:inline-flex; align-items:center; gap:4px; padding:5px 8px; border-radius:999px; background:rgb(18 22 29 / 82%); color:#fff; font-size:.62rem; font-weight:750; letter-spacing:.04em; backdrop-filter:blur(8px); }
.rank-badge small { color:#d7a85a; font-size:.48rem; }.recommend-badge { background:color-mix(in srgb,var(--c-primary) 88%,transparent); }
.cover-shade { position:absolute; inset:auto 0 0; display:flex; align-items:center; justify-content:space-between; padding:28px 13px 12px; background:linear-gradient(transparent,rgb(0 0 0 / 65%)); color:white; font-size:.65rem; opacity:0; transform:translateY(8px); transition:.3s ease; }
.library-card:hover .cover-shade { opacity:1; transform:none; }
.card-body { display:flex; min-width:0; flex-direction:column; padding:20px 20px 17px; }
.card-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.type-label,.score { display:inline-flex; align-items:center; gap:5px; color:var(--c-text-3); font-size:.61rem; font-weight:650; letter-spacing:.1em; }.score { color:#d3942c; font-size:.72rem; letter-spacing:0; }
.card-body h2 { overflow:hidden; margin:0; color:var(--c-text); font-family:var(--font-heading); font-size:1.12rem; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; }
.creator { margin:4px 0 0; color:var(--c-text-3); font-size:.66rem; }
.reflection { display:-webkit-box; overflow:hidden; margin:14px 0 11px; color:var(--c-text-2); font-size:.73rem; line-height:1.75; -webkit-box-orient:vertical; -webkit-line-clamp:3; }
.genre-row { display:flex; flex-wrap:wrap; gap:5px; margin-top:auto; }.genre-row span { padding:3px 7px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.56rem; }
.card-foot { display:flex; align-items:center; justify-content:space-between; margin-top:13px; padding-top:11px; border-top:0; color:var(--c-text-3); font-size:.58rem; font-variant-numeric:tabular-nums; }
.read-more { display:inline-flex; align-items:center; gap:4px; color:var(--c-primary); font-weight:650; }.read-more :deep(svg) { transition:transform .25s ease; }.library-card:hover .read-more :deep(svg) { transform:translateX(3px); }
.epub-link { display:inline-flex; align-items:center; gap:5px; width:max-content; margin-top:8px; padding:0; border:0; background:transparent; color:var(--c-primary); cursor:pointer; font:inherit; font-size:.62rem; text-decoration:none; }
@keyframes library-card-enter { from { opacity:0; transform:translate3d(0,12px,0) } to { opacity:1; transform:translate3d(0,0,0) } }
.library-card:nth-child(2){animation-delay:55ms}.library-card:nth-child(3){animation-delay:110ms}.library-card:nth-child(4){animation-delay:165ms}.library-card:nth-child(5){animation-delay:220ms}.library-card:nth-child(6){animation-delay:275ms}
@media (max-width:520px) { .library-card { grid-template-columns:116px minmax(0,1fr); min-height:206px; border-radius:16px; }.cover-wrap>img,.cover-placeholder { min-height:206px; }.card-body { padding:15px 14px 13px; }.reflection { margin-top:10px; -webkit-line-clamp:2; }.genre-row span:nth-child(n+3) { display:none; } }
</style>
