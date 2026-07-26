<template>
  <aside class="sidebar-left">
    <div class="sidebar-scroll">
    <div class="hero">
      <svg class="hero-bg" viewBox="0 0 240 120" preserveAspectRatio="none">
        <defs>
          <radialGradient :id="glowId1" cx="30%" cy="20%" r="60%">
            <stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.08" />
            <stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0" />
          </radialGradient>
          <radialGradient :id="glowId2" cx="70%" cy="40%" r="50%">
            <stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.05" />
            <stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="240" height="120" :fill="`url(#${glowId1})`" />
        <rect width="240" height="120" :fill="`url(#${glowId2})`" />
      </svg>
      <div class="hero-content">
        <NuxtLink :to="heroLink" class="hero-row">
          <div class="logo-wrap">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient :id="logoGlowId" x1=".5" y1=".5" x2="1" y2="1">
                  <stop offset="0%" stop-color="currentColor" stop-opacity=".12" />
                  <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M 22 40 Q 48 34, 66 30 Q 78 27, 84 18" stroke-width="5" />
                <line x1="36" y1="38" x2="36" y2="76" stroke-width="4.5" />
                <line x1="22" y1="76" x2="66" y2="76" stroke-width="1.5" opacity=".25" />
                <line x1="66" y1="76" x2="66" y2="30" stroke-width="1.5" opacity=".15" />
                <circle cx="51" cy="57" r="12" :fill="`url(#${logoGlowId})`" stroke="none" />
                <circle cx="51" cy="57" r="4.5" fill="currentColor" stroke="none" />
              </g>
            </svg>
          </div>
          <div class="hero-text">
            <div class="hero-name">{{ heroTitle }}</div>
            <div class="hero-slogan">{{ heroSlogan }}</div>
          </div>
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
      >
        <Icon :name="item.icon" class="nav-icon" />{{ item.label }}
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
    </div>
  </aside>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'site' | 'admin'
}>(), {
  variant: 'site',
})

const emit = defineEmits<{ openSearch: [] }>()
const { theme, setTheme } = useTheme()
const { fontPreset, fontPresets, setFontPreset } = useTypography()
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
const avatarSrc = computed(() => mediaUrl(user.value?.avatar))
const playerSlotRef = ref<HTMLElement | null>(null)
let registeredSlot: HTMLElement | null = null
const uid = useId()
const glowId1 = `glow1-${uid}`
const glowId2 = `glow2-${uid}`
const logoGlowId = `l-glow-${uid}`

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
  { to: '/library', icon: 'ph:books-bold', label: '书影音' },
  { to: '/archive', icon: 'ph:archive-bold', label: '归档' },
  { to: '/category', icon: 'ph:folder-open-bold', label: '分类' },
  { to: '/tags', icon: 'ph:tag-bold', label: '标签' },
  { to: '/friends', icon: 'ph:handshake-bold', label: '友链' },
  { to: '/about', icon: 'ph:info-bold', label: '关于' },
]

const adminFullNav = [
  { to: '/admin', icon: 'ph:gauge-bold', label: '仪表盘' },
  { to: '/admin/posts', icon: 'ph:article-bold', label: '文章' },
  { to: '/admin/library', icon: 'ph:books-bold', label: '书影音' },
  { to: '/admin/categories', icon: 'ph:folder-open-bold', label: '分类' },
  { to: '/admin/tags', icon: 'ph:tag-bold', label: '标签' },
  { to: '/admin/comments', icon: 'ph:chat-circle-dots-bold', label: '评论' },
  { to: '/admin/media', icon: 'ph:image-bold', label: '文件' },
  { to: '/admin/friends', icon: 'ph:handshake-bold', label: '友链' },
  { to: '/admin/friend-applications', icon: 'ph:link-bold', label: '友联申请' },
  { to: '/admin/ai', icon: 'ph:robot-bold', label: 'AI' },
  { to: '/admin/email', icon: 'ph:envelope-bold', label: '邮件' },
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
  if (!isPanel.value) return siteNav
  return isUserAdmin.value ? adminFullNav : userPanelNav
})

const heroLink = computed(() => {
  if (!isPanel.value) return '/home'
  return panelHome()
})

const heroTitle = computed(() => {
  if (!isPanel.value) return '清欢小筑'
  return isUserAdmin.value ? '管理后台' : '个人中心'
})

const heroSlogan = computed(() => {
  if (!isPanel.value) return '此心安处，便是清欢'
  return isUserAdmin.value ? '清欢小筑 · 内容管理' : '管理账号与消息'
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
  const toast = useToast()
  clearSession()
  toast.success('已退出登录')
  router.push('/home')
}

onMounted(() => {
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
  padding: 16px 0 14px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  z-index: 0;
  opacity: 0.7;
  border-radius: 12px;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.logo-wrap {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.logo-wrap svg {
  width: 100%;
  height: 100%;
  color: var(--c-text);
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0.04em;
  line-height: 1.3;
}

.hero-slogan {
  font-size: 0.65rem;
  color: var(--c-text-2);
  margin-top: 1px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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
</style>
