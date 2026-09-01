<template>
  <main class="changelog-admin admin-page-shell">
    <header class="admin-page-head changelog-head">
      <div>
        <span>RELEASE NOTES / SOURCES</span>
        <h1>风迹墙</h1>
        <p>仓库记录会自动读取和整理，人工补记只负责补充提交信息没有说清的内容。</p>
      </div>
      <div class="head-actions">
        <a-button href="/changelog" target="_blank">
          <Icon name="ph:arrow-square-out-bold" />查看页面
        </a-button>
        <a-button :loading="syncing" @click="syncGit">
          <Icon name="ph:arrows-clockwise-bold" />立即刷新
        </a-button>
        <a-button type="primary" :loading="saving" @click="saveConfig">
          <Icon name="ph:floppy-disk-bold" />保存设置
        </a-button>
      </div>
    </header>

    <a-tabs v-model:activeKey="activeTab" size="small" class="changelog-tabs">
      <a-tab-pane key="stream" tab="更新记录" />
      <a-tab-pane key="config" tab="配置" />
    </a-tabs>
    <a-spin :spinning="loading">
      <div v-show="activeTab === 'stream'">
      <section class="source-overview">
        <span class="source-icon"><Icon name="ph:github-logo-bold" /></span>
        <div class="source-copy">
          <small>PRIMARY SOURCE</small>
          <strong>{{ repositoryLabel }}</strong>
          <p>
            优先读取 PushEvent 并按单次推送分组；接口受限时自动回退到 Git
            提交流，本地运行时可直接读取当前 Git 历史。
          </p>
        </div>
        <div class="source-state" :class="adminData.sourceStatus">
          <i />
          <span>{{ adminData.sourceLabel || "等待首次同步" }}</span>
          <small v-if="adminData.fetchedAt">
            {{
              adminData.sourceStatus === "unavailable" ? "最后检查" : "同步于"
            }}
            {{ formatTime(adminData.fetchedAt) }}
          </small>
        </div>
        <div class="token-state">
          <Icon
            :name="
              adminData.tokenConfigured
                ? 'ph:shield-check-bold'
                : 'ph:shield-warning-bold'
            "
          />
          <span>
            {{ tokenStateLabel }}
          </span>
        </div>
      </section>

      <div class="admin-columns single-column">
        <div class="admin-side-column">
          <section class="manual-panel" :class="{ collapsed: !manualExpanded }">
            <header class="panel-head manual-head" @click="manualExpanded = !manualExpanded">
              <span><Icon name="ph:note-pencil-bold" /></span>
              <div>
                <h2>人工补记</h2>
                <p>适合记录内容迁移、运营调整或无法公开的提交。</p>
              </div>
              <div class="manual-head-actions">
                <button type="button" title="添加记录" @click.stop="openCreate"><Icon name="ph:plus-bold" /></button>
                <button type="button" :title="manualExpanded ? '收起人工补记' : '展开人工补记'" @click.stop="manualExpanded = !manualExpanded">
                  <Icon :name="manualExpanded ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" />
                </button>
              </div>
            </header>

            <div v-if="manualExpanded && adminData.manualEntries.length" class="manual-list">
              <article
                v-for="entry in adminData.manualEntries"
                :key="entry.id"
                class="manual-entry"
              >
                <span class="entry-state" :class="{ muted: !entry.published }">
                  <i />{{ entry.published ? "公开" : "草稿" }}
                </span>
                <div>
                  <time>{{ formatDate(entry.publishedAt) }}</time>
                  <strong>{{ entry.title }}</strong>
                  <small>{{ entry.items.length }} 项变更</small>
                </div>
                <div class="row-actions">
                  <button type="button" title="编辑" @click="openEdit(entry)">
                    <Icon name="ph:pencil-simple-bold" />
                  </button>
                  <button
                    type="button"
                    class="danger"
                    title="删除"
                    @click="removeEntry(entry)"
                  >
                    <Icon name="ph:trash-bold" />
                  </button>
                </div>
              </article>
            </div>
            <div v-else-if="manualExpanded" class="manual-empty">
              <Icon name="ph:note-blank-bold" />
              <strong>还没有人工补记</strong>
              <p>Git 记录会照常自动生成，无需重复录入。</p>
              <button type="button" @click="openCreate">添加第一条</button>
            </div>
          </section>

          <section class="automatic-panel">
            <header class="panel-head">
              <span><Icon name="ph:git-branch-bold" /></span>
              <div>
                <h2>自动记录预览</h2>
                <p>以下内容只读，由仓库同步与提交信息整理生成。</p>
              </div>
              <small>{{ automaticItemCount }} 项改动</small>
            </header>

            <div
              v-if="adminData.automaticReleases.length"
              class="automatic-list"
            >
              <article
                v-for="release in adminData.automaticReleases.slice(0, 6)"
                :key="release.id"
              >
                <time>{{ formatDate(release.publishedAt) }}</time>
                <div>
                  <strong>{{ release.title }}</strong>
                  <span>{{
                    release.items.map((item) => item.text).join(" · ")
                  }}</span>
                </div>
                <small>{{ release.items.length }}</small>
              </article>
            </div>
            <div v-else class="automatic-empty">
              <Icon
                name="ph:cloud-arrow-down-bold"
              />服务会自动读取仓库记录，也可以点击“立即刷新”马上检查
            </div>
          </section>
        </div>
      </div>
      </div>
      <div v-show="activeTab === 'config'" class="config-tab-note">
        <a-alert type="info" show-icon message="风迹配置" description="维护公开入口、仓库来源与同步周期，保存后立即用于下一次同步。" />
        <section class="config-tab-form">
          <div class="enable-setting"><div><strong>公开风迹墙</strong><small>关闭后前台菜单自动隐藏，已有记录仍会保留。</small></div><a-switch v-model:checked="config.enabled" /></div>
          <a-form layout="vertical" class="settings-form">
            <a-form-item label="页面标题"><a-input v-model:value="config.title" maxlength="80" /></a-form-item>
            <a-form-item label="页面描述"><a-textarea v-model:value="config.subtitle" :rows="3" maxlength="240" show-count /></a-form-item>
            <div class="repository-fields"><a-form-item label="仓库所有者"><a-input v-model:value="config.repositoryOwner" /></a-form-item><a-form-item label="仓库名称"><a-input v-model:value="config.repositoryName" /></a-form-item><a-form-item label="分支"><a-input v-model:value="config.branch" /></a-form-item></div>
            <div class="number-fields"><a-form-item label="缓存时间"><a-input-number v-model:value="config.cacheTtl" :min="300" :max="86400" addon-after="秒" /></a-form-item><a-form-item label="自动记录数量"><a-input-number v-model:value="config.maxGroups" :min="4" :max="30" addon-after="组" /></a-form-item></div>
            <a-button type="primary" :loading="saving" @click="saveConfig"><Icon name="ph:floppy-disk-bold" />保存设置</a-button>
          </a-form>
        </section>
      </div>
    </a-spin>

    <a-modal
      v-model:open="dialog.open"
      :title="dialog.editing ? '编辑人工补记' : '添加人工补记'"
      ok-text="保存记录"
      cancel-text="取消"
      :confirm-loading="dialog.saving"
      width="620px"
      @ok="saveEntry"
    >
      <a-form layout="vertical" class="entry-form">
        <a-form-item label="更新标题" required>
          <a-input
            v-model:value="dialog.title"
            maxlength="100"
            placeholder="概括这次更新"
          />
        </a-form-item>
        <a-form-item label="一句摘要">
          <a-textarea
            v-model:value="dialog.summary"
            :rows="2"
            maxlength="320"
            placeholder="可选，用一句话说明这次更新的背景"
          />
        </a-form-item>
        <div class="entry-meta-fields">
          <a-form-item label="记录时间" required>
            <a-date-picker
              v-model:value="dialog.date"
              show-time
              format="YYYY-MM-DD HH:mm"
              :allow-clear="false"
            />
          </a-form-item>
          <a-form-item label="公开展示">
            <a-switch v-model:checked="dialog.published" />
          </a-form-item>
        </div>
        <a-form-item label="变更列表" required>
          <div class="entry-items">
            <div v-for="(_, index) in dialog.items" :key="index">
              <span>{{ String(index + 1).padStart(2, "0") }}</span>
              <a-input
                v-model:value="dialog.items[index]"
                maxlength="240"
                placeholder="写清楚一项具体变化"
              />
              <button
                type="button"
                title="移除此项"
                :disabled="dialog.items.length === 1"
                @click="dialog.items.splice(index, 1)"
              >
                <Icon name="ph:minus-bold" />
              </button>
            </div>
            <button
              type="button"
              class="add-item"
              @click="dialog.items.push('')"
            >
              <Icon name="ph:plus-bold" />添加一项
            </button>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </main>
