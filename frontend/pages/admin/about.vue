<template>
  <div class="about-admin">
    <header class="admin-hero">
      <div>
        <span class="eyebrow">CONTENT STUDIO / ABOUT</span>
        <h1>关于我</h1>
        <p>用一套清晰的内容模块，维护前台这张不断更新的个人名片。</p>
      </div>
      <div class="hero-actions">
        <a-button href="/about" target="_blank"
          ><Icon name="ph:arrow-square-out-bold" /> 预览前台</a-button
        ><a-button type="primary" :loading="saving" @click="save"
          ><Icon name="ph:floppy-disk-bold" /> 保存全部配置</a-button
        >
      </div>
    </header>
    <a-spin :spinning="loading"
      ><div class="editor-summary">
        <div>
          <Icon name="ph:stack-bold" /><span
            ><strong>{{
              profile.notes.length +
              profile.skills.length +
              profile.timeline.length
            }}</strong>
            条内容</span
          >
        </div>
        <div>
          <Icon name="ph:link-bold" /><span
            ><strong>{{ profile.socialLinks.length }}</strong> 个链接</span
          >
        </div>
        <div>
          <Icon name="ph:tag-bold" /><span
            ><strong>{{
              profile.heroTags.length + profile.tools.length
            }}</strong>
            个标签</span
          >
        </div>
        <span class="summary-tip"
          ><Icon name="ph:info-bold" /> 修改后点击右上角统一保存</span
        >
      </div>
      <a-tabs v-model:activeKey="activeTab" class="about-tabs">
        <a-tab-pane key="identity" tab="个人名片"
          ><a-card class="editor-card" title="第一印象"
            ><template #extra><Icon name="ph:user-square-bold" /></template>
            <div class="identity-layout">
              <div class="avatar-editor">
                <div class="avatar-preview">
                  <img :src="avatarPreview" alt="头像预览" />
                </div>
                <a-button size="small" @click="chooseAvatar"
                  ><Icon name="ph:image-bold" /> 更换头像</a-button
                ><a-button
                  v-if="profile.avatarUrl"
                  type="link"
                  size="small"
                  danger
                  @click="profile.avatarUrl = ''"
                  >恢复默认</a-button
                >
              </div>
              <a-form layout="vertical" class="identity-form"
                ><div class="form-grid">
                  <a-form-item label="名字"
                    ><a-input
                      v-model:value="profile.name"
                      :maxlength="40" /></a-form-item
                  ><a-form-item label="身份描述"
                    ><a-input
                      v-model:value="profile.role"
                      :maxlength="80" /></a-form-item
                  ><a-form-item label="名片标签"
                    ><a-input
                      v-model:value="profile.badge"
                      :maxlength="30" /></a-form-item
                  ><a-form-item label="一句话"
                    ><a-input
                      v-model:value="profile.motto"
                      :maxlength="120"
                      show-count /></a-form-item
                  ><a-form-item label="所在地"
                    ><a-input
                      v-model:value="profile.location"
                      :maxlength="50" /></a-form-item
                  ><a-form-item label="当前状态"
                    ><a-input
                      v-model:value="profile.availability"
                      :maxlength="60"
                  /></a-form-item></div
              ></a-form></div></a-card
          ><a-card class="editor-card" title="Hero 标签"
            ><p class="help">
              用于首页头像区域的轻量标签，按回车添加，最多 16 个。
            </p>
            <div class="token-editor">
              <a-tag
                v-for="(tag, index) in profile.heroTags"
                :key="`${tag}-${index}`"
                closable
                @close="profile.heroTags.splice(index, 1)"
                >{{ tag }}</a-tag
              ><a-input
                v-model:value="heroTagDraft"
                size="small"
                placeholder="输入后回车"
                @pressEnter="addHeroTag"
              /></div></a-card
        ></a-tab-pane>
        <a-tab-pane key="sections" tab="区块文案"
          ><a-card class="editor-card" title="每一段的标题与说明"
            ><p class="help">
              标题负责识别层级，说明负责建立阅读语境。所有字段都会原样展示在前台。
            </p>
            <div
              class="section-config"
              v-for="item in sectionFields"
              :key="item.key"
            >
              <div class="section-config-label">
                <Icon :name="item.icon" />
                <div>
                  <strong>{{ item.label }}</strong
                  ><small>{{ item.hint }}</small>
                </div>
              </div>
              <div class="section-config-fields">
                <a-input
                  v-model:value="profile.sectionTitles[item.key]"
                  :maxlength="30"
                  placeholder="区块标题"
                /><a-textarea
                  v-model:value="profile.sectionDescriptions[item.key]"
                  :rows="2"
                  :maxlength="180"
                  show-count
                  placeholder="区块说明"
                />
              </div></div></a-card
          ><a-card class="editor-card" title="长文内容"
            ><a-form layout="vertical"
              ><a-form-item label="小记正文"
                ><a-textarea
                  v-model:value="profile.introduction"
                  :rows="10"
                  :maxlength="2400"
                  show-count /></a-form-item
              ><a-form-item label="价值观正文"
                ><a-textarea
                  v-model:value="profile.values"
                  :rows="8"
                  :maxlength="2000"
                  show-count /></a-form-item></a-form></a-card
        ></a-tab-pane>
        <a-tab-pane key="notes" tab="札记与事实"
          ><a-card class="editor-card" title="内容札记"
            ><template #extra
              ><a-button size="small" type="primary" ghost @click="addNote"
                ><Icon name="ph:plus-bold" /> 添加札记</a-button
              ></template
            >
            <div class="repeat-list">
              <div
                v-for="(note, index) in profile.notes"
                :key="index"
                class="repeat-item"
              >
                <div class="repeat-index">{{ pad(index + 1) }}</div>
                <div class="repeat-fields">
                  <div class="field-row">
                    <a-input
                      v-model:value="note.title"
                      placeholder="标题"
                      :maxlength="40"
                    /><a-input
                      v-model:value="note.subtitle"
                      placeholder="英文小标题"
                      :maxlength="50"
                    /><a-input
                      v-model:value="note.icon"
                      placeholder="图标，如 ph:leaf-bold"
                      :maxlength="60"
                    />
                  </div>
                  <a-textarea
                    v-model:value="note.content"
                    placeholder="内容描述"
                    :rows="3"
                    :maxlength="600"
                    show-count
                  />
                </div>
                <div class="repeat-actions">
                  <a-button
                    type="text"
                    :disabled="index === 0"
                    title="上移"
                    @click="move(profile.notes, index, -1)"
                    ><Icon name="ph:arrow-up-bold" /></a-button
                  ><a-button
                    type="text"
                    :disabled="index === profile.notes.length - 1"
                    title="下移"
                    @click="move(profile.notes, index, 1)"
                    ><Icon name="ph:arrow-down-bold" /></a-button
                  ><a-button
                    type="text"
                    danger
                    title="删除"
                    @click="profile.notes.splice(index, 1)"
                    ><Icon name="ph:trash-bold"
                  /></a-button>
                </div>
              </div></div></a-card
          ><a-card class="editor-card" title="小档案"
            ><template #extra
              ><a-button size="small" type="primary" ghost @click="addFact"
                ><Icon name="ph:plus-bold" /> 添加档案</a-button
              ></template
            >
            <div class="fact-list">
              <div v-for="(fact, index) in profile.facts" :key="index">
                <a-input
                  v-model:value="fact.label"
                  placeholder="标签"
                  :maxlength="30"
                /><a-input
                  v-model:value="fact.value"
                  placeholder="内容"
                  :maxlength="60"
                /><a-button
                  type="text"
                  danger
                  title="删除"
                  @click="profile.facts.splice(index, 1)"
                  ><Icon name="ph:x-bold"
                /></a-button>
              </div></div></a-card
        ></a-tab-pane>
        <a-tab-pane key="works" tab="作品与兴趣"
          ><a-card class="editor-card" title="项目作品"
            ><template #extra
              ><a-button size="small" type="primary" ghost @click="addSkill"
                ><Icon name="ph:plus-bold" /> 添加作品</a-button
              ></template
            >
            <p class="help">
              填写项目链接后，前台会显示可访问的箭头入口；支持 https、站内路径。
            </p>
            <div class="work-list">
              <div
                v-for="(skill, index) in profile.skills"
                :key="index"
                class="work-editor"
              >
                <span>{{ pad(index + 1) }}</span>
                <div>
                  <a-input
                    v-model:value="skill.name"
                    placeholder="项目名称"
                    :maxlength="40"
                  /><a-textarea
                    v-model:value="skill.description"
                    placeholder="项目描述"
                    :rows="2"
                    :maxlength="180"
                    show-count
                  /><a-input
                    v-model:value="skill.url"
                    placeholder="项目链接（可选）"
                    :maxlength="300"
                  />
                </div>
                <a-button
                  type="text"
                  danger
                  title="删除"
                  @click="profile.skills.splice(index, 1)"
                  ><Icon name="ph:trash-bold"
                /></a-button>
              </div></div></a-card
          ><a-card class="editor-card" title="兴趣与工具"
            ><p class="help">
              这些词会作为轻量标签展示在前台，适合工作工具、兴趣爱好或正在学习的主题。
            </p>
            <div class="token-editor">
              <a-tag
                v-for="(tool, index) in profile.tools"
                :key="`${tool}-${index}`"
                closable
                @close="profile.tools.splice(index, 1)"
                >{{ tool }}</a-tag
              ><a-input
                v-model:value="toolDraft"
                size="small"
                placeholder="输入后回车"
                @pressEnter="addTool"
              /></div></a-card
        ></a-tab-pane>
        <a-tab-pane key="pet" tab="猫咪档案">
          <a-card class="editor-card" title="猫咪身份档案">
            <template #extra>
              <a-switch
                v-model:checked="profile.pet.enabled"
                checked-children="公开"
                un-checked-children="隐藏"
              />
            </template>
            <p class="help">
              启用后才会出现在前台；身份与照片均来自这里的配置。
            </p>
            <div class="form-grid">
              <a-form-item label="名字"
                ><a-input v-model:value="profile.pet.name" :maxlength="40"
              /></a-form-item>
              <a-form-item label="昵称"
                ><a-input v-model:value="profile.pet.nickname" :maxlength="60"
              /></a-form-item>
              <a-form-item label="品种"
                ><a-input v-model:value="profile.pet.breed" :maxlength="60"
              /></a-form-item>
              <a-form-item label="生日 / 来家日期"
                ><a-input v-model:value="profile.pet.birthday" :maxlength="30"
              /></a-form-item>
            </div>
            <a-form-item label="性格关键词"
              ><a-input
                v-model:value="profile.pet.personality"
                :maxlength="120"
            /></a-form-item>
            <a-form-item label="它的故事"
              ><a-textarea
                v-model:value="profile.pet.story"
                :rows="6"
                :maxlength="1200"
                show-count
            /></a-form-item>
          </a-card>
          <a-card class="editor-card" title="猫咪照片墙">
            <template #extra
              ><a-button
                size="small"
                type="primary"
                ghost
                @click="choosePetPhotos"
                ><Icon name="ph:images-bold" /> 选择照片</a-button
              ></template
            >
            <div v-if="profile.pet.photos.length" class="pet-photo-editor">
              <article
                v-for="(photo, index) in profile.pet.photos"
                :key="`${photo.url}-${index}`"
              >
                <img :src="mediaUrl(photo.url)" alt="猫咪照片预览" />
                <a-input
                  v-model:value="photo.caption"
                  :maxlength="120"
                  placeholder="照片说明"
                />
                <div class="repeat-actions">
                  <a-button
                    type="text"
                    :disabled="index === 0"
                    title="上移"
                    @click="move(profile.pet.photos, index, -1)"
                    ><Icon name="ph:arrow-up-bold"
                  /></a-button>
                  <a-button
                    type="text"
                    :disabled="index === profile.pet.photos.length - 1"
                    title="下移"
                    @click="move(profile.pet.photos, index, 1)"
                    ><Icon name="ph:arrow-down-bold"
                  /></a-button>
                  <a-button
                    type="text"
                    danger
                    title="删除"
                    @click="profile.pet.photos.splice(index, 1)"
                    ><Icon name="ph:trash-bold"
                  /></a-button>
                </div>
              </article>
            </div>
            <a-empty v-else description="还没有选择照片" />
          </a-card>
        </a-tab-pane>
        <a-tab-pane key="timeline" tab="经历时间线"
          ><a-card class="editor-card" title="来路拾记"
            ><template #extra
              ><a-button size="small" type="primary" ghost @click="addTimeline"
                ><Icon name="ph:plus-bold" /> 添加节点</a-button
              ></template
            >
            <div class="timeline-editor">
              <div
                v-for="(item, index) in profile.timeline"
                :key="index"
                class="timeline-item"
              >
                <span class="repeat-index">{{ pad(index + 1) }}</span
                ><a-input
                  v-model:value="item.year"
                  class="year"
                  placeholder="年份"
                  :maxlength="12"
                />
                <div>
                  <a-input
                    v-model:value="item.title"
                    placeholder="事件标题"
                    :maxlength="80"
                  /><a-textarea
                    v-model:value="item.description"
                    placeholder="简短说明"
                    :rows="2"
                    :maxlength="240"
                  />
                </div>
                <div class="repeat-actions">
                  <a-button
                    type="text"
                    :disabled="index === 0"
                    title="上移"
                    @click="move(profile.timeline, index, -1)"
                    ><Icon name="ph:arrow-up-bold" /></a-button
                  ><a-button
                    type="text"
                    :disabled="index === profile.timeline.length - 1"
                    title="下移"
                    @click="move(profile.timeline, index, 1)"
                    ><Icon name="ph:arrow-down-bold" /></a-button
                  ><a-button
                    type="text"
                    danger
                    title="删除"
                    @click="profile.timeline.splice(index, 1)"
                    ><Icon name="ph:trash-bold"
                  /></a-button>
                </div>
              </div></div></a-card
        ></a-tab-pane>
        <a-tab-pane key="social" tab="社交链接"
          ><a-card class="editor-card" title="联系入口"
            ><template #extra
              ><a-button size="small" type="primary" ghost @click="addSocial"
                ><Icon name="ph:plus-bold" /> 添加链接</a-button
              ></template
            >
            <div class="social-list">
              <div v-for="(link, index) in profile.socialLinks" :key="index">
                <a-select v-model:value="link.icon" class="icon-select"
                  ><a-select-option
                    v-for="icon in socialIcons"
                    :key="icon.value"
                    :value="icon.value"
                    ><Icon :name="icon.value" />
                    {{ icon.label }}</a-select-option
                  ></a-select
                ><a-input
                  v-model:value="link.label"
                  placeholder="显示名称"
                  :maxlength="30"
                /><a-input
                  v-model:value="link.url"
                  placeholder="https:// 或 mailto:"
                  :maxlength="300"
                /><a-button
                  type="text"
                  danger
                  title="删除"
                  @click="profile.socialLinks.splice(index, 1)"
                  ><Icon name="ph:trash-bold"
                /></a-button>
              </div></div></a-card
        ></a-tab-pane>
      </a-tabs>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import avatarFallback from "@/assets/images/avatar.jpg";
