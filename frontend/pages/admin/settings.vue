<template>
  <div class="settings-page">
    <a-tabs v-model:activeKey="tab" size="small">
      <a-tab-pane key="basic" tab="基本设置" />
      <a-tab-pane key="email" tab="邮件配置" />
      <a-tab-pane key="music" tab="音乐播放器" />
    </a-tabs>

    <div v-show="tab === 'basic'" class="tab-body">
      <a-space direction="vertical" :size="16" style="width:100%">
        <AdminCard
          icon="ph:house-bold"
          title="站点信息"
          desc="站点标题、描述与关键词"
        >
          <a-form labelAlign="left" size="middle" :label-col="{ style: { width: '88px' } }">
            <a-form-item label="标题">
              <a-input v-model:value="settings.site_title" @blur="saveSetting('site_title')" />
            </a-form-item>
            <a-form-item label="描述">
              <a-textarea v-model:value="settings.site_description" :rows="3" @blur="saveSetting('site_description')" />
            </a-form-item>
            <a-form-item label="关键词">
              <a-input v-model:value="keywordText" placeholder="逗号分隔" @blur="saveKeywords" />
            </a-form-item>
          </a-form>
        </AdminCard>

        <AdminCard
          icon="ph:upload-bold"
          title="上传文件"
          desc="新上传文件的命名方式"
        >
          <a-form labelAlign="left" size="middle" :label-col="{ style: { width: '108px' } }">
            <a-form-item label="文件命名">
              <a-select v-model:value="mediaNaming" style="width:200px" @change="saveMediaNaming">
                <a-select-option value="timestamp">时间戳（默认）</a-select-option>
                <a-select-option value="uuid">UUID</a-select-option>
                <a-select-option value="original">原始文件名</a-select-option>
              </a-select>
              <div class="hint">上传文件时的命名方式，仅对新上传的文件生效</div>
            </a-form-item>
          </a-form>
        </AdminCard>
      </a-space>
    </div>

    <div v-show="tab === 'email'" class="tab-body">
      <AdminCard
        icon="ph:envelope-bold"
        title="邮件配置"
        desc="SMTP 服务器、发信人与测试发送"
      >
          <a-form labelAlign="left" size="middle" :label-col="{ style: { width: '108px' } }">
          <a-form-item label="启用邮件">
            <a-switch v-model:checked="email.email_enabled" @change="saveEmailSetting('email_enabled')" />
          </a-form-item>
          <a-form-item label="SMTP服务器">
            <a-input v-model:value="email.email_smtp_host" placeholder="smtp.qq.com" @blur="saveEmailSetting('email_smtp_host')" />
          </a-form-item>
          <a-form-item label="端口">
            <a-input-number v-model:value="email.email_smtp_port" :min="1" :max="65535" style="width:120px" @blur="saveEmailSetting('email_smtp_port')" />
          </a-form-item>
          <a-form-item label="SSL加密">
            <a-switch v-model:checked="email.email_smtp_secure" @change="saveEmailSetting('email_smtp_secure')" />
          </a-form-item>
          <a-form-item label="发信地址">
            <a-input v-model:value="email.email_smtp_user" placeholder="1833079849@qq.com" @blur="saveEmailSetting('email_smtp_user')" />
          </a-form-item>
          <a-form-item label="SMTP密钥">
            <div class="secret-field">
              <a-input-password v-model:value="email.email_smtp_pass" autocomplete="new-password" placeholder="已配置则留空，输入新密钥可替换" @input="emailPasswordDirty = true" />
              <a-button :disabled="!emailPasswordDirty || !email.email_smtp_pass.trim()" @click="saveEmailPassword">更新密钥</a-button>
            </div>
            <div class="hint">密钥只会在点击“更新密钥”后提交，切换页面不会自动保存。</div>
          </a-form-item>
          <a-form-item label="显示名称">
            <a-input v-model:value="email.email_from_name" placeholder="风隅随笔" @blur="saveEmailSetting('email_from_name')" />
          </a-form-item>
          <a-form-item label="发信人地址">
            <a-input v-model:value="email.email_from_address" placeholder="1833079849@qq.com" @blur="saveEmailSetting('email_from_address')" />
          </a-form-item>
          <a-form-item label="站点URL">
            <a-input v-model:value="email.site_url" placeholder="https://your-domain.com" @blur="saveEmailSetting('site_url')" />
            <div class="hint">用于邮件模板中的「查看详情」链接，请填写完整URL，如 https://your-domain.com</div>
          </a-form-item>
          <a-form-item label="测试发送">
            <a-input v-model:value="emailTestTo" placeholder="输入测试邮箱" style="width:200px;margin-right:8px" />
            <a-button type="primary" :loading="emailTesting" @click="testEmail">发送测试</a-button>
          </a-form-item>
        </a-form>
      </AdminCard>
    </div>

    <div v-show="tab === 'music'" class="tab-body">
      <AdminCard
        icon="ph:music-notes-bold"
        title="音乐播放器"
        desc="播放器行为、默认音源与歌单管理"
      >
        <a-spin :spinning="musicLoading">
          <a-form labelAlign="left" size="middle" :label-col="{ style: { width: '108px' } }">
            <a-form-item label="启用播放器">
              <a-switch v-model:checked="music.music_enabled" />
            </a-form-item>
            <a-form-item label="自动播放">
              <a-switch v-model:checked="music.music_autoplay" />
              <div class="hint">受浏览器策略限制，可能需用户先点一次页面</div>
            </a-form-item>
            <a-form-item label="默认音量">
              <a-slider v-model:value="volumePercent" :min="0" :max="100" style="max-width:240px" />
            </a-form-item>
            <a-form-item label="Meting API">
              <a-input v-model:value="music.music_api" placeholder="https://api.i-meto.com/meting/api" />
            </a-form-item>
            <a-form-item label="默认平台">
              <a-select v-model:value="music.music_server" style="width:160px">
                <a-select-option value="netease">网易云</a-select-option>
                <a-select-option value="tencent">QQ 音乐</a-select-option>
                <a-select-option value="kugou">酷狗</a-select-option>
                <a-select-option value="kuwo">酷我</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="类型">
              <a-select v-model:value="music.music_type" style="width:160px">
                <a-select-option value="playlist">歌单</a-select-option>
                <a-select-option value="album">专辑</a-select-option>
                <a-select-option value="song">单曲</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="默认 ID">
              <a-input v-model:value="music.music_id" placeholder="歌单/专辑/歌曲 ID" />
            </a-form-item>
            <a-form-item label="缓存 TTL(秒)">
              <a-input-number v-model:value="music.music_cache_ttl" :min="60" :max="86400" style="width:160px" />
            </a-form-item>
            <a-form-item label="歌单列表">
              <div class="playlist-editor">
                <div v-for="(p, i) in music.music_playlists" :key="p.key" class="playlist-row"
                  :class="{ dragging: draggedPlaylistIndex === i }" @dragover.prevent @drop="dropPlaylist(i)">
                  <button class="playlist-drag" type="button" draggable="true" title="拖动排序" aria-label="拖动排序"
                    @dragstart="startPlaylistDrag(i, $event)" @dragend="draggedPlaylistIndex = null"><Icon name="ph:dots-six-vertical-bold" /></button>
                  <a-input v-model:value="p.name" placeholder="名称" style="width:100px" />
                  <a-select v-model:value="p.server" style="width:100px">
                    <a-select-option value="netease">网易云</a-select-option>
                    <a-select-option value="tencent">QQ</a-select-option>
                    <a-select-option value="kugou">酷狗</a-select-option>
                    <a-select-option value="kuwo">酷我</a-select-option>
                  </a-select>
                  <a-select v-model:value="p.type" style="width:90px">
                    <a-select-option value="playlist">歌单</a-select-option>
                    <a-select-option value="album">专辑</a-select-option>
                    <a-select-option value="song">单曲</a-select-option>
                  </a-select>
                  <a-input v-model:value="p.id" placeholder="ID" style="flex:1;min-width:100px" />
                  <a-input-number v-model:value="p.sort" class="playlist-sort" :precision="0" title="权重，数值越小越靠前" @blur="sortPlaylists" />
                  <a-button type="text" size="small" :disabled="i === 0" title="上移" @click="movePlaylist(i, -1)"><Icon name="ph:arrow-up-bold" /></a-button>
                  <a-button type="text" size="small" :disabled="i === music.music_playlists.length - 1" title="下移" @click="movePlaylist(i, 1)"><Icon name="ph:arrow-down-bold" /></a-button>
                  <a-button type="text" danger size="small" title="删除" @click="removePlaylist(i)"><Icon name="ph:trash-bold" /></a-button>
                </div>
                <a-button size="small" @click="addPlaylist">+ 添加歌单</a-button>
              </div>
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" :loading="musicSaving" @click="saveMusic">保存音乐配置</a-button>
                <a-button :loading="refreshing" @click="refreshCache">刷新歌单缓存</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-spin>
      </AdminCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { updateSiteSetting } = useSiteSettings()