</template>

<script setup lang="ts">
import { Modal } from "ant-design-vue";
import dayjs, { type Dayjs } from "dayjs";
import type {
  ChangelogAdminResponse,
  ChangelogConfig,
  ChangelogRelease,
} from "@/types/changelog";

const api = useApi();
const toast = useToast();
const loading = ref(true);
const activeTab = ref<'stream' | 'config'>('stream');
const saving = ref(false);
const syncing = ref(false);
const manualExpanded = ref(false);
const config = reactive<ChangelogConfig>({
  enabled: true,
  title: "风迹墙",
  subtitle:
    "风过无声，循迹可寻。每一次改变，都在时间里留下属于自己的印记，那些细微的更迭与变化，也终将成为一路走来不可忽略的痕迹。",
  repositoryOwner: "hf-wind",
  repositoryName: "corner",
  branch: "main",
  cacheTtl: 1800,
  maxGroups: 30,
});
const adminData = reactive<ChangelogAdminResponse>({
  config: { ...config },
  manualEntries: [],
  automaticReleases: [],
  fetchedAt: "",
  sourceStatus: "unavailable",
  sourceLabel: "",
  tokenConfigured: false,
});
const dialog = reactive({
  open: false,
  editing: false,
  id: "",
  saving: false,
  title: "",
  summary: "",
  date: dayjs() as Dayjs,
  published: true,
  items: [""] as string[],
});

