<template>
  <aside class="sidebar-left" :class="{ 'is-collapsed': collapsed }">
    <div class="sidebar-scroll">
    <div class="hero">
      <span class="hero-glow hero-glow-one" aria-hidden="true" />
      <span class="hero-glow hero-glow-two" aria-hidden="true" />
      <span class="wind-stroke wind-stroke-one" aria-hidden="true" />
      <span class="wind-stroke wind-stroke-two" aria-hidden="true" />
      <div class="hero-content">
        <NuxtLink :to="heroLink" class="hero-row" :title="heroTitle">
          <div class="logo-wrap">
            <span class="logo-orbit"><i /><i /></span>
            <Icon name="ph:wind-bold" />
          </div>
          <div class="hero-text">
            <span class="hero-kicker">WIND · CORNER</span>
            <div class="hero-name">{{ heroTitle }}</div>
            <div class="hero-slogan">{{ heroSlogan }}</div>
          </div>
          <span class="hero-status" aria-hidden="true"><i /></span>
        </NuxtLink>
      </div>
    </div>

    <div v-if="!isPanel" class="search-box" @click="openSearch">
      <input type="text" placeholder="搜索文章..." readonly>
      <Icon name="ph:magnifying-glass-bold" class="search-suffix" />
    </div>

    <nav class="nav-menu">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isNavActive(item.to) }"
        :title="collapsed ? item.label : undefined"
      >
        <Icon :name="item.icon" class="nav-icon" /><span class="nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>
    </div>

    <div class="sidebar-bottom">
      <div class="sidebar-divider"></div>
      <div ref="playerSlotRef" class="sidebar-player-slot" />
      <NuxtLink v-if="!isLoggedIn && !isPanel" to="/login" class="login-link">
        <Icon name="ph:sign-in-bold" /> 登录 / 注册
      </NuxtLink>
      <div v-else-if="isLoggedIn" class="user-card">
        <div class="user-row">
          <button type="button" class="user-main" @click="goPanel">
            <div class="avatar-wrapper">
              <img v-if="user?.avatar" :src="avatarSrc" alt="" class="avatar-img">
              <Icon v-else name="ph:user-circle-fill" class="avatar-icon" />
            </div>
            <span class="user-name">{{ user?.username ?? '用户' }}</span>
            <span v-if="isUserAdmin" class="user-badge">管</span>
          </button>
          <NotificationBell />
          <button type="button" class="user-logout" title="退出登录" @click="handleLogout">
            <Icon name="ph:sign-out-bold" />
          </button>
        </div>
        <NuxtLink v-if="isPanel" to="/home" class="user-back">
          <Icon name="ph:arrow-left-bold" />
          <span>返回前台</span>
        </NuxtLink>
      </div>
      <div class="theme-pill">
        <button :class="{ active: theme === 'light' }" @click="setTheme('light')" title="亮色">
          <Icon name="ph:sun-bold" />
        </button>
        <button :class="{ active: theme === 'dark' }" @click="setTheme('dark')" title="深色">
          <Icon name="ph:moon-bold" />
        </button>
        <button :class="{ active: theme === 'auto' }" @click="setTheme('auto')" title="跟随系统">
          <Icon name="ph:monitor-bold" />
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
      -->
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useFeatureFlags } from '~/composables/useFeatureFlags'

const props = withDefaults(defineProps<{
  variant?: 'site' | 'admin'
  collapsed?: boolean
}>(), {
  variant: 'site',
  collapsed: false,
})

const emit = defineEmits<{ openSearch: [] }>()
const { theme, setTheme } = useTheme()
const { siteTitle, siteDescription, loadSiteSettings } = useSiteSettings()
// 字体切换入口暂时隐藏：const { fontPreset, fontPresets, setFontPreset } = useTypography()
const { registerSlot, unregisterSlot } = useMusicPlayerSlot()
const {
  user,
  isLoggedIn,
  isAdmin: isUserAdmin,
  readStorage,
  refreshProfile,
  clearSession,
  panelHome,
} = useAuth()
const { mediaUrl } = useMediaUrl()
const route = useRoute()
const router = useRouter()

