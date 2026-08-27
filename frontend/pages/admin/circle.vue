<template>
  <div class="circle-admin admin-page-shell">
    <header class="admin-page-head"><div><span>CONTENT RESOURCES</span><h1>朋友圈</h1><p>管理 RSS / Atom 动态订阅与前台朋友圈展示。</p></div><div class="head-actions"><template v-if="activeTab === 'config'"><a-button type="primary" :loading="saving" @click="saveConfig"><Icon name="ph:floppy-disk-bold" /> 保存配置</a-button></template><template v-else><a-button type="primary" @click="openCreate"><Icon name="ph:plus-bold" /> 添加订阅源</a-button></template></div></header>
    <a-tabs v-model:activeKey="activeTab" class="circle-tabs">
      <a-tab-pane key="config" tab="配置">
        <AdminCard icon="ph:sliders-horizontal-bold" title="动态流设置" desc="控制朋友圈的标题、封面与抓取缓存。">
          <a-form layout="vertical" size="middle"><div class="form-grid"><a-form-item label="启用朋友圈"><a-switch v-model:checked="config.enabled" /></a-form-item><a-form-item label="缓存时间（秒）"><a-input-number v-model:value="config.cacheTtl" :min="60" :max="3600" /></a-form-item><a-form-item label="页面标题"><a-input v-model:value="config.title" placeholder="朋友圈" /></a-form-item><a-form-item label="页面副标题"><a-input v-model:value="config.subtitle" placeholder="和朋友们分享新鲜事" /></a-form-item></div><a-form-item label="封面组"><a-textarea v-model:value="config.coversText" :rows="4" placeholder="每行一个图片 URL，只有一张时固定使用，多张时循环随机使用" /><div class="cover-actions"><a-button size="small" @click="pickCovers"><Icon name="ph:image-square-bold" /> 从媒体库多选</a-button><span>最多 20 张，支持直接粘贴 URL。</span></div></a-form-item></a-form>
        </AdminCard>
      </a-tab-pane>
      <a-tab-pane key="sources" tab="订阅源">
        <section class="source-panel admin-table-shell"><div class="panel-toolbar"><div><strong>RSS / Atom 订阅源</strong><span>友链中已有 RSS 地址的站点会自动出现在这里，刷新即可同步新增来源。</span></div><AdminRefreshButton :loading="loading" @click="load" /></div><a-table size="small" :loading="loading" :data-source="pagedSources" :columns="columns" row-key="key" :pagination="false" :scroll="{ x: 920 }" :locale="{ emptyText: '暂无订阅源，请先在友链中填写 RSS 地址' }"><template #bodyCell="{ column, record }"><template v-if="column.key === 'source'"><div class="source-cell"><span class="source-logo"><img v-if="record.avatar" :src="record.avatar" :alt="`${record.name || '站点'} Logo`" loading="lazy" @error="onLogoError" /><Icon v-else name="ph:globe-simple-bold" /></span><div><strong>{{ record.name || '未命名站点' }}</strong><small>{{ record.url || record.rssUrl }}</small></div></div></template><template v-else-if="column.key === 'rssUrl'"><a :href="record.rssUrl" target="_blank" rel="noopener noreferrer" class="rss-link">{{ record.rssUrl }}</a></template><template v-else-if="column.key === 'enabled'"><a-switch :checked="record.enabled" checked-children="启用" un-checked-children="停用" @change="toggleSource(record, $event)" /></template><template v-else-if="column.key === 'actions'"><div class="admin-row-actions"><a-button type="link" size="small" @click="openEdit(record)"><Icon name="ph:pencil-simple-bold" /> 编辑</a-button><a-button type="link" size="small" danger @click="removeSource(record)"><Icon name="ph:trash-bold" /> 删除</a-button></div></template></template></a-table><AdminPagination v-model:current="pagination.current" :page-size="pagination.pageSize" :total="sources.length" :show-size-changer="false" @change="changePage" /></section>
      </a-tab-pane>
    </a-tabs>
    <a-modal v-model:open="sourceDialog.open" :title="sourceDialog.editing ? '编辑订阅源' : '添加订阅源'" ok-text="保存" cancel-text="取消" :confirm-loading="sourceDialog.saving" @ok="saveSource"><a-form layout="vertical" :model="sourceDialog.form"><a-form-item label="站点 URL"><div class="inspect-field"><a-input v-model:value="sourceDialog.form.url" placeholder="https://example.com" @input="markSourceField('url')" @blur="inspectSubscriptionSite(false)" @press-enter.prevent="inspectSubscriptionSite(true)" /><a-button :loading="sourceDialog.inspecting" @click="inspectSubscriptionSite(true)"><Icon v-if="!sourceDialog.inspecting" name="ph:magic-wand-bold" /> 自动识别</a-button></div><small class="inspect-hint">输入站点地址后自动识别名称、Logo 与 RSS；识别结果仍可手动修改。</small><div v-if="sourceDialog.message" class="inspect-message" :class="sourceDialog.messageType"><Icon :name="sourceDialog.messageType === 'success' ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'" /> {{ sourceDialog.message }}</div></a-form-item><a-form-item label="站点名称" required><a-input v-model:value="sourceDialog.form.name" placeholder="例如：阮一峰的网络日志" @input="markSourceField('name')" /></a-form-item><a-form-item label="RSS / Atom 地址" required><a-input v-model:value="sourceDialog.form.rssUrl" placeholder="https://example.com/feed.xml" @input="markSourceField('rssUrl')" /></a-form-item><a-form-item label="站点 Logo"><a-input v-model:value="sourceDialog.form.avatar" placeholder="Logo URL（可选）" @input="markSourceField('avatar')" /></a-form-item><a-form-item label="状态"><a-switch v-model:checked="sourceDialog.form.enabled" checked-children="启用" un-checked-children="停用" /></a-form-item></a-form></a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