const repositoryLabel = computed(
  () => `${config.repositoryOwner}/${config.repositoryName} · ${config.branch}`,
);
const automaticItemCount = computed(() =>
  adminData.automaticReleases.reduce(
    (total, release) => total + release.items.length,
    0,
  ),
);
const tokenStateLabel = computed(() => {
  if (adminData.tokenConfigured) return "已配置 GitHub Token";
  if (adminData.sourceStatus === "unavailable")
    return "未配置 Token，请检查仓库访问";
  if (adminData.sourceLabel === "本地 Git 提交")
    return "未配置 Token，当前使用本地 Git";
  return "未配置 Token，当前使用公开数据源";
});

async function load() {
  loading.value = true;
  try {
    const result = await api.get<ChangelogAdminResponse>("/changelog/admin");
    Object.assign(adminData, result);
    Object.assign(config, result.config);
  } catch (error: any) {
    toast.error(error?.message || "风迹配置加载失败");
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  saving.value = true;
  try {
    const result = await api.put<ChangelogConfig>(
      "/changelog/admin/config",
      config,
    );
    Object.assign(config, result);
    toast.success("风迹设置已保存");
  } catch (error: any) {
    toast.error(error?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function syncGit() {
  syncing.value = true;
  try {
    const result = await api.post<any>("/changelog/admin/refresh");
    await load();
    if (result?.sourceStatus === "unavailable") {
      toast.warning(result?.sourceLabel || "代码仓库暂时无法读取");
    } else if (!result?.releases) {
      toast.info("仓库已连接，暂时没有可展示的提交");
    } else {
      toast.success(
        `已从${result?.sourceLabel || "代码仓库"}同步 ${result.releases} 组更新`,
      );
    }
  } catch (error: any) {
    toast.error(error?.message || "仓库同步失败");
  } finally {
    syncing.value = false;
  }
}

function resetDialog() {
  Object.assign(dialog, {
    open: true,
    editing: false,
    id: "",
    saving: false,
    title: "",
    summary: "",
    date: dayjs(),
    published: true,
    items: [""],
  });
}

function openCreate() {
  resetDialog();
}

function openEdit(entry: ChangelogRelease) {
  Object.assign(dialog, {
    open: true,
    editing: true,
    id: entry.id,
    saving: false,
    title: entry.title,
    summary: entry.summary || "",
    date: dayjs(entry.publishedAt),
    published: entry.published !== false,
    items: entry.items.map((item) => item.text),
  });
}

async function saveEntry() {
  const items = dialog.items.map((text) => text.trim()).filter(Boolean);
  if (!dialog.title.trim()) return void toast.warning("请填写更新标题");
  if (!items.length) return void toast.warning("至少填写一项变更");
  dialog.saving = true;
  const payload = {
    title: dialog.title.trim(),
    summary: dialog.summary.trim(),
    publishedAt: dialog.date.toISOString(),
    published: dialog.published,
    items: items.map((text) => ({ text })),
  };
  try {
    if (dialog.editing)
      await api.put(`/changelog/admin/entries/${dialog.id}`, payload);
    else await api.post("/changelog/admin/entries", payload);
    dialog.open = false;
    await load();
    toast.success(dialog.editing ? "人工补记已更新" : "人工补记已添加");
  } catch (error: any) {
    toast.error(error?.message || "记录保存失败");
  } finally {
    dialog.saving = false;
  }
}

function removeEntry(entry: ChangelogRelease) {
  Modal.confirm({
    title: "删除这条人工补记？",
    content: `「${entry.title}」删除后无法恢复，Git 自动记录不受影响。`,
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      try {
        await api.delete(`/changelog/admin/entries/${entry.id}`);
        adminData.manualEntries = adminData.manualEntries.filter(
          (item) => item.id !== entry.id,
        );
        toast.success("人工补记已删除");
      } catch (error: any) {
        toast.error(error?.message || "删除失败");
      }
    },
  });
}

function formatTime(value: string) {
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

function formatDate(value: string) {
  return dayjs(value).format("YYYY.MM.DD");
}

onMounted(load);
useHead({ title: "风迹墙管理" });
</script>

<style scoped>
.changelog-admin {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.changelog-head {
  align-items: center;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.head-actions :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.source-overview {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
  padding: 17px 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ld-bg-card);
}

.source-icon,
.panel-head > span {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1.12rem;
  place-items: center;
}

.source-copy {
  display: grid;
  gap: 3px;
}

.source-copy small {
  color: var(--c-primary);
  font: 700 0.49rem var(--font-mono);
}

.source-copy strong {
  color: var(--c-text);
  font-size: 0.78rem;
}

.source-copy p {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.59rem;
}

.source-state {
  display: grid;
  grid-template-columns: 7px auto;
  align-items: center;
  gap: 4px 7px;
  color: var(--c-text-2);
  font-size: 0.6rem;
}

.source-state i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a88748;
}

.source-state.connected i {
  background: #2f8b69;
}

.source-state.fallback i {
  background: var(--c-primary);
}

.source-state small {
  grid-column: 2;
  color: var(--c-text-3);
  font: 0.49rem var(--font-mono);
}

.token-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 7px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  font-size: 0.56rem;
}

.admin-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  align-items: start;
  gap: 18px;
  margin-top: 18px;
}
.admin-columns.single-column { grid-template-columns: minmax(0, 1fr); }

.admin-side-column {
  display: grid;
  min-width: 0;
  gap: 18px;
}

.settings-panel,
.manual-panel,
.automatic-panel {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ld-bg-card);
}

.panel-head {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.panel-head h2 {
  margin: 0 0 3px;
  color: var(--c-text);
  font-size: 0.8rem;
}

.panel-head p {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.58rem;
}

.manual-head > button {
  display: grid;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  cursor: pointer;
  place-items: center;
}

.manual-head { cursor: pointer; }
.manual-head-actions { display: flex; align-items: center; gap: 5px; }
.manual-head-actions button { display: grid; width: 32px; height: 32px; border: 0; border-radius: 7px; background: var(--c-primary-soft); color: var(--c-primary); cursor: pointer; place-items: center; transition: transform .25s ease, background-color .2s ease; }
.manual-head-actions button:hover { background: color-mix(in srgb, var(--c-primary-soft) 74%, var(--c-primary)); transform: translateY(-1px); }
.manual-panel.collapsed { padding-bottom: 14px; }

.enable-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 22px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
}

.enable-setting > div {
  display: grid;
  gap: 3px;
}

.enable-setting strong {
  color: var(--c-text);
  font-size: 0.7rem;
}

.enable-setting small {
  color: var(--c-text-3);
  font-size: 0.56rem;
}

.settings-form {
  margin-top: 13px;
}

.repository-fields,
.number-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.repository-fields :deep(.ant-form-item:last-child) {
  grid-column: 1 / -1;
}

.number-fields :deep(.ant-input-number-group-wrapper),
.number-fields :deep(.ant-input-number) {
  width: 100%;
}

.manual-list {
  max-height: 462px;
  margin-top: 18px;
  overflow-y: auto;
}

.manual-entry {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px 4px;
  border-top: 1px solid var(--border);
}

.entry-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #2f8569;
  font-size: 0.52rem;
}

