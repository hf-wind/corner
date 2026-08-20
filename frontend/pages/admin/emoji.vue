<template>
  <div class="emoji-admin admin-page-shell">
    <header class="admin-page-head"><div><h1>表情资源</h1><p>管理表情包、Unicode 字符和动态图片资源。</p></div></header>
    <div class="table-toolbar">
      <a-input v-model:value="packKeyword" allow-clear placeholder="搜索表情包" class="pack-search">
        <template #prefix><Icon name="ph:magnifying-glass" /></template>
      </a-input>
      <a-button type="primary" @click="openAddPack">
        <PlusOutlined /> 添加表情包
      </a-button>
    </div>

    <a-table
      row-key="id"
      :columns="packColumns"
      :data-source="filteredPacks"
      :loading="loading"
      :pagination="false"
      :expanded-row-keys="expandedPackIds"
      :scroll="{ x: 760 }"
      @expand="onPackExpand"
    >
      <template #bodyCell="{ column, record: pack }">
        <template v-if="column.key === 'name'">
          <strong class="pack-name">{{ pack.name }}</strong>
        </template>
        <template v-else-if="column.key === 'type'">
          <a-tag :color="pack.type === 'animated' ? 'orange' : 'blue'">
            {{ pack.type === "animated" ? "动态图片" : "Unicode" }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'count'">
          {{ pack._count?.items || 0 }} 个
        </template>
        <template v-else-if="column.key === 'enabled'">
          <a-switch
            v-model:checked="pack.enabled"
            size="small"
            checked-children="启"
            un-checked-children="关"
            @change="togglePack(pack)"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="table-actions">
            <a-button
              type="link"
              size="small"
              title="添加表情"
              @click="openAddItem(pack)"
            >
              <PlusOutlined /> 添加
            </a-button>
            <a-button
              type="text"
              size="small"
              title="编辑表情包"
              @click="openEditPack(pack)"
            >
              <EditOutlined />
            </a-button>
            <a-button
              type="text"
              size="small"
              danger
              title="删除表情包"
              @click="removePack(pack)"
            >
              <DeleteOutlined />
            </a-button>
          </div>
        </template>
      </template>

      <template #expandedRowRender="{ record: pack }">
        <div class="items-table-wrap">
          <div class="items-heading">
            <span>{{ pack.name }} / 表情明细</span>
            <a-input v-model:value="ensureItemState(pack.id).keyword" allow-clear size="small" placeholder="搜索标签、字符或 URL" class="item-search" @press-enter="searchPackItems(pack.id)">
              <template #prefix><Icon name="ph:magnifying-glass" /></template>
            </a-input>
            <a-button size="small" @click="searchPackItems(pack.id)">搜索</a-button>
            <a-button size="small" @click="openAddItem(pack)"
              ><PlusOutlined /> 添加表情</a-button
            >
          </div>
          <a-table
            row-key="id"
            size="small"
            :columns="itemColumns"
            :data-source="itemStates[pack.id]?.items || []"
            :loading="itemStates[pack.id]?.loading"
            :scroll="{ x: 660 }"
            :pagination="{
              current: itemStates[pack.id]?.page || 1,
              pageSize: itemStates[pack.id]?.pageSize || 20,
              total: itemStates[pack.id]?.total || 0,
              showSizeChanger: false,
              showTotal: (total: number) => `共 ${total} 条`,
            }"
            @change="
              (pagination: any) => changeItemPage(pack, pagination.current || 1)
            "
          >
            <template #bodyCell="{ column, record: item }">
              <template v-if="column.key === 'preview'">
                <span v-if="pack.type === 'static'" class="emoji-char">{{
                  item.char || "?"
                }}</span>
                <span v-else class="emoji-image">
                  <img
                    v-if="item.imageUrl"
                    :src="mediaUrl(item.imageUrl)"
                    :alt="item.label || '表情'"
                    loading="lazy"
                  />
                  <Icon v-else name="ph:image-broken-bold" />
                </span>
              </template>
              <template v-else-if="column.key === 'content'">
                <code class="item-content">{{
                  item.char || item.imageUrl || "-"
                }}</code>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="table-actions">
                  <a-button
                    type="link"
                    size="small"
                    @click="openEditItem(pack, item)"
                    >编辑</a-button
                  >
                  <a-button
                    type="link"
                    size="small"
                    danger
                    @click="removeItem(pack, item)"
                    >删除</a-button
                  >
                </div>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </a-table>

    <a-modal
      v-model:open="packDialog.open"
      :title="packDialog.editing ? '编辑表情包' : '添加表情包'"
      width="420px"
      @ok="confirmPack"
    >
      <div class="add-field">
        <label class="add-label">名称</label
        ><a-input v-model:value="packDialog.name" placeholder="如：笑脸·静态" />
      </div>
      <div class="add-field">
        <label class="add-label">类型</label>
        <a-select v-model:value="packDialog.type" style="width: 100%">
          <a-select-option value="static">静态（Unicode 字符）</a-select-option>
          <a-select-option value="animated">动态（图片 URL）</a-select-option>
        </a-select>
      </div>
      <div v-if="packDialog.type === 'animated'" class="add-field">
        <label class="add-label">GIF 压缩</label>
        <a-switch
          v-model:checked="packDialog.compressAnimated"
          checked-children="开"
          un-checked-children="关"
        />
        <div class="add-hint">上传 GIF 时自动压缩为动画 WebP</div>
      </div>
      <div class="add-field">
        <label class="add-label">排序</label
        ><a-input-number
          v-model:value="packDialog.sort"
          :min="0"
          style="width: 100%"
        />
      </div>
    </a-modal>

    <a-modal
      v-model:open="itemDialog.open"
      :title="itemDialog.editing ? '编辑表情' : '添加表情'"
      width="480px"
      @ok="confirmItem"
    >
      <div class="add-field">
        <label class="add-label">标签</label
        ><a-input v-model:value="itemDialog.label" placeholder="表情描述文字" />
      </div>
      <div v-if="selectedPackType === 'static'" class="add-field">
        <label class="add-label">字符</label
        ><a-input
          v-model:value="itemDialog.char"
          placeholder="如：😀"
          maxlength="4"
        />
        <div class="add-hint">输入 Unicode 表情字符</div>
      </div>
      <template v-else>
        <div class="add-field">
          <label class="add-label">图片 URL</label
          ><a-input
            v-model:value="itemDialog.imageUrl"
            placeholder="https://..."
          />
        </div>
        <div class="add-field">
          <label class="add-label">或从媒体库选择</label
          ><a-button @click="openMediaLibrary"
            ><FolderOutlined /> 选择图片</a-button
          >
        </div>
        <div v-if="itemDialog.imageUrl" class="emoji-item-preview">
          <img
            :src="mediaUrl(itemDialog.imageUrl)"
            alt="preview"
            loading="lazy"
          />
        </div>
      </template>
      <div class="add-field">
        <label class="add-label">排序</label
        ><a-input-number
          v-model:value="itemDialog.sort"
          :min="0"
          style="width: 100%"
        />
      </div>
      <div v-if="itemDialog.editing" class="dialog-footer">
        <a-button danger @click="deleteItemFromDialog"
          ><DeleteOutlined /> 删除</a-button
        >
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "auth", ssr: false });

