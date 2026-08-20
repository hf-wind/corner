<template>
  <div class="editor-page">
    <a-spin :spinning="loading" class="table-spin">
      <div class="editor-layout" v-if="!loading">
        <div class="editor-main">
          <a-alert
            v-if="needsPublish"
            type="warning"
            show-icon
            class="pending-alert"
            message="有未发布修改，请到文章列表点击「发布」后前台才会更新"
          />
          <div class="editor-field">
            <a-input
              v-model:value="form.title"
              placeholder="输入文章标题…"
              class="title-input"
              :bordered="false"
            />
          </div>

          <div class="ai-selection-tools">
            <span>AI 选区</span
            ><button
              v-for="item in aiActions"
              :key="item.action"
              type="button"
              :disabled="aiTransforming"
              @click="transformSelection(item.action)"
            >
              <Icon :name="item.icon" />{{ item.label }}
            </button>
          </div>
          <div class="editor-field editor-field-grow">
            <client-only>
              <MdEditor
                v-if="editorReady"
                :key="editorKey"
                v-model="form.content"
                language="zh-CN"
                :toolbars="toolbars"
                :theme="editorTheme"
                @upload-img="onUploadImg"
                @save="save"
                class="md-editor"
              />
            </client-only>
          </div>
        </div>

        <div class="editor-sidebar">
          <a-card
            :bordered="false"
            class="meta-card"
            size="small"
            title="内容设置"
          >
            <div class="meta-row">
              <label>Slug</label>
              <a-input
                v-model:value="form.slug"
                placeholder="URL 标识"
                size="small"
              />
            </div>
            <div class="meta-row meta-row-inline">
              <label>推荐</label>
              <a-switch v-model:checked="form.featured" />
              <a-button size="small" @click="openVersions">
                <Icon name="ph:clock-counter-clockwise-bold" />版本记录
              </a-button>
              <a-button
                type="primary"
                size="small"
                @click="save"
                :loading="saving"
                style="margin-left: auto"
              >
                {{ saving ? "保存中…" : "保存" }}
              </a-button>
            </div>
          </a-card>

          <a-card :bordered="false" class="meta-card" size="small" title="分类">
            <a-tree-select
              v-model:value="form.categoryId"
              :tree-data="categoryTree"
              :fieldNames="{ label: 'name', value: 'id', children: 'children' }"
              placeholder="选择分类"
              allow-clear
              size="small"
              style="width: 100%"
            />
          </a-card>

          <a-card :bordered="false" class="meta-card" size="small" title="标签">
            <a-select
              v-model:value="form.tagIds"
              mode="multiple"
              size="small"
              style="width: 100%"
              placeholder="选择标签"
            >
              <a-select-option v-for="t in tags" :key="t.id" :value="t.id">{{
                t.name
              }}</a-select-option>
            </a-select>
          </a-card>

          <a-card :bordered="false" class="meta-card" size="small" title="摘要">
            <a-textarea
              v-model:value="form.excerpt"
              :rows="4"
              placeholder="文章摘要（可选，可 AI 生成）"
            />
            <a-button
              block
              size="small"
              class="gen-excerpt-btn"
              :loading="generatingExcerpt"
              @click="generateExcerpt"
            >
              <template v-if="!generatingExcerpt">
                <ThunderboltOutlined /> 生成摘要
              </template>
              <template v-else>生成中…</template>
            </a-button>
          </a-card>

          <MomentLocationEditor
            v-model:happened-at="form.occurredAt"
            v-model:place="form.place"
            v-model:visibility="form.locationVisibility"
            v-model:precision="form.locationPrecision"
            date-label="故事发生时间"
            context="记录文章中故事真实发生的时间和地点，发布后会自动进入时光星图。"
            @source="form.locationSource = $event"
          />

          <a-card
            :bordered="false"
            class="meta-card"
            size="small"
            title="封面图"
          >
            <div class="cover-setter" @click="coverOpen = true">
              <div v-if="form.coverImage" class="cover-preview">
                <img :src="mediaUrl(form.coverImage)" class="cover-img" />
                <div class="cover-overlay">点击修改</div>
              </div>
              <div v-else class="cover-placeholder">
                <PictureOutlined /> 点击设置封面
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </a-spin>

    <a-modal
      v-model:open="coverOpen"
      title="设置封面"
      width="420px"
      :footer="null"
      @cancel="coverOpen = false"
      destroyOnClose
    >
      <div class="cover-modal-body">
        <a-button
          block
          size="large"
          @click="coverUpload"
          class="cover-modal-btn"
        >
          <UploadOutlined /> 上传图片
        </a-button>
        <a-button
          block
          size="large"
          :loading="pickingCover"
          @click="pickWallpaper"
          class="cover-modal-btn"
        >
          换一张壁纸
        </a-button>
        <div class="cover-modal-divider"><span>或</span></div>
        <div class="cover-modal-url">
          <a-input
            v-model:value="coverUrlInput"
            placeholder="输入图片 URL"
            allow-clear
            @keyup.enter="coverConfirmUrl"
          />
          <a-button
            type="primary"
            :disabled="!coverUrlInput.trim()"
            @click="coverConfirmUrl"
            >确定</a-button
          >
        </div>
      </div>
    </a-modal>
    <a-modal
      v-model:open="aiDiffOpen"
      title="AI 改写差异确认"
      width="860px"
      :confirm-loading="aiTransforming"
      ok-text="应用到选区"
      cancel-text="取消"
      @ok="applyAiTransform"
    >
      <div class="ai-diff">
        <section>
          <strong>原文</strong>
          <pre>{{ aiOriginal }}</pre>
        </section>
        <section>
          <strong>建议稿</strong>
          <pre>{{ aiOutput }}</pre>
        </section>
      </div>
    </a-modal>
    <a-modal
      v-model:open="versionsOpen"
      title="文章版本记录"
      width="720px"
      :footer="null"
    >
      <a-spin :spinning="versionsLoading">
        <div v-if="versions.length" class="version-list">
          <article v-for="item in versions" :key="item.id">
            <span class="version-index">V{{ item.version }}</span>
            <div>
              <header>
                <strong>{{ item.title || "未命名版本" }}</strong>
                <a-tag color="blue">
                  {{ versionSource(item.source) }}
                </a-tag>
              </header>
              <p>{{ item.excerpt || "该版本未填写摘要" }}</p>
              <small>{{ formatVersionTime(item.createdAt) }} · {{ item.createdBy?.username || "系统" }} · 正文 {{ item.contentLength }} 字符</small>
            </div>
            <a-button
              size="small"
              :loading="restoringVersion === item.id"
              @click="confirmRestoreVersion(item)"
            >
              <Icon name="ph:arrow-counter-clockwise-bold" />恢复
            </a-button>
          </article>
        </div>
        <a-empty v-else-if="!versionsLoading" description="暂无版本记录" />
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { Modal } from "ant-design-vue";
import {
  ThunderboltOutlined,
  PictureOutlined,
  UploadOutlined,
} from "@ant-design/icons-vue";
import { ensureSlug } from "~/utils/postMeta";
import type { Place } from "~/types/place";
import { configureMarkdownEditor } from "~/utils/configureMarkdownEditor";

