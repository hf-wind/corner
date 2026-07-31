<template>
  <div class="album-admin">
    <header class="admin-heading">
      <div><h1>相册</h1><p>编排照片、确认 EXIF，并控制每一处时间与地点如何被看见。</p></div>
      <a-button type="primary" @click="router.push('/admin/albums/create')"><Icon name="ph:plus-bold" /> 新建相册</a-button>
    </header>
    <div class="album-toolbar">
      <a-segmented v-model:value="filter.status" :options="statusOptions" @change="resetAndLoad" />
      <a-input-search v-model:value="filter.search" allow-clear placeholder="搜索相册名称或说明" @search="resetAndLoad" />
    </div>
    <a-spin :spinning="loading">
      <div v-if="items.length" class="album-grid">
        <article v-for="album in items" :key="album.id" class="album-card">
          <button type="button" class="album-cover" @click="router.push(`/admin/albums/${album.id}`)">
            <img v-if="album.coverMedia?.path" :src="mediaUrl(album.coverMedia.path)" :alt="album.title">
            <Icon v-else name="ph:images-square" />
            <span>{{ album._count?.items || 0 }} PHOTOS</span>
          </button>
          <div class="album-body">
            <div class="album-meta"><a-badge :status="album.status === 'published' ? 'success' : 'default'" :text="statusText(album.status)" /><span>{{ formatDate(album.happenedAt || album.updatedAt) }}</span></div>
            <h2>{{ album.title }}</h2><p>{{ album.description || '这一册还没有写下说明。' }}</p>
            <div class="album-actions"><a-button type="link" @click="router.push(`/admin/albums/${album.id}`)">编辑</a-button><a-button v-if="album.status === 'published'" type="link" @click="router.push(`/albums/${album.slug}`)">查看</a-button><a-button type="link" danger @click="remove(album)">删除</a-button></div>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state"><Icon name="ph:images-square" /><h2>相册架还是空的</h2><p>从一组照片开始，把零散的时刻编成一册。</p><a-button type="primary" @click="router.push('/admin/albums/create')">新建第一本相册</a-button></div>
    </a-spin>
    <div v-if="totalPages > 1" class="pagination"><a-pagination v-model:current="page" :total="total" :page-size="limit" @change="load" /></div>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

const api = useApi()
const toast = useToast()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const items = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const limit = 12
const filter = reactive({ status: 'all', search: '' })
const statusOptions = [{ label: '全部', value: 'all' }, { label: '已发布', value: 'published' }, { label: '私密', value: 'private' }, { label: '草稿', value: 'draft' }]

function formatDate(value?: string) { return value ? value.slice(0, 10).replaceAll('-', '.') : '未设时间' }
function statusText(status: string) { return status === 'published' ? '已发布' : status === 'private' ? '私密' : '草稿' }
function resetAndLoad() { page.value = 1; void load() }
async function load() {
  loading.value = true
  try {
    const res = await api.get<any>('/albums/admin', { page: page.value, limit, ...filter })
    items.value = res.items || []; total.value = res.total || 0; totalPages.value = res.totalPages || 1
  } catch { items.value = []; total.value = 0 }
  finally { loading.value = false }
}
function remove(album: any) {
  Modal.confirm({
    title: '删除相册', content: `确认删除「${album.title}」？媒体库中的原图不会被删除。`, okType: 'danger', okText: '删除', cancelText: '取消',
    onOk: async () => { try { await api.delete(`/albums/${album.id}`); toast.success('相册已删除'); await load() } catch (error: any) { toast.error(error?.message || '删除失败') } },
  })
}
onMounted(load)
useHead({ title: '相册管理' })
</script>

<style scoped>
.album-admin{width:min(1220px,100%);margin:0 auto}.admin-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.admin-heading span{color:var(--c-primary);font-size:.58rem;font-weight:700;letter-spacing:.17em}.admin-heading h1{margin:5px 0 0;color:var(--c-text);font-size:1.55rem}.admin-heading p{margin:5px 0 0;color:var(--c-text-3);font-size:.72rem}.album-toolbar{display:grid;grid-template-columns:auto minmax(220px,360px);justify-content:space-between;gap:12px;margin-bottom:16px}.album-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.album-card{overflow:hidden;border:1px solid color-mix(in srgb,var(--border) 75%,transparent);border-radius:15px;background:var(--ld-bg-card);box-shadow:0 8px 26px color-mix(in srgb,var(--ld-shadow) 24%,transparent);transition:transform .2s ease,box-shadow .2s ease}.album-card:hover{box-shadow:0 15px 38px color-mix(in srgb,var(--ld-shadow) 34%,transparent);transform:translateY(-3px)}.album-cover{position:relative;display:grid;width:100%;aspect-ratio:4/3;padding:0;overflow:hidden;border:0;background:var(--c-bg-2);color:var(--c-primary);cursor:pointer;font-size:2.3rem;place-items:center}.album-cover img{width:100%;height:100%;object-fit:cover;transition:transform .35s ease}.album-card:hover .album-cover img{transform:scale(1.035)}.album-cover span{position:absolute;right:10px;bottom:9px;padding:4px 7px;border-radius:6px;background:rgb(8 10 14 / 62%);color:#fff;font-size:.52rem;letter-spacing:.12em;backdrop-filter:blur(8px)}.album-body{padding:15px}.album-meta{display:flex;align-items:center;justify-content:space-between;color:var(--c-text-3);font-size:.59rem}.album-body h2{margin:9px 0 0;overflow:hidden;color:var(--c-text);font-size:1rem;text-overflow:ellipsis;white-space:nowrap}.album-body p{display:-webkit-box;min-height:38px;margin:6px 0 0;overflow:hidden;color:var(--c-text-3);font-size:.65rem;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.album-actions{display:flex;justify-content:flex-end;margin-top:9px;padding-top:7px;border-top:1px solid color-mix(in srgb,var(--border) 65%,transparent)}.empty-state{display:grid;min-height:420px;place-items:center;align-content:center;text-align:center}.empty-state>svg{color:var(--c-primary);font-size:3rem}.empty-state h2{margin:14px 0 0;color:var(--c-text)}.empty-state p{margin:6px 0 17px;color:var(--c-text-3);font-size:.72rem}.pagination{display:flex;justify-content:center;margin-top:20px}@media(max-width:980px){.album-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.admin-heading{align-items:flex-start;flex-direction:column}.album-toolbar{grid-template-columns:1fr}.album-grid{grid-template-columns:1fr}}
</style>
