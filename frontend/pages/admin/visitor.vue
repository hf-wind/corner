<template>
  <main class="access-admin admin-page-shell">
    <header class="admin-page-head">
      <div>
        <span>VISITOR JOURNEYS</span>
        <h1>访问管理</h1>
        <p>按访客与会话还原进入、浏览、阅读和离开的完整链路。</p>
      </div>
      <AdminRefreshButton :loading="loading" @click="loadAccess" />
    </header>
    <div class="access-toolbar table-toolbar">
      <a-input-search
        v-model:value="keyword"
        allow-clear
        placeholder="搜索访客昵称或指纹"
        class="access-search"
        @search="applySearch"
      /><span class="toolbar-spacer" /><span class="access-count"
        >共 {{ total }} 位访客</span
      >
    </div>
    <section class="access-workspace">
      <div class="visitor-pane admin-table-shell">
        <a-table
          :loading="loading"
          :data-source="items"
          :columns="columns"
          :pagination="false"
          row-key="visitorIdHash"
          size="small"
          :custom-row="visitorRow"
          :row-class-name="rowClassName"
          :locale="{ emptyText: '尚无访问记录' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'visitor'"
              ><div class="visitor-cell">
                <span class="visitor-avatar"
                  ><Icon :name="deviceIcon(record.environment)"
                /></span>
                <div>
                  <strong>{{ safeNickname(record.nickname) }}</strong
                  ><small
                    >{{ record.region || "未知地区" }} ·
                    {{ shortHash(record.visitorIdHash) }}</small
                  >
                </div>
              </div></template
            >
            <template v-else-if="column.key === 'activity'"
              ><strong class="metric">{{ record.eventCount }}</strong
              ><small class="metric-note"> 条上报</small></template
            >
            <template v-else-if="column.key === 'environment'"
              ><span class="environment">{{
                record.environment || "环境信息待上报"
              }}</span></template
            >
            <template v-else-if="column.key === 'lastSeenAt'">{{
              formatDateTime(record.lastSeenAt)
            }}</template>
          </template>
        </a-table>
        <AdminPagination
          v-model:current="page"
          :total="total"
          :page-size="limit"
          :show-size-changer="false"
          @change="loadAccess"
        />
      </div>
      <aside class="journey-pane">
        <div v-if="!selected" class="journey-empty">
          <Icon name="ph:path-bold" /><strong>选择一位访客</strong
          ><span>这里会按会话和时间展示完整访问链路。</span>
        </div>
        <template v-else>
          <header class="journey-head">
            <div>
              <span>访问链路</span>
              <h2>{{ safeNickname(selected.nickname) }}</h2>
              <p>
                {{ selected.region || "未知地区" }} ·
                {{ selected.environment || "环境信息待上报" }}
              </p>
            </div>
            <a-button
              size="small"
              :loading="timelineLoading"
              @click="loadTimeline"
              ><Icon name="ph:arrows-clockwise-bold"
            /></a-button>
          </header>
          <div class="session-filter">
            <button
              type="button"
              :class="{ active: !sessionFilter }"
              @click="selectSession('')"
            >
              全部会话</button
            ><button
              v-for="(session, index) in sessions"
              :key="session"
              type="button"
              :class="{ active: sessionFilter === session }"
              @click="selectSession(session)"
            >
              会话 {{ sessions.length - index }}
            </button>
          </div>
          <a-spin :spinning="timelineLoading" class="timeline-spin"
            ><ol v-if="events.length" class="timeline">
              <li v-for="event in events" :key="event.id" class="timeline-item">
                <span class="event-icon"
                  ><Icon :name="eventMeta(event.action).icon"
                /></span>
                <div class="event-body">
                  <header>
                    <strong>{{ eventMeta(event.action).label }}</strong
                    ><time>{{ formatDateTime(event.createdAt) }}</time>
                  </header>
                  <p>{{ eventTitle(event) }}</p>
                  <div class="event-tags">
                    <span v-if="event.contentType">{{
                      contentLabel(event.contentType)
                    }}</span
                    ><span v-if="durationLabel(event)"
                      >停留 {{ durationLabel(event) }}</span
                    ><span v-if="event.identity === 'user'">登录用户</span>
                  </div>
                  <details v-if="hasMetadata(event)">
                    <summary>具体信息</summary>
                    <pre>{{ formatMetadata(event.metadata) }}</pre>
                  </details>
                </div>
              </li>
            </ol>
            <div v-else class="journey-empty compact">
              <Icon name="ph:wind-bold" /><span>这位访客暂时没有上报链路</span>
            </div></a-spin
          >
        </template>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
