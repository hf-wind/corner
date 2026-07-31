<template>
  <div class="album-editor">
    <header class="editor-heading">
      <div class="heading-copy">
        <button type="button" class="back-link" @click="router.push('/admin/albums')"><Icon name="ph:arrow-left-bold" /> 返回相册</button>
        <div><h1>{{ form.title || '新建相册' }}</h1><span>{{ items.length }} 张照片 · 原图保留，公开位置由你确认</span></div>
      </div>
      <div class="heading-actions">
        <a-button v-if="props.id" @click="setPrivate">设为私密</a-button>
        <a-button :loading="saving" @click="save">保存草稿</a-button>
        <a-button type="primary" :loading="publishing" @click="publish">保存并发布</a-button>
      </div>
    </header>

    <div class="editor-grid">
      <main class="editor-main">
        <section class="panel base-panel">
          <header><div><span>01</span><h2>相册信息</h2></div></header>
          <div class="field-grid">
            <label>相册名称<a-input v-model:value="form.title" placeholder="例如：绍兴的晚风" @blur="fillSlug" /></label>
            <label>Slug<a-input v-model:value="form.slug" placeholder="shaoxing-evening" /></label>
            <label class="wide">相册说明<a-textarea v-model:value="form.description" :rows="4" placeholder="写下这一册照片共同的故事。" /></label>
            <label>主时间<a-date-picker v-model:value="albumDate" show-time style="width:100%" /></label>
            <label>主地点<PlacePicker v-model="form.place" /></label>
          </div>
          <div class="privacy-row">
            <label>地点策略<a-select v-model:value="form.locationVisibility"><a-select-option value="private">私密</a-select-option><a-select-option value="blurred">模糊公开</a-select-option><a-select-option value="public">精确公开</a-select-option></a-select></label>
            <label>公开精度<a-select v-model:value="form.locationPrecision"><a-select-option value="place">地点</a-select-option><a-select-option value="city">城市</a-select-option><a-select-option value="province">省份</a-select-option><a-select-option value="exact">精确坐标</a-select-option></a-select></label>
          </div>
        </section>

        <section class="panel photos-panel">
          <header>
            <div><span>02</span><h2>照片编排</h2></div>
            <a-button type="primary" ghost @click="pickPhotos"><Icon name="ph:images-square-bold" /> 从媒体库选择</a-button>
          </header>
          <div v-if="items.length" class="photo-list">
            <article
              v-for="(item, index) in items"
              :key="item.mediaId"
              class="photo-item"
              draggable="true"
              @dragstart="dragIndex = index"
              @dragover.prevent
              @drop="moveItem(index)"
            >
              <div class="drag-handle" title="拖拽排序"><Icon name="ph:dots-six-vertical-bold" /></div>
              <button type="button" class="photo-preview" @click="openPreview(index)"><img :src="mediaUrl(item.media.path)" :alt="item.caption || form.title"><span>{{ String(index + 1).padStart(2, '0') }}</span></button>
              <div class="photo-fields">
                <a-input v-model:value="item.caption" placeholder="这张照片的说明" />
                <div class="photo-meta-row">
                  <a-date-picker v-model:value="item.dateValue" show-time placeholder="拍摄时间" />
                  <a-select v-model:value="item.momentId" allow-clear show-search placeholder="关联瞬间" :filter-option="filterMoment">
                    <a-select-option v-for="moment in moments" :key="moment.id" :value="moment.id">{{ moment.title }}</a-select-option>
                  </a-select>
                  <a-button @click="openMetadata(item)"><Icon name="ph:camera-bold" /> EXIF</a-button>
                </div>
                <div class="photo-privacy-row">
                  <a-select v-model:value="item.locationVisibility" size="small">
                    <a-select-option value="private">地点私密</a-select-option>
                    <a-select-option value="blurred">模糊公开</a-select-option>
                    <a-select-option value="public">精确公开</a-select-option>
                  </a-select>
                  <a-select v-model:value="item.locationPrecision" size="small">
                    <a-select-option value="place">地点级</a-select-option>
                    <a-select-option value="city">城市级</a-select-option>
                    <a-select-option value="province">省份级</a-select-option>
                    <a-select-option value="exact">精确坐标</a-select-option>
                  </a-select>
                </div>
                <div class="item-place"><PlacePicker v-model="item.place" /></div>
              </div>
              <div class="photo-actions">
                <a-tooltip title="设为封面"><button type="button" :class="{ active: form.coverMediaId === item.mediaId }" @click="form.coverMediaId = item.mediaId"><Icon name="ph:bookmark-simple-fill" /></button></a-tooltip>
                <a-tooltip title="移除照片"><button type="button" @click="removeItem(index)"><Icon name="ph:trash-bold" /></button></a-tooltip>
              </div>
            </article>
          </div>
          <div v-else class="photo-empty"><Icon name="ph:images-square" /><h3>还没有照片</h3><p>从媒体库批量加入图片，拖拽决定它们讲述故事的顺序。</p><a-button type="primary" @click="pickPhotos">选择照片</a-button></div>
        </section>
      </main>

      <aside class="editor-rail">
        <section class="rail-card cover-card">
          <header><span>封面预览</span><small>{{ form.coverMediaId ? '已选择' : '默认首图' }}</small></header>
          <div class="cover-preview"><img v-if="coverItem" :src="mediaUrl(coverItem.media.path)" alt="相册封面"><Icon v-else name="ph:image-square" /></div>
          <p>封面只影响相册入口，照片原图不会被裁剪或覆盖。</p>
        </section>
        <section class="rail-card guide-card"><Icon name="ph:shield-check-bold" /><h3>位置隐私</h3><p>EXIF 中的 GPS 只作为后台候选。照片默认私密，选择公开策略后才进入相册公开响应。</p></section>
      </aside>
    </div>

    <ImageLightbox v-model="previewOpen" v-model:index="previewIndex" :images="previewImages" label="相册照片" />
    <a-modal v-model:open="metadataDialog.open" title="确认 EXIF 候选" :confirm-loading="metadataDialog.saving" ok-text="确认候选" cancel-text="稍后处理" @ok="confirmMetadata">
      <a-spin :spinning="metadataDialog.loading">
        <div v-if="metadataDialog.media" class="metadata-card">
          <img :src="mediaUrl(metadataDialog.media.path)" alt="EXIF 图片">
          <dl><div><dt>解析状态</dt><dd>{{ metadataStatus }}</dd></div><div><dt>相机</dt><dd>{{ cameraText }}</dd></div><div><dt>原始尺寸</dt><dd>{{ sizeText }}</dd></div><div><dt>GPS 候选</dt><dd>{{ gpsText }}</dd></div></dl>
          <label>确认拍摄时间<a-date-picker v-model:value="metadataDialog.dateValue" show-time style="width:100%" /></label>
          <label>确认地点<PlacePicker v-model="metadataDialog.place" /></label>
          <a-button v-if="hasGpsCandidate && !metadataDialog.place" @click="createPlaceFromExif"><Icon name="ph:map-pin-plus-bold" /> 从 GPS 创建地点候选</a-button>
          <a-button v-if="metadataDialog.metadata?.status === 'failed'" @click="retryMetadata">重新解析</a-button>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import dayjs, { type Dayjs } from 'dayjs'
