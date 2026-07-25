<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">我的友链</div>

      <section class="friends-hero">
        <h2>友情链接</h2>
        <p>这里收藏了一些值得慢慢逛的站点。每个链接背后，都是一个认真记录世界的人。</p>
      </section>

      <section v-if="showApplyForm" class="form-card">
        <div class="form-card-header">
          <h3>申请友链</h3>
          <a-button type="text" size="small" @click="showApplyForm = false">关闭</a-button>
        </div>
        <a-form :model="applyForm" layout="vertical" @finish="submitApply">
          <a-form-item label="站点名称" required>
            <a-input v-model:value="applyForm.siteName" placeholder="请输入站点名称" />
          </a-form-item>
          <a-form-item label="站点地址" required>
            <a-input v-model:value="applyForm.siteUrl" placeholder="https://example.com" />
          </a-form-item>
          <a-form-item label="站点头像">
            <a-input v-model:value="applyForm.siteAvatar" placeholder="头像 URL（可选）" />
          </a-form-item>
          <a-form-item label="站点描述">
            <a-textarea v-model:value="applyForm.siteDescription" :rows="2" placeholder="简单描述一下你的站点" />
          </a-form-item>
          <a-form-item label="RSS 地址">
            <a-input v-model:value="applyForm.siteRssUrl" placeholder="RSS/Atom URL（可选）" />
          </a-form-item>
          <a-form-item label="联系邮箱" required>
            <a-input v-model:value="applyForm.contactEmail" placeholder="用于接收审核结果" />
          </a-form-item>
          <a-form-item label="友链页面地址" required>
            <a-input v-model:value="applyForm.friendPageUrl" placeholder="请提供已添加本站友链的页面 URL" />
            <div class="form-hint">若后台开启反链检查，需要先在你的友链页添加本站信息。</div>
          </a-form-item>
          <a-button type="primary" html-type="submit" :loading="applySubmitting">提交申请</a-button>
        </a-form>
      </section>

      <section v-if="showRemoveForm" class="form-card">
        <div class="form-card-header">
          <h3>申请移除</h3>
          <a-button type="text" size="small" @click="showRemoveForm = false">关闭</a-button>
        </div>
        <a-form v-if="!removeCodeSent" layout="vertical" @finish="sendRemoveCode">
          <a-form-item label="联系邮箱" required>
            <a-input v-model:value="removeEmail" placeholder="请输入申请时使用的邮箱" />
          </a-form-item>
          <a-button type="primary" :loading="removeSending" html-type="submit">发送验证码</a-button>
        </a-form>
        <a-form v-else layout="vertical" @finish="confirmRemove">
          <a-form-item label="验证码" required>
            <a-input v-model:value="removeCode" placeholder="请输入验证码" />
          </a-form-item>
          <a-button type="primary" :loading="removeSubmitting" html-type="submit">确认移除</a-button>
        </a-form>
      </section>

      <div v-if="loading" class="loading-tip">加载中...</div>
      <div v-else-if="friends.length" class="friends-grid">
        <a v-for="friend in friends" :key="friend.url" :href="friend.url" target="_blank" class="friend-card">
          <img v-if="friend.avatar" class="friend-avatar" :src="friend.avatar" :alt="friend.name">
          <div v-else class="friend-avatar fallback">{{ friend.name.slice(0, 1) }}</div>
          <div class="friend-name">{{ friend.name }}</div>
          <div class="friend-desc">{{ friend.description || '这个站点还没有留下简介。' }}</div>
          <div class="friend-tags">
            <span v-if="friend.webmasterName" class="friend-tag">{{ friend.webmasterName }}</span>
            <span v-if="friend.rssUrl" class="friend-tag">RSS</span>
          </div>
        </a>
      </div>
      <a-empty v-else description="暂无友链" />
    </main>

    <aside class="sidebar-right">
      <div v-if="mySite" class="right-card">
        <div class="right-card-title">我的站点</div>
        <div class="my-site-info">
          <img v-if="mySite.avatar" class="my-site-avatar" :src="mySite.avatar" :alt="mySite.name">
          <div class="my-site-name">{{ mySite.name }}</div>
          <div v-if="mySite.description" class="my-site-desc">{{ mySite.description }}</div>
          <a-button size="small" type="primary" ghost class="copy-btn" @click="copySiteUrl">复制站点地址</a-button>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">友链统计</div>
        <div class="friend-stat-row">
          <span>友链总数</span>
          <span class="stat-value">{{ friends.length }} 个</span>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">申请须知</div>
        <div class="apply-notice">
          <p>申请前请确认：</p>
          <p>1. 已将本站添加到你的友链页面。</p>
          <p>2. 站点可正常访问，内容健康合规。</p>
          <p>3. 推荐使用博客、个人主页或长期维护的内容站。</p>
        </div>
      </div>

      <button class="sidebar-action-btn primary" @click="openApply">申请友链</button>
      <button class="sidebar-action-btn danger" @click="openRemove">申请移除</button>
    </aside>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const toast = useToast()
