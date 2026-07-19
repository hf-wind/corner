<template>
  <aside class="sidebar-left">
    <div class="hero">
      <svg class="hero-bg" viewBox="0 0 240 120" preserveAspectRatio="none">
        <defs>
          <radialGradient id="glow1" cx="30%" cy="20%" r="60%">
            <stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="glow2" cx="70%" cy="40%" r="50%">
            <stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="240" height="120" fill="url(#glow1)"/>
        <rect width="240" height="120" fill="url(#glow2)"/>
      </svg>
      <div class="hero-content">
        <div class="avatar-ring">
          <NuxtLink to="/home">
            <img class="avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" alt="avatar">
          </NuxtLink>
        </div>
        <div class="hero-name">清欢小筑</div>
        <div class="hero-slogan">此心安处，便是清欢</div>
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
      <NuxtLink to="/login" class="login-link">
        <Icon name="ph:sign-in-bold" />
        登录 / 注册
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
const theme = ref('light')

function setTheme(mode: string) {
  theme.value = mode
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (mode === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }
}

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
}

/* ===== Hero ===== */
.hero {
  text-align: center;
  position: relative;
  padding: 16px 0 14px;
}
.hero-bg {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 120px;
  z-index: 0;
  opacity: 0.7;
  border-radius: 12px;
}
.hero-content {
  position: relative;
  z-index: 1;
}
.avatar-ring {
  position: relative;
  display: inline-block;
}
.avatar-ring::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(var(--c-primary), var(--c-accent, #60a5fa), var(--c-primary));
  animation: spin-ring 4s linear infinite;
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff calc(100% - 2.5px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff calc(100% - 2.5px));
}
@keyframes spin-ring {
  to { transform: rotate(360deg); }
}
.avatar {
  width: 64px; height: 64px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  position: relative;
  z-index: 1;
}
.hero-name {
  font-size: 1.05rem;
  font-weight: 700;
  margin-top: 10px;
  color: var(--c-text);
  letter-spacing: 0.03em;
}
.hero-slogan {
  font-size: 0.68rem;
  color: var(--c-text-2);
  margin-top: 2px;
  letter-spacing: 0.05em;
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
  width: 100%;
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
.search-box input::placeholder { color: var(--c-text-3); }
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
.login-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--c-text-2);
  text-align: center;
  text-decoration: none;
  padding: 5px 0;
  border-radius: 6px;
  transition: color 0.2s;
}
.login-link:hover { color: var(--c-primary); }
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