definePageMeta({ layout: "admin", middleware: "auth", ssr: false });

const api = useApi();
const toast = useToast();
const { mediaUrl } = useMediaUrl();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const editorReady = ref(false);
const saving = ref(false);
const generatingExcerpt = ref(false);
const pickingCover = ref(false);
const needsPublish = ref(false);
const postId = ref("");
const categories = ref<any[]>([]);
const tags = ref<any[]>([]);
const form = ref({
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  coverImage: "",
  categoryId: undefined as string | undefined,
  tagIds: [] as string[],
  featured: false,
  occurredAt: "",
  place: null as Place | null,
  locationVisibility: "private" as "public" | "blurred" | "private",
  locationPrecision: "place" as "exact" | "place" | "city" | "province",
  locationSource: "manual" as "manual" | "map" | "exif" | "imported",
});
const confirmedLocationKey = ref("");
const editorKey = ref(0);
const coverOpen = ref(false);
const coverUrlInput = ref("");
const aiTransforming = ref(false);
const aiDiffOpen = ref(false);
const aiOriginal = ref("");
const aiOutput = ref("");
const versionsOpen = ref(false);
const versionsLoading = ref(false);
const restoringVersion = ref("");
const versions = ref<any[]>([]);
const aiSelection = reactive({ start: 0, end: 0 });
const aiActions = [
  { action: "polish", label: "润色", icon: "ph:magic-wand-bold" },
  {
    action: "expand",
    label: "扩写",
    icon: "ph:arrows-out-line-horizontal-bold",
  },
  {
    action: "compress",
    label: "压缩",
    icon: "ph:arrows-in-line-horizontal-bold",
  },
] as const;