const isPanel = computed(() => props.variant === 'admin')
const collapsed = computed(() => props.collapsed && isPanel.value)
const { albumsEnabled, mapEnabled } = useFeatureFlags()
const avatarSrc = computed(() => mediaUrl(user.value?.avatar))
const playerSlotRef = ref<HTMLElement | null>(null)
let registeredSlot: HTMLElement | null = null

watch(playerSlotRef, (el) => {
  if (registeredSlot && registeredSlot !== el) unregisterSlot(registeredSlot)
  registeredSlot = el
  if (el) registerSlot(el)
}, { immediate: true })

onBeforeUnmount(() => {
  if (registeredSlot) {
    unregisterSlot(registeredSlot)
    registeredSlot = null
  }
})

const siteNav = [
  { to: '/home', icon: 'ph:house-bold', label: '首页' },
  { to: '/archive', icon: 'ph:archive-bold', label: '归档' },
  { to: '/category', icon: 'ph:folder-open-bold', label: '分类' },
  { to: '/tags', icon: 'ph:tag-bold', label: '标签' },
  { to: '/library', icon: 'ph:books-bold', label: '书影' },
  { to: '/moments', icon: 'ph:sparkle-bold', label: '瞬间' },
  { to: '/time/map', icon: 'ph:map-trifold-bold', label: '地图' },
  { to: '/albums', icon: 'ph:images-square-bold', label: '相册' },
  { to: '/friends', icon: 'ph:handshake-bold', label: '友链' },
  { to: '/about', icon: 'ph:info-bold', label: '关于' },
]

const adminFullNav = [
  { to: '/admin/moments', icon: 'ph:sparkle-bold', label: '瞬间' },
  { to: '/admin/albums', icon: 'ph:images-square-bold', label: '相册' },
  { to: '/admin', icon: 'ph:gauge-bold', label: '仪表盘' },
  { to: '/admin/analytics', icon: 'ph:chart-line-up-bold', label: '访问统计' },
  { to: '/admin/posts', icon: 'ph:article-bold', label: '文章' },
  { to: '/admin/library', icon: 'ph:books-bold', label: '书影' },
  { to: '/admin/categories', icon: 'ph:folder-open-bold', label: '分类' },
  { to: '/admin/tags', icon: 'ph:tag-bold', label: '标签' },
  { to: '/admin/comments', icon: 'ph:chat-circle-dots-bold', label: '评论' },
  { to: '/admin/users', icon: 'ph:users-three-bold', label: '用户' },
  { to: '/admin/media', icon: 'ph:image-bold', label: '文件' },
  { to: '/admin/friends', icon: 'ph:handshake-bold', label: '友链' },
  { to: '/admin/friend-applications', icon: 'ph:link-bold', label: '友联申请' },
  { to: '/admin/ai', icon: 'ph:robot-bold', label: 'AI' },
  { to: '/admin/email', icon: 'ph:envelope-bold', label: '邮件' },
  { to: '/admin/about', icon: 'ph:identification-card-bold', label: '关于我' },
  { to: '/admin/settings', icon: 'ph:gear-bold', label: '设置' },
  { to: '/admin/emoji', icon: 'ph:smiley-bold', label: '表情' },
  { to: '/admin/info', icon: 'ph:info-bold', label: '系统信息' },
  { to: '/admin/profile', icon: 'ph:user-bold', label: '我的信息' },
  { to: '/admin/messages', icon: 'ph:bell-bold', label: '我的消息' },
]

const userPanelNav = [
  { to: '/admin/profile', icon: 'ph:user-bold', label: '我的信息' },
  { to: '/admin/messages', icon: 'ph:bell-bold', label: '我的消息' },
]

const navItems = computed(() => {
  const filterFeatures = (items: typeof siteNav) => items.filter(item =>
    (albumsEnabled || !item.to.includes('/albums')) && (mapEnabled || !item.to.includes('/time/map')),
  )
  if (!isPanel.value) return filterFeatures(siteNav)
  return isUserAdmin.value ? filterFeatures(adminFullNav) : userPanelNav
})