const api = useApi();
const toast = useToast();
const loading = ref(false);
const timelineLoading = ref(false);
const keyword = ref("");
const appliedKeyword = ref("");
const page = ref(1);
const limit = 15;
const total = ref(0);
const items = ref<any[]>([]);
const selected = ref<any | null>(null);
const events = ref<any[]>([]);
const sessions = ref<string[]>([]);
const sessionFilter = ref("");
const columns: TableColumnsType = [
  { key: "visitor", title: "访客", width: 220 },
  { key: "environment", title: "访问环境", ellipsis: true },
  { key: "activity", title: "链路", width: 86 },
  { key: "lastSeenAt", title: "最近到访", width: 146 },
];
const EVENT_META: Record<string, { label: string; icon: string }> = {
  page_view: { label: "进入页面", icon: "ph:arrow-square-in-bold" },
  page_leave: { label: "离开页面", icon: "ph:arrow-square-out-bold" },
  content_read: { label: "阅读内容", icon: "ph:book-open-text-bold" },
  click: { label: "页面交互", icon: "ph:cursor-click-bold" },
};
function eventMeta(action: string) {
  return (
    EVENT_META[action] || {
      label: action || "未知事件",
      icon: "ph:dot-outline-fill",
    }
  );
}
function safeNickname(value: unknown) {
  return String(value || "神秘访客").replace(/undefined/gi, "旅人");
}
function shortHash(hash: string) {
  return String(hash || "").slice(0, 8);
}
function deviceIcon(environment: string) {
  return /手机|Android|iOS/i.test(environment || "")
    ? "ph:device-mobile-bold"
    : /平板|Tablet|iPad/i.test(environment || "")
      ? "ph:device-tablet-bold"
      : "ph:desktop-bold";
}
function contentLabel(type: string) {
  return (
    (
      {
        article: "文章",
        library: "书影",
        circle: "风讯角",
        page: "页面",
        admin: "后台",
      } as Record<string, string>
    )[type] || type
  );
}
function formatDateTime(value: string) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(value))
    : "—";
}
function durationLabel(event: any) {
  const ms = Number(event?.metadata?.durationMs || 0);
  if (!ms) return "";
  return ms < 60_000
    ? `${Math.max(1, Math.round(ms / 1000))} 秒`
    : `${Math.round(ms / 60_000)} 分钟`;
}
function eventTitle(event: any) {
  return String(
    event?.metadata?.title || event.path || event.sourceId || "未提供页面信息",
  );
}
function hasMetadata(event: any) {
  return (
    event?.metadata &&
    Object.keys(event.metadata).filter(
      (key) => !["title", "durationMs"].includes(key),
    ).length > 0
  );
}
function formatMetadata(metadata: unknown) {
  return JSON.stringify(metadata || {}, null, 2);
}
function rowClassName(record: any) {
  return selected.value?.visitorIdHash === record.visitorIdHash
    ? "is-selected"
    : "";
}
function visitorRow(record: any) {
  return { onClick: () => selectVisitor(record) };
}
function applySearch() {
  page.value = 1;
  appliedKeyword.value = keyword.value.trim();
  void loadAccess();
}
async function loadAccess() {
  loading.value = true;
  try {
    const result = await api.get<any>("/visitor/admin/access", {
      q: appliedKeyword.value || undefined,
      page: page.value,
      limit,
    });
    items.value = result.items || [];
    total.value = result.total || 0;
    if (!selected.value && items.value.length)
      await selectVisitor(items.value[0]);
  } catch (error: any) {
    toast.error(error?.message || "访问记录读取失败");
  } finally {
    loading.value = false;
  }
}
async function selectVisitor(record: any) {
  selected.value = record;
  sessionFilter.value = "";
  await loadTimeline();
}
async function selectSession(value: string) {
  sessionFilter.value = value;
  await loadTimeline();
}
async function loadTimeline() {
  if (!selected.value) return;
  timelineLoading.value = true;
  try {
    const result = await api.get<any>(
      `/visitor/admin/access/${selected.value.visitorIdHash}/timeline`,
      { sessionId: sessionFilter.value || undefined, limit: 300 },
    );
    events.value = result.events || [];
    if (!sessionFilter.value) sessions.value = result.sessions || [];
  } catch (error: any) {
    events.value = [];
    toast.error(error?.message || "访问链路读取失败");
  } finally {
    timelineLoading.value = false;
  }
}
onMounted(loadAccess);
useHead({ title: "访问管理 · 管理" });
</script>