type Subscription = { key: string; name: string; url: string; rssUrl: string; avatar: string; enabled: boolean }
const api = useApi(); const toast = useToast(); const { openItems } = useMediaLibrary()
const activeTab = ref('config'); const loading = ref(true); const saving = ref(false)
const config = reactive({ enabled: true, title: '朋友圈', subtitle: '和朋友们分享新鲜事', cacheTtl: 600, coversText: '', subscriptions: [] as Subscription[] })
const pagination = reactive({ current: 1, pageSize: 10 }); const sources = computed(() => config.subscriptions); const pagedSources = computed(() => sources.value.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize))
const columns = [{ title: '站点', key: 'source', width: 250 }, { title: '订阅地址', key: 'rssUrl', minWidth: 300 }, { title: '状态', key: 'enabled', width: 90 }, { title: '操作', key: 'actions', width: 150, fixed: 'right' as const }]
const emptySource = (): Omit<Subscription, 'key'> => ({ name: '', url: '', rssUrl: '', avatar: '', enabled: true })
const sourceDialog = reactive({ open: false, editing: false, index: -1, saving: false, inspecting: false, message: '', messageType: 'success' as 'success' | 'error', form: emptySource(), touched: new Set<string>(), autofilled: {} as Record<string, string> })
function normalize(item: any, index: number): Subscription { return { key: `source_${index}_${item.rssUrl || Date.now()}`, name: item.name || item.siteName || '', url: item.url || item.siteUrl || '', rssUrl: item.rssUrl || item.siteRssUrl || '', avatar: item.avatar || item.siteAvatar || '', enabled: item.enabled !== false } }
async function load() { loading.value = true; try { const result = await api.get<any>('/circle/admin/config'); Object.assign(config, { enabled: result?.enabled !== false, title: result?.title || '朋友圈', subtitle: result?.subtitle || '和朋友们分享新鲜事', cacheTtl: Number(result?.cacheTtl) || 600, coversText: Array.isArray(result?.covers) ? result.covers.join('\n') : '', subscriptions: Array.isArray(result?.subscriptions) ? result.subscriptions.map(normalize) : [] }); pagination.current = 1 } catch (error: any) { toast.error(error?.message || '加载朋友圈配置失败') } finally { loading.value = false } }
function changePage(page: number) { pagination.current = page }
function openCreate() { sourceDialog.editing = false; sourceDialog.index = -1; sourceDialog.form = emptySource(); sourceDialog.touched = new Set(); sourceDialog.autofilled = {}; sourceDialog.message = ''; sourceDialog.open = true }
function openEdit(record: Subscription) { sourceDialog.editing = true; sourceDialog.index = sources.value.findIndex((item) => item.key === record.key); sourceDialog.form = { ...record }; sourceDialog.touched = new Set(['name', 'url', 'rssUrl', 'avatar']); sourceDialog.autofilled = {}; sourceDialog.message = ''; sourceDialog.open = true }
function markSourceField(field: string) { if (field !== 'url') sourceDialog.touched.add(field) }
function normalizeHttpUrl(value: string) { const raw = value.trim(); if (!raw) return ''; return /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}` }
function onLogoError(event: Event) { const image = event.target as HTMLImageElement; if (image.dataset.fallback) image.style.display = 'none'; else { image.dataset.fallback = '1'; image.src = '/logo_64.png' } }
async function inspectSubscriptionSite(forceRequest: boolean) {
  const value = normalizeHttpUrl(sourceDialog.form.url)
  if (!value) { if (forceRequest) toast.warning('请先填写站点 URL'); return }
  try { new URL(value) } catch { if (forceRequest) toast.warning('请输入有效的站点 URL'); return }
  if (sourceDialog.inspecting) return
  sourceDialog.form.url = value; sourceDialog.inspecting = true; sourceDialog.message = ''
  try {
    const result = await api.post<any>('/friend-link/inspect-site', { url: value })
    const incoming = { name: String(result?.name || '').trim(), avatar: String(result?.avatar || '').trim(), rssUrl: String(result?.rssUrl || '').trim() }
    let filled = 0
    for (const field of ['name', 'avatar', 'rssUrl'] as const) {
      const current = String(sourceDialog.form[field] || '').trim()
      const previous = sourceDialog.autofilled[field] || ''
      if (incoming[field] && (!current || current === previous) && !sourceDialog.touched.has(field)) { sourceDialog.form[field] = incoming[field]; sourceDialog.autofilled[field] = incoming[field]; filled += 1 }
    }
    if (result?.url) sourceDialog.form.url = result.url
    sourceDialog.messageType = 'success'; sourceDialog.message = filled ? `已自动填充 ${filled} 项信息，可继续手动修改。` : '站点可访问，未发现可补充的空字段。'
  } catch (error: any) { sourceDialog.messageType = 'error'; sourceDialog.message = error?.message || '自动识别失败，请手动填写。' }
  finally { sourceDialog.inspecting = false }
}
async function saveSource() { if (!sourceDialog.form.name.trim() || !sourceDialog.form.rssUrl.trim()) return void toast.warning('站点名称和 RSS 地址不能为空'); sourceDialog.saving = true; const previous = config.subscriptions.map((item) => ({ ...item })); const item = { ...sourceDialog.form }; if (sourceDialog.editing && sourceDialog.index >= 0) config.subscriptions[sourceDialog.index] = { ...item, key: config.subscriptions[sourceDialog.index].key }; else config.subscriptions.push({ ...item, key: `source_${Date.now()}` }); try { await persist(); sourceDialog.open = false; toast.success('订阅源已保存') } catch (error: any) { config.subscriptions.splice(0, config.subscriptions.length, ...previous); toast.error(error?.message || '保存失败') } finally { sourceDialog.saving = false } }
async function toggleSource(record: Subscription, enabled: boolean) { const previous = record.enabled; record.enabled = enabled; try { await persist(); toast.success(enabled ? '订阅源已启用' : '订阅源已停用') } catch (error: any) { record.enabled = previous; toast.error(error?.message || '状态更新失败') } }
function removeSource(record: Subscription) { Modal.confirm({ title: '删除订阅源？', content: `确认移除「${record.name || record.rssUrl}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: async () => { const index = sources.value.findIndex((item) => item.key === record.key); if (index < 0) return; const removed = config.subscriptions.splice(index, 1); try { await persist(); toast.success('订阅源已删除') } catch (error: any) { config.subscriptions.splice(index, 0, ...removed); toast.error(error?.message || '删除失败') } } }) }
async function persist() { await api.put('/circle/admin/config', { enabled: config.enabled, title: config.title, subtitle: config.subtitle, covers: config.coversText.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean), cacheTtl: config.cacheTtl, subscriptions: config.subscriptions.map(({ key, ...item }) => item) }) }
async function saveConfig() { saving.value = true; try { await persist(); toast.success('朋友圈配置已保存') } catch (error: any) { toast.error(error?.message || '保存配置失败') } finally { saving.value = false } }
async function pickCovers() { const items = await openItems({ multiple: true, folder: 'cover' }); const urls = items.map((item: any) => String(item.path || item.url || '').trim()).filter(Boolean); if (!urls.length) return; const existing = config.coversText.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean); config.coversText = Array.from(new Set([...existing, ...urls])).slice(0, 20).join('\n') }
onMounted(load); useHead({ title: '朋友圈管理' })
</script>