const heroLink = computed(() => {
  if (!isPanel.value) return '/home'
  return panelHome()
})

const heroTitle = computed(() => {
  if (!isPanel.value) return siteTitle.value
  return isUserAdmin.value ? '管理后台' : '个人中心'
})

const heroSlogan = computed(() => {
  if (!isPanel.value) return siteDescription.value
  return isUserAdmin.value ? `${siteTitle.value} · 内容管理` : '管理账号与消息'
})

function isNavActive(to: string) {
  if (isPanel.value) {
    if (to === '/admin') return route.path === '/admin'
    return route.path === to || route.path.startsWith(`${to}/`)
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}

function openSearch() {
  emit('openSearch')
}

function goPanel() {
  router.push(panelHome())
}

function handleLogout() {
  clearSession()
  try {
    const toast = useToast()
    toast.success('已退出登录')
  } catch {
    // ignore
  }
  router.replace('/home')
}

onMounted(() => {
  void loadSiteSettings()
  readStorage()
  if (isLoggedIn.value) refreshProfile()
})
watch(() => route.fullPath, () => {
  readStorage()
})
</script>

<style scoped>
.sidebar-left {
  width: var(--left-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 16px 16px;
  overflow: visible;
  min-height: 0;
  height: 100%;
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.sidebar-player-slot {
  position: relative;
  z-index: 50;
  overflow: visible;
  width: 100%;
  min-height: 0;
}

.sidebar-player-slot:empty {
  display: none;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  margin: 0 0 3px;
  padding: 13px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 16px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--c-primary-soft) 64%, var(--ld-bg-card)), var(--ld-bg-card) 70%);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  isolation: isolate;
}
.hero::after { position:absolute; top:-46px; right:-39px; width:112px; height:112px; border:1px dashed color-mix(in srgb,var(--c-primary) 22%,transparent); border-radius:50%; content:''; animation:hero-orbit 24s linear infinite; }
.hero-glow { position:absolute; z-index:-1; border-radius:50%; filter:blur(18px); opacity:.5; }
.hero-glow-one { top:-28px; left:-20px; width:90px; height:90px; background:color-mix(in srgb,var(--c-primary) 18%,transparent); animation:hero-drift 7s ease-in-out infinite alternate; }
.hero-glow-two { right:-24px; bottom:-32px; width:88px; height:88px; background:color-mix(in srgb,#9b78df 14%,transparent); animation:hero-drift 9s ease-in-out -2s infinite alternate-reverse; }
.wind-stroke { position:absolute; z-index:-1; height:1px; border-radius:99px; background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--c-primary) 35%,transparent),transparent); transform:rotate(-8deg); }
.wind-stroke-one { top:20px; right:-8px; width:94px; animation:wind-pass 5.4s ease-in-out infinite; }
.wind-stroke-two { right:8px; bottom:16px; width:64px; animation:wind-pass 6.8s ease-in-out -2s infinite; }
.hero-content { position:relative; z-index:1; }

