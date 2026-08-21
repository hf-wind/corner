<template>
  <Teleport to="body">
    <Transition name="viewer-fade">
      <div v-if="modelValue" ref="dialogRef" class="media-viewer" role="dialog" aria-modal="true" :aria-label="dialogLabel" tabindex="-1" @click.self="closeFromBackdrop">
        <div class="viewer-chrome viewer-top" @click.stop>
          <span class="viewer-count"><b>{{ paddedIndex }}</b><i>/</i>{{ paddedTotal }}</span>
          <div class="viewer-tools">
            <template v-if="activeItem?.type === 'image'">
              <button type="button" title="缩小" :disabled="scale <= minScale" @click="zoomBy(-.25)"><Icon name="ph:magnifying-glass-minus-bold" /></button>
              <span>{{ Math.round(scale * 100) }}%</span>
              <button type="button" title="放大" :disabled="scale >= maxScale" @click="zoomBy(.25)"><Icon name="ph:magnifying-glass-plus-bold" /></button>
              <button type="button" title="重置" @click="resetTransform"><Icon name="ph:arrows-in-simple-bold" /></button>
            </template>
            <slot name="toolbar" :image="activeItem" :index="safeIndex" />
            <button ref="closeRef" type="button" class="viewer-close" title="关闭" @click="close"><Icon name="ph:x-bold" /></button>
          </div>
        </div>

        <Swiper
          class="viewer-swiper"
          :modules="swiperModules"
          :initial-slide="safeIndex"
          :loop="loop && normalizedItems.length > 1"
          :keyboard="{ enabled: true }"
          :a11y="a11yOptions"
          :resistance-ratio=".72"
          :speed="420"
          grab-cursor
          @swiper="onSwiper"
          @slide-change="onSlideChange"
          @click="onStageClick"
        >
          <SwiperSlide v-for="item in normalizedItems" :key="item.id ?? item.src" class="viewer-slide" :class="{ 'is-long': longImages.has(item.src) }">
            <div v-if="item.type === 'image'" class="viewer-image-wrap" :style="item.src === activeItem?.src ? imageStyle : undefined" @wheel.prevent="onWheel">
              <img :src="item.src" :alt="item.alt" draggable="false" @load="onImageLoad($event, item.src)" @error="failedSources.add(item.src)" />
              <div v-if="failedSources.has(item.src)" class="viewer-state"><Icon name="ph:image-broken-bold" /><span>图片加载失败</span></div>
            </div>
            <video v-else-if="item.type === 'video'" class="viewer-video" :src="item.src" :poster="item.poster" controls playsinline preload="metadata" @click.stop />
            <div v-else-if="item.type === 'audio'" class="viewer-audio" @click.stop>
              <span><Icon name="ph:waveform-bold" /></span><strong>{{ item.name || item.caption || '音频文件' }}</strong><audio :src="item.src" controls preload="metadata" />
            </div>
            <div v-else class="viewer-document" @click.stop>
              <span><Icon name="ph:file-text-bold" /></span><strong>{{ item.name || item.caption || '文档文件' }}</strong><a :href="item.src" target="_blank" rel="noopener"><Icon name="ph:arrow-square-out-bold" />打开文件</a>
            </div>
          </SwiperSlide>
        </Swiper>

        <button v-if="canNavigate" type="button" class="viewer-nav viewer-prev" title="上一项" @click.stop="previous"><Icon name="ph:caret-left-bold" /></button>
        <button v-if="canNavigate" type="button" class="viewer-nav viewer-next" title="下一项" @click.stop="next"><Icon name="ph:caret-right-bold" /></button>

        <div class="viewer-chrome viewer-bottom" @click.stop>
          <p v-if="activeItem?.caption">{{ activeItem.caption }}</p>
          <div v-if="canNavigate" class="viewer-pagination">
            <button v-for="(_, index) in normalizedItems" :key="index" type="button" :class="{ active: index === safeIndex }" :aria-label="`查看第 ${index + 1} 项`" @click="select(index)" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Keyboard } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'

