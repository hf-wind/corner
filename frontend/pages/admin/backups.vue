<template>
  <div class="admin-page-shell backup-page">
    <header class="admin-page-head">
      <div>
        <span>DISASTER RECOVERY</span>
        <h1>备份与恢复</h1>
        <p>管理完整迁移归档、密钥纳管状态、异地邮件副本与受控数据恢复。</p>
      </div>
      <a-button type="primary" :loading="creating" :disabled="busy" @click="createBackup">
        <Icon name="ph:cloud-arrow-up-bold" /> 手动完整备份
      </a-button>
    </header>

    <section class="task-status" :class="status.status">
      <span class="status-icon"><Icon :name="statusIcon" /></span>
      <div>
        <strong>{{ statusTitle }}</strong>
        <p>{{ status.message || '当前没有运行中的任务' }}</p>
      </div>
      <small v-if="status.finishedAt">{{ formatDate(status.finishedAt) }}</small>
    </section>

    <section class="summary-grid">
      <article>
        <Icon name="ph:archive-box-bold" />
        <div><small>可用归档</small><strong>{{ backups.length }}</strong><p>服务器本地保留记录</p></div>
      </article>
      <article>
        <Icon name="ph:hard-drives-bold" />
        <div><small>归档总量</small><strong>{{ formatBytes(totalBytes) }}</strong><p>不含恢复前临时副本</p></div>
      </article>
      <article>
        <Icon name="ph:shield-check-bold" />
        <div><small>敏感资产</small><strong>{{ managedCount }}/{{ inventory.assets.length }}</strong><p>AES-256 加密纳管</p></div>
      </article>
      <article>
        <Icon name="ph:envelope-simple-bold" />
        <div><small>最近异地副本</small><strong>{{ latestArchiveMail }}</strong><p>{{ latestMailLimit }}MB 内自动附加归档</p></div>
      </article>
    </section>

    <section class="asset-section">
      <header><div><span>ASSET INVENTORY</span><h2>迁移资产清单</h2></div><small>最近备份：{{ inventory.latestBackupId || '暂无' }}</small></header>
      <div class="asset-grid">
        <article v-for="asset in inventory.assets" :key="asset.key">
          <span :class="['asset-state', { managed: asset.managed }]">
            <Icon :name="asset.managed ? 'ph:check-bold' : 'ph:warning-bold'" />
          </span>
          <div><strong>{{ asset.label }}</strong><code>{{ asset.archivePath }}</code></div>
          <a-tag v-if="asset.encrypted" color="blue">已加密</a-tag>
          <a-tag v-else :color="asset.managed ? 'green' : 'orange'">{{ asset.managed ? '已纳管' : '待备份' }}</a-tag>
        </article>
      </div>
    </section>

    <section class="records-section">
      <header><div><span>RECOVERY POINTS</span><h2>备份记录</h2></div><AdminRefreshButton :loading="loading" @click="loadAll" /></header>
      <a-table
        row-key="backupId"
        :columns="columns"
        :data-source="pagedBackups"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1180 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'backup'">
            <div class="backup-id"><strong>{{ record.backupId }}</strong><small>{{ formatDate(record.createdAt) }}</small></div>
          </template>
          <template v-else-if="column.key === 'size'">{{ formatBytes(record.archiveBytes) }}</template>
          <template v-else-if="column.key === 'commit'"><code>{{ record.gitCommit?.slice(0, 10) || '—' }}</code></template>
          <template v-else-if="column.key === 'integrity'"><a-tag color="green"><Icon name="ph:check-circle-bold" /> SHA256 通过</a-tag></template>
          <template v-else-if="column.key === 'archiveEmail'">
            <div class="mail-state"><strong>{{ record.email?.archive?.status || '未记录' }}</strong><small>{{ record.email?.archive?.recipient || '—' }}</small><span>{{ record.email?.archive?.attached ? '含归档附件' : '仅报告' }}</span></div>
          </template>
          <template v-else-if="column.key === 'notificationEmail'">
            <div class="mail-state"><strong>{{ record.email?.notification?.status || '未记录' }}</strong><small>{{ record.email?.notification?.recipient || '—' }}</small></div>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="admin-row-actions">
              <a-button type="link" size="small" @click="openDetail(record)"><Icon name="ph:eye-bold" /> 详情</a-button>
              <a-button type="link" size="small" :disabled="busy" @click="openRestore(record)"><Icon name="ph:clock-counter-clockwise-bold" /> 恢复数据</a-button>
            </div>
          </template>
        </template>
      </a-table>
      <AdminPagination v-model:current="page" :page-size="pageSize" :total="backups.length" :show-size-changer="false" />
    </section>

    <a-modal v-model:open="detail.open" title="备份详情" :footer="null" width="min(680px, calc(100vw - 24px))">
      <div v-if="detail.item" class="backup-detail">
        <div><span>恢复点</span><strong>{{ detail.item.backupId }}</strong></div>
        <div><span>创建时间</span><strong>{{ formatDate(detail.item.createdAt) }}</strong></div>
        <div><span>归档大小</span><strong>{{ formatBytes(detail.item.archiveBytes) }}</strong></div>
        <div><span>Git 提交</span><code>{{ detail.item.gitCommit || '—' }}</code></div>
        <div><span>归档邮件</span><strong>{{ detail.item.email?.archive?.status || '未记录' }} · {{ detail.item.email?.archive?.recipient || '—' }}</strong></div>
        <div><span>管理员通知</span><strong>{{ detail.item.email?.notification?.status || '未记录' }} · {{ detail.item.email?.notification?.recipient || '—' }}</strong></div>
        <section><span>原始记录</span><pre>{{ JSON.stringify(detail.item, null, 2) }}</pre></section>
      </div>
    </a-modal>
    <a-modal v-model:open="restore.open" title="恢复历史数据" :confirm-loading="restore.loading" ok-text="创建安全备份并恢复" ok-type="danger" width="540px" @ok="confirmRestore">
      <a-alert type="warning" show-icon message="恢复会替换当前数据库与上传文件" description="系统会先自动创建一份完整安全备份。SSH、证书、环境变量和系统服务不会被网页恢复覆盖。" />
      <div class="restore-fields">
        <label><span>恢复点</span><a-input :value="restore.backupId" disabled /></label>
        <label><span>独立恢复口令</span><a-input-password v-model:value="restore.token" autocomplete="off" placeholder="输入服务器备份恢复口令" /></label>
        <label><span>确认文本</span><a-input v-model:value="restore.confirmation" :placeholder="`RESTORE ${restore.backupId}`" /><small>请输入：<code>RESTORE {{ restore.backupId }}</code></small></label>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "auth", ssr: false });