import type {
  AboutFact,
  AboutNote,
  AboutProfile,
  AboutSkill,
  AboutSocialLink,
  AboutTimelineItem,
  AboutSectionTitles,
} from "@/types/about";
import { createAboutProfile, normalizeAboutProfile } from "@/types/about";
const api = useApi();
const toast = useToast();
const { mediaUrl } = useMediaUrl();
const { open } = useMediaLibrary();
const loading = ref(true);
const saving = ref(false);
const profile = reactive<AboutProfile>(createAboutProfile());
const activeTab = ref("identity");
const heroTagDraft = ref("");
const toolDraft = ref("");
const avatarPreview = computed(() =>
  profile.avatarUrl ? mediaUrl(profile.avatarUrl) : avatarFallback,
);
const socialIcons = [
  { label: "GitHub", value: "ph:github-logo-bold" },
  { label: "邮箱", value: "ph:envelope-simple-bold" },
  { label: "微博", value: "ph:weibo-logo-bold" },
  { label: "Twitter", value: "ph:twitter-logo-bold" },
  { label: "RSS", value: "ph:rss-bold" },
  { label: "网站", value: "ph:globe-bold" },
  { label: "其他", value: "ph:link-bold" },
];
const sectionFields: {
  key: keyof AboutSectionTitles;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    key: "introduction",
    label: "小记其人",
    hint: "个人来处与自我介绍",
    icon: "ph:book-open-bold",
  },
  {
    key: "notes",
    label: "几页闲话",
    hint: "工作、生活与站点缘起",
    icon: "ph:note-bold",
  },
  {
    key: "activity",
    label: "此刻在做什么",
    hint: "工具、兴趣与正在学习",
    icon: "ph:sparkle-bold",
  },
  {
    key: "skills",
    label: "平日所做",
    hint: "作品与能力条目",
    icon: "ph:briefcase-bold",
  },
  {
    key: "pet",
    label: "猫咪档案",
    hint: "猫咪身份、故事与照片",
    icon: "ph:cat-bold",
  },
  {
    key: "timeline",
    label: "来路拾记",
    hint: "人生与职业节点",
    icon: "ph:timeline-bold",
  },
  {
    key: "values",
    label: "价值观",
    hint: "重要的判断与尺度",
    icon: "ph:scales-bold",
  },
  {
    key: "facts",
    label: "小档案",
    hint: "轻量的个人信息",
    icon: "ph:identification-card-bold",
  },
];
async function load() {
  loading.value = true;
  try {
    Object.assign(
      profile,
      normalizeAboutProfile(await api.get("/settings/about_profile")),
    );
  } catch {
    toast.error("加载配置失败");
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (!profile.name.trim()) {
    toast.warning("请填写名字");
    return;
  }
  saving.value = true;
  try {
    profile.heroTags = profile.heroTags
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 16);
    profile.tools = profile.tools.map((item) => item.trim()).filter(Boolean);
    const value = normalizeAboutProfile(JSON.parse(JSON.stringify(profile)));
    await api.put("/settings", { key: "about_profile", value });
    Object.assign(profile, value);
    toast.success("关于我配置已保存");
  } catch (error: any) {
    toast.error(error?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}
async function choosePetPhotos() {
  const urls = await open({ folder: "about" });
  const known = new Set(profile.pet.photos.map((item) => item.url));
  for (const url of urls) {
    if (known.has(url) || profile.pet.photos.length >= 18) continue;
    profile.pet.photos.push({ url, caption: "" });
    known.add(url);
  }
}
function addHeroTag() {
  const value = heroTagDraft.value.trim();
  if (
    value &&
    !profile.heroTags.includes(value) &&
    profile.heroTags.length < 16
  )
    profile.heroTags.push(value);
  heroTagDraft.value = "";
}
function addTool() {
  const value = toolDraft.value.trim();
  if (value && !profile.tools.includes(value)) profile.tools.push(value);
  toolDraft.value = "";
}
async function chooseAvatar() {
  const urls = await open({ folder: "about" });
  if (urls[0]) profile.avatarUrl = urls[0];
}
function addNote() {
  profile.notes.push({
    title: "",
    subtitle: "",
    content: "",
    icon: "ph:leaf-bold",
  } satisfies AboutNote);
}
function addSkill() {
  profile.skills.push({
    name: "",
    description: "",
    url: "",
  } satisfies AboutSkill);
}
function addFact() {
  profile.facts.push({ label: "", value: "" } satisfies AboutFact);
}
function addTimeline() {
  profile.timeline.push({
    year: String(new Date().getFullYear()),
    title: "",
    description: "",
  } satisfies AboutTimelineItem);
}
function addSocial() {
  profile.socialLinks.push({
    label: "",
    url: "",
    icon: "ph:link-bold",
  } satisfies AboutSocialLink);
}
function move<T>(list: T[], index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(target, 0, item);
}
function pad(index: number) {
  return String(index).padStart(2, "0");
}
onMounted(load);
useHead({ title: "关于我管理" });
</script>

<style scoped>
.about-admin {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 8px 0 44px;
}
.admin-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 18px 0 20px;
  border-bottom: 1px solid var(--border);
}
.eyebrow {
  color: var(--c-primary);
  font: 700 0.58rem var(--font-mono);
  letter-spacing: 0.16em;
}
.admin-hero h1 {
  margin: 7px 0 5px;
  color: var(--c-text);
  font: 650 1.75rem var(--font-heading);
}
.admin-hero p {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.7rem;
}
.hero-actions {
  display: flex;
  gap: 8px;
}
.editor-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 12px 15px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}
.editor-summary > div {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-right: 18px;
  border-right: 1px solid var(--border);
  color: var(--c-text-2);
  font-size: 0.65rem;
}
.editor-summary > div > svg {
  color: var(--c-primary);
  font-size: 1rem;
}
.editor-summary strong {
  color: var(--c-text);
  font-size: 0.9rem;
}
.summary-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  color: var(--c-text-3);
  font-size: 0.6rem;
}
.about-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 14px;
}
.about-tabs :deep(.ant-tabs-tab) {
  padding: 10px 5px;
  color: var(--c-text-3);
  font-size: 0.72rem;
}
.about-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--c-primary);
}
.editor-card {
  margin-bottom: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 12px;
  background: var(--ld-bg-card);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 22%, transparent);
}
.editor-card :deep(.ant-card-head) {
  min-height: 48px;
  border-bottom: 1px solid var(--border);
}
.editor-card :deep(.ant-card-head-title) {
  font-size: 0.84rem;
  color: var(--c-text);
}
.editor-card :deep(.ant-card-extra) {
  color: var(--c-primary);
}
.identity-layout {
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
  gap: 25px;
}
.avatar-editor {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
}
.avatar-preview {
  width: 112px;
  aspect-ratio: 4/5;
  padding: 5px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}