export type MediaPreviewItem = {
  src: string
  alt?: string
  caption?: string
  id?: string | number
  type?: 'image' | 'video' | 'audio' | 'document'
  mimeType?: string
  poster?: string
  name?: string
}
export type ImagePreviewItem = MediaPreviewItem

const props = withDefaults(defineProps<{
  modelValue: boolean
  images: Array<string | MediaPreviewItem>
  index?: number
  loop?: boolean
  minScale?: number
  maxScale?: number
  closeOnBackdrop?: boolean
  label?: string
}>(), { index: 0, loop: true, minScale: .5, maxScale: 4, closeOnBackdrop: true, label: '媒体预览' })

const emit = defineEmits<{ 'update:modelValue': [open:boolean]; 'update:index':[index:number]; change:[index:number]; close:[] }>()
const { mediaUrl } = useMediaUrl()
const dialogRef = ref<HTMLElement|null>(null)
const closeRef = ref<HTMLButtonElement|null>(null)
const swiperRef = shallowRef<SwiperInstance|null>(null)
const scale = ref(1)
const longImages = reactive(new Set<string>())
const failedSources = reactive(new Set<string>())
const swiperModules = [A11y, Keyboard]
const a11yOptions = { enabled:true, prevSlideMessage:'上一项', nextSlideMessage:'下一项', slideLabelMessage:'第 {{index}} 项，共 {{slidesLength}} 项' }
let previousFocus: HTMLElement|null = null

function inferType(item: MediaPreviewItem) {
  if (item.type) return item.type
  const value = `${item.mimeType || ''} ${item.src}`.toLowerCase()
  if (/video\/|\.(mp4|webm|mov|m4v)(\?|$)/.test(value)) return 'video'
  if (/audio\/|\.(mp3|flac|wav|ogg|m4a|aac)(\?|$)/.test(value)) return 'audio'
  if (/image\/|\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/.test(value)) return 'image'
  return 'document'
}
const normalizedItems = computed<MediaPreviewItem[]>(() => props.images.map((raw,index) => {
  const item = typeof raw === 'string' ? { src:raw } : raw
  return { ...item, src:mediaUrl(item.src), poster:item.poster ? mediaUrl(item.poster) : undefined, alt:item.alt || `${props.label} ${index+1}`, type:inferType(item) }
}).filter(item => Boolean(item.src)))
const safeIndex = computed(() => Math.min(Math.max(0,props.index),Math.max(0,normalizedItems.value.length-1)))
const activeItem = computed(() => normalizedItems.value[safeIndex.value])
const canNavigate = computed(() => normalizedItems.value.length > 1)
const paddedIndex = computed(() => String(safeIndex.value+1).padStart(2,'0'))
const paddedTotal = computed(() => String(normalizedItems.value.length).padStart(2,'0'))
const dialogLabel = computed(() => `${props.label}，第 ${safeIndex.value+1} 项，共 ${normalizedItems.value.length} 项`)
const imageStyle = computed(() => ({ transform:`scale(${scale.value})` }))

watch(() => props.modelValue, open => {
  if (!import.meta.client) return
  document.body.classList.toggle('image-lightbox-open',open)
  if (open) { previousFocus=document.activeElement as HTMLElement|null; resetTransform(); nextTick(() => closeRef.value?.focus()) }
  else { previousFocus?.focus?.(); previousFocus=null }
}, { immediate:true })
watch(() => props.index, index => { if (swiperRef.value && swiperRef.value.realIndex !== index) swiperRef.value.slideToLoop(index) })
watch(activeItem, () => resetTransform())

