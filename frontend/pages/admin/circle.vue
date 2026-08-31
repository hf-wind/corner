<template>
  <main class="wind-admin admin-page-shell">
    <header class="admin-page-head compact-head">
      <div><span>CONTENT CHANNEL</span><h1>风讯角</h1><p>配置公开入口，并管理风讯分类与 RSS 来源。</p></div>
      <div class="head-actions">
        <div class="mode-switch" role="tablist" aria-label="管理区域">
          <button type="button" :class="{ active: mode === 'sources' }" @click="mode = 'sources'"><Icon name="ph:rss-simple-bold" /><span>来源</span></button>
          <button type="button" :class="{ active: mode === 'config' }" @click="mode = 'config'"><Icon name="ph:sliders-horizontal-bold" /><span>设置</span></button>
        </div>
        <a-button v-if="mode === 'sources'" type="primary" @click="openCreate"><Icon name="ph:plus-bold" /> 添加来源</a-button>
        <a-button v-else type="primary" :loading="saving" @click="saveConfig"><Icon name="ph:floppy-disk-bold" /> 保存</a-button>
      </div>
    </header>

    <section v-if="mode === 'config'" class="config-layout">
      <div class="enable-row">
        <span class="setting-icon"><Icon name="ph:wind-bold" /></span>
        <div><strong>公开风讯角</strong><small>关闭后前台菜单会自动隐藏，已保存的来源不受影响。</small></div>
        <a-switch v-model:checked="config.enabled" />
      </div>
      <a-form layout="vertical" class="config-form">
        <a-form-item label="页面标题"><a-input v-model:value="config.title" placeholder="风讯角" /></a-form-item>
        <a-form-item label="页面副标题"><a-input v-model:value="config.subtitle" placeholder="从不同的角落，收拢值得读完的文字。" /></a-form-item>
        <a-form-item label="刷新缓存"><a-input-number v-model:value="config.cacheTtl" :min="60" :max="3600" addon-after="秒" /></a-form-item>
      </a-form>
    </section>

    <template v-else>
      <div class="source-filter">
        <button v-for="tab in sourceTabs" :key="tab.key" type="button" :class="{ active: sourceTab === tab.key }" @click="sourceTab = tab.key">
          <Icon :name="tab.icon" /><span>{{ tab.label }}</span><small>{{ tab.count }}</small>
        </button>
        <AdminRefreshButton :loading="loading" @click="load" />
      </div>

      <section class="source-list" :class="{ loading }">
        <div class="source-list-head"><span>站点</span><span>分类</span><span>状态</span><span>操作</span></div>
        <div v-if="loading && !pagedSources.length" class="source-empty"><Icon name="ph:circle-notch-bold" class="spin" /> 正在读取来源</div>
        <div v-else-if="!pagedSources.length" class="source-empty"><Icon name="ph:rss-simple-bold" /> 当前分类暂无来源</div>
        <article v-for="record in pagedSources" v-else :key="record.key" class="source-row">
          <div class="source-site">
            <span class="source-logo"><img v-if="record.avatar" :src="record.avatar" alt="" referrerpolicy="no-referrer" @error="onLogoError" /><Icon v-else name="ph:globe-simple-bold" /></span>
            <div><strong>{{ record.name || '未命名站点' }}<em v-if="record.kind === 'friend'">自动同步</em><em v-else-if="record.origin === 'default'">默认</em></strong><a :href="record.rssUrl" target="_blank" rel="noopener noreferrer">{{ record.rssUrl }}</a></div>
          </div>
          <span class="source-category"><Icon :name="categoryIcon(record)" />{{ categoryLabel(record) }}</span>
          <a-switch v-if="record.kind !== 'friend'" :checked="record.enabled" size="small" @change="toggleSource(record, $event)" />
          <span v-else class="sync-state"><i />跟随友链</span>
          <div class="row-actions">
            <AppLink v-if="record.kind === 'friend'" to="/admin/friends" title="前往友链管理"><Icon name="ph:arrow-square-out-bold" /></AppLink>
            <template v-else><button type="button" title="编辑" @click="openEdit(record)"><Icon name="ph:pencil-simple-bold" /></button><button type="button" class="danger" title="删除" @click="removeSource(record)"><Icon name="ph:trash-bold" /></button></template>
          </div>
        </article>
      </section>
      <AdminPagination v-model:current="pagination.current" :page-size="pagination.pageSize" :total="filteredSources.length" :show-size-changer="false" @change="changePage" />
    </template>

    <a-modal v-model:open="dialog.open" :title="dialog.editing ? '编辑 RSS 来源' : '添加 RSS 来源'" ok-text="保存" cancel-text="取消" :confirm-loading="dialog.saving" @ok="saveSource">
      <a-form layout="vertical" :model="dialog.form">
        <a-form-item label="站点地址"><div class="inspect-field"><a-input v-model:value="dialog.form.url" placeholder="https://example.com" @input="markField('url')" @blur="inspectSite(false)" @press-enter.prevent="inspectSite(true)" /><a-button :loading="dialog.inspecting" @click="inspectSite(true)"><Icon name="ph:magic-wand-bold" /> 识别</a-button></div><small class="form-hint">自动识别名称、站点图标与 RSS 地址。</small><div v-if="dialog.message" class="inspect-message" :class="dialog.messageType"><Icon :name="dialog.messageType === 'success' ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'" />{{ dialog.message }}</div></a-form-item>
        <a-form-item label="站点名称" required><a-input v-model:value="dialog.form.name" @input="markField('name')" /></a-form-item>
        <a-form-item label="RSS / Atom 地址" required><a-input v-model:value="dialog.form.rssUrl" @input="markField('rssUrl')" /></a-form-item>
        <a-form-item label="前台分类" required><a-select v-model:value="dialog.form.section"><a-select-option value="thought">思考</a-select-option><a-select-option value="news">新闻</a-select-option><a-select-option value="tech">科技</a-select-option><a-select-option value="ai">AI</a-select-option></a-select></a-form-item>
        <a-form-item label="站点图标"><a-input v-model:value="dialog.form.avatar" placeholder="可选" @input="markField('avatar')" /></a-form-item>
        <a-form-item label="启用来源"><a-switch v-model:checked="dialog.form.enabled" /></a-form-item>
      </a-form>
    </a-modal>
  </main>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