<style scoped>
.access-toolbar {
  margin-bottom: 12px;
}
.access-search {
  width: min(320px, 100%);
}
.access-count {
  color: var(--c-text-3);
  font-size: 0.68rem;
}
.access-workspace {
  display: grid;
  grid-template-columns: minmax(520px, 1.1fr) minmax(340px, 0.9fr);
  gap: 14px;
  min-height: 560px;
}
.visitor-pane {
  min-width: 0;
}
.visitor-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.visitor-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 8px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  place-items: center;
}
.visitor-cell div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.visitor-cell strong {
  color: var(--c-text);
  font-size: 0.76rem;
}
.visitor-cell small,
.metric-note {
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.environment {
  color: var(--c-text-2);
  font-size: 0.68rem;
}
.metric {
  color: var(--c-primary);
}
.visitor-pane :deep(.ant-table-row) {
  cursor: pointer;
}
.visitor-pane :deep(.ant-table-row.is-selected > td) {
  background: color-mix(
    in srgb,
    var(--c-primary-soft) 64%,
    transparent
  ) !important;
}
.journey-pane {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ld-bg-card);
  overflow: hidden;
}
.journey-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--border);
}
.journey-head span {
  color: var(--c-primary);
  font: 700 0.52rem var(--font-mono);
  letter-spacing: 0.14em;
}
.journey-head h2 {
  margin: 3px 0;
  font-size: 1rem;
}
.journey-head p {
  color: var(--c-text-3);
  font-size: 0.62rem;
}
.session-filter {
  display: flex;
  gap: 6px;
  padding: 12px 0;
  overflow-x: auto;
}
.session-filter button {
  flex: 0 0 auto;
  padding: 5px 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.62rem;
}
.session-filter button.active {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.timeline-spin {
  display: block;
}
.timeline {
  max-height: calc(100dvh - 300px);
  margin: 0;
  padding: 2px 2px 20px;
  overflow: auto;
  list-style: none;
}
.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  padding-bottom: 16px;
}
.timeline-item:not(:last-child)::before {
  position: absolute;
  top: 29px;
  bottom: 1px;
  left: 14px;
  width: 1px;
  background: var(--border);
  content: "";
}
.event-icon {
  z-index: 1;
  display: grid;
  width: 30px;
  height: 30px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, var(--border));
  border-radius: 50%;
  background: var(--ld-bg-card);
  color: var(--c-primary);
  place-items: center;
}
.event-body {
  min-width: 0;
  padding-top: 2px;
}
.event-body header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.event-body strong {
  font-size: 0.72rem;
}
.event-body time {
  color: var(--c-text-3);
  font: 0.54rem var(--font-mono);
}
.event-body p {
  margin: 3px 0 6px;
  overflow-wrap: anywhere;
  color: var(--c-text-2);
  font-size: 0.66rem;
  line-height: 1.5;
}
.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.event-tags span {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  font-size: 0.54rem;
}
details {
  margin-top: 7px;
  color: var(--c-text-3);
  font-size: 0.58rem;
}
details summary {
  cursor: pointer;
}
pre {
  max-height: 150px;
  margin-top: 5px;
  padding: 8px;
  overflow: auto;
  border-radius: 6px;
  background: var(--c-bg-2);
  font: 0.55rem/1.5 var(--font-mono);
  white-space: pre-wrap;
}
.journey-empty {
  display: grid;
  min-height: 420px;
  color: var(--c-text-3);
  place-content: center;
  place-items: center;
  gap: 7px;
  text-align: center;
}
.journey-empty > svg {
  color: var(--c-primary);
  font-size: 2rem;
}
.journey-empty strong {
  color: var(--c-text);
}
.journey-empty span {
  font-size: 0.66rem;
}
.journey-empty.compact {
  min-height: 240px;
}
@media (max-width: 1050px) {
  .access-workspace {
    grid-template-columns: 1fr;
  }
  .journey-pane {
    min-height: 420px;
  }
  .timeline {
    max-height: 520px;
  }
}
@media (max-width: 680px) {
  .access-workspace {
    display: block;
  }
  .journey-pane {
    margin-top: 12px;
    padding: 14px;
  }
  .visitor-pane {
    overflow-x: auto;
  }
}
</style>
