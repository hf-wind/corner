<template>
  <div class="settings-page admin-page-shell">
    <header class="admin-page-head"><div><h1>站点设置</h1><p>集中管理站点信息、邮件、上传策略与音乐资源。</p></div><a-button :loading="healthLoading" @click="loadConfigHealth"><Icon name="ph:heartbeat-bold" /> 配置体检</a-button></header>
    <section class="config-health" :class="{ attention: configHealth.requiredMissing }">
      <header><div><Icon :name="configHealth.requiredMissing ? 'ph:warning-circle-bold' : 'ph:check-circle-bold'" /><span><strong>{{ configHealth.requiredMissing ? `${configHealth.requiredMissing} 项必要配置缺失` : '必要配置已齐全' }}</strong><small>{{ configHealth.configuredCount }} / {{ configHealth.checks.length }} 项已配置</small></span></div><time v-if="configHealth.checkedAt">{{ String(configHealth.checkedAt).slice(0, 16).replace('T', ' ') }}</time></header>
      <div class="health-grid"><article v-for="item in configHealth.checks" :key="item.key"><i :class="{ ok: item.configured }"><Icon :name="item.configured ? 'ph:check-bold' : 'ph:x-bold'" /></i><span><strong>{{ item.label }}</strong><small>{{ item.source }}</small></span><a-tag :color="item.configured ? 'green' : item.required ? 'red' : 'default'">{{ item.configured ? '已配置' : item.required ? '必需' : '可选' }}</a-tag></article></div>
    </section>
    <a-tabs v-model:activeKey="tab" size="small" @change="handleSettingsTab">
      <a-tab-pane key="website" tab="网站信息" />
      <a-tab-pane key="basic" tab="基本设置" />
      <a-tab-pane key="email" tab="邮件配置" />
      <a-tab-pane key="music" tab="音乐播放器" />
      <a-tab-pane key="friends" tab="友链管理" />
    </a-tabs>

    <div v-show="tab === 'website'" class="tab-body">
      <a-space direction="vertical" :size="16" style="width: 100%">
        <AdminCard icon="ph:house-bold" title="默认站点信息" desc="前台标题、搜索描述与系统默认站点资料">
          <a-form labelAlign="left" size="middle" :label-col="{ style: { width: '88px' } }">
            <a-form-item label="标题"><a-input v-model:value="settings.site_title" @blur="saveSetting('site_title')" /></a-form-item>
            <a-form-item label="公开地址"><a-input v-model:value="settings.site_url" placeholder="https://corner.ink" @blur="saveSetting('site_url')" /></a-form-item>
            <a-form-item label="描述"><a-textarea v-model:value="settings.site_description" :rows="3" @blur="saveSetting('site_description')" /></a-form-item>
            <a-form-item label="关键词"><a-input v-model:value="keywordText" placeholder="逗号分隔" @blur="saveKeywords" /></a-form-item>
          </a-form>
        </AdminCard>
        <AdminCard icon="ph:handshake-bold" title="友链展示资料" desc="用于友链页展示、互链申请和本站默认对外资料">
          <a-alert type="info" show-icon message="站点名称、地址和描述直接共用上方默认站点信息；这里只补充友链展示需要的头像、RSS 和联系邮箱。" />
          <a-form class="site-profile-form" labelAlign="left" size="middle" :label-col="{ style: { width: '88px' } }">
            <a-form-item label="站点头像"><a-input v-model:value="siteForm.avatar" placeholder="头像 URL" /></a-form-item>
            <a-form-item label="RSS 地址"><a-input v-model:value="siteForm.rssUrl" placeholder="https://corner.ink/api/rss.xml" /></a-form-item>
            <a-form-item label="联系邮箱"><a-input v-model:value="siteForm.contactEmail" type="email" /></a-form-item>
            <a-form-item :wrapper-col="{ style: { marginLeft: '88px' } }"><a-button type="primary" :loading="siteSaving" @click="saveSiteInfo"><Icon name="ph:floppy-disk-bold" /> 保存展示资料</a-button></a-form-item>
          </a-form>
        </AdminCard>
      </a-space>
    </div>

    <div v-show="tab === 'basic'" class="tab-body">
      <a-space direction="vertical" :size="16" style="width: 100%">
        <AdminCard
          icon="ph:upload-bold"
          title="上传文件"
          desc="新上传文件的命名方式"
        >
          <a-form
            labelAlign="left"
            size="middle"
            :label-col="{ style: { width: '108px' } }"
          >
            <a-form-item label="文件命名">
              <a-select
                v-model:value="mediaNaming"
                style="width: 200px"
                @change="saveMediaNaming"
              >
                <a-select-option value="timestamp"
                  >时间戳（默认）</a-select-option
                >
                <a-select-option value="uuid">UUID</a-select-option>
                <a-select-option value="original">原始文件名</a-select-option>
              </a-select>
              <div class="hint">上传文件时的命名方式，仅对新上传的文件生效</div>
            </a-form-item>
          </a-form>
        </AdminCard>

        <AdminCard
          icon="ph:bottle-bold"
          title="时光海额度"
          desc="控制同一访客每天投瓶与打捞的次数"
        >
          <a-form
            labelAlign="left"
            size="middle"
            :label-col="{ style: { width: '108px' } }"
          >
            <a-form-item label="每日投瓶">
              <a-input-number
                v-model:value="settings.visitor_bottle_daily_limit"
                :min="1"
                :max="100"
                :precision="0"
                style="width: 140px"
                @change="saveSetting('visitor_bottle_daily_limit')"
              />
              <div class="hint">包含新瓶和接力瓶，默认 3 次。</div>
            </a-form-item>
            <a-form-item label="每日打捞">
              <a-input-number
                v-model:value="settings.visitor_fish_daily_limit"
                :min="1"
                :max="100"
                :precision="0"
                style="width: 140px"
                @change="saveSetting('visitor_fish_daily_limit')"
              />
              <div class="hint">打捞请求会计入额度，默认 5 次。</div>
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
        <a-form
          labelAlign="left"
          size="middle"
          :label-col="{ style: { width: '108px' } }"
        >
          <a-form-item label="启用邮件">
            <a-switch
              v-model:checked="email.email_enabled"
              @change="saveEmailSetting('email_enabled')"
            />
          </a-form-item>
          <a-form-item label="SMTP服务器">
            <a-input
              v-model:value="email.email_smtp_host"
              placeholder="smtp.qq.com"
              @blur="saveEmailSetting('email_smtp_host')"
            />
          </a-form-item>
          <a-form-item label="端口">
            <a-input-number
              v-model:value="email.email_smtp_port"
              :min="1"
              :max="65535"
              style="width: 120px"
              @blur="saveEmailSetting('email_smtp_port')"
            />
          </a-form-item>
          <a-form-item label="SSL加密">
            <a-switch
              v-model:checked="email.email_smtp_secure"
              @change="saveEmailSetting('email_smtp_secure')"
            />
          </a-form-item>
          <a-form-item label="发信地址">
            <a-input
              v-model:value="email.email_smtp_user"
              placeholder="1833079849@qq.com"
              @blur="saveEmailSetting('email_smtp_user')"
            />
          </a-form-item>
          <a-form-item label="SMTP密钥">
            <div class="secret-field">
              <a-input-password
                v-model:value="email.email_smtp_pass"
                autocomplete="new-password"
                placeholder="已配置则留空，输入新密钥可替换"
                @input="emailPasswordDirty = true"
              />
              <a-button
                :disabled="!emailPasswordDirty || !email.email_smtp_pass.trim()"
                @click="saveEmailPassword"
                >更新密钥</a-button
              >
            </div>
            <div class="hint">
              密钥只会在点击“更新密钥”后提交，切换页面不会自动保存。
            </div>
          </a-form-item>
          <a-form-item label="显示名称">
            <a-input
              v-model:value="email.email_from_name"
              placeholder="风隅随笔"
              @blur="saveEmailSetting('email_from_name')"
            />
          </a-form-item>
          <a-form-item label="发信人地址">
            <a-input
              v-model:value="email.email_from_address"
              placeholder="1833079849@qq.com"
              @blur="saveEmailSetting('email_from_address')"
            />
          </a-form-item>
          <a-form-item label="站点URL">
            <a-input
              v-model:value="email.site_url"
              placeholder="https://your-domain.com"
              @blur="saveEmailSetting('site_url')"
            />
            <div class="hint">
              用于邮件模板中的「查看详情」链接，请填写完整URL，如
              https://your-domain.com
            </div>
          </a-form-item>
          <a-form-item label="测试发送">
            <a-input
              v-model:value="emailTestTo"
              placeholder="输入测试邮箱"
              style="width: 200px; margin-right: 8px"
            />
            <a-button type="primary" :loading="emailTesting" @click="testEmail"
              >发送测试</a-button
            >
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
          <div class="music-config">
            <section
              class="music-preferences"
              aria-labelledby="music-behavior-title"
            >
              <header class="config-section-head">
                <div>
                  <span>PLAYER BEHAVIOR</span>
                  <h3 id="music-behavior-title">播放设置</h3>
                </div>
                <small>应用于全站悬浮播放器</small>
              </header>

              <div class="preference-grid">
                <label class="preference-row">
                  <span class="preference-icon"
                    ><Icon name="ph:power-bold"
                  /></span>
                  <span class="preference-copy">
                    <strong>启用播放器</strong>
                    <small>关闭后前台不加载音乐资源</small>
                  </span>
                  <a-switch v-model:checked="music.music_enabled" />
                </label>
                <label class="preference-row">
                  <span class="preference-icon"
                    ><Icon name="ph:play-circle-bold"
                  /></span>
                  <span class="preference-copy">
                    <strong>自动播放</strong>
                    <small>浏览器可能要求首次交互后播放</small>
                  </span>
                  <a-switch v-model:checked="music.music_autoplay" />
                </label>
                <div class="preference-row volume-row">
                  <span class="preference-icon"
                    ><Icon name="ph:speaker-high-bold"
                  /></span>
                  <span class="preference-copy">
                    <strong>默认音量</strong>
                    <small>新访客首次播放时使用</small>
                  </span>
                  <div class="volume-control">
                    <a-slider
                      v-model:value="volumePercent"
                      :min="0"
                      :max="100"
                    />
                    <output>{{ volumePercent }}%</output>
                  </div>
                </div>
              </div>

              <details class="advanced-music-settings">
                <summary>
                  <span
                    ><Icon name="ph:sliders-horizontal-bold" /> 音源与缓存</span
                  >
                  <Icon name="ph:caret-down-bold" />
                </summary>
                <div class="advanced-fields">
                  <label>
                    <span>Meting API</span>
                    <a-input
                      v-model:value="music.music_api"
                      placeholder="https://api.i-meto.com/meting/api"
                    />
                  </label>
                  <label>
                    <span>缓存有效期</span>
                    <a-input-number
                      v-model:value="music.music_cache_ttl"
                      :min="60"
                      :max="86400"
                      addon-after="秒"
                    />
                  </label>
                </div>
              </details>
            </section>

            <section
              class="playlist-workspace"
              aria-labelledby="playlist-workspace-title"
            >
              <header class="config-section-head playlist-workspace-head">
                <div>
                  <span>PLAYLIST WORKSPACE</span>
                  <h3 id="playlist-workspace-title">站内歌单</h3>
                </div>
                <a-button type="primary" @click="addPlaylist">
                  <Icon name="ph:plus-bold" /> 新建歌单
                </a-button>
              </header>

              <div class="playlist-editor">
                <article
                  v-for="(p, i) in music.music_playlists"
                  :key="p.key"
                  class="playlist-item"
                  :class="{ dragging: draggedPlaylistIndex === i }"
                  @dragover.prevent
                  @drop="dropPlaylist(i)"
                >
                  <header class="playlist-row">
                    <button
                      class="playlist-drag"
                      type="button"
                      draggable="true"
                      title="拖动排序"
                      aria-label="拖动排序"
                      @dragstart="startPlaylistDrag(i, $event)"
                      @dragend="draggedPlaylistIndex = null"
                    >
                      <Icon name="ph:dots-six-vertical-bold" />
                    </button>
                    <span class="playlist-order">{{
                      String(i + 1).padStart(2, "0")
                    }}</span>
                    <a-input
                      v-model:value="p.name"
                      placeholder="歌单名称"
                      class="playlist-name"
                    />
                    <label class="playlist-visible">
                      <a-checkbox v-model:checked="p.visible" />
                      <span>前台展示</span>
                    </label>
                    <span class="playlist-track-count"
                      >{{ p.tracks.length }} 首</span
                    >
                    <div class="playlist-actions">
                      <a-button
                        type="text"
                        title="从歌单 ID 选曲"
                        @click="openSourcePicker(p)"
                      >
                        <Icon name="ph:cloud-arrow-down-bold" />
                      </a-button>
                      <a-button
                        type="text"
                        title="从媒体库添加"
                        @click="addMediaTracks(p)"
                      >
                        <Icon name="ph:folder-open-bold" />
                      </a-button>
                      <a-button
                        type="text"
                        :disabled="i === 0"
                        title="上移歌单"
                        @click="movePlaylist(i, -1)"
                      >
                        <Icon name="ph:arrow-up-bold" />
                      </a-button>
                      <a-button
                        type="text"
                        :disabled="i === music.music_playlists.length - 1"
                        title="下移歌单"
                        @click="movePlaylist(i, 1)"
                      >
                        <Icon name="ph:arrow-down-bold" />
                      </a-button>
                      <a-button
                        type="text"
                        danger
                        title="删除歌单"
                        @click="removePlaylist(i)"
                      >
                        <Icon name="ph:trash-bold" />
                      </a-button>
                      <a-button
                        type="text"
                        class="playlist-toggle"
                        :class="{ expanded: p.expanded }"
                        :title="p.expanded ? '收起歌曲' : '展开歌曲'"
                        :aria-label="p.expanded ? '收起歌曲' : '展开歌曲'"
                        :aria-expanded="p.expanded"
                        @click="p.expanded = !p.expanded"
                      >
                        <Icon name="ph:caret-down-bold" />
                      </a-button>
                    </div>
                  </header>

                  <Transition
                    @before-enter="beforePlaylistEnter"
                    @enter="enterPlaylist"
                    @after-enter="afterPlaylistTransition"
                    @before-leave="beforePlaylistLeave"
                    @leave="leavePlaylist"
                    @after-leave="afterPlaylistTransition"
                  >
                    <div v-if="p.expanded" class="playlist-content">
                      <a-table
                        v-if="p.tracks.length"
                        row-key="key"
                        size="small"
                        :columns="trackColumns"
                        :data-source="p.tracks"
                        :pagination="false"
                        :scroll="{ x: 820 }"
                        class="playlist-track-table"
                      >
                        <template #bodyCell="{ column, record: track, index: trackIndex }">
                          <template v-if="column.key === 'cover'">
                            <div class="track-cover-editor">
                              <img v-if="track.pic" :src="track.pic" alt="" loading="lazy" />
                              <span v-else><Icon name="ph:music-note-bold" /></span>
                              <a-button
                                type="text"
                                size="small"
                                :loading="coverResolvingKey === track.key"
                                title="自动获取封面"
                                @click="resolveTrackCover(track)"
                              ><Icon name="ph:magnifying-glass-bold" /></a-button>
                            </div>
                          </template>
                          <template v-else-if="column.key === 'name'">
                            <a-input v-model:value="track.name" size="small" placeholder="歌曲名" />
                          </template>
                          <template v-else-if="column.key === 'artist'">
                            <a-input v-model:value="track.artist" size="small" placeholder="歌手" />
                          </template>
                          <template v-else-if="column.key === 'sort'">
                            <a-input-number v-model:value="track.sort" size="small" :min="0" :step="10" />
                          </template>
                          <template v-else-if="column.key === 'actions'">
                            <div class="track-actions">
                              <a-button type="text" size="small" :disabled="trackIndex === 0" title="上移" @click="moveTrack(p, trackIndex, -1)"><Icon name="ph:caret-up-bold" /></a-button>
                              <a-button type="text" size="small" :disabled="trackIndex === p.tracks.length - 1" title="下移" @click="moveTrack(p, trackIndex, 1)"><Icon name="ph:caret-down-bold" /></a-button>
                              <a-popconfirm title="确认从歌单移除这首歌？" ok-text="移除" cancel-text="取消" @confirm="p.tracks.splice(trackIndex, 1)">
                                <a-button type="text" danger size="small" title="移除歌曲"><Icon name="ph:trash-bold" /></a-button>
                              </a-popconfirm>
                            </div>
                          </template>
                        </template>
                      </a-table>
                      <div v-else class="playlist-empty">
                        <Icon name="ph:music-notes-simple-bold" />
                        <span>从在线歌单或媒体库添加歌曲</span>
                      </div>
                    </div>
                  </Transition>
                </article>
              </div>
            </section>

            <footer class="music-config-actions">
              <span>保存后前台播放器将在下次加载时读取新配置</span>
              <div>
                <a-button :loading="refreshing" @click="refreshCache">
                  <Icon name="ph:arrows-clockwise-bold" /> 刷新缓存
                </a-button>
                <a-button
                  type="primary"
                  :loading="musicSaving"
                  @click="saveMusic"
                >
                  <Icon name="ph:floppy-disk-bold" /> 保存配置
                </a-button>
              </div>
            </footer>
          </div>
        </a-spin>
      </AdminCard>

      <a-modal
        v-model:open="sourcePicker.open"
        title="从来源歌单选曲"
        width="min(760px, calc(100vw - 32px))"
      >
        <audio
          ref="sourcePreviewRef"
          preload="none"
          class="source-preview-audio"
          @play="sourcePreviewPlaying = true"
          @pause="sourcePreviewPlaying = false"
          @ended="sourcePreviewPlaying = false"
          @error="handleSourcePreviewError"
        />
        <div class="source-toolbar">
          <a-select v-model:value="sourcePicker.server" style="width: 112px">
            <a-select-option value="netease">网易云</a-select-option>
            <a-select-option value="tencent">QQ 音乐</a-select-option>
            <a-select-option value="kugou">酷狗</a-select-option>
            <a-select-option value="kuwo">酷我</a-select-option>
          </a-select>
          <a-select v-model:value="sourcePicker.type" style="width: 96px">
            <a-select-option value="playlist">歌单</a-select-option>
            <a-select-option value="album">专辑</a-select-option>
          </a-select>
          <a-input
            v-model:value="sourcePicker.id"
            placeholder="输入歌单 ID"
            @press-enter="loadSourceTracks"
          />
          <a-button
            type="primary"
            :loading="sourcePicker.loading"
            @click="loadSourceTracks"
            >获取歌曲</a-button
          >
        </div>
        <a-input
          v-if="sourcePicker.tracks.length"
          v-model:value="sourcePicker.query"
          allow-clear
          placeholder="搜索歌曲或歌手"
          class="source-search"
        />
        <a-spin :spinning="sourcePicker.loading">
          <div v-if="filteredSourceTracks.length" class="source-track-list">
            <div
              v-for="track in filteredSourceTracks"
              :key="track.key"
              class="source-track"
              :class="{ selected: selectedSourceKeys.has(track.key) }"
            >
              <button
                type="button"
                class="source-select"
                :aria-pressed="selectedSourceKeys.has(track.key)"
                @click="toggleSourceTrack(track.key)"
              >
                <span class="source-check"
                  ><Icon
                    :name="
                      selectedSourceKeys.has(track.key)
                        ? 'ph:check-bold'
                        : 'ph:plus-bold'
                    "
                /></span>
                <span class="source-copy"
                  ><strong>{{ track.name }}</strong
                  ><small>{{ track.artist }}</small></span
                >
              </button>
              <button
                type="button"
                class="source-preview"
                :class="{
                  active:
                    sourcePreviewKey === track.key && sourcePreviewPlaying,
                }"
                :title="
                  sourcePreviewKey === track.key && sourcePreviewPlaying
                    ? '暂停试听'
                    : '试听歌曲'
                "
                :aria-label="
                  sourcePreviewKey === track.key && sourcePreviewPlaying
                    ? `暂停试听 ${track.name}`
                    : `试听 ${track.name}`
                "
                @click="toggleSourcePreview(track)"
              >
                <Icon
                  :name="
                    sourcePreviewKey === track.key && sourcePreviewPlaying
                      ? 'ph:pause-fill'
                      : 'ph:play-fill'
                  "
                />
              </button>
            </div>
          </div>
          <a-empty
            v-else-if="!sourcePicker.loading"
            description="输入来源歌单 ID 后获取歌曲"
          />
        </a-spin>
        <template #footer>
          <a-button @click="sourcePicker.open = false">取消</a-button>
          <a-button
            :disabled="!sourcePicker.tracks.length"
            @click="adoptWholeSource"
            >整单采用</a-button
          >
          <a-button
            type="primary"
            :disabled="!selectedSourceKeys.size"
            @click="confirmSourceTracks"
          >
            添加选中歌曲
          </a-button>
        </template>
      </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "auth", ssr: false });

