<template>
  <section class="personal-ai-tools">
    <header><div><span>PERSONAL AI</span><h2>我的 AI 记忆工具</h2><p>这些工具只处理管理员自己的内容与写作记忆。</p></div></header>
    <div class="tool-grid">
      <article>
        <span class="tool-icon"><Icon name="ph:fingerprint-bold" /></span>
        <div><h3>作者风格档案</h3><p>从已发布文章和瞬间提取语气、节奏、词汇与结构偏好。</p></div>
        <a-button :loading="busy === 'style'" @click="rebuildStyle"><Icon name="ph:arrows-clockwise-bold" /> 重建档案</a-button>
        <pre v-if="styleResult">{{ JSON.stringify(styleResult.profile, null, 2) }}</pre>
      </article>
      <article>
        <span class="tool-icon"><Icon name="ph:brain-bold" /></span>
        <div><h3>问问过去的自己</h3><p>从自己的私有与公开内容中检索记忆线索。</p></div>
        <a-textarea v-model:value="privateQuery" :rows="3" placeholder="例如：我过去如何看待独处？" />
        <a-button type="primary" :loading="busy === 'private'" @click="askPrivate"><Icon name="ph:magnifying-glass-bold" /> 检索记忆</a-button>
        <p v-if="privateResult" class="answer">{{ privateResult.answer }}</p>
        <AppLink v-for="item in privateResult?.matches || []" :key="item.href" :to="item.href">{{ item.title }} · {{ item.status }}</AppLink>
      </article>
      <article>
        <span class="tool-icon"><Icon name="ph:notebook-bold" /></span>
        <div><h3>记忆叙事</h3><p>将已有内容整理为周记、月报、年度故事或记忆航线草稿。</p></div>
        <a-select v-model:value="narrative.kind">
          <a-select-option value="weekly">周记</a-select-option><a-select-option value="monthly">月报</a-select-option><a-select-option value="yearly">年度故事</a-select-option><a-select-option value="route">记忆航线</a-select-option>
        </a-select>
        <a-input v-model:value="narrative.theme" placeholder="主题（可选）" />
        <a-button type="primary" :loading="busy === 'narrative'" @click="generateNarrative"><Icon name="ph:sparkle-bold" /> 生成草稿</a-button>
        <div v-if="narrativeResult" class="narrative-result"><h4>{{ narrativeResult.title }}</h4><pre>{{ narrativeResult.content }}</pre></div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const api = useApi();
const toast = useToast();
const busy = ref("");
const styleResult = ref<any>();
const privateQuery = ref("");
const privateResult = ref<any>();
const narrative = reactive({ kind: "weekly", theme: "" });
const narrativeResult = ref<any>();

async function rebuildStyle() {
  busy.value = "style";
  try { styleResult.value = await api.post("/ai/admin/style/rebuild"); toast.success("风格档案已更新"); }
  catch (error: any) { toast.error(error?.message || "风格档案更新失败"); }
  finally { busy.value = ""; }
}
async function askPrivate() {
  if (!privateQuery.value.trim()) { toast.warning("请输入想检索的问题"); return; }
  busy.value = "private";
  try { privateResult.value = await api.post("/ai/admin/private-query", { query: privateQuery.value }); }
  catch (error: any) { toast.error(error?.message || "记忆检索失败"); }
  finally { busy.value = ""; }
}
async function generateNarrative() {
  busy.value = "narrative";
  try { narrativeResult.value = await api.post("/ai/admin/narratives", narrative); toast.success("叙事草稿已生成"); }
  catch (error: any) { toast.error(error?.message || "叙事生成失败"); }
  finally { busy.value = ""; }
}
</script>

<style scoped>
.personal-ai-tools{margin-top:16px;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.personal-ai-tools>header span{color:var(--c-primary);font-size:.52rem;letter-spacing:.12em}.personal-ai-tools h2{margin:3px 0 0;font-size:.9rem}.personal-ai-tools header p{margin:4px 0 14px;color:var(--c-text-3);font-size:.58rem}.tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.tool-grid article{display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:10px;padding:15px;border:1px solid var(--border);border-radius:8px;background:var(--c-bg-1)}.tool-icon{display:grid;width:34px;height:34px;border-radius:8px;background:var(--c-primary-soft);color:var(--c-primary);place-items:center}.tool-grid h3{margin:0;font-size:.72rem}.tool-grid p{margin:4px 0 0;color:var(--c-text-3);font-size:.56rem;line-height:1.65}.tool-grid :deep(.ant-select){width:100%}.tool-grid pre{width:100%;max-height:240px;margin:0;padding:10px;overflow:auto;border-radius:6px;background:var(--ld-bg-card);color:var(--c-text-2);font-size:.52rem;white-space:pre-wrap}.tool-grid a{color:var(--c-primary);font-size:.56rem}.tool-grid .answer{padding:10px;border-radius:6px;background:var(--ld-bg-card);color:var(--c-text-2)}.narrative-result{width:100%}.narrative-result h4{margin:0 0 7px;font-size:.65rem}@media(max-width:980px){.tool-grid{grid-template-columns:1fr}}
</style>
