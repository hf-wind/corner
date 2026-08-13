<template>
  <main class="stories-page">
    <ContentPageHero
      eyebrow="MEMORY STORIES · 记忆叙事"
      title="让一段故事，沿着时间缓缓展开"
      description="文字、照片、地点与音乐不再散落。它们沿同一条航线重逢，成为可以沉浸播放的记忆章节。"
      icon="ph:play-fill"
      :metric="items.length"
      metric-label="条故事航线"
      variant="stories"
    />

    <header class="section-heading">
      <div><span>CHAPTERED MEMORIES</span><h2>故事航线</h2></div>
      <AppLink to="/journeys">浏览旅行 <Icon name="ph:arrow-right-bold" /></AppLink>
    </header>

    <Transition name="content-switch" mode="out-in">
      <section v-if="items.length" key="stories" class="story-grid content-reveal">
        <AppLink v-for="(item, index) in items" :key="item.id" :to="`/stories/${item.slug}`" class="story-card">
          <div class="story-cover">
            <img v-if="item.coverImage || item.steps[0]?.photo?.path" :src="mediaUrl(item.coverImage || item.steps[0].photo.path)" :alt="item.title">
            <span v-else><Icon name="ph:star-four-bold" /></span>
            <i class="cover-shade" />
            <small>{{ String(index + 1).padStart(2, '0') }}</small>
          </div>
          <div class="story-copy">
            <span><Icon name="ph:list-numbers-bold" />{{ item.steps.length }} 个章节</span>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description || '一段仍在展开的记忆。' }}</p>
            <strong><Icon name="ph:play-fill" /> 播放故事</strong>
          </div>
          <Icon name="ph:arrow-up-right-bold" class="story-arrow" />
        </AppLink>
      </section>
      <div v-else-if="!loading" key="empty" class="public-empty content-reveal"><Icon name="ph:star-four" /><h2>故事仍在编排中</h2><p>第一条航线会从这里启程。</p></div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
const api = useApi()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const items = ref<any[]>([])

onMounted(async () => {
  try { items.value = await api.get('/stories') }
  catch { items.value = [] }
  finally { loading.value = false }
})

useHead({ title: '故事航线' })
</script>

<style scoped>
.stories-page { width:100%; height:100%; padding:24px 28px 70px; overflow-y:auto; background:var(--c-bg); color:var(--c-text); scrollbar-gutter:stable; }
.section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:4px 2px 15px; }.section-heading span { color:var(--c-primary); font-size:.5rem; font-weight:750; letter-spacing:.18em; }.section-heading h2 { margin:4px 0 0; font-size:1.22rem; }.section-heading>a { display:flex; align-items:center; gap:6px; color:var(--c-primary); font-size:.62rem; }
.story-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.story-card { position:relative; display:grid; min-height:220px; grid-template-columns:minmax(150px,42%) minmax(0,1fr); overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:var(--ui-radius-panel); background:var(--ld-bg-card); box-shadow:var(--ui-shadow-soft); transition:.35s var(--ui-ease-out); }.story-card:hover { border-color:color-mix(in srgb,var(--c-primary) 40%,var(--border)); box-shadow:var(--ui-shadow-panel); transform:translateY(-4px); }.story-cover { position:relative; min-height:220px; overflow:hidden; background:var(--c-bg-2); }.story-cover img,.story-cover>span { width:100%; height:100%; }.story-cover img { object-fit:cover; transition:transform .65s var(--ui-ease-out); }.story-cover>span { display:grid; color:var(--c-primary); font-size:2.5rem; place-items:center; }.story-card:hover img { transform:scale(1.045); }.cover-shade { position:absolute; inset:0; background:linear-gradient(180deg,transparent 56%,rgb(5 8 12/48%)); }.story-cover small { position:absolute; right:10px; bottom:9px; color:#fff; font-family:var(--font-mono); font-size:.5rem; letter-spacing:.12em; }
.story-copy { display:flex; min-width:0; justify-content:center; flex-direction:column; padding:23px; }.story-copy>span { display:flex; align-items:center; gap:5px; color:var(--c-primary); font-size:.53rem; letter-spacing:.08em; }.story-copy h2 { margin:9px 0 0; font-size:1.05rem; }.story-copy p { display:-webkit-box; margin:8px 0 0; overflow:hidden; color:var(--c-text-3); font-size:.65rem; line-height:1.7; -webkit-box-orient:vertical; -webkit-line-clamp:3; }.story-copy strong { display:flex; align-items:center; gap:6px; margin-top:16px; color:var(--c-text-2); font-size:.59rem; }.story-arrow { position:absolute; top:13px; right:13px; color:var(--c-primary); opacity:0; transition:.2s; transform:translate(-3px,3px); }.story-card:hover .story-arrow { opacity:1; transform:none; }
.public-empty { display:grid; min-height:300px; align-content:center; justify-items:center; border:1px dashed var(--border); border-radius:var(--ui-radius-panel); color:var(--c-text-3); text-align:center; }.public-empty>svg { color:var(--c-primary); font-size:2.5rem; }.public-empty h2 { margin:12px 0 0; color:var(--c-text); font-size:1rem; }.public-empty p { margin-top:6px; font-size:.64rem; }
@media (max-width:900px) { .stories-page { padding-top:max(70px,calc(env(safe-area-inset-top) + 64px)); }.story-grid { grid-template-columns:1fr; } }
@media (max-width:560px) { .stories-page { padding-right:14px; padding-left:14px; }.story-card { min-height:180px; grid-template-columns:38% 1fr; }.story-cover { min-height:180px; }.story-copy { padding:17px; }.story-copy p { -webkit-line-clamp:2; } }
@media (prefers-reduced-motion:reduce) { .story-card,.story-cover img,.story-arrow { transition:none; } }
</style>