type Subscription = { key: string; name: string; url: string; rssUrl: string; avatar: string; section?: string; kind?: 'subscription' | 'friend'; origin?: 'default' | 'manual'; enabled: boolean }
const api = useApi()
const toast = useToast()
const mode = ref<'sources' | 'config'>('sources')
const sourceTab = ref('all')
const loading = ref(true)
const saving = ref(false)
const config = reactive({ enabled: true, title: '风讯角', subtitle: '从不同的角落，收拢值得读完的文字。', cacheTtl: 600, subscriptions: [] as Subscription[] })
const pagination = reactive({ current: 1, pageSize: 9 })
const sources = computed(() => config.subscriptions)
const sourceTabs = computed(() => [
  { key: 'all', label: '全部', icon: 'ph:squares-four-bold', count: sources.value.length },
  { key: 'friends', label: '友链', icon: 'ph:handshake-bold', count: sources.value.filter(item => item.kind === 'friend').length },
  { key: 'thought', label: '思考', icon: 'ph:lightbulb-filament-bold', count: sources.value.filter(item => item.kind !== 'friend' && item.section === 'thought').length },
  { key: 'news', label: '新闻', icon: 'ph:newspaper-bold', count: sources.value.filter(item => item.kind !== 'friend' && item.section === 'news').length },
  { key: 'tech', label: '科技', icon: 'ph:cpu-bold', count: sources.value.filter(item => item.kind !== 'friend' && item.section === 'tech').length },
  { key: 'ai', label: 'AI', icon: 'ph:sparkle-bold', count: sources.value.filter(item => item.kind !== 'friend' && item.section === 'ai').length },
])
const filteredSources = computed(() => sourceTab.value === 'all' ? sources.value : sources.value.filter(item => sourceTab.value === 'friends' ? item.kind === 'friend' : item.kind !== 'friend' && item.section === sourceTab.value))
const pagedSources = computed(() => filteredSources.value.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize))
const emptySource = (): Omit<Subscription, 'key'> => ({ name: '', url: '', rssUrl: '', avatar: '', section: 'news', kind: 'subscription', origin: 'manual', enabled: true })
const dialog = reactive({ open: false, editing: false, index: -1, saving: false, inspecting: false, message: '', messageType: 'success' as 'success' | 'error', form: emptySource(), touched: new Set<string>(), autofilled: {} as Record<string, string> })