import { Modal } from 'ant-design-vue'
import type { AlbumItem } from '~/types/album'
import type { Place } from '~/types/place'

const props = defineProps<{ id?: string }>()
const api = useApi()
const toast = useToast()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const { openItems } = useMediaLibrary()
const saving = ref(false)
const publishing = ref(false)
const dragIndex = ref(-1)
const previewOpen = ref(false)
const previewIndex = ref(0)
const moments = ref<any[]>([])
const items = ref<Array<AlbumItem & { dateValue: Dayjs | null; place: Place | null }>>([])
const form = reactive({ title: '', slug: '', description: '', coverMediaId: null as string | null, happenedAt: null as string | null, place: null as Place | null, locationVisibility: 'private', locationPrecision: 'place', locationExactConfirmedAt: null as string | null })
const albumDate = computed({ get: () => form.happenedAt ? dayjs(form.happenedAt) : null, set: (value: Dayjs | null) => { form.happenedAt = value?.toISOString() || null } })
const coverItem = computed(() => items.value.find(item => item.mediaId === form.coverMediaId) || items.value[0])
const previewImages = computed(() => items.value.map(item => ({ src: item.media.path, caption: item.caption || undefined })))
const metadataDialog = reactive({ open: false, loading: false, saving: false, item: null as any, media: null as any, metadata: null as any, dateValue: null as Dayjs | null, place: null as Place | null })
const metadataStatus = computed(() => ({ pending: '等待解析', completed: '解析完成', failed: '解析失败' } as any)[metadataDialog.metadata?.status] || '尚无数据')
const cameraText = computed(() => [metadataDialog.metadata?.cameraMake, metadataDialog.metadata?.cameraModel, metadataDialog.metadata?.lensModel].filter(Boolean).join(' · ') || '未记录')
const sizeText = computed(() => metadataDialog.metadata?.width ? `${metadataDialog.metadata.width} × ${metadataDialog.metadata.height}` : '未记录')
const gpsText = computed(() => metadataDialog.metadata?.latitude != null ? `${metadataDialog.metadata.latitude.toFixed(6)}, ${metadataDialog.metadata.longitude.toFixed(6)}` : '未记录')
const hasGpsCandidate = computed(() => metadataDialog.metadata?.latitude != null && metadataDialog.metadata?.longitude != null)