const categoryTree = computed(() => buildTree(categories.value));

async function transformSelection(action: "polish" | "expand" | "compress") {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    ".md-editor textarea",
  );
  const start = textarea?.selectionStart ?? 0;
  const end = textarea?.selectionEnd ?? 0;
  const selected = start === end ? "" : form.value.content.slice(start, end);
  if (!selected.trim()) {
    toast.warning("请先在编辑器中选择一段文字");
    return;
  }
  aiTransforming.value = true;
  try {
    const result = await api.post<{ original: string; output: string }>(
      "/ai/write/transform",
      { text: selected, action },
    );
    aiSelection.start = start;
    aiSelection.end = end;
    aiOriginal.value = selected;
    aiOutput.value = result.output;
    aiDiffOpen.value = true;
  } catch (error: any) {
    toast.error(error?.message || "AI 改写失败");
  } finally {
    aiTransforming.value = false;
  }
}

function applyAiTransform() {
  form.value.content =
    form.value.content.slice(0, aiSelection.start) +
    aiOutput.value +
    form.value.content.slice(aiSelection.end);
  hasUnsaved = true;
  aiDiffOpen.value = false;
  toast.success("已应用 AI 建议");
}

function buildTree(items: any[]): any[] {
  return items.map((c: any) => ({
    ...c,
    children: c.children?.length ? buildTree(c.children) : undefined,
  }));
}

const toolbars = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "codeRow",
  "code",
  "link",
  "image",
  "table",
  "mermaid",
  "katex",
  "revoke",
  "next",
  "save",
  "pageFullscreen",
  "fullscreen",
  "preview",
];

const editorTheme = computed(() => {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
});

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let hasUnsaved = false;
let originalContent = "";

function locationKey() {
  return `${form.value.place?.id || ""}|${form.value.locationVisibility}|${form.value.locationPrecision}`;
}

function postPayload(confirmExactLocation = false) {
  return {
    title: form.value.title,
    slug: form.value.slug,
    content: form.value.content,
    excerpt: form.value.excerpt,
    coverImage: form.value.coverImage,
    categoryId: form.value.categoryId,
    tagIds: [...form.value.tagIds],
    featured: form.value.featured,
    occurredAt: form.value.occurredAt
      ? new Date(form.value.occurredAt).toISOString()
      : null,
    placeId: form.value.place?.id || null,
    locationVisibility: form.value.place
      ? form.value.locationVisibility
      : "private",
    locationPrecision: form.value.locationPrecision,
    locationSource: form.value.place ? form.value.locationSource : null,
    ...(confirmExactLocation ? { confirmExactLocation: true } : {}),
  };
}