.entry-state i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.entry-state.muted {
  color: var(--c-text-3);
}

.manual-entry > div:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.manual-entry time,
.manual-entry small {
  color: var(--c-text-3);
  font: 0.49rem var(--font-mono);
}

.manual-entry strong {
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.67rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 3px;
}

.row-actions button {
  display: grid;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
}

.row-actions button:hover {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

.row-actions button.danger:hover {
  background: color-mix(in srgb, #cf596b 10%, transparent);
  color: #cf596b;
}

.manual-empty {
  display: grid;
  min-height: 190px;
  align-content: center;
  justify-items: center;
  color: var(--c-text-3);
  text-align: center;
}

.manual-empty > :deep(svg) {
  color: var(--c-primary);
  font-size: 1.45rem;
}

.manual-empty strong {
  margin-top: 12px;
  color: var(--c-text);
  font-size: 0.7rem;
}

.manual-empty p {
  margin: 6px 0 14px;
  font-size: 0.56rem;
}

.manual-empty button {
  padding: 7px 11px;
  border: 0;
  border-radius: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.59rem;
}

.automatic-panel {
  margin-top: 0;
}

.automatic-panel .panel-head > small {
  color: var(--c-text-3);
  font: 0.52rem var(--font-mono);
}

.automatic-list {
  margin-top: 18px;
}

.automatic-list article {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 14px;
  min-height: 54px;
  padding: 9px 4px;
  border-top: 1px solid var(--border);
}

.automatic-list time,
.automatic-list article > small {
  color: var(--c-text-3);
  font: 0.51rem var(--font-mono);
}

.automatic-list article > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.automatic-list strong {
  color: var(--c-text);
  font-size: 0.68rem;
}

.automatic-list span {
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.55rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.automatic-list article > small {
  display: grid;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--c-bg-2);
  place-items: center;
}

.automatic-empty {
  display: flex;
  min-height: 112px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--c-text-3);
  font-size: 0.6rem;
}

.entry-meta-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
}

