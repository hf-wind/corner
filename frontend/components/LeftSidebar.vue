<template>
  <aside class="sidebar-left" :class="{ 'is-collapsed': collapsed }">
    <div class="sidebar-hero">
      <div class="hero">
        <span class="hero-glow hero-glow-one" aria-hidden="true" />
        <span class="hero-glow hero-glow-two" aria-hidden="true" />
        <span class="wind-stroke wind-stroke-one" aria-hidden="true" />
        <span class="wind-stroke wind-stroke-two" aria-hidden="true" />
        <div class="hero-content">
          <AppLink :to="heroLink" class="hero-row" :title="heroTitle">
            <div class="logo-wrap">
              <SiteWindLogo />
            </div>
            <div class="hero-text">
              <span class="hero-kicker">WIND · CORNER</span>
              <div class="hero-name">{{ heroTitle }}</div>
              <div class="hero-slogan">{{ heroSlogan }}</div>
            </div>
            <span class="hero-status" aria-hidden="true"><i /></span>
          </AppLink>
        </div>
      </div>
    </div>

    <div v-if="!isPanel" class="search-box" @click="openSearch">
      <input type="text" placeholder="搜索文章..." readonly />
      <Icon name="ph:magnifying-glass-bold" class="search-suffix" />
    </div>

    <div class="sidebar-scroll">
      <nav class="nav-menu">
        <section
          v-for="group in navGroups"
          :key="group.key"
          class="nav-group"
          :class="{ 'is-open': isGroupOpen(group), 'single-group': group.key === 'articles' }"
        >
          <button
            v-if="!collapsed && group.key !== 'articles'"
            type="button"
            class="nav-group-toggle"
            :aria-expanded="isGroupOpen(group)"
            @click="toggleGroup(group.key)"
          >
            <span>{{ group.label }}</span>
            <Icon name="ph:caret-down-bold" />
          </button>
          <div
            class="nav-group-items"
            :class="{ 'is-collapsed-group': !isGroupOpen(group) && !collapsed }"
          >
            <div class="nav-group-inner">
              <AppLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="nav-item"
                :class="{ active: isNavActive(item.to) }"
                :title="collapsed ? item.label : undefined"
              >
                <Icon :name="item.icon" class="nav-icon" /><span
                  class="nav-label"
                  >{{ item.label }}</span
                >
              </AppLink>
            </div>
          </div>
        </section>
      </nav>
    </div>

    <div class="sidebar-bottom">
      <div class="sidebar-bottom-scroll">
        <div class="sidebar-divider"></div>
        <AppLink v-if="!isLoggedIn && !isPanel" to="/login" class="login-link">
          <Icon name="ph:sign-in-bold" /> 登录 / 注册
        </AppLink>
        <div v-else-if="isLoggedIn" class="user-card">
          <div class="user-row">
            <button type="button" class="user-main" @click="goPanel">
              <div class="avatar-wrapper">
                <img
                  v-if="user?.avatar"
                  :src="avatarSrc"
                  alt=""
                  class="avatar-img"
                />
                <Icon v-else name="ph:user-circle-fill" class="avatar-icon" />
              </div>
              <span class="user-name">{{ user?.username ?? "用户" }}</span>
              <span v-if="isUserAdmin" class="user-badge">管</span>
            </button>
            <NotificationBell />
            <button
              type="button"
              class="user-logout"
              title="退出登录"
              @click="handleLogout"
            >
              <Icon name="ph:sign-out-bold" />
            </button>
          </div>
        </div>
        <div class="sidebar-tools" aria-label="侧栏快捷操作">
          <AppLink
            v-if="isPanel"
            to="/home"
            class="sidebar-tool user-back"
            title="返回前台"
            aria-label="返回前台"
          >
            <Icon name="ph:arrow-u-up-left-bold" />
          </AppLink>
          <div
            class="theme-pill"
            :class="`theme-${theme}`"
            role="group"
            aria-label="主题"
          >
            <button
              type="button"
              :class="{ active: theme === 'light' }"
              title="亮色"
              aria-label="亮色"
              @click="setTheme('light')"
            >
              <Icon name="ph:sun-bold" />
            </button>
            <button
              type="button"
              :class="{ active: theme === 'dark' }"
              title="深色"
              aria-label="深色"
              @click="setTheme('dark')"
            >
              <Icon name="ph:moon-bold" />
            </button>
            <button
              type="button"
              :class="{ active: theme === 'auto' }"
              title="跟随系统"
              aria-label="跟随系统"
              @click="setTheme('auto')"
            >
              <Icon name="ph:monitor-bold" />
            </button>
          </div>
          <button
            v-if="isPanel && isUserAdmin && allowCollapse"
            type="button"
            class="sidebar-tool admin-collapse-button"
            :title="collapsed ? '展开管理侧栏' : '收起管理侧栏'"
            :aria-label="collapsed ? '展开管理侧栏' : '收起管理侧栏'"
            @click="emit('toggle-collapse')"
          >
            <Icon
              :name="collapsed ? 'ph:sidebar-simple-bold' : 'ph:sidebar-bold'"
            />
          </button>
        </div>
        <!-- 字体切换暂不展示，保留结构与样式便于后续恢复。
      <div v-if="!isPanel" class="font-pill" role="group" aria-label="全局字体">
        <button
          v-for="option in fontPresets"
          :key="option.id"
          type="button"
          :class="{ active: fontPreset === option.id }"
          :title="option.label"
          :aria-label="option.label"
          @click="setFontPreset(option.id)"
        >
          {{ option.short }}
        </button>
      </div>
      --></div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useFeatureFlags } from "~/composables/useFeatureFlags";