function onSwiper(swiper: SwiperInstance) { swiperRef.value=swiper }
function onSlideChange(swiper: SwiperInstance) { const index=swiper.realIndex; if(index!==safeIndex.value){ emit('update:index',index); emit('change',index) } }
function select(index:number) { swiperRef.value?.slideToLoop(index) }
function previous() { swiperRef.value?.slidePrev() }
function next() { swiperRef.value?.slideNext() }
function zoomBy(delta:number) { scale.value=Math.min(props.maxScale,Math.max(props.minScale,Number((scale.value+delta).toFixed(2)))); if(swiperRef.value) swiperRef.value.allowTouchMove=scale.value<=1 }
function resetTransform() { scale.value=1; if(swiperRef.value) swiperRef.value.allowTouchMove=true }
function onWheel(event:WheelEvent) { if(activeItem.value?.type==='image') zoomBy(event.deltaY < 0 ? .2 : -.2) }
function onImageLoad(event:Event,src:string) { const image=event.currentTarget as HTMLImageElement; if(image.naturalHeight/image.naturalWidth>2.15) longImages.add(src) }
function onStageClick(swiper:SwiperInstance,event:MouseEvent) { if(event.target instanceof HTMLElement && event.target.closest('video,audio,a,button')) return; if(event.detail===2 && activeItem.value?.type==='image') scale.value>1?resetTransform():zoomBy(1) }
function close() { emit('update:modelValue',false); emit('close') }
function closeFromBackdrop() { if(props.closeOnBackdrop) close() }
function onKeydown(event:KeyboardEvent) { if(!props.modelValue)return; if(event.key==='Escape')close(); else if(event.key==='+')zoomBy(.25); else if(event.key==='-')zoomBy(-.25); else if(event.key==='0')resetTransform() }
onMounted(() => window.addEventListener('keydown',onKeydown))
onUnmounted(() => { window.removeEventListener('keydown',onKeydown); document.body.classList.remove('image-lightbox-open') })
</script>