const api = useApi();
const toast = useToast();
const { updateSiteSetting } = useSiteSettings();
const { openItems } = useMediaLibrary();
const router = useRouter();
const tab = ref("website");
const healthLoading = ref(false);
const configHealth = reactive<any>({ checks: [], configuredCount: 0, requiredMissing: 0, checkedAt: "" });
const settings = ref({
  site_title: "",
  site_url: "",
  site_description: "",
  site_keywords: "" as any,
  visitor_bottle_daily_limit: 3,
  visitor_fish_daily_limit: 5,
});
const keywordText = ref("");
const mediaNaming = ref("timestamp");
const siteSaving = ref(false);
const siteForm = reactive({
  name: "",
  url: "",
  avatar: "",
  description: "",
  rssUrl: "",
  contactEmail: "1833079849@qq.com",
});

const emailTesting = ref(false);
const emailTestTo = ref("");
const emailPasswordDirty = ref(false);
const email = reactive({
  email_enabled: true,
  email_smtp_host: "smtp.qq.com",
  email_smtp_port: 465,
  email_smtp_secure: true,
  email_smtp_user: "1833079849@qq.com",
  email_smtp_pass: "",
  email_from_name: "风隅随笔",
  email_from_address: "1833079849@qq.com",
  site_url: "",
});