const props = withDefaults(
  defineProps<{
    variant?: "site" | "admin";
    collapsed?: boolean;
    allowCollapse?: boolean;
  }>(),
  {
    variant: "site",
    collapsed: false,
    allowCollapse: true,
  },
);

const emit = defineEmits<{ openSearch: []; "toggle-collapse": [] }>();
const { theme, setTheme } = useTheme();
const { confirm } = useConfirm();
const { siteTitle, siteDescription, loadSiteSettings } = useSiteSettings();
// 字体切换入口暂时隐藏：const { fontPreset, fontPresets, setFontPreset } = useTypography()
const {
  user,
  isLoggedIn,
  isAdmin: isUserAdmin,
  readStorage,
  refreshProfile,
  clearSession,
  panelHome,
  lastPublicPath,
} = useAuth();
const { mediaUrl } = useMediaUrl();
const route = useRoute();
const router = useRouter();

const isPanel = computed(() => props.variant === "admin");
const collapsed = computed(() => props.collapsed && isPanel.value);
const allowCollapse = computed(() => props.allowCollapse);
const {
  albumsEnabled,
  mapEnabled,
  constellationEnabled,
  storiesEnabled,
  guestbookEnabled,
  circleEnabled,
  loadCircleFeature,
  changelogEnabled,
  loadChangelogFeature,
} = useFeatureFlags();
const avatarSrc = computed(() => mediaUrl(user.value?.avatar));

const siteNav = [
  { to: "/home", icon: "ph:house-bold", label: "首页" },
  { to: "/archive", icon: "ph:archive-bold", label: "归档" },
  { to: "/category", icon: "ph:folder-open-bold", label: "分类" },
  { to: "/tags", icon: "ph:tag-bold", label: "标签" },
  { to: "/library", icon: "ph:books-bold", label: "书影" },
  { to: "/moments", icon: "ph:sparkle-bold", label: "瞬间" },
  { to: "/circle", icon: "ph:wind-bold", label: "风讯角" },
  { to: "/time/map", icon: "ph:map-trifold-bold", label: "地图" },
  { to: "/time/constellation", icon: "ph:graph-bold", label: "星图" },
  { to: "/stories", icon: "ph:path-bold", label: "故事" },
  { to: "/albums", icon: "ph:images-square-bold", label: "相册" },
  { to: "/guestbook", icon: "ph:chat-circle-dots-bold", label: "时光留言" },
  { to: "/friends", icon: "ph:handshake-bold", label: "友链" },
  { to: "/changelog", icon: "ph:git-commit-bold", label: "风迹墙" },
  { to: "/about", icon: "ph:info-bold", label: "关于" },
];