const tab = ref('basic')
const settings = ref({ site_title: '', site_description: '', site_keywords: '' as any })
const keywordText = ref('')
const mediaNaming = ref('timestamp')

const emailTesting = ref(false)
const emailTestTo = ref('')
const emailPasswordDirty = ref(false)
const email = reactive({
  email_enabled: true,
  email_smtp_host: 'smtp.qq.com',
  email_smtp_port: 465,
  email_smtp_secure: true,
  email_smtp_user: '1833079849@qq.com',
  email_smtp_pass: '',
  email_from_name: '风隅随笔',
  email_from_address: '1833079849@qq.com',
  site_url: '',
})

const musicLoading = ref(true)
const musicSaving = ref(false)
const refreshing = ref(false)
const draggedPlaylistIndex = ref<number | null>(null)
let playlistKeySequence = 0
type PlaylistForm = { key: string; name: string; server: string; type: string; id: string; sort: number }
function playlistKey() { return `playlist-${Date.now().toString(36)}-${playlistKeySequence++}` }
const music = reactive({
  music_enabled: true,
  music_autoplay: false,
  music_volume: 0.55,
  music_api: 'https://api.i-meto.com/meting/api',
  music_server: 'netease',
  music_type: 'playlist',
  music_id: '8043180114',
  music_cache_ttl: 21600,
  music_playlists: [] as PlaylistForm[],
})

