<template>
  <div class="native-page">
    <header>
      <div>
        <span>AI NATIVE</span>
        <h1>AI 体验与内容智能</h1>
        <p>
          汇总前台 AI
          体验事件，并管理语义索引、作者风格与记忆叙事；事件总数并不等同于模型调用次数。
        </p>
      </div>
      <a-button type="primary" :loading="busy === 'index'" @click="rebuildIndex"
        ><Icon name="ph:arrows-clockwise-bold" />重建索引</a-button
      >
    </header>
    <section class="metrics">
      <article>
        <small>AI 体验事件</small><strong>{{ analytics.total || 0 }}</strong>
      </article>
      <article>
        <small>AI 对话</small><strong>{{ analytics.chats || 0 }}</strong>
      </article>
      <article>
        <small>推荐来源点击</small
        ><strong>{{ analytics.sourceClicks || 0 }}</strong>
      </article>
      <article>
        <small>回答好评率</small
        ><strong>{{ analytics.helpfulRate || 0 }}<em>%</em></strong>
        <span
          >{{ analytics.helpful || 0 }} /
          {{ analytics.feedbackTotal || 0 }} 次反馈</span
        >
      </article>
      <article>
        <small>前台 Token</small
        ><strong>{{ formatNumber(usage.totals?.totalTokens) }}</strong
        ><span
          >输入 {{ formatNumber(usage.totals?.inputTokens) }} · 输出
          {{ formatNumber(usage.totals?.outputTokens) }}</span
        >
      </article>
      <article>
        <small>估算费用</small
        ><strong
          ><em>$</em>{{ formatCost(usage.totals?.estimatedCostUsd) }}</strong
        ><span>{{
          usage.pricing?.inputPerMillionUsd ||
          usage.pricing?.outputPerMillionUsd
            ? "按配置单价估算"
            : "尚未配置 Token 单价"
        }}</span>
      </article>
    </section>
    <section class="usage-panel">
      <header>
        <div>
          <span>FRONTEND USAGE</span>
          <h2>前台 AI 消耗明细</h2>
        </div>
        <small>关联足迹档案，按 Token 消耗排序</small>
      </header>
      <div class="usage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>身份</th>
              <th>账户</th>
              <th>最近足迹</th>
              <th>访问</th>
              <th>调用</th>
              <th>输入 Token</th>
              <th>输出 Token</th>
              <th>合计</th>
              <th>估算费用</th>
              <th>对话</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="actor in usage.actors || []"
              :key="`${actor.actorType}:${actor.actorId}`"
            >
              <td>
                <span class="actor-type" :class="actor.actorType">{{
                  actor.actorType === "user" ? "用户" : "访客"
                }}</span>
              </td>
              <td>
                <div class="actor-account">
                  <span class="actor-avatar">
                    <img v-if="actor.avatar" :src="actor.avatar" alt="" />
                    <b v-else>{{ String(actor.name || '访').charAt(0) }}</b>
                  </span>
                  <span><strong>{{ actor.name }}</strong><small>{{ actor.email || actor.bio || (actor.visitCount ? "访客足迹档案" : "未关联足迹档案") }}</small></span>
                </div>
              </td>
              <td><strong>{{ actor.region || "位置未知" }}</strong><small>{{ [actor.browser, deviceLabel(actor.device), formatTime(actor.lastSeenAt)].filter(Boolean).join(" · ") || "暂无足迹" }}</small></td>
              <td>{{ actor.visitCount || 0 }}<small>{{ actor.messageCount || 0 }} 条留言</small></td>
              <td>{{ actor.calls }}</td>
              <td>{{ formatNumber(actor.inputTokens) }}</td>
              <td>{{ formatNumber(actor.outputTokens) }}</td>
              <td>{{ formatNumber(actor.totalTokens) }}</td>
              <td>${{ formatCost(actor.estimatedCostUsd) }}</td>
              <td>
                <a-button
                  type="link"
                  size="small"
                  :disabled="!actor.conversationId"
                  @click="openConversation(actor)"
                  ><Icon name="ph:eye-bold" />查看</a-button
                >
              </td>
            </tr>
            <tr v-if="!(usage.actors || []).length">
              <td colspan="10" class="usage-empty">暂无前台 AI 消耗记录</td>
            </tr>
          </tbody>
        </table>
      </div>
      <a-pagination
        v-if="(usage.actorPagination?.total || 0) > usagePageSize"
        class="usage-pagination"
        size="small"
        :current="usagePage"
        :page-size="usagePageSize"
        :total="usage.actorPagination.total"
        :show-size-changer="false"
        @change="loadUsage"
      />
    </section>
    <div class="grid">
      <a-card title="作者风格档案" :bordered="false"
        ><p>从已发布文章和瞬间提取语气、节奏、词汇与结构偏好。</p>
        <a-button :loading="busy === 'style'" @click="rebuildStyle"
          >重新建立档案</a-button
        >
        <pre v-if="styleResult">{{
          JSON.stringify(styleResult.profile, null, 2)
        }}</pre></a-card
      ><a-card title="问问过去的自己" :bordered="false"
        ><a-textarea
          v-model:value="privateQuery"
          :rows="3"
          placeholder="例如：我过去如何看待独处？"
        /><a-button
          type="primary"
          :loading="busy === 'private'"
          @click="askPrivate"
          >检索私有内容</a-button
        >
        <p v-if="privateResult">{{ privateResult.answer }}</p>
        <a
          v-for="item in privateResult?.matches || []"
          :key="item.href"
          :href="item.href"
          >{{ item.title }} · {{ item.status }}</a
        ></a-card
      ><a-card title="记忆叙事" :bordered="false"
        ><a-select v-model:value="narrative.kind"
          ><a-select-option value="weekly">周记</a-select-option
          ><a-select-option value="monthly">月报</a-select-option
          ><a-select-option value="yearly">年度故事</a-select-option
          ><a-select-option value="route">记忆航线</a-select-option></a-select
        ><a-input
          v-model:value="narrative.theme"
          placeholder="主题（可选）"
        /><a-button
          type="primary"
          :loading="busy === 'narrative'"
          @click="generateNarrative"
          >生成草稿</a-button
        >
        <article v-if="narrativeResult">
          <h3>{{ narrativeResult.title }}</h3>
          <pre>{{ narrativeResult.content }}</pre>
        </article></a-card
      ><a-card title="动作统计" :bordered="false"
        ><div
          v-for="item in analytics.byAction || []"
          :key="item.action"
          class="action-row"
        >
          <span>{{ actionLabel(item.action) }}</span
          ><strong>{{ item.count }}</strong>
        </div></a-card
      >
    </div>

    <a-modal
      v-model:open="conversationOpen"
      :title="
        conversationDetail?.user?.username || selectedActor?.name || 'AI 对话'
      "
      width="min(720px, calc(100vw - 24px))"
      :footer="null"
      @cancel="closeConversation"
    >
      <a-spin :spinning="conversationLoading">
        <div
          v-if="conversationDetail?.messages?.length"
          class="conversation-list"
        >
          <div
            v-for="message in conversationDetail.messages"
            :key="message.id"
            class="conversation-message"
            :class="message.role"
          >
            <small
              >{{ message.role === "user" ? "访客" : "AI" }} ·
              {{ formatTime(message.createdAt) }}</small
            >
            <div>{{ message.content }}</div>
          </div>
        </div>
        <a-empty
          v-else-if="!conversationLoading"
          description="该身份暂无可查看的对话记录"
        />
        <a-pagination
          v-if="(conversationDetail?.total || 0) > conversationPageSize"
          class="conversation-pagination"
          size="small"
          :current="conversationPage"
          :page-size="conversationPageSize"
          :total="conversationDetail.total"
          :show-size-changer="false"
          @change="loadConversation"
        />
      </a-spin>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "auth", ssr: false });