const friends = ref<any[]>([])
const loading = ref(true)
const showApplyForm = ref(false)
const showRemoveForm = ref(false)
const mySite = ref<{ name: string; url: string; avatar?: string; description?: string } | null>(null)

const applyForm = reactive({
  siteName: '',
  siteUrl: '',
  siteAvatar: '',
  siteDescription: '',
  siteRssUrl: '',
  contactEmail: '',
  friendPageUrl: '',
})
const applySubmitting = ref(false)
const removeEmail = ref('')
const removeCode = ref('')
const removeCodeSent = ref(false)
const removeSending = ref(false)
const removeSubmitting = ref(false)

onMounted(async () => {
  await Promise.allSettled([loadFriends(), loadMySite()])
  loading.value = false
})

function normalizeFriend(friend: any) {
  return {
    name: friend.name || friend.siteName || '',
    url: friend.url || friend.siteUrl || '',
    avatar: friend.avatar || friend.siteAvatar || '',
    description: friend.description || friend.siteDescription || friend.desc || '',
    rssUrl: friend.rssUrl || friend.siteRssUrl || '',
    webmasterName: friend.webmasterName || '',
  }
}

async function loadFriends() {
  try {
    const res = await api.get<any[]>('/settings/friends')
    friends.value = Array.isArray(res)
      ? res.map(normalizeFriend).filter((friend) => friend.name && friend.url)
      : []
  } catch {
    friends.value = []
  }
}

async function loadMySite() {
  try {
    const res = await api.get<any>('/friend-link/my-site')
    mySite.value = res || null
  } catch {
    mySite.value = null
  }
}

function openApply() {
  showApplyForm.value = true
  showRemoveForm.value = false
}

function openRemove() {
  showRemoveForm.value = true
  showApplyForm.value = false
}

function copySiteUrl() {
  if (!mySite.value?.url) return
  navigator.clipboard.writeText(mySite.value.url).then(() => {
    toast.success('已复制站点地址')
  })
}

async function submitApply() {
  applySubmitting.value = true
  try {
    await api.post('/friend-link/apply', { ...applyForm })
    toast.success('申请已提交，请留意邮箱通知')
    Object.assign(applyForm, {
      siteName: '',
      siteUrl: '',
      siteAvatar: '',
      siteDescription: '',
      siteRssUrl: '',
      contactEmail: '',
      friendPageUrl: '',
    })
    showApplyForm.value = false
  } catch (e: any) {
    toast.error(e?.message || '申请提交失败，请重试')
  } finally {
    applySubmitting.value = false
  }
}

async function sendRemoveCode() {
  if (!removeEmail.value?.trim()) {
    toast.warning('请输入联系邮箱')
    return
  }
  removeSending.value = true
  try {
    await api.post('/friend-link/remove/send-code', { email: removeEmail.value })
    toast.success('验证码已发送，请查收邮箱')
    removeCodeSent.value = true
  } catch (e: any) {
    toast.error(e?.message || '发送验证码失败')
  } finally {
    removeSending.value = false
  }
}