const volumePercent = computed({
  get: () => Math.round((music.music_volume || 0) * 100),
  set: (v: number) => { music.music_volume = Math.min(1, Math.max(0, v / 100)) },
})

onMounted(() => {
  loadSettings()
  loadMusic()
  loadEmail()
})

async function loadSettings() {
  try {
    const res = await api.get<any>('/settings')
    if (res) {
      settings.value.site_title = res.site_title || ''
      settings.value.site_description = res.site_description || ''
      const kw = res.site_keywords
      settings.value.site_keywords = Array.isArray(kw) ? kw : []
      keywordText.value = Array.isArray(kw) ? kw.join(', ') : (kw || '')
      mediaNaming.value = (res.media_naming as string) || 'timestamp'
    }
  } catch {}
}

async function loadEmail() {
  try {
    const [emailRes, siteUrlRes] = await Promise.all([
      api.get<any>('/email/config'),
      api.get<any>('/settings/site_url').catch(() => null),
    ])
    if (emailRes) {
      email.email_enabled = emailRes.enabled ?? true
      email.email_smtp_host = emailRes.host || 'smtp.qq.com'
      email.email_smtp_port = emailRes.port || 465
      email.email_smtp_secure = emailRes.secure !== false
      email.email_smtp_user = emailRes.user || '1833079849@qq.com'
      email.email_smtp_pass = ''
      emailPasswordDirty.value = false
      email.email_from_name = emailRes.fromName || '风隅随笔'
      email.email_from_address = emailRes.fromAddress || '1833079849@qq.com'
    }
    const siteUrl = typeof siteUrlRes === 'string' ? siteUrlRes : siteUrlRes?.value
    if (siteUrl) email.site_url = siteUrl
  } catch {}
}

async function saveEmailSetting(key: string) {
  if (key === 'email_smtp_pass' && !email.email_smtp_pass.trim()) return
  try {
    await api.put('/email/config', { [key]: (email as any)[key] })
    toast.success('已保存')
  } catch {
    toast.error('保存失败')
  }
}

async function saveEmailPassword() {
  if (!emailPasswordDirty.value || !email.email_smtp_pass.trim()) return
  try {
    await api.put('/email/config', { email_smtp_pass: email.email_smtp_pass })
    email.email_smtp_pass = ''
    emailPasswordDirty.value = false
    toast.success('SMTP 密钥已更新')
  } catch {
    toast.error('密钥更新失败')
  }
}

async function testEmail() {
  if (!emailTestTo.value) {
    toast.warning('请输入测试邮箱')
    return
  }
  emailTesting.value = true
  try {
    const res = await api.post<any>('/email/test', { to: emailTestTo.value })
    if (res.success) {
      toast.success('测试邮件已发送')
    } else {
      toast.error(res.message || '发送失败')
    }
  } catch (e: any) {
    toast.error(e?.message || '发送失败')
  } finally {
    emailTesting.value = false
  }
}

async function saveMediaNaming() {
  try {
    await api.put('/settings', { key: 'media_naming', value: mediaNaming.value })
    toast.success('已保存')
  } catch {
    toast.error('保存失败')
  }
}

async function saveSetting(key: string) {
  try {
    await api.put('/settings', { key, value: (settings.value as any)[key] })
    if (key === 'site_title' || key === 'site_description') {
      updateSiteSetting(key, String((settings.value as any)[key] || ''))
    }
    toast.success('已保存')
  } catch {
    toast.error('保存失败')
  }
}

async function saveKeywords() {
  const arr = keywordText.value.split(/[,，]\s*/).filter(Boolean)
  settings.value.site_keywords = arr
  try {
    await api.put('/settings', { key: 'site_keywords', value: arr })
    toast.success('已保存')
  } catch {
    toast.error('保存失败')
  }
}

