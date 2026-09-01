<template>
  <div class="journey-map-wrap">
    <div ref="mapEl" class="journey-map" />
    <div v-if="error" class="map-fallback"><Icon name="ph:map-trifold-bold" /><span>{{ error }}</span></div>
  </div>
</template>

<script setup lang="ts">
import { AmapAdapter } from '@/utils/map-adapter'
const props = defineProps<{ stops: any[] }>()
const mapEl = ref<HTMLElement>(); const error = ref(''); let adapter: AmapAdapter | null = null
const points = computed(() => props.stops.flatMap((stop:any) => Number.isFinite(Number(stop.publicLocation?.longitude)) && Number.isFinite(Number(stop.publicLocation?.latitude)) ? [{ longitude:Number(stop.publicLocation.longitude), latitude:Number(stop.publicLocation.latitude), stop }] : []))
onMounted(async()=>{ if(!mapEl.value||!points.value.length){error.value='这段旅程暂未公开地图位置';return} try { adapter=new AmapAdapter(); const first=points.value[0]; await adapter.mount(mapEl.value,{longitude:first.longitude,latitude:first.latitude,zoom:11}); const items=points.value.map(({longitude,latitude,stop},index)=>({id:`journey-stop:${stop.id}`,kind:'memory' as const,type:'moment' as const,title:stop.title,href:'#',longitude,latitude,placeName:stop.publicLocation.name,precision:stop.publicLocation.precision,occurredAt:stop.occurredAt})); adapter.setItems(items); adapter.setPath(points.value); const west=Math.min(...points.value.map(p=>p.longitude)),east=Math.max(...points.value.map(p=>p.longitude)),south=Math.min(...points.value.map(p=>p.latitude)),north=Math.max(...points.value.map(p=>p.latitude)); if(points.value.length>1)adapter.fitBounds({west,south,east,north}) } catch(e:any){error.value=e?.message||'地图暂时无法加载'} })
onUnmounted(()=>adapter?.destroy())
</script>

<style scoped>
.journey-map-wrap{position:relative;min-height:360px;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:var(--c-bg-2)}.journey-map{position:absolute;inset:0}.map-fallback{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:9px;color:var(--c-text-3)}.map-fallback svg{font-size:2rem}@media(max-width:640px){.journey-map-wrap{min-height:280px}}
</style>
