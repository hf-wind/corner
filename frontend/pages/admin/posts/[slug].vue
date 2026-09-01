<template>
  <div class="editor-page admin-page-shell">
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
            <span>AI 全文优化</span
            ><button
              v-for="item in aiActions"
              :key="item.action"
              type="button"
              :disabled="aiTransforming"
              @click="transformFullText"
            >
              <Icon :name="item.icon" />{{ item.label }}
            </button>
          </div>
          <div class="editor-field editor-field-grow">
            <client-only>
              <MdEditor
                v-if="editorReady"
                v-model="form.content"
                language="zh-CN"
                :toolbars="toolbars"
                :theme="editorTheme"
                preview-theme="smart-blue"
                code-theme="github"
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
              <a-button
                type="primary"
                size="small"
                @click="save"
                :loading="saving"
                style="margin-left: auto"
              >
                <Icon name="ph:floppy-disk-bold" />
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
          <Icon name="ph:shuffle-bold" /> 换一张壁纸
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
            ><Icon name="ph:check-bold" /> 确定</a-button
          >
        </div>
      </div>
    </a-modal>
    <a-modal
      v-model:open="aiDiffOpen"
      title="AI 改写差异确认"
      width="860px"
      :confirm-loading="aiTransforming"
      ok-text="应用到全文"
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
const isCreate = computed(() => String(route.params.slug || "") === "new");
const loading = ref(true);
const editorReady = ref(false);
const saving = ref(false);
const generatingExcerpt = ref(false);
const pickingCover = ref(false);
const needsPublish = ref(false);
const postId = ref("");
const currentSlug = ref("");
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
const editorDark = ref(false);
const coverOpen = ref(false);
const coverUrlInput = ref("");
const aiTransforming = ref(false);
const aiDiffOpen = ref(false);
const aiOriginal = ref("");
const aiOutput = ref("");
const aiActions = [
  { action: "style", label: "文风优化", icon: "ph:signature-bold" },
] as const;

const categoryTree = computed(() => buildTree(categories.value));

async function transformFullText() {
  const selected = form.value.content.trim();
  if (!selected) {
    toast.warning("请先输入正文");
    return;
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: "确认优化全文？",
      content: "文风优化会把整篇正文发送给 AI，并生成待审核建议稿，不会自动覆盖原文。",
      okText: "继续优化",
      cancelText: "取消",
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
  if (!confirmed) return;
  aiTransforming.value = true;
  try {
    const result = await api.post<{ original: string; output: string }>(
      "/ai/write/transform",
      { text: selected, action: "style" },
    );
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
  form.value.content = aiOutput.value;
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
  return editorDark.value ? "dark" : "light";
});

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let hasUnsaved = false;
let originalContent = "";
let themeObserver: MutationObserver | null = null;

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
  editorDark.value = document.documentElement.classList.contains("dark");
  const slug = route.params.slug as string;
  const [post, catRes, tagRes] = await Promise.all([
    isCreate.value
      ? Promise.resolve(null)
      : api.get<any>(`/posts/${slug}/preview`).catch(() => null),
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
    currentSlug.value = post.slug || slug;
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
  } else if (isCreate.value && route.query.generated === "1") {
    try {
      const draft = useClientState().getSession("articleEditorDraft", null);
      if (draft) {
        form.value = {
          ...form.value,
          title: String(draft.title || ""),
          slug: String(draft.slug || ""),
          content: String(draft.content || ""),
          excerpt: String(draft.excerpt || ""),
          coverImage: String(draft.coverImage || ""),
          categoryId: draft.categoryId || undefined,
          tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : [],
        };
        useClientState().removeSession("articleEditorDraft");
        toast.info("AI 草稿已带入编辑器，确认后再保存");
      }
    } catch {
      useClientState().removeSession("articleEditorDraft");
    }
  }
  originalContent = JSON.stringify(form.value);
  loading.value = false;

  themeObserver = new MutationObserver(() => {
    editorDark.value = document.documentElement.classList.contains("dark");
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  autoSaveTimer = setInterval(autoSave, 30000);
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
  themeObserver?.disconnect();
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
  if (!hasUnsaved || !currentSlug.value || !form.value.title || !form.value.slug) return;
  try {
    const res = await api.put<any>(
      `/posts/${currentSlug.value}`,
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
    const res = currentSlug.value
      ? await api.put<any>(
          `/posts/${currentSlug.value}`,
          postPayload(confirmExactLocation),
        )
      : await api.post<any>("/posts", postPayload(confirmExactLocation));
    needsPublish.value = res?.needsPublish ?? true;
    postId.value = res?.id || postId.value;
    currentSlug.value = res?.slug || form.value.slug;
    form.value.slug = currentSlug.value;
    toast.success(isCreate.value ? "文章草稿已创建" : "保存成功");
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
  min-height: 100%;
  height: max(100%, 100dvh);
  overflow: hidden;
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

@media (max-width: 900px) {
  .editor-page { height: auto; min-height: 100%; overflow: visible; }
  .editor-layout { height: auto; min-height: calc(100dvh - 112px); overflow: visible; }
  .editor-main { overflow: visible; padding-right: 0; }
  .editor-sidebar { width: 100%; height: auto; max-height: none; overflow: visible; }
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
@media (max-width: 700px) {
  .ai-diff {
    grid-template-columns: 1fr;
  }
  .ai-selection-tools {
    flex-wrap: wrap;
  }
}
</style>

<style>
:root .editor-page .md-editor {
  --md-bk-color: var(--c-bg);
  --md-bk-color-outstand: var(--c-bg-1);
  --md-bk-color-hover: var(--c-bg-2);
  --md-bk-color-block: color-mix(in srgb, var(--c-bg-1) 82%, var(--c-bg));
  --md-bk-color-code: var(--code-bg);
  --md-border-color: var(--border);
  --md-color: var(--c-text);
  --md-color-secondary: var(--c-text-2);
  --md-primary-color: var(--c-primary);
}

:root .editor-page .md-editor-toolbar-wrapper {
  background: color-mix(in srgb, var(--c-bg-1) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
