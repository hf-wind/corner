<template>
  <div class="place-page">
    <main>
      <header class="place-hero">
        <NuxtLink to="/moments"><Icon name="ph:arrow-left-bold" />返回瞬间</NuxtLink>
        <span><Icon name="ph:map-pin-fill" /></span>
        <p>PLACE · 时光地点</p>
        <h1>{{ place.name || '地点' }}</h1>
        <small>{{ regionText }}</small>
        <strong>{{ place.momentCount || moments.length }} 条公开瞬间</strong>
      </header>

      <section class="place-content">
        <header><div><span>MEMORIES HERE</span><h2>发生在这里</h2></div></header>
        <div v-if="loading" class="place-state"><Icon name="ph:spinner-gap-bold" class="spinning" />正在读取</div>
        <div v-else-if="moments.length" class="moment-list"><MomentCard v-for="moment in moments" :key="moment.slug" :moment="moment" /></div>
        <div v-else class="place-state"><Icon name="ph:map-pin-line" />这里暂时没有公开瞬间</div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const route = useRoute()
const loading = ref(true)
const place = ref<any>({})
const moments = ref<any[]>([])
const slug = computed(() => String(route.params.slug || ''))
const regionText = computed(() => [place.value.province, place.value.city, place.value.country].filter((value, index, values) => value && values.indexOf(value) === index).join(' · '))

async function load() {
  loading.value = true
  try {
    const [placeResult, momentResult] = await Promise.all([
      api.get<any>(`/places/${slug.value}`),
      api.get<any>(`/places/${slug.value}/memories`, { limit: 50 }),
    ])
    place.value = placeResult
    moments.value = momentResult.items || []
  } catch {
    place.value = { name: '地点不存在' }
    moments.value = []
  } finally { loading.value = false }
}

onMounted(load)
watch(slug, load)
useHead({ title: computed(() => `${place.value.name || '地点'} · 时光地点`) })
</script>

<style scoped>
.place-page { flex:1; min-height:0; overflow-y:auto; background:var(--c-bg); }.place-page main { width:min(920px,100%); margin:0 auto; padding:28px 28px 60px; }
.place-hero { position:relative; min-height:230px; padding:48px 28px 34px 86px; border-bottom:1px solid var(--border); }.place-hero>a { position:absolute; top:0; left:0; display:flex; align-items:center; gap:5px; color:var(--c-text-3); font-size:.66rem; text-decoration:none; }.place-hero>span { position:absolute; top:52px; left:18px; display:grid; width:50px; height:50px; border:1px solid color-mix(in srgb,var(--c-primary) 32%,var(--border)); border-radius:8px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.45rem; place-items:center; }.place-hero p { margin:0; color:var(--c-primary); font-size:.56rem; font-weight:700; letter-spacing:.18em; }.place-hero h1 { margin:12px 0 7px; color:var(--c-text); font-size:2.2rem; line-height:1.2; }.place-hero small { color:var(--c-text-3); font-size:.7rem; }.place-hero strong { display:block; margin-top:26px; color:var(--c-text-2); font-size:.72rem; font-weight:600; }
.place-content { padding-top:28px; }.place-content>header span { color:var(--c-primary); font-size:.52rem; font-weight:700; letter-spacing:.16em; }.place-content h2 { margin:5px 0 18px; color:var(--c-text); font-size:1.1rem; }.moment-list { display:grid; gap:12px; }.place-state { display:flex; min-height:220px; align-items:center; justify-content:center; gap:7px; border:1px dashed var(--border); border-radius:8px; color:var(--c-text-3); font-size:.72rem; }.spinning { animation:spin .8s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:640px) { .place-page main { padding:max(72px,calc(env(safe-area-inset-top) + 64px)) 16px 36px; }.place-hero { min-height:200px; padding:44px 4px 26px 60px; }.place-hero>span { left:0; width:45px; height:45px; }.place-hero h1 { font-size:1.7rem; } }
</style>