.hero-row {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.logo-wrap {
  position:relative;
  display:grid;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  border:1px solid color-mix(in srgb,var(--c-primary) 34%,var(--border));
  border-radius:15px;
  background:color-mix(in srgb,var(--ld-bg-card) 80%,transparent);
  box-shadow:inset 0 0 0 5px color-mix(in srgb,var(--c-primary-soft) 38%,transparent);
  color:var(--c-primary);
  font-size:1.35rem;
  place-items:center;
}
.logo-orbit { position:absolute; inset:-5px; border:1px solid color-mix(in srgb,var(--c-primary) 18%,transparent); border-radius:18px; animation:logo-breathe 3.4s ease-in-out infinite; }
.logo-orbit i { position:absolute; width:5px; height:5px; border-radius:50%; background:var(--c-primary); box-shadow:0 0 8px color-mix(in srgb,var(--c-primary) 55%,transparent); }
.logo-orbit i:first-child { top:-3px; right:10px; }.logo-orbit i:last-child { bottom:5px; left:-3px; background:#d99459; }

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-name {
  margin-top:2px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0.04em;
  line-height: 1.3;
}
.hero-kicker { color:var(--c-primary); font-family:var(--font-mono); font-size:.43rem; font-weight:700; letter-spacing:.14em; }
.hero-status { display:grid; width:18px; height:18px; flex:0 0 auto; border:1px solid var(--border); border-radius:50%; background:color-mix(in srgb,var(--ld-bg-card) 82%,transparent); place-items:center; }
.hero-status i { width:5px; height:5px; border-radius:50%; background:#47b985; box-shadow:0 0 0 3px color-mix(in srgb,#47b985 13%,transparent); animation:status-pulse 2.4s ease-in-out infinite; }

.hero-slogan {
  font-size: 0.65rem;
  color: var(--c-text-2);
  margin-top: 1px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes hero-orbit { to { transform:rotate(360deg); } }
@keyframes hero-drift { to { transform:translate3d(10px,8px,0) scale(1.12); } }
@keyframes wind-pass { 0%,100% { opacity:.15; transform:translateX(-12px) rotate(-8deg); } 50% { opacity:.75; transform:translateX(12px) rotate(-8deg); } }
@keyframes logo-breathe { 50% { opacity:.5; transform:scale(.94); } }

/* ===== Search ===== */
.search-box {
  margin-top: 14px;
  position: relative;
  display: flex;
  align-items: center;
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
  padding: 7px 30px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.78rem;
  outline: none;
  cursor: pointer;
  transition: border 0.2s, box-shadow 0.2s;
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
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  flex-shrink: 0;
  margin-top: 8px;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: visible;
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
  transition: color 0.15s, background 0.15s;
}

.user-logout:hover {
  color: color-mix(in srgb, #ef4444 70%, var(--c-text-2));
  background: color-mix(in srgb, #ef4444 8%, transparent);
}

.user-back {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  text-decoration: none;
  color: var(--c-text-2);
  background: color-mix(in srgb, var(--ld-bg-card) 70%, transparent);
  transition: all 0.15s;
}

.user-back:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.theme-pill {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3px;
  padding: 3px;
  width: fit-content;
  margin: 0 auto;
  background: var(--c-bg-2);
  border-radius: 1.2rem;
}

.theme-pill button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 1rem;
  border: none;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
  line-height: 1;
}

.theme-pill button.active {
  background: var(--ld-bg-card);
  color: var(--c-text);
  box-shadow: 0.1em 0.2em 0.5em var(--ld-shadow);
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
  transition: color 0.15s, background 0.15s, box-shadow 0.15s;
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

.sidebar-left.is-collapsed { width:72px; padding-inline:9px; }
.is-collapsed .sidebar-scroll { padding-right:0; }
.is-collapsed .hero { padding:8px; border-radius:14px; }
.is-collapsed .hero-row { justify-content:center; }
.is-collapsed .logo-wrap { width:42px; height:42px; border-radius:13px; }
.is-collapsed .hero-text,.is-collapsed .hero-status,.is-collapsed .search-box,.is-collapsed .nav-label,.is-collapsed .user-name,.is-collapsed .user-badge,.is-collapsed .user-logout,.is-collapsed .user-back span { display:none; }
.is-collapsed .nav-menu { gap:5px; }
.is-collapsed .nav-item { justify-content:center; padding:9px 0; }
.is-collapsed .nav-icon { width:auto; font-size:1.08rem; }
.is-collapsed .sidebar-bottom { align-items:center; }
.is-collapsed .sidebar-player-slot { width:44px; }
.is-collapsed .login-link { width:42px; height:42px; padding:0; font-size:0; }
.is-collapsed .login-link :deep(svg) { font-size:1rem; }
.is-collapsed .user-card { width:44px; padding:6px; }
.is-collapsed .user-row,.is-collapsed .user-main { justify-content:center; }
.is-collapsed .user-main { flex:0 0 auto; padding:0; }
.is-collapsed .theme-pill { width:42px; flex-direction:column; border-radius:14px; }
.is-collapsed .theme-pill button { width:34px; padding:7px 0; }

@media (prefers-reduced-motion: reduce) {
  .hero::after,.hero-glow,.wind-stroke,.logo-orbit,.hero-status i { animation:none; }
}
</style>