const musicLoading = ref(true);
const musicSaving = ref(false);
const refreshing = ref(false);
const draggedPlaylistIndex = ref<number | null>(null);
let playlistKeySequence = 0;
type PlaylistTrackForm = {
  key: string;
  name: string;
  artist: string;
  url: string;
  pic: string;
  sort: number;
  lrc?: string;
  mediaId?: string;
};
type PlaylistForm = {
  key: string;
  name: string;
  server: string;
  type: string;
  id: string;
  sort: number;
  visible: boolean;
  expanded: boolean;
  tracks: PlaylistTrackForm[];
};
function playlistKey() {
  return `playlist-${Date.now().toString(36)}-${playlistKeySequence++}`;
}
function trackKey() {
  return `track-${Date.now().toString(36)}-${playlistKeySequence++}`;
}

const sourcePicker = reactive({
  open: false,
  loading: false,
  targetKey: "",
  server: "netease",
  type: "playlist",
  id: "",
  query: "",
  tracks: [] as Array<
    PlaylistTrackForm & { previewPic?: string; previewUrl?: string }
  >,
});
const sourcePreviewRef = ref<HTMLAudioElement | null>(null);
const coverResolvingKey = ref("");
const trackColumns = [
  { title: "封面", key: "cover", width: 92 },
  { title: "歌曲", key: "name", minWidth: 180 },
  { title: "歌手", key: "artist", minWidth: 150 },
  { title: "权重", key: "sort", width: 100 },
  { title: "操作", key: "actions", width: 118, fixed: "right" as const },
];
const sourcePreviewKey = ref("");
const sourcePreviewPlaying = ref(false);
const selectedSourceKeys = ref(new Set<string>());
const filteredSourceTracks = computed(() => {
  const query = sourcePicker.query.trim().toLocaleLowerCase();
  if (!query) return sourcePicker.tracks;
  return sourcePicker.tracks.filter((track) =>
    `${track.name} ${track.artist}`.toLocaleLowerCase().includes(query),
  );
});
const music = reactive({
  music_enabled: true,
  music_autoplay: false,
  music_volume: 0.55,
  music_api: "https://api.i-meto.com/meting/api",
  music_server: "netease",
  music_type: "playlist",
  music_id: "8043180114",
  music_cache_ttl: 21600,
  music_playlists: [] as PlaylistForm[],
});