async function loadMusic() {
  musicLoading.value = true
  try {
    const res = await api.get<any>('/music/admin/config')
    const cfg = res?.config || {}
    Object.assign(music, {
      music_enabled: cfg.music_enabled ?? true,
      music_autoplay: cfg.music_autoplay ?? false,
      music_volume: cfg.music_volume ?? 0.55,
      music_api: cfg.music_api || MUSIC_FALLBACK_API,
      music_server: cfg.music_server || 'netease',
      music_type: cfg.music_type || 'playlist',
      music_id: cfg.music_id || '8043180114',
      music_cache_ttl: cfg.music_cache_ttl ?? 21600,
      music_playlists: Array.isArray(cfg.music_playlists) && cfg.music_playlists.length
        ? cfg.music_playlists.map((p: any, index: number) => ({ ...p, key: playlistKey(), sort: Number.isFinite(Number(p.sort)) ? Number(p.sort) : (index + 1) * 10 }))
        : [{ key: playlistKey(), name: '默认歌单', server: 'netease', type: 'playlist', id: '8043180114', sort: 10 }],
    })
  } catch {
    toast.error('加载音乐配置失败')
  } finally {
    musicLoading.value = false
  }
}

const MUSIC_FALLBACK_API = 'https://api.i-meto.com/meting/api'

function addPlaylist() {
  music.music_playlists.push({
    name: `歌单${music.music_playlists.length + 1}`,
    server: music.music_server || 'netease',
    type: 'playlist',
    id: '',
    sort: (music.music_playlists.at(-1)?.sort || 0) + 10,
    key: playlistKey(),
  })
}

function normalizePlaylistSort() {
  music.music_playlists.forEach((playlist, index) => { playlist.sort = (index + 1) * 10 })
}

function sortPlaylists() {
  music.music_playlists.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
}

function movePlaylist(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= music.music_playlists.length) return
  const [playlist] = music.music_playlists.splice(index, 1)
  music.music_playlists.splice(target, 0, playlist)
  normalizePlaylistSort()
}

function startPlaylistDrag(index: number, event: DragEvent) {
  draggedPlaylistIndex.value = index
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function dropPlaylist(index: number) {
  const source = draggedPlaylistIndex.value
  if (source === null || source === index) { draggedPlaylistIndex.value = null; return }
  const [playlist] = music.music_playlists.splice(source, 1)
  music.music_playlists.splice(index, 0, playlist)
  normalizePlaylistSort()
  draggedPlaylistIndex.value = null
}

function removePlaylist(i: number) {
  if (music.music_playlists.length <= 1) {
    toast.warning('至少保留一个歌单')
    return
  }
  music.music_playlists.splice(i, 1)
}

async function saveMusic() {
  if (!music.music_playlists.some((p) => p.id?.trim())) {
    toast.warning('请至少填写一个有效歌单 ID')
    return
  }
  musicSaving.value = true
  try {
    sortPlaylists()
    if (music.music_playlists[0]?.id) {
      music.music_id = music.music_playlists[0].id
      music.music_server = music.music_playlists[0].server
      music.music_type = music.music_playlists[0].type
    }
    await api.put('/music/admin/config', {
      config: {
        music_enabled: music.music_enabled,
        music_autoplay: music.music_autoplay,
        music_volume: music.music_volume,
        music_api: music.music_api,
        music_server: music.music_server,
        music_type: music.music_type,
        music_id: music.music_id,
        music_cache_ttl: music.music_cache_ttl,
        music_playlists: music.music_playlists.filter((p) => p.id?.trim()).map(({ key: _key, ...playlist }) => playlist),
      },
    })
    toast.success('音乐配置已保存')
  } catch {
    toast.error('保存失败')
  } finally {
    musicSaving.value = false
  }
}

async function refreshCache() {
  refreshing.value = true
  try {
    const res = await api.post<any>('/music/admin/refresh')
    const n = res?.total ?? res?.tracks?.length ?? 0
    toast.success(`缓存已刷新，共 ${n} 首`)
  } catch {
    toast.error('刷新失败，请检查 API / 歌单 ID')
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.tab-body {
  animation: tab-fade 0.18s ease;
}
@keyframes tab-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
.section-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
}
.hint { font-size: 0.72rem; color: var(--c-text-3); margin-top: 4px; }
.playlist-editor { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.playlist-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.playlist-row.dragging { opacity:.48; }
.playlist-drag { display:grid; width:28px; height:28px; flex:0 0 28px; border:0; background:transparent; color:var(--c-text-3); cursor:grab; place-items:center; }
.playlist-drag:active { cursor:grabbing; }
.playlist-sort { width:76px; }
.secret-field { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
@media (max-width:520px) { .secret-field { grid-template-columns:1fr; } }
</style>