function fillSlug() { if (!form.slug && form.title) form.slug = form.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '') }
function filterMoment(input: string, option: any) { return String(option?.children?.[0]?.children || '').toLowerCase().includes(input.toLowerCase()) }
function openPreview(index: number) { previewIndex.value = index; previewOpen.value = true }
function removeItem(index: number) { const [removed] = items.value.splice(index, 1); if (removed && form.coverMediaId === removed.mediaId) form.coverMediaId = items.value[0]?.mediaId || null }
function moveItem(index: number) { if (dragIndex.value < 0 || dragIndex.value === index) return; const [item] = items.value.splice(dragIndex.value, 1); items.value.splice(index, 0, item); dragIndex.value = -1 }

async function pickPhotos() {
  const selected = await openItems({ multiple: true, folder: 'album' })
  const existing = new Set(items.value.map(item => item.mediaId))
  for (const media of selected) if (!existing.has(media.id) && media.mimeType?.startsWith('image/')) items.value.push({ mediaId: media.id, sort: items.value.length, caption: '', happenedAt: null, placeId: null, place: null, momentId: null, locationVisibility: 'private', locationPrecision: 'place', locationSource: null, locationExactConfirmedAt: null, media, dateValue: null })
  if (!form.coverMediaId) form.coverMediaId = items.value[0]?.mediaId || null
}

function payload() {
  return {
    title: form.title.trim(), slug: form.slug.trim(), description: form.description.trim() || null,
    coverMediaId: form.coverMediaId, happenedAt: form.happenedAt, placeId: form.place?.id || null,
    locationVisibility: form.locationVisibility, locationPrecision: form.locationPrecision,
    locationExactConfirmedAt: form.locationVisibility === 'public' && form.locationPrecision === 'exact' ? form.locationExactConfirmedAt || new Date().toISOString() : null,
    items: items.value.map((item, index) => ({ mediaId: item.mediaId, sort: index, caption: item.caption || null, happenedAt: item.dateValue?.toISOString() || null, placeId: item.place?.id || null, momentId: item.momentId || null, locationVisibility: item.locationVisibility, locationPrecision: item.locationPrecision, locationSource: item.locationSource || null, locationExactConfirmedAt: item.locationVisibility === 'public' && item.locationPrecision === 'exact' ? item.locationExactConfirmedAt || new Date().toISOString() : null })),
  }
}