const volumePercent = computed({
  get: () => Math.round((music.music_volume || 0) * 100),
  set: (v: number) => {
    music.music_volume = Math.min(1, Math.max(0, v / 100));
  },
});

onMounted(async () => {
  loadConfigHealth();
  await Promise.all([loadSettings(), loadSiteInfo(), loadMusic(), loadEmail()]);
  settings.value.site_title ||= siteForm.name;
  settings.value.site_url ||= siteForm.url;
  settings.value.site_description ||= siteForm.description;
});

function handleSettingsTab(key: string) {
  if (key === "friends") void router.push("/admin/friends");
}

async function loadSiteInfo() {
  try {
    const result = await api.get<any>("/friend-link/my-site");
    Object.assign(siteForm, {
      name: result?.name || "",
      url: result?.url || "",
      avatar: result?.avatar || "",
      description: result?.description || "",
      rssUrl: result?.rssUrl || "",
      contactEmail: result?.contactEmail || "1833079849@qq.com",
    });
  } catch {
    toast.error("本站展示资料加载失败");
  }
}

async function saveSiteInfo() {
  if (!settings.value.site_title.trim() || !settings.value.site_url.trim()) {
    toast.warning("站点名称和地址不能为空");
    return;
  }
  siteSaving.value = true;
  try {
    Object.assign(
      siteForm,
      await api.put<any>("/friend-link/my-site", {
        ...siteForm,
        name: settings.value.site_title,
        url: settings.value.site_url,
        description: settings.value.site_description,
      }),
    );
    toast.success("友链展示资料已保存");
  } catch (error: any) {
    toast.error(error?.message || "展示资料保存失败");
  } finally {
    siteSaving.value = false;
  }
}