const adminFullNav = [
  { to: "/admin", icon: "ph:gauge-bold", label: "仪表盘" },
  { to: "/admin/analytics", icon: "ph:chart-line-up-bold", label: "访问统计" },
  { to: "/admin/posts", icon: "ph:article-bold", label: "文章" },
  { to: "/admin/moments", icon: "ph:sparkle-bold", label: "瞬间" },
  { to: "/admin/circle", icon: "ph:wind-bold", label: "风讯角" },
  { to: "/admin/library", icon: "ph:books-bold", label: "书影" },
  { to: "/admin/albums", icon: "ph:images-square-bold", label: "相册" },
  { to: "/admin/memory-graph", icon: "ph:planet-bold", label: "时光星图" },
  { to: "/admin/journeys", icon: "ph:path-bold", label: "故事航线" },
  { to: "/admin/categories", icon: "ph:folder-open-bold", label: "分类管理" },
  { to: "/admin/tags", icon: "ph:tag-bold", label: "标签管理" },
  { to: "/admin/friends", icon: "ph:handshake-bold", label: "友链管理" },
  { to: "/admin/comments", icon: "ph:shield-check-bold", label: "审核中心" },
  { to: "/admin/media", icon: "ph:image-bold", label: "媒体库" },
  { to: "/admin/users", icon: "ph:users-three-bold", label: "用户管理" },
  { to: "/admin/visitor", icon: "ph:footprints-bold", label: "访问管理" },
  { to: "/admin/visitor-content", icon: "ph:chat-circle-dots-bold", label: "留言与漂流瓶" },
  { to: "/admin/ai", icon: "ph:robot-bold", label: "功能与模型" },
  { to: "/admin/email", icon: "ph:envelope-bold", label: "邮件功能" },
  { to: "/admin/emoji", icon: "ph:smiley-bold", label: "表情资源" },
  { to: "/admin/about", icon: "ph:identification-card-bold", label: "关于我" },
  { to: "/admin/changelog", icon: "ph:git-commit-bold", label: "风迹墙" },
  { to: "/admin/settings", icon: "ph:gear-bold", label: "站点设置" },
  { to: "/admin/profile", icon: "ph:user-bold", label: "我的信息" },
  { to: "/admin/messages", icon: "ph:bell-bold", label: "我的消息" },
];

const userPanelNav = [
  { to: "/admin/profile", icon: "ph:user-bold", label: "我的信息" },
  { to: "/admin/messages", icon: "ph:bell-bold", label: "我的消息" },
];

const navItems = computed(() => {
  const filterFeatures = (items: typeof siteNav) =>
    items.filter(
      (item) =>
        (albumsEnabled || !item.to.includes("/albums")) &&
        (mapEnabled || !item.to.includes("/time/map")) &&
        (constellationEnabled || !item.to.includes("/time/constellation")) &&
        (storiesEnabled || !item.to.includes("/stories")) &&
        (guestbookEnabled || !item.to.includes("/guestbook")) &&
        (isPanel.value ||
          circleEnabled.value ||
          !item.to.includes("/circle")) &&
        (isPanel.value ||
          changelogEnabled.value ||
          !item.to.includes("/changelog")),
    );
  if (!isPanel.value) return filterFeatures(siteNav);
  return isUserAdmin.value ? filterFeatures(adminFullNav) : userPanelNav;
});