function confirmExactLocation(message: string) {
  return new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '确认公开精确位置',
      content: message,
      okText: '确认公开',
      cancelText: '返回检查',
      okType: 'danger',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}

async function ensureExactLocationConfirmed() {
  if (form.locationVisibility === 'public' && form.locationPrecision === 'exact' && !form.locationExactConfirmedAt) {
    const confirmed = await confirmExactLocation('相册主地点将以精确坐标公开，访客可以直接定位。')
    if (!confirmed) return false
    form.locationExactConfirmedAt = new Date().toISOString()
  }
  const pendingItems = items.value.filter(item => item.locationVisibility === 'public' && item.locationPrecision === 'exact' && !item.locationExactConfirmedAt)
  if (pendingItems.length) {
    const confirmed = await confirmExactLocation(`${pendingItems.length} 张照片将公开精确坐标，访客可从灯箱和后续地图定位。`)
    if (!confirmed) return false
    const confirmedAt = new Date().toISOString()
    pendingItems.forEach(item => { item.locationExactConfirmedAt = confirmedAt })
  }
  return true
}

async function persist() {
  if (!form.title.trim() || !form.slug.trim()) throw new Error('请填写相册名称和 Slug')
  if (!await ensureExactLocationConfirmed()) throw new Error('已取消精确位置公开')
  const saved = props.id ? await api.put<any>(`/albums/${props.id}`, payload()) : await api.post<any>('/albums', payload())
  if (!props.id) await router.replace(`/admin/albums/${saved.id}`)
  return saved
}
async function save() { saving.value = true; try { await persist(); toast.success('相册已保存') } catch (error: any) { toast.error(error?.message || '保存失败') } finally { saving.value = false } }
async function publish() { publishing.value = true; try { const saved = await persist(); await api.post(`/albums/${saved.id}/publish`); toast.success('相册已发布'); router.push('/admin/albums') } catch (error: any) { toast.error(error?.message || '发布失败') } finally { publishing.value = false } }
async function setPrivate() { if (!props.id) return; try { await persist(); await api.post(`/albums/${props.id}/private`); toast.success('相册已设为私密'); router.push('/admin/albums') } catch (error: any) { toast.error(error?.message || '设置失败') } }

async function openMetadata(item: any) {
  metadataDialog.open = true; metadataDialog.loading = true; metadataDialog.item = item
  try { const result = await api.get<any>(`/media/${item.mediaId}/metadata`); metadataDialog.media = result; metadataDialog.metadata = result.metadata; metadataDialog.dateValue = result.metadata?.confirmedCapturedAt ? dayjs(result.metadata.confirmedCapturedAt) : result.metadata?.capturedAt ? dayjs(result.metadata.capturedAt) : null; metadataDialog.place = result.metadata?.confirmedPlace || item.place || null }
  catch (error: any) { toast.error(error?.message || 'EXIF 加载失败') }
  finally { metadataDialog.loading = false }
}
async function confirmMetadata() { if (!metadataDialog.item) return; metadataDialog.saving = true; try { await api.put(`/media/${metadataDialog.item.mediaId}/metadata`, { capturedAt: metadataDialog.dateValue?.toISOString() || null, placeId: metadataDialog.place?.id || null }); metadataDialog.item.dateValue = metadataDialog.dateValue; metadataDialog.item.place = metadataDialog.place; metadataDialog.item.locationSource = 'exif'; metadataDialog.open = false; toast.success('EXIF 候选已确认') } catch (error: any) { toast.error(error?.message || '确认失败') } finally { metadataDialog.saving = false } }
async function retryMetadata() { if (!metadataDialog.item) return; await api.post(`/media/${metadataDialog.item.mediaId}/metadata/retry`); metadataDialog.metadata.status = 'pending'; toast.success('已重新加入解析队列') }
async function createPlaceFromExif() {
  if (!hasGpsCandidate.value) return
  try {
    const candidate = await api.get<any>('/places/provider/reverse', { longitude: metadataDialog.metadata.longitude, latitude: metadataDialog.metadata.latitude, coordinateSystem: 'wgs84' })
    const place = await api.post<Place>('/places', {
      name: candidate.name || '照片拍摄地点', address: candidate.address || null, city: candidate.city || null,
      province: candidate.province || null, country: candidate.country || '中国', type: 'poi',
      longitude: metadataDialog.metadata.longitude, latitude: metadataDialog.metadata.latitude, coordinateSystem: 'wgs84',
    })
    metadataDialog.place = place
    toast.success('已根据 EXIF GPS 创建地点候选')
  } catch (error: any) { toast.error(error?.message || '地点候选创建失败') }
}