const api = useApi();
const toast = useToast();
const busy = ref("");
const analytics = ref<any>({});
const usage = ref<any>({});
const usagePage = ref(1);
const usagePageSize = 15;
const styleResult = ref<any>();
const privateQuery = ref("");
const privateResult = ref<any>();
const narrative = reactive({ kind: "weekly", theme: "" });
const narrativeResult = ref<any>();
const conversationOpen = ref(false);
const conversationLoading = ref(false);
const conversationDetail = ref<any>();
const selectedActor = ref<any>();
const conversationPage = ref(1);
const conversationPageSize = 50;
const actionLabels: Record<string, string> = {
  exposure: "组件曝光",
  open: "打开 AI 面板",
  chat: "发起对话",
  feedback: "回答反馈",
  recommend_click: "点击推荐来源",
  related_click: "点击相关阅读",
  reading_end: "结束阅读",
};
function actionLabel(action: string) {
  return actionLabels[action] || action;
}
function formatNumber(value?: number) {
  return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
}
function formatCost(value?: number) {
  return (Number(value) || 0).toFixed(6);
}
function formatTime(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
function deviceLabel(value?: string) {
  return ({ mobile: "手机", tablet: "平板", desktop: "桌面端" } as Record<string, string>)[String(value || "")] || value || "";
}
async function loadUsage(page = usagePage.value) {
  usagePage.value = page;
  try {
    usage.value = await api.get("/ai/admin/usage", { page, pageSize: usagePageSize });
  } catch {
    usage.value = {};
  }
}
async function openConversation(actor: any) {
  selectedActor.value = actor;
  conversationDetail.value = null;
  conversationPage.value = 1;
  conversationOpen.value = true;
  await loadConversation(1);
}
async function loadConversation(page = 1) {
  if (!selectedActor.value?.conversationId) return;
  conversationLoading.value = true;
  conversationPage.value = page;
  try {
    conversationDetail.value = await api.get(
      `/ai/admin/conversations/${encodeURIComponent(selectedActor.value.conversationId)}`,
      { page, pageSize: conversationPageSize },
    );
  } catch {
    conversationDetail.value = null;
    toast.error("加载对话失败");
  } finally {
    conversationLoading.value = false;
  }
}
function closeConversation() {
  selectedActor.value = null;
  conversationDetail.value = null;
}
async function load() {
  try {
    const [analyticsResult, usageResult] = await Promise.all([
      api.get("/ai/admin/analytics"),
      api.get("/ai/admin/usage", { page: usagePage.value, pageSize: usagePageSize }),
    ]);
    analytics.value = analyticsResult;
    usage.value = usageResult;
  } catch {
    analytics.value = {};
    usage.value = {};
  }
}
async function rebuildIndex() {
  busy.value = "index";
  try {
    const r = await api.post<any>("/ai/admin/index/rebuild");
    toast.success(`已索引 ${r.indexed} 条内容`);
  } finally {
    busy.value = "";
  }
}
async function rebuildStyle() {
  busy.value = "style";
  try {
    styleResult.value = await api.post("/ai/admin/style/rebuild");
    toast.success("风格档案已更新");
  } finally {
    busy.value = "";
  }
}
async function askPrivate() {
  if (!privateQuery.value.trim()) return;
  busy.value = "private";
  try {
    privateResult.value = await api.post("/ai/admin/private-query", {
      query: privateQuery.value,
    });
  } finally {
    busy.value = "";
  }
}
async function generateNarrative() {
  busy.value = "narrative";
  try {
    narrativeResult.value = await api.post("/ai/admin/narratives", narrative);
    toast.success("叙事草稿已生成");
  } finally {
    busy.value = "";
  }
}
onMounted(load);
</script>
<style scoped>
.native-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow: auto;
}
.native-page > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.native-page header span {
  color: var(--c-primary);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.native-page h1 {
  margin: 5px 0;
  color: var(--c-text);
  font-size: 1.45rem;
}
.native-page header p,
.grid p {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.66rem;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}
.usage-panel {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--ld-bg-card);
}
.usage-panel > header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.usage-panel h2 {
  margin: 4px 0 0;
  font-size: 0.92rem;
}
.usage-panel header small {
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.usage-table-wrap {
  overflow-x: auto;
}
.usage-panel table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}
.usage-panel th,
.usage-panel td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
  color: var(--c-text-2);
  font-size: 0.62rem;
  text-align: left;
}
.usage-panel th {
  color: var(--c-text-3);
  font-size: 0.54rem;
  font-weight: 600;
}
.usage-panel td:nth-child(n + 3) {
  font-variant-numeric: tabular-nums;
}
.usage-panel td strong,
.usage-panel td small {
  display: block;
}
.actor-account { display:flex; min-width:190px; align-items:center; gap:8px; }
.actor-account > span:last-child { min-width:0; }
.actor-avatar { display:grid; width:32px; height:32px; flex:0 0 32px; overflow:hidden; border-radius:50%; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }
.actor-avatar img { width:100%; height:100%; object-fit:cover; }
.actor-avatar b { font-size:.7rem; }
.usage-pagination { display:flex; justify-content:center; margin-top:14px; }
.usage-panel td small {
  margin-top: 2px;
  color: var(--c-text-3);
  font-size: 0.5rem;
}
.actor-type {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.actor-type.guest {
  background: color-mix(in srgb, #d89454 12%, transparent);
  color: #bb6d2b;
}
.usage-empty {
  padding: 28px !important;
  text-align: center !important;
}
.metrics article {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--ld-bg-card);
}
.metrics small {
  display: block;
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.metrics strong {
  font-size: 1.35rem;
}
.metrics strong em {
  margin-left: 2px;
  color: var(--c-text-3);
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 600;
}
.metrics article > span {
  display: block;
  margin-top: 2px;
  color: var(--c-text-3);
  font-size: 0.5rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.grid :deep(.ant-card-body) {
  display: grid;
  gap: 10px;
}
.grid pre {
  max-height: 320px;
  overflow: auto;
  padding: 10px;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  font:
    11px/1.6 ui-monospace,
    monospace;
  white-space: pre-wrap;
}
.grid a {
  display: block;
  color: var(--c-primary);
  font-size: 0.62rem;
}
.action-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.65rem;
}
.conversation-list {
  display: flex;
  max-height: 58vh;
  flex-direction: column;
  gap: 11px;
  overflow-y: auto;
  padding: 4px 2px 12px;
}
.conversation-message {
  display: flex;
  max-width: 86%;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.conversation-message.user {
  align-self: flex-end;
  align-items: flex-end;
}
.conversation-message small {
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.conversation-message > div {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-1);
  color: var(--c-text-2);
  font-size: 0.72rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.conversation-message.user > div {
  border-color: color-mix(in srgb, var(--c-primary) 30%, transparent);
  background: var(--c-primary-soft);
  color: var(--c-text);
}
.conversation-pagination {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
@media (max-width: 800px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .native-page > header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