<style scoped>
.media-viewer{position:fixed;z-index:3000;inset:0;overflow:hidden;background:color-mix(in srgb,var(--c-bg) 94%,transparent);color:var(--c-text);backdrop-filter:blur(20px) saturate(.9);overscroll-behavior:none}.viewer-swiper{width:100%;height:100%}.viewer-slide{display:flex;align-items:center;justify-content:center;min-height:100%;padding:72px 92px 68px;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.viewer-image-wrap{display:flex;max-width:100%;max-height:100%;align-items:center;justify-content:center;transform-origin:center;transition:transform .25s cubic-bezier(.22,1,.36,1);will-change:transform}.viewer-image-wrap img{display:block;width:auto;max-width:100%;max-height:calc(100dvh - 140px);border-radius:6px;box-shadow:0 24px 78px rgb(0 0 0 / 28%);object-fit:contain;user-select:none;-webkit-user-drag:none}.viewer-slide.is-long{align-items:flex-start;justify-content:center;touch-action:pan-y}.viewer-slide.is-long .viewer-image-wrap{width:min(920px,100%);max-width:none;max-height:none;align-items:flex-start}.viewer-slide.is-long img{width:100%;max-width:none;max-height:none;height:auto}.viewer-video{width:min(1120px,100%);max-height:calc(100dvh - 140px);border-radius:6px;background:#000;box-shadow:0 24px 78px rgb(0 0 0 / 30%)}
.viewer-audio,.viewer-document{display:grid;width:min(520px,calc(100vw - 32px));justify-items:center;gap:14px;padding:28px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card);box-shadow:0 20px 60px color-mix(in srgb,var(--ld-shadow) 48%,transparent)}.viewer-audio>span,.viewer-document>span{display:grid;width:58px;height:58px;border-radius:50%;background:var(--c-primary-soft);color:var(--c-primary);font-size:1.6rem;place-items:center}.viewer-audio strong,.viewer-document strong{max-width:100%;overflow:hidden;font-size:.85rem;text-overflow:ellipsis;white-space:nowrap}.viewer-audio audio{width:100%}.viewer-document a{display:inline-flex;min-height:34px;align-items:center;gap:6px;padding:0 14px;border-radius:999px;background:var(--c-primary);color:#fff;font-size:.68rem}
.viewer-chrome{position:absolute;z-index:10;display:flex;align-items:center;pointer-events:none}.viewer-chrome>*{pointer-events:auto}.viewer-top{top:max(12px,env(safe-area-inset-top));right:14px;left:14px;justify-content:space-between}.viewer-bottom{right:18px;bottom:max(14px,env(safe-area-inset-bottom));left:18px;flex-direction:column;gap:9px}.viewer-bottom p{max-width:min(720px,80vw);margin:0;color:var(--c-text-2);font-size:.68rem;line-height:1.5;text-align:center}.viewer-count{display:inline-flex;height:34px;align-items:center;gap:7px;padding:0 13px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--ld-bg-card) 90%,transparent);box-shadow:0 8px 24px color-mix(in srgb,var(--ld-shadow) 32%,transparent);font-family:var(--font-mono);font-size:.62rem}.viewer-count b{font-size:.8rem}.viewer-count i{font-style:normal;opacity:.42}.viewer-tools{display:flex;height:40px;align-items:center;gap:3px;padding:3px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--ld-bg-card) 90%,transparent);box-shadow:0 8px 24px color-mix(in srgb,var(--ld-shadow) 32%,transparent)}.viewer-tools>span{width:40px;color:var(--c-text-3);font-size:.58rem;text-align:center}.viewer-tools button,.viewer-nav{display:grid;border:0;background:transparent;color:var(--c-text);cursor:pointer;place-items:center}.viewer-tools button{width:32px;height:32px;border-radius:50%}.viewer-tools button:hover,.viewer-tools button:focus-visible{background:var(--c-primary-soft);color:var(--c-primary);outline:0}.viewer-tools button:disabled{opacity:.3}.viewer-tools .viewer-close{background:color-mix(in srgb,var(--c-text) 7%,transparent)}
.viewer-nav{position:absolute;z-index:9;top:50%;width:44px;height:44px;border:1px solid var(--border);border-radius:50%;background:color-mix(in srgb,var(--ld-bg-card) 88%,transparent);box-shadow:0 9px 28px color-mix(in srgb,var(--ld-shadow) 38%,transparent);font-size:1.05rem;transform:translateY(-50%);backdrop-filter:blur(12px)}.viewer-nav:hover{background:var(--c-primary-soft);color:var(--c-primary)}.viewer-prev{left:18px}.viewer-next{right:18px}.viewer-pagination{display:flex;max-width:min(440px,80vw);align-items:center;gap:5px;padding:6px 9px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--ld-bg-card) 88%,transparent);overflow-x:auto}.viewer-pagination button{width:6px;height:6px;flex:0 0 6px;padding:0;border:0;border-radius:50%;background:var(--c-text-3);cursor:pointer;opacity:.42;transition:width .22s ease,opacity .22s ease}.viewer-pagination button.active{width:22px;border-radius:999px;background:var(--c-primary);opacity:1}.viewer-state{position:absolute;display:flex;align-items:center;gap:7px;color:var(--c-text-3);font-size:.68rem}.viewer-fade-enter-active,.viewer-fade-leave-active{transition:opacity .2s ease}.viewer-fade-enter-from,.viewer-fade-leave-to{opacity:0}
@media(max-width:640px){.viewer-slide{padding:58px 0 62px}.viewer-image-wrap img{max-height:calc(100dvh - 120px);border-radius:0;box-shadow:none}.viewer-slide.is-long{justify-content:flex-start}.viewer-slide.is-long .viewer-image-wrap{width:100%;min-width:100%}.viewer-nav{display:none}.viewer-top{top:max(7px,env(safe-area-inset-top));right:7px;left:10px}.viewer-count{height:32px;padding:0 10px}.viewer-tools{height:36px;border-color:color-mix(in srgb,var(--border) 60%,transparent)}.viewer-tools button{width:28px;height:28px}.viewer-tools>span{display:none}.viewer-bottom{bottom:max(8px,env(safe-area-inset-bottom))}.viewer-bottom p{max-width:90vw}.viewer-video{max-height:calc(100dvh - 120px);border-radius:0}.viewer-audio,.viewer-document{padding:22px 16px;border-radius:8px}}
@media(prefers-reduced-motion:reduce){.viewer-image-wrap,.viewer-pagination button,.viewer-fade-enter-active,.viewer-fade-leave-active{transition:none}}
</style>