async function confirmRemove() {
  removeSubmitting.value = true
  try {
    await api.post('/friend-link/remove/verify', { email: removeEmail.value, code: removeCode.value })
    toast.success('友链已移除')
    removeEmail.value = ''
    removeCode.value = ''
    removeCodeSent.value = false
    showRemoveForm.value = false
    await loadFriends()
  } catch (e: any) {
    toast.error(e?.message || '验证失败，请重试')
  } finally {
    removeSubmitting.value = false
  }
}
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }
.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }
.loading-tip { text-align: center; color: var(--c-text-2); padding: 32px; font-size: 0.85rem; }
.section-title { font-size: 0.82rem; color: var(--c-text-2); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }
.friends-hero { background: var(--ld-bg-card); border-radius: 14px; padding: 32px; box-shadow: 0 2px 4px var(--ld-shadow); margin-bottom: 28px; text-align: center; transition: all 0.2s; }
.friends-hero h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; color: var(--c-text); }
.friends-hero p { font-size: 0.85rem; color: var(--c-text-2); line-height: 1.7; max-width: 500px; margin: 0 auto; }
.friends-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
.friend-card { background: var(--ld-bg-card); border-radius: 14px; padding: 24px; box-shadow: 0 2px 4px var(--ld-shadow); text-align: center; cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; }
.friend-card:hover { transform: translateY(-2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.friend-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--c-bg-1); margin: 0 auto 12px; display: grid; place-items: center; }
.friend-avatar.fallback { background: var(--c-primary-soft); color: var(--c-primary); font-weight: 700; font-size: 1.4rem; }
.friend-name { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; color: var(--c-text); }
.friend-desc { font-size: 0.75rem; color: var(--c-text-2); line-height: 1.5; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.friend-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; min-height: 20px; }
.friend-tag { font-size: 0.62rem; padding: 2px 8px; border-radius: 12px; background: var(--c-primary-soft); color: var(--c-primary); }
.form-card { background: var(--ld-bg-card); border-radius: 14px; padding: 24px; box-shadow: 0 2px 4px var(--ld-shadow); margin-bottom: 20px; }
.form-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.form-card-header h3 { font-size: 1rem; font-weight: 700; margin: 0; color: var(--c-text); }
.form-hint { font-size: 0.72rem; color: var(--c-text-2); margin-top: 4px; }
.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--ld-bg-card); border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px var(--ld-shadow); transition: all 0.2s; }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; color: var(--c-text); }
.friend-stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--c-text); }
.stat-value { color: var(--accent); font-weight: 700; }
.apply-notice { font-size: 0.78rem; color: var(--c-text-2); line-height: 1.7; }
.my-site-info { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.my-site-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--c-primary); }
.my-site-name { font-size: 0.92rem; font-weight: 700; color: var(--c-text); }
.my-site-desc { font-size: 0.75rem; color: var(--c-text-2); text-align: center; line-height: 1.5; }
.copy-btn { width: 100%; margin-top: 4px; }
.sidebar-action-btn { width: 100%; padding: 10px 0; border-radius: 10px; border: none; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.sidebar-action-btn.primary { background: var(--c-primary); color: #fff; box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 30%, transparent); }
.sidebar-action-btn.primary:hover { opacity: 0.9; transform: translateY(-1px); }
.sidebar-action-btn.danger { background: var(--c-bg-1); color: var(--c-text-2); border: 1px solid var(--border); }
.sidebar-action-btn.danger:hover { border-color: #e74c3c; color: #e74c3c; }
@media (max-width: 640px) {
  .friends-hero { padding: 24px 16px; margin-bottom: 22px; }
  .friends-hero h2 { font-size: 1.15rem; }
  .friends-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
  .friend-card { padding: 16px 10px; }
  .friend-avatar { width: 54px; height: 54px; margin-bottom: 9px; }
  .friend-name { font-size: 0.88rem; }
}
@media (max-width: 360px) {
  .friends-grid { grid-template-columns: 1fr; }
}
</style>