async function load() {
  const momentResult = await api.get<any>('/moments', { page: 1, limit: 500, status: 'all' }).catch(() => ({ items: [] }))
  moments.value = momentResult.items || []
  if (!props.id) return
  const album = await api.get<any>(`/albums/admin/${props.id}`)
  Object.assign(form, { title: album.title, slug: album.slug, description: album.description || '', coverMediaId: album.coverMediaId, happenedAt: album.happenedAt, place: album.place, locationVisibility: album.locationVisibility, locationPrecision: album.locationPrecision, locationExactConfirmedAt: album.locationExactConfirmedAt })
  items.value = (album.items || []).map((item: any) => ({ ...item, mediaId: item.mediaId, media: item.media, metadata: item.media?.metadata, place: item.place || item.media?.metadata?.confirmedPlace || null, dateValue: item.happenedAt ? dayjs(item.happenedAt) : item.media?.metadata?.confirmedCapturedAt ? dayjs(item.media.metadata.confirmedCapturedAt) : null }))
}
onMounted(() => load().catch((error: any) => toast.error(error?.message || '相册加载失败')))
</script>

<style scoped>
.photo-privacy-row{display:grid;grid-template-columns:140px 140px;gap:7px}
.album-editor{width:min(1320px,100%);margin:0 auto;padding-bottom:36px}.editor-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)}.heading-copy{display:flex;min-width:0;flex-direction:column;gap:10px}.heading-copy>div{min-width:0}.heading-copy h1{overflow:hidden;margin:0;color:var(--c-text);font-size:1.38rem;text-overflow:ellipsis;white-space:nowrap}.heading-copy span{display:block;margin-top:3px;color:var(--c-text-3);font-size:.62rem}.back-link{display:flex;width:max-content;align-items:center;gap:6px;border:0;background:transparent;color:var(--c-text-3);cursor:pointer;font:inherit;font-size:.68rem}.back-link:hover{color:var(--c-primary)}.heading-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.editor-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px}.editor-main,.editor-rail{display:grid;align-content:start;gap:16px}.panel,.rail-card{border:1px solid color-mix(in srgb,var(--border) 76%,transparent);border-radius:14px;background:var(--ld-bg-card)}.panel{padding:22px}.panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.panel>header>div{display:flex;align-items:center;gap:10px}.panel>header span{display:grid;width:26px;height:26px;border-radius:50%;background:var(--c-primary-soft);color:var(--c-primary);font-size:.62rem;place-items:center}.panel h2{margin:0;color:var(--c-text);font-size:1rem}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field-grid label,.privacy-row label,.metadata-card label{display:grid;gap:7px;color:var(--c-text-2);font-size:.68rem}.field-grid .wide{grid-column:1/-1}.privacy-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.photo-list{display:grid;gap:10px}.photo-item{display:grid;grid-template-columns:24px 150px minmax(0,1fr) 36px;gap:12px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--c-bg-1);transition:border-color .18s ease,box-shadow .18s ease}.photo-item:hover{border-color:color-mix(in srgb,var(--c-primary) 36%,var(--border));box-shadow:0 8px 20px color-mix(in srgb,var(--ld-shadow) 24%,transparent)}.drag-handle{color:var(--c-text-3);cursor:grab;font-size:1.1rem}.photo-preview{position:relative;height:104px;padding:0;overflow:hidden;border:0;border-radius:9px;background:var(--c-bg-2);cursor:zoom-in}.photo-preview img{width:100%;height:100%;object-fit:cover}.photo-preview span{position:absolute;right:6px;bottom:6px;padding:3px 5px;border-radius:5px;background:rgb(0 0 0 / 54%);color:#fff;font-size:.54rem}.photo-fields{display:grid;gap:8px}.photo-meta-row{display:grid;grid-template-columns:minmax(160px,1fr) minmax(150px,1fr) auto;gap:7px}.item-place{max-width:420px}.photo-actions{display:grid;gap:6px}.photo-actions button{display:grid;width:32px;height:32px;padding:0;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--c-text-3);cursor:pointer;place-items:center}.photo-actions button:hover,.photo-actions button.active{border-color:var(--c-primary);background:var(--c-primary-soft);color:var(--c-primary)}.photo-empty{display:grid;min-height:270px;place-items:center;align-content:center;text-align:center}.photo-empty>svg{color:var(--c-primary);font-size:2.6rem}.photo-empty h3{margin:13px 0 0;color:var(--c-text)}.photo-empty p{max-width:420px;margin:7px 0 16px;color:var(--c-text-3);font-size:.7rem;line-height:1.7}.rail-card{padding:17px}.rail-card header{display:flex;justify-content:space-between;color:var(--c-text-2);font-size:.67rem}.rail-card header small{color:var(--c-primary)}.cover-preview{display:grid;aspect-ratio:4/3;margin-top:12px;overflow:hidden;border-radius:11px;background:var(--c-bg-2);color:var(--c-text-3);font-size:2rem;place-items:center}.cover-preview img{width:100%;height:100%;object-fit:cover}.rail-card p{margin:10px 0 0;color:var(--c-text-3);font-size:.62rem;line-height:1.65}.guide-card{background:linear-gradient(145deg,var(--c-primary-soft),var(--ld-bg-card))}.guide-card>svg{color:var(--c-primary);font-size:1.25rem}.guide-card h3{margin:10px 0 0;color:var(--c-text);font-size:.82rem}.metadata-card{display:grid;gap:14px}.metadata-card>img{width:100%;max-height:220px;border-radius:10px;object-fit:contain;background:var(--c-bg-2)}.metadata-card dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}.metadata-card dl div{padding:9px;border-radius:8px;background:var(--c-bg-1)}.metadata-card dt{color:var(--c-text-3);font-size:.58rem}.metadata-card dd{margin:3px 0 0;color:var(--c-text-2);font-size:.68rem}.item-place :deep(.map-shell){display:none}.item-place :deep(.picker-hint){display:none}.item-place :deep(.place-results){top:42px}@media(max-width:1000px){.editor-grid{grid-template-columns:1fr}.editor-rail{grid-template-columns:1fr 1fr}}@media(max-width:720px){.editor-heading{align-items:flex-start;flex-direction:column}.heading-actions{width:100%;justify-content:flex-start}.field-grid,.privacy-row{grid-template-columns:1fr}.field-grid .wide{grid-column:auto}.photo-item{grid-template-columns:20px 92px minmax(0,1fr)}.photo-preview{height:90px}.photo-actions{grid-column:2/-1;grid-template-columns:repeat(2,32px);justify-content:end}.photo-meta-row{grid-template-columns:1fr}.editor-rail{grid-template-columns:1fr}}
</style>