onMounted(async () => {
  const slug = route.params.slug as string;
  const [post, catRes, tagRes] = await Promise.all([
    api.get<any>(`/posts/${slug}/preview`).catch(() => null),
    api.get<any>("/categories").catch(() => []),
    api.get<any>("/tags").catch(() => []),
    configureMarkdownEditor().then(() => {
      editorReady.value = true;
    }),
  ]);
  categories.value = Array.isArray(catRes) ? catRes : [];
  tags.value = Array.isArray(tagRes) ? tagRes : [];
  if (post) {
    postId.value = post.id || "";
    form.value = {
      title: post.title || "",
      slug: post.slug || "",
      content: post.content || "",
      excerpt: post.excerpt || "",
      coverImage: post.coverImage || "",
      categoryId: post.categoryId || undefined,
      tagIds: post.tagIds || [],
      featured: post.featured || false,
      occurredAt: toLocalDateTime(post.occurredAt),
      place: post.place || null,
      locationVisibility: post.locationVisibility || "private",
      locationPrecision: post.locationPrecision || "place",
      locationSource: post.locationSource || "manual",
    };
    confirmedLocationKey.value = post.locationExactConfirmedAt
      ? locationKey()
      : "";
    needsPublish.value = !!post.needsPublish;
    originalContent = JSON.stringify(form.value);
  }
  loading.value = false;

  const obs = new MutationObserver(() => {
    editorKey.value++;
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  autoSaveTimer = setInterval(autoSave, 30000);
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

watch(
  () => form.value,
  () => {
    hasUnsaved = JSON.stringify(form.value) !== originalContent;
  },
  { deep: true },
);

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasUnsaved) {
    e.preventDefault();
    e.returnValue = "";
  }
}

async function autoSave() {
  if (!hasUnsaved || !form.value.title || !form.value.slug) return;
  try {
    const res = await api.put<any>(
      `/posts/${route.params.slug}`,
      postPayload(),
    );
    needsPublish.value = res?.needsPublish ?? true;
    originalContent = JSON.stringify(form.value);
    hasUnsaved = false;
    if (res?.slug && res.slug !== route.params.slug) {
      await router.replace(`/admin/posts/${res.slug}`);
    }
  } catch {
    /* silent */
  }
}

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function coverConfirmUrl() {
  const v = coverUrlInput.value.trim();
  if (v) {
    form.value.coverImage = v;
    coverOpen.value = false;
    coverUrlInput.value = "";
  }
}

async function coverUpload() {
  const { open } = useMediaLibrary();
  const urls = await open({ multiple: false, folder: "cover" });
  if (urls.length) {
    form.value.coverImage = urls[0];
    coverOpen.value = false;
  }
}

async function pickWallpaper() {
  pickingCover.value = true;
  try {
    const list = await api.get<any>("/ai/wallpapers", { page: 1, rows: 9 });
    const items = list?.items || [];
    if (!items.length) {
      toast.warning("暂无可用壁纸，请手动上传");
      return;
    }
    const pick = items[Math.floor(Math.random() * items.length)];
    const media = await api.post<any>("/media/import-url", {
      url: pick.url,
      folder: "cover",
    });
    if (media?.path) {
      form.value.coverImage = media.path;
      coverOpen.value = false;
      toast.success("封面已更新");
    }
  } catch (e: any) {
    toast.error("获取壁纸失败: " + (e.message || ""));
  }
  pickingCover.value = false;
}

async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  if (!postId.value) {
    toast.error("文章信息尚未加载，请稍后重试");
    return;
  }
  try {
    const urls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `article/${postId.value}`);
      const res = await api.upload<any>("/media/upload", fd);
      urls.push(res.path || "");
    }
    callback(urls);
  } catch {
    toast.error("上传失败");
  }
}

async function generateExcerpt() {
  if (!form.value.content?.trim() || form.value.content.trim().length < 20) {
    toast.warning("请先写一些正文再生成摘要");
    return;
  }
  const run = async () => {
    generatingExcerpt.value = true;
    try {
      const res = await api.post<{ excerpt: string; source?: string }>(
        "/ai/summarize",
        {
          title: form.value.title,
          content: form.value.content,
        },
      );
      form.value.excerpt = res.excerpt || "";
      toast.success(
        res.source === "ai" ? "摘要已生成" : "已用本地方式生成摘要",
      );
    } catch (e: any) {
      toast.error("生成失败: " + (e.message || ""));
    }
    generatingExcerpt.value = false;
  };
  if (form.value.excerpt?.trim()) {
    Modal.confirm({
      title: "覆盖现有摘要？",
      content: "将用 AI 重新生成摘要并覆盖当前内容。",
      okText: "覆盖",
      cancelText: "取消",
      onOk: run,
    });
  } else {
    await run();
  }
}