.entry-meta-fields :deep(.ant-picker) {
  width: 100%;
}

.entry-items {
  display: grid;
  gap: 8px;
}

.entry-items > div {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 7px;
}

.entry-items > div > span {
  color: var(--c-text-3);
  font: 0.5rem var(--font-mono);
}

.entry-items button {
  display: grid;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
}

.entry-items button:disabled {
  cursor: default;
  opacity: 0.35;
}

.entry-items .add-item {
  display: inline-flex;
  width: max-content;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  color: var(--c-primary);
  font: inherit;
  font-size: 0.58rem;
}

@media (max-width: 900px) {
  .source-overview {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .source-state {
    grid-column: 2;
  }

  .token-state {
    grid-column: 2;
    justify-self: start;
  }

  .admin-columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .changelog-head {
    align-items: flex-start;
  }

  .head-actions {
    width: 100%;
  }

  .source-overview {
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 14px;
  }

  .source-icon {
    width: 38px;
    height: 38px;
  }

  .repository-fields,
  .number-fields {
    grid-template-columns: 1fr;
  }

  .repository-fields :deep(.ant-form-item:last-child) {
    grid-column: auto;
  }

  .automatic-list article {
    grid-template-columns: minmax(0, 1fr) 24px;
  }

  .automatic-list time {
    grid-column: 1 / -1;
  }

  .entry-meta-fields {
    grid-template-columns: 1fr;
  }
}
</style>