<style scoped>
.circle-admin { width: min(1160px, 100%); margin: 0 auto; }
.head-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.circle-tabs :deep(.ant-tabs-nav) { margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.cover-actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; color: var(--c-text-3); font-size: .64rem; }
.source-panel { overflow: hidden; }
.panel-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
.panel-toolbar > div { display: grid; gap: 4px; }
.panel-toolbar strong { color: var(--c-text); font-size: .82rem; }
.panel-toolbar span { color: var(--c-text-3); font-size: .62rem; }
.source-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.source-cell > div { display: grid; min-width: 0; gap: 3px; }
.source-cell strong, .source-cell small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-cell strong { color: var(--c-text); font-size: .74rem; }
.source-cell small { color: var(--c-text-3); font-size: .58rem; }
.rss-link { display: block; max-width: 460px; overflow: hidden; color: var(--c-primary); font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
.source-logo { display: grid; width: 34px; height: 34px; flex: 0 0 34px; overflow: hidden; border: 1px solid var(--border); border-radius: 9px; background: var(--c-bg-2); color: var(--c-primary); place-items: center; }
.source-logo img { width: 100%; height: 100%; object-fit: cover; }
.inspect-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.inspect-hint { display: block; margin-top: 7px; color: var(--c-text-3); font-size: .6rem; line-height: 1.5; }
.inspect-message { display: flex; align-items: center; gap: 5px; margin-top: 7px; font-size: .62rem; line-height: 1.5; }
.inspect-message.success { color: #2b8b71; }
.inspect-message.error { color: #c65468; }
@media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } .head-actions { width: 100%; justify-content: flex-start; } .panel-toolbar { align-items: flex-start; flex-direction: column; } .cover-actions { align-items: flex-start; flex-direction: column; } }
</style>