async function save() {
  if (!form.value.title) {
    toast.warning("标题不能为空");
    return;
  }
  form.value.slug = ensureSlug(form.value.slug, form.value.title);
  const needsExactConfirmation =
    form.value.place &&
    form.value.locationVisibility === "public" &&
    form.value.locationPrecision === "exact" &&
    confirmedLocationKey.value !== locationKey();
  if (needsExactConfirmation) {
    Modal.confirm({
      title: "确认公开精确位置？",
      content: `保存后，前台会展示“${form.value.place?.name}”的精确坐标。`,
      okText: "确认并保存",
      cancelText: "暂不保存",
      onOk: () => persistPost(true),
    });
    return;
  }
  await persistPost(false);
}

async function persistPost(confirmExactLocation: boolean) {
  saving.value = true;
  try {
    const res = await api.put<any>(
      `/posts/${route.params.slug}`,
      postPayload(confirmExactLocation),
    );
    needsPublish.value = res?.needsPublish ?? true;
    toast.success("保存成功");
    if (res?.locationExactConfirmedAt)
      confirmedLocationKey.value = locationKey();
    originalContent = JSON.stringify(form.value);
    hasUnsaved = false;
    if (res?.slug && res.slug !== route.params.slug) {
      await router.replace(`/admin/posts/${res.slug}`);
    }
  } catch (e: any) {
    toast.error("保存失败: " + (e.message || ""));
  }
  saving.value = false;
}

async function openVersions() {
  versionsOpen.value = true;
  versionsLoading.value = true;
  try {
    versions.value = await api.get<any[]>(`/posts/${route.params.slug}/versions`);
  } catch (error: any) {
    versions.value = [];
    toast.error(error?.message || "版本记录加载失败");
  } finally {
    versionsLoading.value = false;
  }
}

function versionSource(source: string) {
  return source === "publish" ? "发布快照" : "历史发布";
}

function formatVersionTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function confirmRestoreVersion(item: any) {
  Modal.confirm({
    title: `恢复到 V${item.version}？`,
    content: "恢复会把该发布版本替换为当前草稿，线上页面保持不变；确认内容后需要再次点击发布。",
    okText: "确认恢复",
    cancelText: "取消",
    onOk: async () => {
      restoringVersion.value = item.id;
      try {
        const restored = await api.post<any>(`/posts/${route.params.slug}/versions/${item.id}/restore`);
        originalContent = "";
        hasUnsaved = false;
        toast.success("版本已恢复");
        window.location.assign(`/admin/posts/${restored.slug || route.params.slug}`);
      } catch (error: any) {
        toast.error(error?.message || "恢复失败");
      } finally {
        restoringVersion.value = "";
      }
    },
  });
}
</script>

<style scoped>
.pending-alert {
  margin-bottom: 8px;
}

.md-editor-preview :deep(pre) {
  border-radius: 0px;
}

:deep(.md-editor-code) {
  background-color: var(--md-theme-code-inline-bg-color);
}