type NavGroup = { key: string; label: string; items: typeof siteNav };
const expandedGroups = ref<Record<string, boolean>>({
  articles: true,
  taxonomy: true,
  timeline: true,
  community: true,
  "community-content": false,
  overview: true,
  content: true,
  resources: false,
  engagement: true,
  intelligence: true,
  notify: false,
  system: true,
  account: true,
});
const navGroups = computed<NavGroup[]>(() => {
  const items = navItems.value;
  if (isPanel.value) {
    if (!isUserAdmin.value) {
      return [{ key: "account", label: "个人中心", items }];
    }
    const select = (paths: string[]) =>
      items.filter((item) => paths.includes(item.to));
    return [
      {
        key: "overview",
        label: "总览",
        items: select(["/admin", "/admin/analytics"]),
      },
      {
        key: "content",
        label: "内容创作",
        items: select([
          "/admin/posts",
          "/admin/moments",
          "/admin/library",
          "/admin/albums",
          "/admin/memory-graph",
          "/admin/journeys",
        ]),
      },
      {
        key: "resources",
        label: "内容资源",
        items: select([
          "/admin/categories",
          "/admin/tags",
          "/admin/circle",
          "/admin/friends",
          "/admin/media",
          "/admin/emoji",
        ]),
      },
      {
        key: "engagement",
        label: "社区与用户",
        items: select(["/admin/comments", "/admin/users", "/admin/visitor"]),
      },
      {
        key: "community-content",
        label: "留言与漂流瓶",
        items: select(["/admin/visitor-content"]),
      },
      {
        key: "intelligence",
        label: "AI 能力",
        items: select(["/admin/ai"]),
      },
      {
        key: "system",
        label: "系统与通知",
        items: select([
          "/admin/email",
          "/admin/settings",
          "/admin/about",
          "/admin/changelog",
        ]),
      },
      {
        key: "account",
        label: "账户",
        items: select(["/admin/profile", "/admin/messages"]),
      },
    ].filter((group) => group.items.length);
  }
  const select = (paths: string[]) =>
    items.filter((item) => paths.includes(item.to));
  return [
    { key: "articles", label: "首页", items: select(["/home"]) },
    {
      key: "taxonomy",
      label: "文章索引",
      items: select(["/archive", "/category", "/tags"]),
    },
    {
      key: "timeline",
      label: "时光收藏",
      items: select([
        "/moments",
        "/circle",
        "/library",
        "/albums",
        "/time/map",
        "/time/constellation",
        "/stories",
      ]),
    },
    {
      key: "community",
      label: "相遇",
      items: select(["/guestbook", "/friends", "/changelog", "/about"]),
    },
  ].filter((group) => group.items.length);
});

function isGroupOpen(group: NavGroup) {
  return collapsed.value || expandedGroups.value[group.key] !== false;
}
function toggleGroup(key: string) {
  expandedGroups.value[key] = !expandedGroups.value[key];
}

function expandActiveGroup() {
  const activeGroup = navGroups.value.find((group) =>
    group.items.some((item) => isNavActive(item.to)),
  );
  if (activeGroup) expandedGroups.value[activeGroup.key] = true;
}

const heroLink = computed(() => {
  if (!isPanel.value) return "/home";
  return panelHome();
});

const heroTitle = computed(() => {
  if (!isPanel.value) return siteTitle.value;
  return isUserAdmin.value ? "管理后台" : "个人中心";
});

const heroSlogan = computed(() => {
  if (!isPanel.value) return siteDescription.value;
  return isUserAdmin.value ? `${siteTitle.value} · 内容管理` : "管理账号与消息";
});

function isNavActive(to: string) {
  if (isPanel.value) {
    if (to === "/admin") return route.path === "/admin";
    return route.path === to || route.path.startsWith(`${to}/`);
  }
  return route.path === to || route.path.startsWith(`${to}/`);
}

function openSearch() {
  emit("openSearch");
}

function goPanel() {
  router.push(isUserAdmin.value ? "/admin" : "/admin/profile");
}

async function handleLogout() {
  const accepted = await confirm({
    title: "退出登录？",
    message: "退出后仍可继续浏览公开内容。",
    confirmText: "退出",
    danger: true,
  });
  if (!accepted) return;
  const returnPath = route.meta.requiresAuth
    ? lastPublicPath()
    : route.fullPath;
  clearSession();
  try {
    const toast = useToast();
    toast.success("已退出登录");
  } catch {
    // ignore
  }
  await router.replace(returnPath || "/home");
}

onMounted(() => {
  void loadSiteSettings();
  void loadCircleFeature();
  void loadChangelogFeature();
  readStorage();
  expandActiveGroup();
  if (isLoggedIn.value) refreshProfile();
});
watch(
  () => route.fullPath,
  () => {
    readStorage();
    expandActiveGroup();
  },
);
</script>

