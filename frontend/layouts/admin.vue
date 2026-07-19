<template>
  <div>
    <header class="header">
      <NuxtLink to="/admin" class="header-logo">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" alt="logo">
        <span>清欢小筑</span>
      </NuxtLink>
      <div class="header-right">
        <NuxtLink to="/home" class="header-link">查看前台 →</NuxtLink>
        <button class="header-theme" @click="toggleTheme"><Icon :name="isDark ? 'ph:sun-bold' : 'ph:moon-bold'" /></button>
        <div class="header-user">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face" alt="">
          管理员
        </div>
      </div>
    </header>
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="menu-group">
          <div class="menu-label">概览</div>
          <NuxtLink to="/admin" class="menu-item" active-class="active"><Icon name="ph:chart-bar-bold" class="menu-icon" />仪表盘</NuxtLink>
          <NuxtLink to="/admin/settings" class="menu-item" active-class="active"><Icon name="ph:gear-six-bold" class="menu-icon" />站点设置</NuxtLink>
        </div>
        <div class="menu-group">
          <div class="menu-label">内容</div>
          <NuxtLink to="/admin/posts" class="menu-item" active-class="active"><Icon name="ph:file-text-bold" class="menu-icon" />文章管理</NuxtLink>
          <NuxtLink to="/admin/categories" class="menu-item" active-class="active"><Icon name="ph:folder-open-bold" class="menu-icon" />分类管理</NuxtLink>
          <NuxtLink to="/admin/tags" class="menu-item" active-class="active"><Icon name="ph:tag-bold" class="menu-icon" />标签管理</NuxtLink>
          <NuxtLink to="/admin/comments" class="menu-item" active-class="active"><Icon name="ph:chat-circle-dots-bold" class="menu-icon" />评论管理</NuxtLink>
        </div>
        <div class="menu-group">
          <div class="menu-label">媒体</div>
          <NuxtLink to="/admin/media" class="menu-item" active-class="active"><Icon name="ph:images-bold" class="menu-icon" />文件管理</NuxtLink>
        </div>
        <div class="menu-group">
          <div class="menu-label">系统</div>
          <NuxtLink to="/admin/info" class="menu-item" active-class="active"><Icon name="ph:info-bold" class="menu-icon" />系统信息</NuxtLink>
          <NuxtLink to="/admin/logs" class="menu-item" active-class="active"><Icon name="ph:clipboard-text-bold" class="menu-icon" />日志</NuxtLink>
        </div>
      </aside>
      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}
</script>

<style scoped>
.header {
  height: 56px;
  background: var(--ld-bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 20px;
  box-shadow: 0 2px 4px var(--ld-shadow);
}
.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}
.header-logo img {
  width: 32px; height: 32px;
  border-radius: 8px;
  object-fit: cover;
}
.header-logo span {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-text);
}
.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-theme {
  width: 34px; height: 34px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--c-bg);
  color: var(--c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
}
.header-theme:hover { border-color: var(--c-primary); color: var(--c-primary); }
.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--c-text-2);
}
.header-user img {
  width: 28px; height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.header-link {
  font-size: 0.78rem;
  color: var(--c-primary);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--c-primary);
  transition: all 0.2s;
}
.header-link:hover {
  background: var(--c-primary);
  color: #fff;
}
.admin-layout {
  display: flex;
  height: calc(100vh - 56px);
}
.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--c-bg-1);
  border-right: 1px solid var(--border);
  padding: 20px 0;
  overflow-y: auto;
}
.menu-group { margin-bottom: 20px; }
.menu-label {
  font-size: 0.68rem;
  color: var(--c-text-2);
  letter-spacing: 0.1em;
  padding: 0 20px;
  margin-bottom: 8px;
  text-transform: uppercase;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  font-size: 0.85rem;
  color: var(--c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}
.menu-item:hover { color: var(--c-text); background: var(--c-primary-soft); }
.menu-item.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
  font-weight: 700;
  border-right: 2px solid var(--c-primary);
}
.menu-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  background: var(--c-bg);
}
</style>