.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.identity-form :deep(.ant-form-item) {
  margin-bottom: 14px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}
.help {
  margin: 0 0 14px;
  color: var(--c-text-3);
  font-size: 0.65rem;
  line-height: 1.65;
}
.token-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}
.token-editor :deep(.ant-input) {
  width: 160px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.section-config {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  padding: 15px 0;
  border-bottom: 1px solid var(--border);
}
.section-config:last-child {
  border-bottom: 0;
}
.section-config-label {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}
.section-config-label > svg {
  margin-top: 2px;
  color: var(--c-primary);
  font-size: 1rem;
}
.section-config-label div {
  display: grid;
  gap: 4px;
}
.section-config-label strong {
  font-size: 0.72rem;
  color: var(--c-text);
}
.section-config-label small {
  color: var(--c-text-3);
  font-size: 0.58rem;
  line-height: 1.5;
}
.section-config-fields {
  display: grid;
  gap: 8px;
}
.repeat-list {
  display: grid;
  gap: 10px;
}
.repeat-item,
.work-editor,
.timeline-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 84px;
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}
.repeat-index,
.work-editor > span {
  padding-top: 6px;
  color: var(--c-primary);
  font: 0.6rem var(--font-mono);
}
.repeat-fields,
.work-editor > div,
.timeline-item > div {
  display: grid;
  gap: 8px;
}
.field-row {
  display: grid;
  grid-template-columns: 0.8fr 1fr 0.8fr;
  gap: 8px;
}
.repeat-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0;
}
.fact-list,
.social-list {
  display: grid;
  gap: 8px;
}
.fact-list > div {
  display: grid;
  grid-template-columns: 1fr 1.4fr 32px;
  gap: 8px;
}
.work-editor {
  grid-template-columns: 30px minmax(0, 1fr) 32px;
}
.timeline-editor {
  display: grid;
  gap: 10px;
}
.timeline-item {
  grid-template-columns: 30px 90px minmax(0, 1fr) 84px;
}
.social-list > div {
  display: grid;
  grid-template-columns: 120px 150px minmax(0, 1fr) 32px;
  gap: 8px;
}
.icon-select {
  width: 120px;
}
.pet-photo-editor {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.pet-photo-editor article {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}
.pet-photo-editor img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.pet-photo-editor .repeat-actions {
  justify-content: center;
}
@media (max-width: 680px) {
  .admin-hero {
    align-items: flex-start;
    flex-direction: column;
  }
  .hero-actions {
    width: 100%;
  }
  .hero-actions :deep(.ant-btn) {
    flex: 1;
  }
  .editor-summary {
    flex-wrap: wrap;
  }
  .summary-tip {
    width: 100%;
    margin-left: 0;
  }
  .identity-layout,
  .form-grid,
  .section-config {
    grid-template-columns: 1fr;
  }
  .avatar-editor {
    align-items: flex-start;
  }
  .field-row,
  .fact-list > div,
  .social-list > div,
  .timeline-item {
    grid-template-columns: 1fr;
  }
  .repeat-actions {
    justify-content: flex-start;
  }
  .repeat-item {
    grid-template-columns: 24px minmax(0, 1fr);
  }
  .repeat-item > .repeat-actions {
    grid-column: 2;
  }
  .timeline-item > .repeat-index {
    grid-column: 1;
  }
  .timeline-item > .year {
    grid-column: 2;
  }
  .timeline-item > div:not(.repeat-actions) {
    grid-column: 2;
  }
  .timeline-item > .repeat-actions {
    grid-column: 2;
  }
  .about-tabs :deep(.ant-tabs-nav-list) {
    width: max-content;
  }
  .about-admin {
    padding-inline: 0;
  }
  .pet-photo-editor {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