<style scoped>
.sidebar-left {
  width: var(--left-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 16px 16px;
  overflow: hidden;
  min-height: 0;
  height: 100%;
  max-height: 100dvh;
}

.sidebar-hero {
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
}

.sidebar-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 11px 2px 8px 0;
  overscroll-behavior: contain;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  margin: 0;
  padding: 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 16px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--c-primary-soft) 64%, var(--ld-bg-card)),
    var(--ld-bg-card) 70%
  );
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  isolation: isolate;
}

.hero::after {
  position: absolute;
  top: -58px;
  right: -46px;
  width: 126px;
  height: 126px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 18%, transparent);
  border-radius: 50%;
  content: "";
  animation: hero-orbit 24s linear infinite;
}

.hero-glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  filter: blur(18px);
  opacity: 0.5;
}

.hero-glow-one {
  top: -28px;
  left: -20px;
  width: 90px;
  height: 90px;
  background: color-mix(in srgb, var(--c-primary) 18%, transparent);
  animation: hero-drift 7s ease-in-out infinite alternate;
}

.hero-glow-two {
  right: -24px;
  bottom: -32px;
  width: 88px;
  height: 88px;
  background: color-mix(in srgb, #9b78df 14%, transparent);
  animation: hero-drift 9s ease-in-out -2s infinite alternate-reverse;
}

.wind-stroke {
  position: absolute;
  z-index: -1;
  height: 1px;
  border-radius: 99px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--c-primary) 35%, transparent),
    transparent
  );
  transform: rotate(-8deg);
}

.wind-stroke-one {
  top: 20px;
  right: -8px;
  width: 94px;
  animation: wind-pass 5.4s ease-in-out infinite;
}

.wind-stroke-two {
  right: 8px;
  bottom: 16px;
  width: 64px;
  animation: wind-pass 6.8s ease-in-out -2s infinite;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-row {
  display: flex;
  align-items: center;
  align-items: flex-start;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}

.logo-wrap {
  position: relative;
  display: grid;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border));
  padding: 7px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 80%, transparent);
  box-shadow: inset 0 0 0 5px
    color-mix(in srgb, var(--c-primary-soft) 38%, transparent);
  color: var(--c-primary);
  place-items: center;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-name {
  margin-top: 2px;
  font-family: var(--font-brand);
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0.04em;
  line-height: 1.3;
}

.hero-kicker {
  color: var(--c-primary);
  font-family: var(--font-accent);
  font-size: 0.41rem;
  font-weight: 760;
  letter-spacing: 0.11em;
}

.hero-status {
  display: grid;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  margin-top: 2px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
  place-items: center;
}

.hero-status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #47b985;
  box-shadow: 0 0 0 3px color-mix(in srgb, #47b985 13%, transparent);
  animation: status-pulse 2.4s ease-in-out infinite;
}

.hero-slogan {
  max-width: 138px;
  font-family: var(--font-summary);
  font-size: 0.57rem;
  color: var(--c-text-2);
  margin-top: 1px;
  letter-spacing: 0.06em;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
}

@keyframes hero-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes hero-drift {
  to {
    transform: translate3d(10px, 8px, 0) scale(1.12);
  }
}

@keyframes wind-pass {
  0%,
  100% {
    opacity: 0.15;
    transform: translateX(-12px) rotate(-8deg);
  }

  50% {
    opacity: 0.75;
    transform: translateX(12px) rotate(-8deg);
  }
}

@keyframes logo-breathe {
  50% {
    opacity: 0.5;
    transform: scale(0.94);
  }
}

/* ===== Search ===== */
.search-box {
  flex: 0 0 auto;
  margin-top: 11px;
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.search-suffix {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: var(--c-text-3);
  pointer-events: none;
}

.search-box input {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 7px 30px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.78rem;
  outline: none;
  cursor: pointer;
  transition:
    border 0.2s,
    box-shadow 0.2s;
}

.search-box input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
}

