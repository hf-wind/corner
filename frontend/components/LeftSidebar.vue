<template>
  <aside class="sidebar-left">
    <div class="hero">
      <svg class="hero-bg" viewBox="0 0 260 120" preserveAspectRatio="none">
        <path d="M0,40 Q65,0 130,35 T260,30 L260,120 L0,120Z" fill="var(--accent)" opacity="0.06"/>
        <path d="M0,60 Q65,25 130,55 T260,50 L260,120 L0,120Z" fill="var(--accent)" opacity="0.04"/>
        <circle cx="200" cy="20" r="30" fill="var(--accent)" opacity="0.04"/>
        <circle cx="50" cy="30" r="18" fill="var(--accent)" opacity="0.03"/>
      </svg>
      <div class="hero-content">
        <NuxtLink to="/home">
          <img class="avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" alt="avatar">
        </NuxtLink>
        <div class="hero-name">清欢小筑</div>
        <div class="hero-slogan">记录生活的小角落</div>
      </div>
    </div>

    <div class="search-box">
      <input type="text" placeholder="搜索文章..." @focus="$router.push('/search')">
      <span class="search-icon">⌘K</span>
    </div>

    <nav class="nav-menu">
      <NuxtLink to="/home" class="nav-item" active-class="active">
        <span class="nav-icon">🏠</span>首页
      </NuxtLink>
      <NuxtLink to="/archive" class="nav-item" active-class="active">
        <span class="nav-icon">📁</span>归档
      </NuxtLink>
      <NuxtLink to="/category" class="nav-item" active-class="active">
        <span class="nav-icon">📂</span>分类
      </NuxtLink>
      <NuxtLink to="/tags" class="nav-item" active-class="active">
        <span class="nav-icon">#</span>标签
      </NuxtLink>
      <NuxtLink to="/friends" class="nav-item" active-class="active">
        <span class="nav-icon">🤝</span>友链
      </NuxtLink>
      <NuxtLink to="/about" class="nav-item" active-class="active">
        <span class="nav-icon">ℹ</span>关于
      </NuxtLink>
    </nav>

    <div class="sidebar-bottom">
      <NuxtLink to="/login" class="login-link">登录 / 注册</NuxtLink>
      <div class="theme-row">
        <button class="theme-btn" :class="{ active: theme === 'light' }" @click="setTheme('light')" title="亮色">☀</button>
        <button class="theme-btn" :class="{ active: theme === 'dark' }" @click="setTheme('dark')" title="深色">🌙</button>
        <button class="theme-btn" :class="{ active: theme === 'auto' }" @click="setTheme('auto')" title="跟随系统">🖥</button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
const theme = ref('light')

function setTheme(mode: string) {
  theme.value = mode
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
</script>

<style scoped>
.sidebar-left {
  width: var(--left-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 32px 20px 20px;
  overflow-y: auto;
}
.hero {
  text-align: center;
  position: relative;
  padding: 20px 0 16px;
}
.hero-bg {
  position: absolute;
  top: 0; left: -20px; right: -20px;
  height: 120px;
  z-index: 0;
  opacity: 0.5;
}
.hero-content {
  position: relative;
  z-index: 1;
}
.avatar {
  width: 72px; height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2.5px solid var(--accent);
  box-shadow: 0 0 0 4px var(--accent-light);
}
.hero-name {
  font-size: 1.15rem;
  font-weight: 700;
  margin-top: 10px;
}
.hero-slogan {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: 3px;
  letter-spacing: 0.05em;
}
.search-box {
  margin-top: 22px;
  position: relative;
}
.search-box input {
  width: 100%;
  padding: 9px 36px 9px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text);
  font-family: inherit;
  font-size: 0.82rem;
  outline: none;
  transition: border 0.25s;
}
.search-box input:focus { border-color: var(--accent); }
.search-box input::placeholder { color: var(--text-secondary); }
.search-icon {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  font-size: 0.72rem;
  color: var(--text-secondary);
  background: var(--border);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}
.nav-menu {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-item:hover, .nav-item.active {
  color: var(--text);
  background: var(--accent-light);
}
.nav-item.active { color: var(--accent); font-weight: 700; }
.nav-icon { font-size: 1rem; width: 20px; text-align: center; }
.sidebar-bottom {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-link {
  font-size: 0.78rem;
  color: var(--text-secondary);
  text-align: center;
  transition: color 0.2s;
}
.login-link:hover { color: var(--accent); }
.theme-row {
  display: flex;
  justify-content: center;
  gap: 6px;
}
.theme-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.theme-btn:hover, .theme-btn.active {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
