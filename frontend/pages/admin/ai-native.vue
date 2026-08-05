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
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "auth", ssr: false });
const api = useApi();
const toast = useToast();
const busy = ref("");
const analytics = ref<any>({});
const styleResult = ref<any>();
const privateQuery = ref("");
const privateResult = ref<any>();
const narrative = reactive({ kind: "weekly", theme: "" });
const narrativeResult = ref<any>();
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
async function load() {
  try {
    analytics.value = await api.get("/ai/admin/analytics");
  } catch {
    analytics.value = {};
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
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
