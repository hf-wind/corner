<template>
  <a-config-provider :theme="themeConfig">
    <div class="admin-root">
      <div class="admin-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <a-menu :selected-keys="[activeMenu]" :inline-collapsed="sidebarCollapsed" mode="inline" class="compact-menu" @click="({ key }) => router.push(key)">
          <a-menu-item key="/admin"><DashboardOutlined /><span>仪表盘</span></a-menu-item>
          <a-menu-item key="/admin/posts"><FileTextOutlined /><span>文章</span></a-menu-item>
          <a-menu-item key="/admin/categories"><FolderOutlined /><span>分类</span></a-menu-item>
          <a-menu-item key="/admin/tags"><TagsOutlined /><span>标签</span></a-menu-item>
          <a-menu-item key="/admin/comments"><MessageOutlined /><span>评论</span></a-menu-item>
          <a-menu-item key="/admin/media"><PictureOutlined /><span>文件</span></a-menu-item>
          <a-menu-item key="/admin/friends"><TeamOutlined /><span>友链</span></a-menu-item>
          <a-menu-item key="/admin/settings"><SettingOutlined /><span>设置</span></a-menu-item>
          <a-menu-item key="/admin/info"><InfoCircleOutlined /><span>信息</span></a-menu-item>
        </a-menu>
        <div class="sidebar-footer" :class="{ collapsed: sidebarCollapsed }">
          <a-button size="small" type="text" class="footer-btn" @click="sidebarCollapsed = !sidebarCollapsed">
            <MenuUnfoldOutlined v-if="sidebarCollapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
          <a-button v-if="!sidebarCollapsed" size="small" type="text" class="footer-btn" @click="toggleTheme">
            <Icon :name="isDark ? 'solar:sun-bold' : 'solar:moon-bold'" />
          </a-button>
          <a-button v-if="!sidebarCollapsed" size="small" type="text" class="footer-btn" @click="logout">
            <LogoutOutlined />
          </a-button>
        </div>
      </div>
      <div class="admin-main">
        <slot />
        <GlobalMediaLibrary />
        <GlobalIconPicker />
      </div>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)
const isDark = ref(false)
const sidebarCollapsed = ref(false)

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
}))

onMounted(() => {
  const token = localStorage.getItem('token')
  if (!token) { router.push('/login'); return }
  const themeSaved = localStorage.getItem('theme')
  if (themeSaved === 'dark') { isDark.value = true; document.documentElement.classList.add('dark') }
  const collapseSaved = localStorage.getItem('sidebar_collapsed')
  if (collapseSaved === 'true') sidebarCollapsed.value = true
})
watch(sidebarCollapsed, (val) => {
  localStorage.setItem('sidebar_collapsed', val ? 'true' : 'false')
})

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/home')
}
</script>

<style scoped>
.admin-root { height:100vh; display:flex; }
.admin-sidebar { width:200px; display:flex; flex-direction:column; border-right:1px solid var(--border); flex-shrink:0; transition:width 0.2s; overflow:hidden; }
.admin-sidebar.collapsed { width:64px; }
.compact-menu { border-inline-end:none !important; background:transparent; flex:1; overflow-y:auto; overflow-x:hidden; }
.compact-menu :deep(.ant-menu-item) { height:34px; line-height:34px; margin:1px 6px; border-radius:6px; font-size:0.82rem; padding-inline:14px !important; }
.compact-menu :deep(.ant-menu-item-selected) { background:var(--c-primary-soft); font-weight:600; }
.compact-menu :deep(.ant-menu-item) .anticon { font-size:16px; }
.admin-sidebar:not(.collapsed) .compact-menu :deep(.ant-menu-item span:not(.anticon)) { opacity:1; transition:opacity 0.2s; }
.admin-sidebar.collapsed .compact-menu :deep(.ant-menu-item) { margin:1px 0 !important; padding-inline:0 !important; overflow:hidden; }
.admin-sidebar.collapsed .compact-menu :deep(.ant-menu-item .ant-menu-title-content) { display:flex; justify-content:center; align-items:center; flex:0 0 auto; min-width:0; }
.admin-sidebar.collapsed .compact-menu :deep(.ant-menu-item .anticon) { margin-right:0 !important; }
.admin-sidebar.collapsed .compact-menu :deep(.ant-menu-title-content > span:not(.anticon)) { display:none !important; }
.sidebar-footer { display:flex; justify-content:center; gap:4px; padding:8px 0; flex-shrink:0; width:100%; }
.footer-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px; color:var(--c-text-3); font-size:16px; }
.footer-btn:hover { color:var(--c-primary); background:var(--c-primary-soft); }
.admin-main { background:var(--c-bg); padding:20px 24px; overflow-y:auto; min-height:0; flex:1; }
</style>
<style>
.admin-sidebar.collapsed .ant-menu-inline-collapsed { width:100% !important; }
</style>