async function loadConfigHealth() {
  healthLoading.value = true;
  try {
    Object.assign(configHealth, await api.get<any>("/settings/health"));
  } catch {
    configHealth.checks = [];
  } finally {
    healthLoading.value = false;
  }
}

async function loadSettings() {
  try {
    const res = await api.get<any>("/settings");
    if (res) {
      settings.value.site_title = res.site_title || "";
      settings.value.site_url = res.site_url || "";
      settings.value.site_description = res.site_description || "";
      const kw = res.site_keywords;
      settings.value.site_keywords = Array.isArray(kw) ? kw : [];
      keywordText.value = Array.isArray(kw) ? kw.join(", ") : kw || "";
      mediaNaming.value = (res.media_naming as string) || "timestamp";
      settings.value.visitor_bottle_daily_limit = Math.max(
        1,
        Number(res.visitor_bottle_daily_limit) || 3,
      );
      settings.value.visitor_fish_daily_limit = Math.max(
        1,
        Number(res.visitor_fish_daily_limit) || 5,
      );
    }
  } catch {}
}

async function loadEmail() {
  try {
    const [emailRes, siteUrlRes] = await Promise.all([
      api.get<any>("/email/config"),
      api.get<any>("/settings/site_url").catch(() => null),
    ]);
    if (emailRes) {
      email.email_enabled = emailRes.enabled ?? true;
      email.email_smtp_host = emailRes.host || "smtp.qq.com";
      email.email_smtp_port = emailRes.port || 465;
      email.email_smtp_secure = emailRes.secure !== false;
      email.email_smtp_user = emailRes.user || "1833079849@qq.com";
      email.email_smtp_pass = "";
      emailPasswordDirty.value = false;
      email.email_from_name = emailRes.fromName || "风隅随笔";
      email.email_from_address = emailRes.fromAddress || "1833079849@qq.com";
    }
    const siteUrl =
      typeof siteUrlRes === "string" ? siteUrlRes : siteUrlRes?.value;
    if (siteUrl) email.site_url = siteUrl;
  } catch {}
}

async function saveEmailSetting(key: string) {
  if (key === "email_smtp_pass" && !email.email_smtp_pass.trim()) return;
  try {
    await api.put("/email/config", { [key]: (email as any)[key] });
    toast.success("已保存");
    void loadConfigHealth();
  } catch {
    toast.error("保存失败");
  }
}

async function saveEmailPassword() {
  if (!emailPasswordDirty.value || !email.email_smtp_pass.trim()) return;
  try {
    await api.put("/email/config", { email_smtp_pass: email.email_smtp_pass });
    email.email_smtp_pass = "";
    emailPasswordDirty.value = false;
    toast.success("SMTP 密钥已更新");
  } catch {
    toast.error("密钥更新失败");
  }
}

async function testEmail() {
  if (!emailTestTo.value) {
    toast.warning("请输入测试邮箱");
    return;
  }
  emailTesting.value = true;
  try {
    const res = await api.post<any>("/email/test", { to: emailTestTo.value });
    if (res.success) {
      toast.success("测试邮件已发送");
    } else {
      toast.error(res.message || "发送失败");
    }
  } catch (e: any) {
    toast.error(e?.message || "发送失败");
  } finally {
    emailTesting.value = false;
  }
}

async function saveMediaNaming() {
  try {
    await api.put("/settings", {
      key: "media_naming",
      value: mediaNaming.value,
    });
    toast.success("已保存");
    void loadConfigHealth();
  } catch {
    toast.error("保存失败");
  }
}

async function saveSetting(key: string) {
  try {
    await api.put("/settings", { key, value: (settings.value as any)[key] });
    if (key === "site_title" || key === "site_description") {
      updateSiteSetting(key, String((settings.value as any)[key] || ""));
    }
    toast.success("已保存");
    void loadConfigHealth();
  } catch {
    toast.error("保存失败");
  }
}

async function saveKeywords() {
  const arr = keywordText.value.split(/[,，]\s*/).filter(Boolean);
  settings.value.site_keywords = arr;
  try {
    await api.put("/settings", { key: "site_keywords", value: arr });
    toast.success("已保存");
  } catch {
    toast.error("保存失败");
  }
}

async function loadMusic() {
  musicLoading.value = true;
  try {
    const res = await api.get<any>("/music/admin/config");
    const cfg = res?.config || {};
    Object.assign(music, {
      music_enabled: cfg.music_enabled ?? true,
      music_autoplay: cfg.music_autoplay ?? false,
      music_volume: cfg.music_volume ?? 0.55,
      music_api: cfg.music_api || MUSIC_FALLBACK_API,
      music_server: cfg.music_server || "netease",
      music_type: cfg.music_type || "playlist",
      music_id: cfg.music_id || "8043180114",
      music_cache_ttl: cfg.music_cache_ttl ?? 21600,
      music_playlists:
        Array.isArray(cfg.music_playlists) && cfg.music_playlists.length
          ? cfg.music_playlists.map((p: any, index: number) => ({
              ...p,
              key: playlistKey(),
              visible: p.visible !== false,
              expanded: false,
                  tracks: Array.isArray(p.tracks)
                ? p.tracks.map((track: any, trackIndex: number) => ({
                    ...track,
                    key: trackKey(),
                    pic: track.pic || "",
                    sort: Number.isFinite(Number(track.sort)) ? Number(track.sort) : (trackIndex + 1) * 10,
                  }))
                : [],
              sort: Number.isFinite(Number(p.sort))
                ? Number(p.sort)
                : (index + 1) * 10,
            }))
          : [
              {
                key: playlistKey(),
                name: "默认歌单",
                server: "netease",
                type: "playlist",
                id: "8043180114",
                sort: 10,
                visible: true,
                expanded: false,
                tracks: [],
              },
            ],
    });
  } catch {
    toast.error("加载音乐配置失败");
  } finally {
    musicLoading.value = false;
  }
}

const MUSIC_FALLBACK_API = "https://api.i-meto.com/meting/api";

function addPlaylist() {
  music.music_playlists.push({
    name: `歌单${music.music_playlists.length + 1}`,
    server: "local",
    type: "custom",
    id: `local-${Date.now().toString(36)}`,
    sort: (music.music_playlists.at(-1)?.sort || 0) + 10,
    visible: true,
    expanded: false,
    tracks: [],
    key: playlistKey(),
  });
}