type ItemState = {
  items: any[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  loaded: boolean;
  keyword: string;
};

const api = useApi();
const toast = useToast();
const { mediaUrl } = useMediaUrl();
const loading = ref(true);
const saving = ref(false);
const packs = ref<any[]>([]);
const packKeyword = ref("");
const filteredPacks = computed(() => {
  const keyword = packKeyword.value.trim().toLocaleLowerCase();
  if (!keyword) return packs.value;
  return packs.value.filter((pack) =>
    `${pack.name} ${pack.type}`.toLocaleLowerCase().includes(keyword),
  );
});
const expandedPackIds = ref<string[]>([]);
const itemStates = reactive<Record<string, ItemState>>({});
const packColumns = [
  { title: "表情包", key: "name", dataIndex: "name" },
  { title: "类型", key: "type", width: 120 },
  { title: "数量", key: "count", width: 100 },
  { title: "排序", key: "sort", dataIndex: "sort", width: 80 },
  { title: "状态", key: "enabled", width: 90 },
  { title: "操作", key: "actions", width: 170, fixed: "right" },
];
const itemColumns = [
  { title: "预览", key: "preview", width: 76 },
  { title: "标签", key: "label", dataIndex: "label", width: 140 },
  { title: "字符 / URL", key: "content" },
  { title: "排序", key: "sort", dataIndex: "sort", width: 80 },
  { title: "操作", key: "actions", width: 110, fixed: "right" },
];

const packDialog = reactive({
  open: false,
  editing: false,
  id: "",
  name: "",
  type: "static",
  sort: 0,
  compressAnimated: false,
});
const itemDialog = reactive({
  open: false,
  editing: false,
  id: "",
  packId: "",
  label: "",
  char: "",
  imageUrl: "",
  sort: 0,
});
const selectedPackType = ref("static");

function ensureItemState(packId: string) {
  itemStates[packId] ||= {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    loaded: false,
    keyword: "",
  };
  return itemStates[packId];
}

async function loadPacks() {
  loading.value = true;
  try {
    packs.value = (await api.get<any[]>("/emoji-packs/all")) || [];
    for (const pack of packs.value) ensureItemState(pack.id);
  } catch {
    toast.error("加载表情包失败");
  } finally {
    loading.value = false;
  }
}

async function loadPackItems(packId: string, page = 1) {
  const state = ensureItemState(packId);
  if (state.loading) return;
  state.loading = true;
  try {
    const data = await api.get<any>(`/emoji-packs/${packId}/items`, {
      page,
      limit: state.pageSize,
      keyword: state.keyword.trim() || undefined,
    });
    state.items = Array.isArray(data?.items) ? data.items : [];
    state.page = Number(data?.page) || page;
    state.total = Number(data?.total) || 0;
    state.loaded = true;
  } catch {
    toast.error("加载表情明细失败");
  } finally {
    state.loading = false;
  }
}

function onPackExpand(expanded: boolean, pack: any) {
  expandedPackIds.value = expanded
    ? [...new Set([...expandedPackIds.value, pack.id])]
    : expandedPackIds.value.filter((id) => id !== pack.id);
  const state = ensureItemState(pack.id);
  if (expanded && !state.loaded) void loadPackItems(pack.id, 1);
}

function changeItemPage(pack: any, page: number) {
  void loadPackItems(pack.id, page);
}

function searchPackItems(packId: string) {
  const state = ensureItemState(packId);
  state.loaded = false;
  void loadPackItems(packId, 1);
}

function openAddPack() {
  Object.assign(packDialog, {
    editing: false,
    id: "",
    name: "",
    type: "static",
    sort: 0,
    compressAnimated: true,
    open: true,
  });
}
function openEditPack(pack: any) {
  Object.assign(packDialog, {
    editing: true,
    id: pack.id,
    name: pack.name,
    type: pack.type,
    sort: pack.sort,
    compressAnimated: pack.compressAnimated ?? true,
    open: true,
  });
}
async function confirmPack() {
  if (!packDialog.name.trim()) return toast.warning("请输入名称");
  saving.value = true;
  try {
    const payload = {
      name: packDialog.name,
      type: packDialog.type,
      sort: packDialog.sort,
      compressAnimated:
        packDialog.compressAnimated && packDialog.type === "animated",
    };
    if (packDialog.editing)
      await api.put(`/emoji-packs/${packDialog.id}`, payload);
    else await api.post("/emoji-packs", payload);
    packDialog.open = false;
    toast.success(packDialog.editing ? "已更新" : "已创建");
    await loadPacks();
  } catch {
    toast.error("操作失败");
  } finally {
    saving.value = false;
  }
}
async function togglePack(pack: any) {
  try {
    await api.put(`/emoji-packs/${pack.id}`, { enabled: pack.enabled });
  } catch {
    pack.enabled = !pack.enabled;
    toast.error("状态更新失败");
  }
}
async function removePack(pack: any) {
  try {
    await api.delete(`/emoji-packs/${pack.id}`);
    delete itemStates[pack.id];
    toast.success("已删除");
    await loadPacks();
  } catch {
    toast.error("删除失败");
  }
}

function openAddItem(pack: any) {
  selectedPackType.value = pack.type;
  Object.assign(itemDialog, {
    editing: false,
    id: "",
    packId: pack.id,
    label: "",
    char: "",
    imageUrl: "",
    sort: 0,
    open: true,
  });
}
function openEditItem(pack: any, item: any) {
  selectedPackType.value = pack.type;
  Object.assign(itemDialog, {
    editing: true,
    id: item.id,
    packId: pack.id,
    label: item.label || "",
    char: item.char || "",
    imageUrl: item.imageUrl || "",
    sort: item.sort || 0,
    open: true,
  });
}
async function confirmItem() {
  if (selectedPackType.value === "static" && !itemDialog.char.trim())
    return toast.warning("请输入表情字符");
  if (selectedPackType.value === "animated" && !itemDialog.imageUrl.trim())
    return toast.warning("请输入图片 URL");
  saving.value = true;
  try {
    const payload = {
      label: itemDialog.label,
      char: itemDialog.char,
      imageUrl: itemDialog.imageUrl,
      sort: itemDialog.sort,
    };
    if (itemDialog.editing)
      await api.put(`/emoji-packs/items/${itemDialog.id}`, payload);
    else
      await api.post("/emoji-packs/items", {
        ...payload,
        packId: itemDialog.packId,
      });
    itemDialog.open = false;
    toast.success(itemDialog.editing ? "已更新" : "已添加");
    await refreshPack(itemDialog.packId);
  } catch {
    toast.error("操作失败");
  } finally {
    saving.value = false;
  }
}
async function refreshPack(packId: string) {
  const state = ensureItemState(packId);
  await Promise.all([loadPackItems(packId, state.page), loadPacks()]);
}
async function removeItem(pack: any, item: any) {
  try {
    await api.delete(`/emoji-packs/items/${item.id}`);
    toast.success("已删除");
    const state = ensureItemState(pack.id);
    const targetPage =
      state.items.length === 1 && state.page > 1 ? state.page - 1 : state.page;
    await refreshPack(pack.id);
    if (targetPage !== state.page) await loadPackItems(pack.id, targetPage);
  } catch {
    toast.error("删除失败");
  }
}
async function deleteItemFromDialog() {
  const pack = packs.value.find((entry) => entry.id === itemDialog.packId);
  if (!pack) return;
  await removeItem(pack, { id: itemDialog.id });
  itemDialog.open = false;
}
async function openMediaLibrary() {
  const { open } = useMediaLibrary();
  const pack = packs.value.find((entry) => entry.id === itemDialog.packId);
  const urls = await open({
    folder: "emoji",
    compressAnimated: Boolean(
      pack?.compressAnimated && pack?.type === "animated",
    ),
  });
  if (urls.length) itemDialog.imageUrl = urls[0];
}

onMounted(loadPacks);
</script>

<style scoped>
.emoji-admin {
  min-width: 0;
}
.table-toolbar {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-bottom: 14px;
}
.pack-search {
  width: 240px;
  margin-right: auto;
}
.item-search {
  width: min(260px, 32vw);
  margin-left: auto;
}
.pack-name {
  color: var(--c-text);
  font-size: 0.82rem;
}
.table-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.items-table-wrap {
  padding: 4px 4px 10px 24px;
}
.items-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: var(--c-text-2);
  font-size: 0.72rem;
}
.emoji-char {
  font-size: 1.45rem;
  line-height: 1;
}
.emoji-image {
  display: grid;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  place-items: center;
}
.emoji-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.item-content {
  display: block;
  max-width: 360px;
  overflow: hidden;
  color: var(--c-text-2);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.add-field {
  margin-bottom: 14px;
}
.add-label {
  display: block;
  margin-bottom: 4px;
  color: var(--c-text);
  font-size: 0.78rem;
  font-weight: 600;
}
.add-hint {
  margin-top: 3px;
  color: var(--c-text-3);
  font-size: 0.65rem;
}
.emoji-item-preview {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--c-bg-1);
}
.emoji-item-preview img {
  max-width: 128px;
  max-height: 128px;
  object-fit: contain;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
@media (max-width: 640px) {
  .items-table-wrap {
    padding-left: 0;
  }
  .pack-search,
  .item-search {
    width: 100%;
  }
  .items-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