.search-box input::placeholder {
  color: var(--c-text-3);
}

/* ===== Nav ===== */
.nav-menu {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-group + .nav-group {
  margin-top: 8px;
}

.nav-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  border: 0;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font: inherit;
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  text-align: left;
}

.nav-group-toggle svg {
  font-size: 0.62rem;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-group.is-open .nav-group-toggle svg {
  transform: rotate(0deg);
}

.nav-group:not(.is-open) .nav-group-toggle svg {
  transform: rotate(-90deg);
}

.nav-group-items {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition:
    grid-template-rows 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;
}

.nav-group-inner {
  min-height: 0;
}

.nav-group-items.is-collapsed-group {
  grid-template-rows: 0fr;
  opacity: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--c-text-2);
  font-size: 0.85rem;
  text-decoration: none;
  transition: all 0.15s;
}

.nav-item:hover {
  color: var(--c-text);
  background: var(--c-bg-2);
}

.nav-item.active {
  color: var(--c-primary);
  font-weight: 700;
  background: var(--c-primary-soft);
}

.nav-icon {
  font-size: 1rem;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

/* ===== Bottom ===== */
.sidebar-bottom {
  position: relative;
  flex: 0 0 auto;
  min-height: 0;
  margin-top: 0;
  padding-top: 7px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow: visible;
}

.sidebar-bottom-scroll {
  display: flex;
  flex: 0 0 auto;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  overflow: visible;
}

.sidebar-tools {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.sidebar-tool {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-bg-2) 76%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.82rem;
  line-height: 1;
  text-decoration: none;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.theme-pill {
  --theme-pill-pad: 3px;
  --theme-pill-ease: cubic-bezier(0.47, 1.64, 0.41, 0.8);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3px;
  padding: var(--theme-pill-pad);
  width: fit-content;
  box-sizing: border-box;
  margin: 0;
  background: var(--c-bg-2);
  border-radius: 1.2rem;
  isolation: isolate;
}

.theme-pill::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  /* background: color-mix(in srgb, var(--c-bg-2) 88%, transparent); */
  content: "";
  transition:
    inset 0.25s ease,
    box-shadow 0.25s ease;
}

.theme-pill:focus-within::after {
  inset: -3px;
  /* box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 14%, transparent); */
}

.theme-pill::before {
  position: absolute;
  z-index: 0;
  top: var(--theme-pill-pad);
  bottom: var(--theme-pill-pad);
  left: var(--theme-pill-pad);
  width: 34px;
  box-sizing: border-box;
  border-radius: 1rem;
  background: var(--ld-bg-card);
  box-shadow:
    inset 0 1px 1px color-mix(in srgb, #fff 32%, transparent),
    0.1em 0.2em 0.5em var(--ld-shadow);
  content: "";
  transform: translate3d(0, 0, 0);
  transition:
    transform 0.5s var(--theme-pill-ease),
    background-color 0.5s ease,
    box-shadow 0.5s ease;
}

.theme-pill.theme-dark::before {
  transform: translate3d(37px, 0, 0);
}

.theme-pill.theme-auto::before {
  transform: translate3d(74px, 0, 0);
}

.theme-pill button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  box-sizing: border-box;
  padding: 5px 10px;
  border: none;
  border-radius: 1rem;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  opacity: 0.75;
  transition:
    color 0.15s ease,
    opacity 0.3s ease;
}

.theme-pill button.active {
  background: transparent;
  color: var(--c-text);
  opacity: 1;
}

.admin-collapse-button {
  color: var(--c-text-2);
}

.sidebar-divider {
  height: 1px;
  background: var(--border);
  opacity: 0.5;
  margin: 0 0 4px;
}

.login-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--c-text-2);
  font-size: 0.8rem;
  text-decoration: none;
  background: var(--c-bg-2);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  transition: all 0.15s;
}

.login-link:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
  border-color: transparent;
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  background: var(--c-bg-2);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.user-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.user-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: background 0.15s;
}

.user-main:hover {
  background: color-mix(in srgb, var(--ld-bg-card) 70%, transparent);
}