function normalize(item: any, index: number): Subscription { return { key: `source_${index}_${item.rssUrl || Date.now()}`, name: item.name || item.siteName || '', url: item.url || item.siteUrl || '', rssUrl: item.rssUrl || item.siteRssUrl || '', avatar: item.avatar || item.siteAvatar || '', section: item.section || 'news', kind: item.kind === 'friend' ? 'friend' : 'subscription', origin: item.origin === 'default' ? 'default' : item.origin === 'manual' ? 'manual' : undefined, enabled: item.enabled !== false } }
async function load() { loading.value = true; try { const result = await api.get<any>('/circle/admin/config'); Object.assign(config, { enabled: result?.enabled !== false, title: result?.title || '风讯角', subtitle: result?.subtitle || '从不同的角落，收拢值得读完的文字。', cacheTtl: Number(result?.cacheTtl) || 600, subscriptions: Array.isArray(result?.subscriptions) ? result.subscriptions.map(normalize) : [] }); pagination.current = 1 } catch (error: any) { toast.error(error?.message || '加载风讯角失败') } finally { loading.value = false } }
function categoryLabel(item: Subscription) { if (item.kind === 'friend') return '友链'; return ({ thought: '思考', news: '新闻', tech: '科技', ai: 'AI' } as Record<string, string>)[item.section || ''] || '新闻' }
function categoryIcon(item: Subscription) { if (item.kind === 'friend') return 'ph:handshake-bold'; return ({ thought: 'ph:lightbulb-filament-bold', news: 'ph:newspaper-bold', tech: 'ph:cpu-bold', ai: 'ph:sparkle-bold' } as Record<string, string>)[item.section || ''] || 'ph:newspaper-bold' }
function changePage(page: number) { pagination.current = page }
function openCreate() { dialog.editing = false; dialog.index = -1; dialog.form = emptySource(); dialog.touched = new Set(); dialog.autofilled = {}; dialog.message = ''; dialog.open = true }
function openEdit(record: Subscription) { dialog.editing = true; dialog.index = sources.value.findIndex(item => item.key === record.key); dialog.form = { ...record }; dialog.touched = new Set(['name', 'url', 'rssUrl', 'avatar']); dialog.autofilled = {}; dialog.message = ''; dialog.open = true }
function markField(field: string) { if (field !== 'url') dialog.touched.add(field) }
function normalizeUrl(value: string) { const raw = value.trim(); return !raw || /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}` }
function onLogoError(event: Event) { (event.target as HTMLImageElement).style.display = 'none' }
async function inspectSite(force: boolean) { const value = normalizeUrl(dialog.form.url); if (!value) { if (force) toast.warning('请先填写站点地址'); return } try { new URL(value) } catch { if (force) toast.warning('请输入有效地址'); return } if (dialog.inspecting) return; dialog.form.url = value; dialog.inspecting = true; dialog.message = ''; try { const result = await api.post<any>('/friend-link/inspect-site', { url: value }); const incoming = { name: String(result?.name || '').trim(), avatar: String(result?.avatar || '').trim(), rssUrl: String(result?.rssUrl || '').trim() }; let filled = 0; for (const field of ['name', 'avatar', 'rssUrl'] as const) { const current = String(dialog.form[field] || '').trim(); if (incoming[field] && (!current || current === dialog.autofilled[field]) && !dialog.touched.has(field)) { dialog.form[field] = incoming[field]; dialog.autofilled[field] = incoming[field]; filled++ } } dialog.messageType = 'success'; dialog.message = filled ? `已识别并填充 ${filled} 项` : '站点可访问，请确认 RSS 地址' } catch (error: any) { dialog.messageType = 'error'; dialog.message = error?.message || '识别失败，请手动填写' } finally { dialog.inspecting = false } }
async function persist() { await api.put('/circle/admin/config', { enabled: config.enabled, title: config.title, subtitle: config.subtitle, cacheTtl: config.cacheTtl, subscriptions: config.subscriptions.map(({ key, ...item }) => item) }) }
async function saveConfig() { saving.value = true; try { await persist(); toast.success('风讯角设置已保存') } catch (error: any) { toast.error(error?.message || '保存失败') } finally { saving.value = false } }
async function saveSource() { if (!dialog.form.name.trim() || !dialog.form.rssUrl.trim()) return void toast.warning('名称和 RSS 地址不能为空'); dialog.saving = true; const previous = config.subscriptions.map(item => ({ ...item })); const item = { ...dialog.form, kind: 'subscription' as const, origin: dialog.form.origin || 'manual' as const }; if (dialog.editing && dialog.index >= 0) config.subscriptions[dialog.index] = { ...item, key: config.subscriptions[dialog.index].key }; else config.subscriptions.push({ ...item, key: `source_${Date.now()}` }); try { await persist(); dialog.open = false; toast.success('RSS 来源已保存') } catch (error: any) { config.subscriptions.splice(0, config.subscriptions.length, ...previous); toast.error(error?.message || '保存失败') } finally { dialog.saving = false } }
async function toggleSource(record: Subscription, enabled: boolean) { const previous = record.enabled; record.enabled = enabled; try { await persist(); toast.success(enabled ? '来源已启用' : '来源已停用') } catch (error: any) { record.enabled = previous; toast.error(error?.message || '更新失败') } }
function removeSource(record: Subscription) { Modal.confirm({ title: '移除 RSS 来源？', content: `将移除「${record.name}」，不会影响原站内容。`, okText: '移除', okType: 'danger', cancelText: '取消', onOk: async () => { const index = sources.value.findIndex(item => item.key === record.key); const removed = config.subscriptions.splice(index, 1); try { await persist(); toast.success('来源已移除') } catch (error: any) { config.subscriptions.splice(index, 0, ...removed); toast.error(error?.message || '移除失败') } } }) }
watch(sourceTab, () => { pagination.current = 1 })
onMounted(load)
useHead({ title: '风讯角管理' })
</script>

<style scoped>
.wind-admin{width:min(1120px,100%);margin:0 auto}.compact-head{align-items:center;padding-bottom:15px}.compact-head h1{margin-top:3px}.head-actions{display:flex;align-items:center;gap:9px}.mode-switch{display:flex;padding:3px;border:1px solid var(--border);border-radius:7px;background:var(--c-bg-2)}.mode-switch button{display:flex;align-items:center;gap:5px;padding:6px 10px;border:0;border-radius:5px;background:transparent;color:var(--c-text-3);cursor:pointer;font:inherit;font-size:.67rem}.mode-switch button.active{background:var(--ld-bg-card);color:var(--c-primary);box-shadow:0 2px 8px color-mix(in srgb,var(--ld-shadow) 40%,transparent)}.config-layout{width:min(760px,100%);margin-top:18px}.enable-row{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:12px;padding:15px 0 20px;border-bottom:1px solid var(--border)}.setting-icon{display:grid;width:38px;height:38px;border-radius:7px;background:var(--c-primary-soft);color:var(--c-primary);place-items:center}.enable-row div{display:grid;gap:3px}.enable-row strong{font-size:.8rem}.enable-row small,.form-hint{color:var(--c-text-3);font-size:.61rem}.config-form{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;margin-top:20px}.config-form :deep(.ant-form-item:nth-child(3)){grid-column:1/-1}.source-filter{display:flex;align-items:center;gap:3px;margin-top:14px;padding-bottom:10px;border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none}.source-filter button{display:flex;flex:0 0 auto;align-items:center;gap:5px;padding:7px 9px;border:0;border-radius:6px;background:transparent;color:var(--c-text-3);cursor:pointer;font:inherit;font-size:.65rem}.source-filter button.active,.source-filter button:hover{background:var(--c-primary-soft);color:var(--c-primary)}.source-filter small{font:.53rem var(--font-mono);opacity:.7}.source-filter :deep(.admin-refresh-button){margin-left:auto}.source-list{margin-top:7px}.source-list-head,.source-row{display:grid;grid-template-columns:minmax(320px,1fr) 100px 110px 76px;align-items:center;gap:14px}.source-list-head{padding:8px 12px;color:var(--c-text-3);font-size:.57rem}.source-row{min-height:62px;padding:10px 12px;border-bottom:1px solid color-mix(in srgb,var(--border) 72%,transparent);transition:background-color .18s}.source-row:hover{background:color-mix(in srgb,var(--c-primary-soft) 20%,transparent)}.source-site{display:flex;align-items:center;gap:10px;min-width:0}.source-logo{display:grid;width:34px;height:34px;flex:0 0 34px;overflow:hidden;border:1px solid var(--border);border-radius:7px;background:var(--c-bg-2);color:var(--c-primary);place-items:center}.source-logo img{width:100%;height:100%;object-fit:cover}.source-site>div{display:grid;min-width:0;gap:4px}.source-site strong{display:flex;align-items:center;gap:6px;font-size:.72rem}.source-site em{padding:2px 5px;border-radius:4px;background:var(--c-primary-soft);color:var(--c-primary);font-size:.5rem;font-style:normal;font-weight:600}.source-site a{overflow:hidden;color:var(--c-text-3);font-size:.56rem;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}.source-category,.sync-state{display:flex;align-items:center;gap:5px;color:var(--c-text-2);font-size:.62rem}.source-category :deep(svg){color:var(--c-primary)}.sync-state i{width:6px;height:6px;border-radius:50%;background:#3d9b78}.row-actions{display:flex;justify-content:flex-end;gap:3px}.row-actions button,.row-actions a{display:grid;width:28px;height:28px;border:0;border-radius:5px;background:transparent;color:var(--c-text-3);cursor:pointer;place-items:center}.row-actions button:hover,.row-actions a:hover{background:var(--c-primary-soft);color:var(--c-primary)}.row-actions .danger:hover{background:color-mix(in srgb,#d85d6f 10%,transparent);color:#d85d6f}.source-empty{display:flex;min-height:260px;align-items:center;justify-content:center;gap:7px;color:var(--c-text-3);font-size:.68rem}.spin{animation:spin 1s linear infinite}.inspect-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.form-hint{display:block;margin-top:6px}.inspect-message{display:flex;align-items:center;gap:5px;margin-top:6px;font-size:.61rem}.inspect-message.success{color:#2f8e70}.inspect-message.error{color:#c65468}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:760px){.compact-head{align-items:flex-start}.head-actions{width:100%;justify-content:space-between}.source-list-head{display:none}.source-row{grid-template-columns:minmax(0,1fr) auto;gap:9px}.source-site{grid-column:1/-1}.source-category,.sync-state{grid-row:2}.row-actions{grid-column:2;grid-row:2}.config-form{grid-template-columns:1fr}.config-form :deep(.ant-form-item:nth-child(3)){grid-column:auto}}
</style>