function openSourcePicker(playlist: PlaylistForm) {
  stopSourcePreview();
  sourcePicker.targetKey = playlist.key;
  sourcePicker.open = true;
  sourcePicker.query = "";
  sourcePicker.tracks = [];
  selectedSourceKeys.value = new Set();
}

async function loadSourceTracks() {
  if (!sourcePicker.id.trim()) {
    toast.warning("请输入来源歌单 ID");
    return;
  }
  stopSourcePreview();
  sourcePicker.loading = true;
  selectedSourceKeys.value = new Set();
  try {
    const response = await api.get<any>("/music/admin/source-tracks", {
      server: sourcePicker.server,
      type: sourcePicker.type,
      id: sourcePicker.id.trim(),
    });
    sourcePicker.tracks = (response?.tracks || []).map((track: any) => ({
      ...track,
      key: track.key || trackKey(),
      pic: track.pic || "",
      sort: Number.isFinite(Number(track.sort)) ? Number(track.sort) : 0,
    }));
    if (!sourcePicker.tracks.length) toast.info("这个来源歌单没有可用歌曲");
  } catch {
    sourcePicker.tracks = [];
    toast.error("歌单获取失败，请检查平台和歌单 ID");
  } finally {
    sourcePicker.loading = false;
  }
}

async function toggleSourcePreview(
  track: PlaylistTrackForm & { previewUrl?: string },
) {
  const audio = sourcePreviewRef.value;
  if (!audio || !track.previewUrl) {
    toast.warning("这首歌曲暂时无法试听");
    return;
  }
  if (sourcePreviewKey.value === track.key) {
    if (audio.paused) {
      await audio.play().catch(() => toast.error("试听播放失败"));
    } else {
      audio.pause();
    }
    return;
  }
  stopSourcePreview();
  sourcePreviewKey.value = track.key;
  audio.src = track.previewUrl;
  await audio.play().catch(() => {
    sourcePreviewPlaying.value = false;
    toast.error("试听播放失败");
  });
}

function stopSourcePreview() {
  const audio = sourcePreviewRef.value;
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  sourcePreviewKey.value = "";
  sourcePreviewPlaying.value = false;
}

function handleSourcePreviewError() {
  if (!sourcePreviewKey.value) return;
  sourcePreviewPlaying.value = false;
  toast.error("试听音源加载失败");
}

function toggleSourceTrack(key: string) {
  const next = new Set(selectedSourceKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedSourceKeys.value = next;
}

function confirmSourceTracks() {
  applySourceTracks(false);
}

function adoptWholeSource() {
  selectedSourceKeys.value = new Set(
    sourcePicker.tracks.map((track) => track.key),
  );
  applySourceTracks(true);
}

function applySourceTracks(replace: boolean) {
  const playlist = music.music_playlists.find(
    (item) => item.key === sourcePicker.targetKey,
  );
  if (!playlist) return;
  stopSourcePreview();
  const additions = sourcePicker.tracks
    .filter((track) => selectedSourceKeys.value.has(track.key))
    .map(({ previewPic: _previewPic, previewUrl: _previewUrl, ...track }) => ({
      ...track,
      key: trackKey(),
    }));
  if (replace) playlist.tracks = additions;
  else appendPlaylistTracks(playlist, additions);
  playlist.server = "local";
  playlist.type = "custom";
  if (!playlist.id.startsWith("local-")) {
    playlist.id = `local-${Date.now().toString(36)}`;
  }
  sourcePicker.open = false;
  toast.success(
    replace
      ? `已采用完整歌单，共 ${additions.length} 首`
      : `已添加 ${additions.length} 首歌曲`,
  );
}

async function addMediaTracks(playlist: PlaylistForm) {
  const items = await openItems({
    multiple: true,
    folder: "audio",
    type: "audio",
  });
  const additions = items
    .filter((item) => String(item.mimeType || "").startsWith("audio/"))
    .map((item) => ({
      key: trackKey(),
      name: String(item.originalName || item.filename || "本地音乐").replace(
        /\.[^.]+$/,
        "",
      ),
      artist: "本地音乐",
      url: String(item.path || ""),
      pic: "",
      sort: (playlist.tracks.length + 1) * 10,
      mediaId: String(item.id || ""),
    }))
    .filter((track) => track.url);
  appendPlaylistTracks(playlist, additions);
  if (additions.length) toast.success(`已添加 ${additions.length} 个音频文件`);
}

function appendPlaylistTracks(
  playlist: PlaylistForm,
  additions: PlaylistTrackForm[],
) {
  const existing = new Set(playlist.tracks.map((track) => track.url));
  playlist.tracks.push(
    ...additions.filter((track) => !existing.has(track.url)),
  );
}

async function resolveTrackCover(track: PlaylistTrackForm) {
  if (!track.name.trim()) return toast.warning("请先填写歌曲名");
  coverResolvingKey.value = track.key;
  try {
    const result = await api.post<{ pic?: string }>("/music/admin/cover", {
      name: track.name,
      artist: track.artist,
    });
    if (!result?.pic) return toast.warning("暂未找到匹配封面");
    track.pic = result.pic;
    toast.success("已补充歌曲封面");
  } catch {
    toast.error("封面获取失败");
  } finally {
    coverResolvingKey.value = "";
  }
}

function moveTrack(playlist: PlaylistForm, index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= playlist.tracks.length) return;
  const [track] = playlist.tracks.splice(index, 1);
  playlist.tracks.splice(target, 0, track);
  playlist.tracks.forEach((item, position) => (item.sort = (position + 1) * 10));
}

function beforePlaylistEnter(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "0";
  el.style.opacity = "0";
}

function enterPlaylist(element: Element) {
  const el = element as HTMLElement;
  requestAnimationFrame(() => {
    el.style.height = `${el.scrollHeight}px`;
    el.style.opacity = "1";
  });
}

function beforePlaylistLeave(element: Element) {
  const el = element as HTMLElement;
  el.style.height = `${el.scrollHeight}px`;
  el.style.opacity = "1";
}

function leavePlaylist(element: Element) {
  const el = element as HTMLElement;
  requestAnimationFrame(() => {
    el.style.height = "0";
    el.style.opacity = "0";
  });
}

function afterPlaylistTransition(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "";
  el.style.opacity = "";
}

watch(
  () => sourcePicker.open,
  (open) => {
    if (!open) stopSourcePreview();
  },
);

function normalizePlaylistSort() {
  music.music_playlists.forEach((playlist, index) => {
    playlist.sort = (index + 1) * 10;
  });
}