.editor-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-spin {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-spin :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-layout {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  padding-right: 16px;
  overflow: hidden;
}

.editor-sidebar {
  width: 300px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.editor-field-grow {
  flex: 1;
  min-height: 0;
  position: relative;
}

.gen-excerpt-btn {
  margin-top: 8px;
}

.editor-field-grow :deep(.md-editor) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  max-height: 100%;
  overflow: hidden;
}

.editor-field-grow :deep(.md-editor-content) {
  min-height: 0;
}

.title-input {
  font-size: 1.15rem;
  font-weight: 600;
  padding-left: 0;
}

.meta-card {
  border-radius: 8px;
}

.meta-row {
  margin-bottom: 10px;
}

.meta-row label {
  display: block;
  font-size: 0.72rem;
  color: var(--c-text-3);
  margin-bottom: 4px;
}

.meta-row-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.meta-row-inline label {
  margin-bottom: 0;
}

.cover-setter {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  transition: border-color 0.2s;
}

.cover-setter:hover {
  border-color: var(--c-primary);
}

.cover-preview {
  position: relative;
}

.cover-img {
  display: block;
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 0.82rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.cover-preview:hover .cover-overlay {
  opacity: 1;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 80px;
  color: var(--c-text-3);
  font-size: 0.82rem;
}

.cover-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-modal-btn {
  height: 44px;
}

.cover-modal-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--c-text-4);
  font-size: 0.78rem;
}

.cover-modal-divider::before,
.cover-modal-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}

.cover-modal-url {
  display: flex;
  gap: 8px;
}

.ai-selection-tools {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  background: var(--ld-bg-card);
}
.ai-selection-tools span {
  margin-right: auto;
  color: var(--c-primary);
  font-size: 0.6rem;
  font-weight: 700;
}
.ai-selection-tools button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--c-bg);
  color: var(--c-text-2);
  font-size: 0.6rem;
  cursor: pointer;
}
.ai-selection-tools button:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.ai-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ai-diff section {
  min-width: 0;
}
.ai-diff strong {
  display: block;
  margin-bottom: 7px;
  color: var(--c-text);
  font-size: 0.72rem;
}
.ai-diff pre {
  min-height: 260px;
  max-height: 55vh;
  overflow: auto;
  margin: 0;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  font:
    12px/1.7 ui-monospace,
    monospace;
  white-space: pre-wrap;
}
.ai-diff section:last-child pre {
  border-color: color-mix(in srgb, var(--c-primary) 35%, var(--border));
}
.version-list {
  display: grid;
  max-height: 62vh;
  overflow: auto;
}
.version-list article {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px 2px;
  border-bottom: 1px solid var(--border);
}
.version-index {
  display: grid;
  width: 40px;
  height: 32px;
  border-radius: 8px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.64rem;
  font-weight: 700;
  place-items: center;
}
.version-list header {
  display: flex;
  align-items: center;
  gap: 7px;
}
.version-list strong { font-size: 0.7rem; }
.version-list p {
  overflow: hidden;
  margin: 5px 0;
  color: var(--c-text-3);
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.version-list small { color: var(--c-text-4); font-size: 0.52rem; }
@media (max-width: 700px) {
  .ai-diff {
    grid-template-columns: 1fr;
  }
  .ai-selection-tools {
    flex-wrap: wrap;
  }
  .version-list article { grid-template-columns: 40px minmax(0, 1fr); }
  .version-list article > :deep(.ant-btn) { grid-column: 1 / -1; }
}
</style>

<style>
:root .md-editor {
  --md-bk-color: #fff;
  --md-bk-color-outstand: #f6f8fa;
  --md-bk-color-hover: #f0f2f5;
  --md-bk-color-block: #fafbfc;
  --md-bk-color-code: #f0f2f5;
  --md-border-color: #e8eaed;
  --md-color: #1f2328;
  --md-color-secondary: #656d76;
  --md-primary-color: #1677ff;
}

:root.dark .md-editor {
  --md-bk-color: hsl(220deg 0% 7%);
  --md-bk-color-outstand: hsl(220deg 10% 10%);
  --md-bk-color-hover: hsl(220deg 10% 14%);
  --md-bk-color-block: hsl(220deg 10% 10%);
  --md-bk-color-code: hsl(220deg 10% 16%);
  --md-border-color: hsl(220deg 10% 20%);
  --md-color: hsl(220deg 0% 100%);
  --md-color-secondary: hsl(220deg 0% 70%);
  --md-primary-color: hsl(220deg 100% 70%);
}
</style>