.avatar-wrapper {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c-primary-soft) 80%, var(--ld-bg-card));
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-icon {
  font-size: 1.1rem;
  color: var(--c-primary);
}

.user-name {
  flex: 1;
  min-width: 0;
  font-size: 0.84rem;
  font-weight: 650;
  color: var(--c-text);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-badge {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  font-size: 0.58rem;
  font-weight: 700;
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.user-logout {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font-size: 1rem;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.user-logout:hover {
  color: color-mix(in srgb, #ef4444 70%, var(--c-text-2));
  background: color-mix(in srgb, #ef4444 8%, transparent);
}

.font-pill {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  padding: 3px;
  width: fit-content;
  margin: -3px auto 0;
  background: var(--c-bg-2);
  border-radius: 1.2rem;
}

.font-pill button {
  width: 30px;
  height: 24px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 1rem;
  background: transparent;
  color: var(--c-text-3);
  font-family: var(--font-body);
  font-size: 0.68rem;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}

.font-pill button:hover {
  color: var(--c-text);
}

.font-pill button.active {
  background: var(--ld-bg-card);
  color: var(--c-primary);
  font-weight: 700;
  box-shadow: 0.1em 0.2em 0.5em var(--ld-shadow);
}

.sidebar-left.is-collapsed {
  width: 72px;
  padding-inline: 9px;
}

.is-collapsed .sidebar-scroll {
  padding-right: 0;
}

.is-collapsed .hero {
  padding: 8px;
  border-radius: 14px;
}

.is-collapsed .hero-row {
  justify-content: center;
}

.is-collapsed .logo-wrap {
  width: 42px;
  height: 42px;
  border-radius: 13px;
}

.is-collapsed .hero-text,
.is-collapsed .hero-status,
.is-collapsed .search-box,
.is-collapsed .nav-label,
.is-collapsed .user-name,
.is-collapsed .user-badge,
.is-collapsed .user-logout,
.is-collapsed .user-back span {
  display: none;
}

.is-collapsed .nav-menu {
  gap: 5px;
}

.is-collapsed .nav-group-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.is-collapsed .nav-item {
  width: 42px;
  margin-inline: auto;
  justify-content: center;
  padding: 9px 0;
}

.is-collapsed .nav-icon {
  width: 18px;
  font-size: 1.08rem;
}

.is-collapsed .sidebar-bottom {
  align-items: center;
}

.is-collapsed .login-link {
  width: 42px;
  height: 42px;
  padding: 0;
  font-size: 0;
}

.is-collapsed .login-link :deep(svg) {
  font-size: 1rem;
}

.is-collapsed .user-card {
  width: 44px;
  padding: 6px;
}

.is-collapsed .user-row,
.is-collapsed .user-main {
  justify-content: center;
}

.is-collapsed .user-main {
  flex: 0 0 auto;
  padding: 0;
}

.is-collapsed .user-card :deep(.notif-bell-wrap) {
  display: none;
}

.is-collapsed .sidebar-tools {
  flex-direction: column;
  gap: 7px;
}

.is-collapsed .user-back {
  width: 28px;
  flex-basis: 28px;
}

.is-collapsed .theme-pill {
  width: 42px;
  height: 105px;
  flex-direction: column;
  align-items: center;
  border-radius: 14px;
}

.is-collapsed .theme-pill button {
  width: 34px;
  height: 31px;
  flex: 0 0 31px;
  padding: 0;
}

.is-collapsed .theme-pill::before {
  top: 3px;
  left: 50%;
  width: 34px;
  height: 31px;
  bottom: auto;
  transform: translate3d(-50%, 0, 0);
}

.is-collapsed .theme-pill.theme-dark::before {
  transform: translate3d(-50%, 34px, 0);
}

.is-collapsed .theme-pill.theme-auto::before {
  transform: translate3d(-50%, 68px, 0);
}

.is-collapsed .admin-collapse-button {
  width: 30px;
  flex-basis: 30px;
}

@media (prefers-reduced-motion: reduce) {
  .hero::after,
  .hero-glow,
  .wind-stroke,
  .hero-status i {
    animation: none;
  }
}
</style>