function sortPlaylists() {
  music.music_playlists.sort(
    (a, b) => Number(a.sort || 0) - Number(b.sort || 0),
  );
}

function movePlaylist(index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= music.music_playlists.length) return;
  const [playlist] = music.music_playlists.splice(index, 1);
  music.music_playlists.splice(target, 0, playlist);
  normalizePlaylistSort();
}

function startPlaylistDrag(index: number, event: DragEvent) {
  draggedPlaylistIndex.value = index;
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function dropPlaylist(index: number) {
  const source = draggedPlaylistIndex.value;
  if (source === null || source === index) {
    draggedPlaylistIndex.value = null;
    return;
  }
  const [playlist] = music.music_playlists.splice(source, 1);
  music.music_playlists.splice(index, 0, playlist);
  normalizePlaylistSort();
  draggedPlaylistIndex.value = null;
}

function removePlaylist(i: number) {
  if (music.music_playlists.length <= 1) {
    toast.warning("至少保留一个歌单");
    return;
  }
  music.music_playlists.splice(i, 1);
}

async function saveMusic() {
  if (!music.music_playlists.some((p) => p.tracks.length || p.id?.trim())) {
    toast.warning("请至少保留一个有效歌单");
    return;
  }
  musicSaving.value = true;
  try {
    sortPlaylists();
    if (music.music_playlists[0]?.id) {
      music.music_id = music.music_playlists[0].id;
      music.music_server = music.music_playlists[0].server;
      music.music_type = music.music_playlists[0].type;
    }
    await api.put("/music/admin/config", {
      config: {
        music_enabled: music.music_enabled,
        music_autoplay: music.music_autoplay,
        music_volume: music.music_volume,
        music_api: music.music_api,
        music_server: music.music_server,
        music_type: music.music_type,
        music_id: music.music_id,
        music_cache_ttl: music.music_cache_ttl,
        music_playlists: music.music_playlists.map(
          ({ key: _key, expanded: _expanded, tracks, ...playlist }) => ({
            ...playlist,
            tracks: tracks.map(({ key: _trackKey, ...track }) => track),
          }),
        ),
      },
    });
    toast.success("音乐配置已保存");
  } catch {
    toast.error("保存失败");
  } finally {
    musicSaving.value = false;
  }
}

async function refreshCache() {
  refreshing.value = true;
  try {
    const res = await api.post<any>("/music/admin/refresh");
    const n = res?.total ?? res?.tracks?.length ?? 0;
    toast.success(`缓存已刷新，共 ${n} 首`);
  } catch {
    toast.error("刷新失败，请检查 API / 歌单 ID");
  } finally {
    refreshing.value = false;
  }
}
</script>

<style scoped>
.settings-page {
  width: min(1120px, 100%);
  margin: 0 auto;
}
.config-health {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, #43a977 34%, var(--border));
  border-radius: 8px;
  background: var(--ld-bg-card);
}
.config-health.attention {
  border-color: color-mix(in srgb, #d18a24 42%, var(--border));
}
.config-health > header,
.config-health > header > div {
  display: flex;
  align-items: center;
  gap: 9px;
}
.config-health > header {
  justify-content: space-between;
  margin-bottom: 11px;
}
.config-health > header > div > svg {
  color: #43a977;
  font-size: 1.1rem;
}
.config-health.attention > header > div > svg {
  color: #c47d17;
}
.config-health header span {
  display: flex;
  flex-direction: column;
}
.config-health header strong {
  font-size: .72rem;
}
.config-health header small,
.config-health time {
  color: var(--c-text-3);
  font-size: .54rem;
}
.health-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
}
.health-grid article {
  display: grid;
  min-width: 0;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border-radius: 7px;
  background: var(--c-bg-1);
}
.health-grid i {
  display: grid;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgb(197 86 86 / 11%);
  color: #c55656;
  font-style: normal;
  place-items: center;
}
.health-grid i.ok {
  background: rgb(67 169 119 / 11%);
  color: #43a977;
}
.health-grid article > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.health-grid article strong {
  overflow: hidden;
  font-size: .6rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.health-grid article small {
  overflow: hidden;
  color: var(--c-text-3);
  font-size: .48rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-body {
  animation: tab-fade 0.18s ease;
}
@keyframes tab-fade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.section-card {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
}
@media (max-width: 900px) {
  .health-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .health-grid { grid-template-columns: 1fr; }
  .config-health > header { align-items: flex-start; flex-direction: column; }
}
.hint {
  font-size: 0.72rem;
  color: var(--c-text-3);
  margin-top: 4px;
}
.music-config {
  display: grid;
  gap: 24px;
}
.config-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.config-section-head span {
  color: var(--c-primary);
  font-size: 0.54rem;
  font-weight: 750;
  letter-spacing: 0.14em;
}
.config-section-head h3 {
  margin: 3px 0 0;
  color: var(--c-text);
  font-size: 0.94rem;
}
.config-section-head small {
  color: var(--c-text-3);
  font-size: 0.62rem;
}
.preference-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.preference-row {
  display: grid;
  min-width: 0;
  min-height: 66px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-bg-1) 74%, transparent);
}
.preference-icon {
  display: grid;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.88rem;
  place-items: center;
}
.preference-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.preference-copy strong {
  color: var(--c-text-2);
  font-size: 0.72rem;
}
.preference-copy small {
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.6rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.volume-row {
  grid-column: 1 / -1;
}
.volume-control {
  display: grid;
  width: min(320px, 42vw);
  grid-template-columns: minmax(120px, 1fr) 42px;
  align-items: center;
  gap: 10px;
}
.volume-control output {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-align: right;
}
.advanced-music-settings {
  margin-top: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.advanced-music-settings summary {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  color: var(--c-text-3);
  cursor: pointer;
  font-size: 0.66rem;
  list-style: none;
}
.advanced-music-settings summary::-webkit-details-marker {
  display: none;
}
.advanced-music-settings summary span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.advanced-music-settings summary > svg {
  transition: transform 0.2s ease;
}
.advanced-music-settings[open] summary > svg {
  transform: rotate(180deg);
}
.advanced-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  gap: 12px;
  padding: 4px 4px 14px;
}
.advanced-fields label {
  display: grid;
  gap: 5px;
  color: var(--c-text-3);
  font-size: 0.62rem;
}
.playlist-workspace {
  padding-top: 20px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.playlist-workspace-head {
  align-items: center;
}
.playlist-editor {
  display: grid;
  gap: 8px;
  width: 100%;
}
.playlist-item {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 8px;
  background: var(--ld-bg-card);
  transition:
    border-color 0.18s ease,
    opacity 0.18s ease,
    box-shadow 0.22s ease;
}
.playlist-item:hover {
  border-color: color-mix(in srgb, var(--c-primary) 28%, var(--border));
}
.playlist-item.dragging {
  opacity: 0.48;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 40%, transparent);
}
.playlist-row {
  display: grid;
  min-height: 54px;
  grid-template-columns: 28px 24px minmax(150px, 1fr) auto 52px auto;
  align-items: center;
  gap: 7px;
  padding: 7px 8px;
}
.playlist-drag {
  display: grid;
  width: 28px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--c-text-3);
  cursor: grab;
  place-items: center;
}
.playlist-drag:active {
  cursor: grabbing;
}
.playlist-order,
.playlist-track-order {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-align: center;
}
.playlist-name {
  min-width: 0;
}
.playlist-visible {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--c-text-2);
  font-size: 0.64rem;
  white-space: nowrap;
}
.playlist-track-count {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-align: center;
  white-space: nowrap;
}
.playlist-actions,
.track-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
}
.playlist-actions :deep(.ant-btn),
.track-actions :deep(.ant-btn) {
  width: 30px;
  height: 30px;
  padding: 0;
}
.playlist-toggle {
  transition: transform 0.26s cubic-bezier(0.22, 0.8, 0.24, 1);
}
.playlist-toggle.expanded {
  transform: rotate(180deg);
}
.playlist-content {
  overflow: hidden;
  background: color-mix(in srgb, var(--c-bg-1) 52%, transparent);
  transition:
    height 0.28s cubic-bezier(0.22, 0.8, 0.24, 1),
    opacity 0.2s ease;
}
.playlist-track-table {
  border-top: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
}
.playlist-track-table :deep(.ant-table),
.playlist-track-table :deep(.ant-table-cell) {
  background: transparent !important;
}
.track-cover-editor {
  display: flex;
  align-items: center;
  gap: 5px;
}
.track-cover-editor > img,
.track-cover-editor > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  overflow: hidden;
  border-radius: 5px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  object-fit: cover;
  place-items: center;
}
.track-cover-editor :deep(.ant-btn) {
  width: 26px;
  height: 26px;
  padding: 0;
}
.playlist-content-head {
  display: grid;
  grid-template-columns: minmax(120px, 1.25fr) minmax(100px, 0.8fr) 92px;
  gap: 7px;
  margin-left: 34px;
  padding: 8px 10px 4px;
  border-top: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.playlist-content-head span:last-child {
  text-align: right;
}
.playlist-tracks {
  padding: 2px 8px 8px;
}
.playlist-track-row {
  display: grid;
  min-height: 42px;
  grid-template-columns: 25px minmax(120px, 1.25fr) minmax(100px, 0.8fr) 92px;
  align-items: center;
  gap: 7px;
}
.playlist-empty {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-top: 1px solid color-mix(in srgb, var(--border) 56%, transparent);
  color: var(--c-text-3);
  font-size: 0.66rem;
}
.playlist-empty > svg {
  color: var(--c-primary);
  font-size: 1rem;
}
.music-config-actions {
  position: sticky;
  z-index: 2;
  bottom: -1px;
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0 0;
  border-top: 1px solid var(--border);
  background: var(--ld-bg-card);
}
.music-config-actions > span {
  color: var(--c-text-3);
  font-size: 0.61rem;
}
.music-config-actions > div {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
.source-toolbar {
  display: grid;
  grid-template-columns: auto auto minmax(160px, 1fr) auto;
  gap: 8px;
}
.source-search {
  margin-top: 12px;
}
.source-track-list {
  display: grid;
  max-height: 430px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  overflow-y: auto;
  margin-top: 10px;
  padding: 2px;
}
.source-track {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 0;
  border-radius: 7px;
  background: var(--c-bg-1);
  color: inherit;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;
}
.source-select {
  display: grid;
  min-width: 0;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  padding: 2px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.source-preview {
  display: grid;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}
.source-preview:hover,
.source-preview.active {
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
  color: var(--c-primary);
}
.source-preview:active {
  transform: scale(0.9);
}
.source-preview-audio {
  display: none;
}
.source-track:hover,
.source-track.selected {
  background: var(--c-primary-soft);
}
.source-track:active {
  transform: scale(0.985);
}
.source-check {
  display: grid;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-text-3) 10%, transparent);
  color: var(--c-text-3);
  font-size: 0.62rem;
  place-items: center;
}
.source-track.selected .source-check {
  background: var(--c-primary);
  color: #fff;
}
.source-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.source-copy strong,
.source-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-copy strong {
  font-size: 0.72rem;
}
.source-copy small {
  color: var(--c-text-3);
  font-size: 0.62rem;
}
.secret-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
@media (max-width: 760px) {
  .preference-grid {
    grid-template-columns: 1fr;
  }
  .volume-row {
    grid-column: auto;
  }
  .volume-control {
    width: min(280px, 40vw);
  }
  .advanced-fields {
    grid-template-columns: 1fr;
  }
  .playlist-row {
    grid-template-columns: 28px 24px minmax(0, 1fr) auto;
  }
  .playlist-visible {
    grid-column: 3;
  }
  .playlist-track-count {
    grid-column: 4;
    grid-row: 2;
  }
  .playlist-actions {
    grid-column: 1 / -1;
    padding-top: 5px;
    border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  }
}
@media (max-width: 520px) {
  .config-section-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .playlist-workspace-head {
    align-items: stretch;
  }
  .playlist-workspace-head :deep(.ant-btn) {
    align-self: flex-end;
  }
  .preference-row {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    padding-inline: 9px;
  }
  .volume-row {
    grid-template-columns: 32px minmax(0, 1fr);
  }
  .volume-control {
    width: 100%;
    grid-column: 1 / -1;
  }
  .playlist-content-head {
    display: none;
  }
  .secret-field {
    grid-template-columns: 1fr;
  }
  .source-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .source-track-list {
    grid-template-columns: 1fr;
  }
  .playlist-track-row {
    min-height: 70px;
    grid-template-columns: 22px minmax(0, 1fr) 92px;
    grid-template-rows: 30px 30px;
  }
  .playlist-track-order {
    grid-row: 1 / 3;
  }
  .playlist-track-row > :deep(.ant-input):nth-of-type(2) {
    grid-column: 2;
    grid-row: 2;
  }
  .track-actions {
    grid-column: 3;
    grid-row: 1 / 3;
  }
  .music-config-actions {
    align-items: stretch;
    flex-direction: column;
    padding-bottom: 4px;
  }
  .music-config-actions > span {
    display: none;
  }
  .music-config-actions > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
