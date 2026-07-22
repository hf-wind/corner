<template>
  <aside class="sidebar-left">
    <div class="hero">
      <svg class="hero-bg" viewBox="0 0 240 120" preserveAspectRatio="none">
        <defs>
          <radialGradient id="glow1" cx="30%" cy="20%" r="60%">
            <stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.08" />
            <stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="glow2" cx="70%" cy="40%" r="50%">
            <stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.05" />
            <stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="240" height="120" fill="url(#glow1)" />
        <rect width="240" height="120" fill="url(#glow2)" />
      </svg>
      <div class="hero-content">
        <NuxtLink to="/home" class="hero-row">
          <div class="logo-wrap">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="l-glow" x1=".5" y1=".5" x2="1" y2="1">
                  <stop offset="0%" stop-color="currentColor" stop-opacity=".12" />
                  <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M 22 40 Q 48 34, 66 30 Q 78 27, 84 18" stroke-width="5" />
                <line x1="36" y1="38" x2="36" y2="76" stroke-width="4.5" />
                <line x1="22" y1="76" x2="66" y2="76" stroke-width="1.5" opacity=".25" />
                <line x1="66" y1="76" x2="66" y2="30" stroke-width="1.5" opacity=".15" />
                <circle cx="51" cy="57" r="12" fill="url(#l-glow)" stroke="none" />
                <circle cx="51" cy="57" r="4.5" fill="currentColor" stroke="none" />
              </g>
            </svg>
          </div>
          <div class="hero-text">
            <div class="hero-name">清欢小筑</div>
            <div class="hero-slogan">此心安处，便是清欢</div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div class="search-box" @click="openSearch">
      <input type="text" placeholder="搜索文章..." readonly>
      <Icon name="ph:magnifying-glass-bold" class="search-suffix" />
    </div>

    <nav class="nav-menu">
      <NuxtLink to="/home" class="nav-item" active-class="active">
        <Icon name="ph:house-bold" class="nav-icon" />首页
      </NuxtLink>
      <NuxtLink to="/archive" class="nav-item" active-class="active">
        <Icon name="ph:archive-bold" class="nav-icon" />归档
      </NuxtLink>
      <NuxtLink to="/category" class="nav-item" active-class="active">
        <Icon name="ph:folder-open-bold" class="nav-icon" />分类
      </NuxtLink>
      <NuxtLink to="/tags" class="nav-item" active-class="active">
        <Icon name="ph:tag-bold" class="nav-icon" />标签
      </NuxtLink>
      <NuxtLink to="/friends" class="nav-item" active-class="active">
        <Icon name="ph:handshake-bold" class="nav-icon" />友链
      </NuxtLink>
      <NuxtLink to="/about" class="nav-item" active-class="active">
        <Icon name="ph:info-bold" class="nav-icon" />关于
      </NuxtLink>
    </nav>

    <div class="sidebar-bottom">
      <div class="sidebar-divider"></div>
      <NuxtLink v-if="!isLoggedIn" to="/login" class="user-entry">
        <div class="avatar-wrapper">
          <Icon name="ph:user-circle-bold" class="default-avatar-icon" />
        </div>
        <div class="user-info">
          <span class="user-name">登录</span>
          <span class="user-desc">点击登录账号</span>
        </div>
      </NuxtLink>
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
    </div>
  </aside>
</template>

<script setup lang="ts">
const emit = defineEmits<{ openSearch: [] }>()
const { theme, setTheme } = useTheme()
const isLoggedIn = computed(() => import.meta.client && !!localStorage.getItem('token'))

function openSearch() {
  emit('openSearch')
}
</script>

<style scoped>
.sidebar-left {
  width: var(--left-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 16px 16px;
  overflow-y: auto;
  overflow-x: hidden;
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
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-divider {
  height: 1px;
  background: var(--border);
  opacity: 0.5;
  margin: 0 0 4px;
}

.user-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--c-text-2);
  text-decoration: none;
  transition: all 0.15s;
}

.user-entry:hover {
  background: var(--c-bg-2);
}

.avatar-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-2);
  flex-shrink: 0;
}

.default-avatar-icon {
  font-size: 1.25rem;
  color: var(--c-text-3);
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1.3;
}

.user-desc {
  font-size: 0.65rem;
  color: var(--c-text-3);
  line-height: 1.3;
  margin-top: 1px;
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
</style>