const api = useApi();
const toast = useToast();
const loading = ref(true);
const creating = ref(false);
const backups = ref<any[]>([]);
const page = ref(1);
const pageSize = 10;
const pagedBackups = computed(() => backups.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const inventory = reactive<any>({ latestBackupId: null, assets: [] });
const status = reactive<any>({ action: null, status: "idle", message: "" });
const restore = reactive({ open: false, loading: false, backupId: "", token: "", confirmation: "" });
const detail = reactive({ open: false, item: null as any });
let pollTimer: ReturnType<typeof setInterval> | null = null;

const columns = [
  { title: "恢复点", key: "backup", width: 190 },
  { title: "归档大小", key: "size", width: 100 },
  { title: "Git 提交", key: "commit", width: 110 },
  { title: "完整性", key: "integrity", width: 130 },
  { title: "异地归档邮箱", key: "archiveEmail", width: 230 },
  { title: "管理员通知", key: "notificationEmail", width: 220 },
  { title: "操作", key: "actions", width: 130, fixed: "right" as const },
];

const busy = computed(() => ["queued", "running"].includes(status.status));
const totalBytes = computed(() => backups.value.reduce((sum, item) => sum + Number(item.archiveBytes || 0), 0));
const managedCount = computed(() => inventory.assets.filter((item: any) => item.managed).length);
const latestArchiveMail = computed(() => backups.value[0]?.email?.archive?.status || "暂无记录");
const latestMailLimit = computed(() => backups.value[0]?.email?.attachmentLimitMb || 20);
const statusTitle = computed(() => ({ idle: "备份服务就绪", queued: "任务等待执行", running: "宿主机正在执行", completed: "最近任务已完成", failed: "最近任务执行失败" }[status.status as string] || "备份服务状态"));
const statusIcon = computed(() => ({ idle: "ph:check-circle-bold", queued: "ph:hourglass-medium-bold", running: "ph:spinner-gap-bold", completed: "ph:check-circle-bold", failed: "ph:warning-circle-bold" }[status.status as string] || "ph:info-bold"));

async function loadAll() {
  loading.value = true;
  try {
    const [records, assets, task] = await Promise.all([
      api.get<any>("/backups"),
      api.get<any>("/backups/inventory"),
      api.get<any>("/backups/status"),
    ]);
    backups.value = records.items || [];
    Object.assign(inventory, assets);
    Object.assign(status, task);
  } catch (error: any) {
    toast.error(error.message || "备份信息加载失败");
  } finally {
    loading.value = false;
  }
}

async function refreshStatus() {
  try {
    const task = await api.get<any>("/backups/status");
    const previous = status.status;
    Object.assign(status, task);
    if (["completed", "failed"].includes(task.status) && task.status !== previous) await loadAll();
  } catch { /* 下一轮轮询重试 */ }
}

async function createBackup() {
  creating.value = true;
  try {
    const result = await api.post<any>("/backups");
    Object.assign(status, { action: "backup", status: result.status, message: result.message });
    toast.success(result.message);
  } catch (error: any) {
    toast.error(error.message || "备份请求提交失败");
  } finally {
    creating.value = false;
  }
}

function openRestore(record: any) {
  restore.backupId = record.backupId;
  restore.token = "";
  restore.confirmation = "";
  restore.open = true;
}

function openDetail(record: any) {
  detail.item = record;
  detail.open = true;
}

async function confirmRestore() {
  if (!restore.token || restore.confirmation !== `RESTORE ${restore.backupId}`) {
    toast.warning("请输入恢复口令和完整确认文本");
    return;
  }
  restore.loading = true;
  try {
    const result = await api.post<any>(`/backups/${restore.backupId}/restore`, {
      recoveryToken: restore.token,
      confirmation: restore.confirmation,
    });
    restore.open = false;
    restore.token = "";
    Object.assign(status, { action: "restore", status: result.status, message: result.message });
    toast.success(result.message);
  } catch (error: any) {
    toast.error(error.message || "恢复请求提交失败");
  } finally {
    restore.loading = false;
  }
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";
}

onMounted(async () => {
  await loadAll();
  pollTimer = setInterval(refreshStatus, 5000);
});
onBeforeUnmount(() => { if (pollTimer) clearInterval(pollTimer); });
useHead({ title: "备份与恢复" });
</script>

<style scoped>
.backup-page{width:min(1280px,100%);margin:0 auto}.task-status{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:12px;margin-bottom:12px;padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.status-icon{display:grid;width:36px;height:36px;border-radius:8px;background:var(--c-primary-soft);color:var(--c-primary);place-items:center}.task-status.running .status-icon :deep(svg){animation:spin 1s linear infinite}.task-status.failed{border-color:color-mix(in srgb,#d95c5c 34%,var(--border))}.task-status.failed .status-icon{background:color-mix(in srgb,#d95c5c 12%,transparent);color:#d95c5c}.task-status strong{font-size:.75rem}.task-status p{margin:3px 0 0;color:var(--c-text-3);font-size:.58rem}.task-status small{color:var(--c-text-3);font-size:.56rem}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.summary-grid article{display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;padding:15px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.summary-grid article>svg{width:36px;height:36px;padding:9px;border-radius:8px;background:var(--c-primary-soft);color:var(--c-primary)}.summary-grid small,.summary-grid p{color:var(--c-text-3);font-size:.54rem}.summary-grid strong{display:block;margin-top:2px;font-size:.86rem}.summary-grid p{margin:4px 0 0}.asset-section,.records-section{margin-top:12px;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.asset-section>header,.records-section>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.asset-section header span,.records-section header span{color:var(--c-primary);font-size:.52rem;letter-spacing:.12em}.asset-section h2,.records-section h2{margin:3px 0 0;font-size:.9rem}.asset-section header small{color:var(--c-text-3);font-size:.58rem}.asset-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.asset-grid article{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--c-bg-1)}.asset-state{display:grid;width:28px;height:28px;border-radius:7px;background:color-mix(in srgb,#d79d37 12%,transparent);color:#b87914;place-items:center}.asset-state.managed{background:color-mix(in srgb,#43a977 12%,transparent);color:#34875e}.asset-grid strong{display:block;font-size:.62rem}.asset-grid code{display:block;margin-top:3px;color:var(--c-text-3);font-size:.5rem;overflow:hidden;text-overflow:ellipsis}.backup-id strong{display:block;font-size:.64rem}.backup-id small,.mail-state small,.mail-state span{display:block;margin-top:3px;color:var(--c-text-3);font-size:.52rem}.mail-state strong{font-size:.6rem}.restore-fields{display:grid;gap:14px;margin-top:18px}.restore-fields label>span{display:block;margin-bottom:6px;color:var(--c-text-2);font-size:.65rem}.restore-fields label>small{display:block;margin-top:5px;color:var(--c-text-3);font-size:.56rem}.backup-detail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.backup-detail>div{display:grid;gap:4px;padding:10px;border-radius:7px;background:var(--c-bg-1)}.backup-detail span{color:var(--c-text-3);font-size:.58rem}.backup-detail strong,.backup-detail code{overflow:hidden;color:var(--c-text);font-size:.65rem;text-overflow:ellipsis}.backup-detail section{grid-column:1/-1}.backup-detail pre{max-height:240px;margin:6px 0 0;padding:10px;overflow:auto;border-radius:7px;background:var(--c-bg-2);color:var(--c-text-2);font:10px/1.5 var(--font-mono);white-space:pre-wrap;word-break:break-word}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1000px){.summary-grid{grid-template-columns:repeat(2,1fr)}.asset-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.task-status{grid-template-columns:36px minmax(0,1fr)}.task-status>small{grid-column:2}.summary-grid,.asset-grid,.backup-detail{grid-template-columns:1fr}.asset-section,.records-section{padding:12px}}
</style>
