<template>
  <main class="journeys-page">
    <ContentPageHero
      eyebrow="TIME ROUTES · 旅行记忆"
      title="地点不是清单，而是记忆发生的顺序"
      description="从一个坐标走向下一个坐标，让沿途的照片、瞬间和停留重新连成一条完整路径。"
      icon="ph:path-bold"
      :metric="items.length"
      metric-label="条公开旅程"
      variant="journeys"
    />

    <header class="section-heading"><div><span>ROUTES & STOPS</span><h2>旅行路线</h2></div><p>沿时间从近到远</p></header>
    <Transition name="content-switch" mode="out-in">
      <section v-if="items.length" key="journeys" class="journey-list content-reveal">
        <AppLink v-for="(item, index) in items" :key="item.id" :to="`/journeys/${item.slug}`" class="journey-card">
          <div class="journey-cover">
            <img v-if="item.coverImage" :src="mediaUrl(item.coverImage)" :alt="item.title">
            <span v-else><Icon name="ph:path-bold" /></span>
            <small>{{ String(index + 1).padStart(2, '0') }}</small>
          </div>
          <div class="journey-copy"><span><Icon name="ph:map-pin-line-bold" />{{ item.stops.length }} 站</span><h2>{{ item.title }}</h2><p>{{ item.description || '一条由地点串起的时间路线。' }}</p></div>
          <span class="journey-action"><Icon name="ph:arrow-up-right-bold" /></span>
        </AppLink>
      </section>
      <div v-else-if="!loading" key="empty" class="public-empty content-reveal"><Icon name="ph:path" /><h2>还没有公开旅行</h2><p>下一段路线，会在抵达之后出现。</p></div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
const api = useApi()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const items = ref<any[]>([])

onMounted(async () => {
  try { items.value = (await api.get<any>('/journeys', { limit: 50 })).items || [] }
  catch { items.value = [] }
  finally { loading.value = false }
})

useHead({ title: '旅行' })
</script>

<style scoped>
.journeys-page { width:100%; height:100%; padding:24px 28px 70px; overflow-y:auto; background:var(--c-bg); color:var(--c-text); scrollbar-gutter:stable; }.section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:4px 2px 14px; }.section-heading span { color:var(--c-primary); font-size:.5rem; font-weight:750; letter-spacing:.18em; }.section-heading h2 { margin:4px 0 0; font-size:1.22rem; }.section-heading p { color:var(--c-text-3); font-size:.58rem; }
.journey-list { display:grid; gap:10px; }.journey-card { position:relative; display:grid; min-height:138px; grid-template-columns:190px minmax(0,1fr) 42px; align-items:center; gap:22px; padding:12px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:var(--ui-radius-panel); background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 22%,transparent); transition:.32s var(--ui-ease-out); }.journey-card::after { position:absolute; bottom:0; left:0; width:0; height:2px; border-radius:0 2px 0 0; background:linear-gradient(90deg,var(--c-primary),var(--ui-accent-warm)); content:''; transition:width .35s var(--ui-ease-out); }.journey-card:hover { border-color:color-mix(in srgb,var(--c-primary) 38%,var(--border)); box-shadow:var(--ui-shadow-panel); transform:translateY(-3px); }.journey-card:hover::after { width:100%; }.journey-cover { position:relative; height:114px; overflow:hidden; border-radius:10px; background:var(--c-bg-2); }.journey-cover img,.journey-cover>span { width:100%; height:100%; }.journey-cover img { object-fit:cover; transition:transform .6s var(--ui-ease-out); }.journey-cover>span { display:grid; color:var(--c-primary); font-size:2.2rem; place-items:center; }.journey-card:hover img { transform:scale(1.045); }.journey-cover small { position:absolute; right:8px; bottom:7px; padding:3px 5px; border-radius:5px; background:rgb(0 0 0 / 35%); color:#fff; font-family:var(--font-mono); font-size:.46rem; backdrop-filter:blur(5px); }
.journey-copy { min-width:0; }.journey-copy>span { display:flex; align-items:center; gap:5px; color:var(--c-primary); font-size:.53rem; }.journey-copy h2 { margin:7px 0 0; font-size:1.05rem; }.journey-copy p { margin:7px 0 0; overflow:hidden; color:var(--c-text-3); font-size:.66rem; text-overflow:ellipsis; white-space:nowrap; }.journey-action { display:grid; width:32px; height:32px; border:1px solid var(--border); border-radius:9px; color:var(--c-text-3); place-items:center; transition:.22s; }.journey-card:hover .journey-action { border-color:var(--c-primary); background:var(--c-primary-soft); color:var(--c-primary); transform:rotate(4deg); }
.public-empty { display:grid; min-height:300px; align-content:center; justify-items:center; border:1px dashed var(--border); border-radius:var(--ui-radius-panel); color:var(--c-text-3); text-align:center; }.public-empty>svg { color:var(--c-primary); font-size:2.5rem; }.public-empty h2 { margin:12px 0 0; color:var(--c-text); font-size:1rem; }.public-empty p { margin-top:6px; font-size:.64rem; }
@media (max-width:900px) { .journeys-page { padding-top:max(70px,calc(env(safe-area-inset-top) + 64px)); } }
@media (max-width:620px) { .journeys-page { padding-right:14px; padding-left:14px; }.journey-card { grid-template-columns:100px minmax(0,1fr) 28px; gap:12px; padding:9px; }.journey-cover { height:86px; }.journey-copy p { white-space:normal; }.journey-action { width:28px; height:28px; } }
@media (prefers-reduced-motion:reduce) { .journey-card,.journey-card::after,.journey-cover img,.journey-action { transition:none; } }
</style>
