<template>
  <div class="page-layout">
    <main class="main-content">
      <ContentPageHero
        eyebrow="NEIGHBORS · FRIEND LINKS"
        title="去朋友们的小站，坐一坐"
        description="互联网很大，但认真生活与记录的人总会彼此遇见。这里收藏着一些值得慢慢逛的个人角落。"
        icon="ph:planet"
        :metric="friends.length"
        metric-label="位网络邻居"
        variant="friends"
      />

      <section class="friend-welcome">
        <div class="welcome-orbit" aria-hidden="true"><span class="welcome-orbit-track"><i /><i /></span><Icon name="ph:planet-duotone" /><span class="welcome-orbit-pulse" /></div>
        <div class="welcome-copy">
          <span>LINK EXCHANGE · 交换友链</span>
          <h2>让彼此的小站，成为互联网里的路标</h2>
          <p>如果你也在认真记录生活、创作或技术，欢迎与风隅随笔交换友链。提交后会进行访问与反链检查。</p>
          <div class="welcome-steps">
            <span><b>01</b>添加本站</span><i /><span><b>02</b>提交信息</span><i /><span><b>03</b>审核上线</span>
          </div>
        </div>
        <div class="welcome-actions">
          <button type="button" class="primary" :class="{ active: showApplyForm }" @click="openApply"><Icon name="ph:paper-plane-tilt-bold" />申请友链</button>
          <button type="button" :class="{ active: showRemoveForm }" @click="openRemove"><Icon name="ph:link-break" />申请移除</button>
        </div>
      </section>

      <Transition name="form-reveal">
        <section v-if="showApplyForm" id="friend-apply-form" class="form-card">
          <header class="form-card-header">
            <div><span class="form-icon"><Icon name="ph:paper-plane-tilt-bold" /></span><div><small>JOIN THE NEIGHBORHOOD</small><h2>申请友链</h2></div></div>
            <button type="button" aria-label="关闭" @click="showApplyForm = false"><Icon name="ph:x-bold" /></button>
          </header>
          <div class="form-intro">
            <Icon name="ph:shield-check-duotone" />
            <p><strong>先添加本站，再提交申请</strong><span>审核结果会发送到联系邮箱，邮箱不会公开展示。</span></p>
          </div>
          <a-form :model="applyForm" layout="vertical" class="apply-form" @finish="submitApply">
            <a-form-item label="站点名称" required><a-input v-model:value="applyForm.siteName" placeholder="你的站点叫什么？" /></a-form-item>
            <a-form-item label="站点地址" required>
              <div class="site-url-control">
                <a-input
                  v-model:value="applyForm.siteUrl"
                  placeholder="https://example.com"
                  :disabled="siteInspecting"
                  @blur="inspectSite(false)"
                  @pressEnter.prevent="inspectSite(true)"
                />
                <a-button :loading="siteInspecting" @click="inspectSite(true)">
                  <Icon v-if="!siteInspecting" name="ph:magic-wand-bold" />
                  {{ lastInspectedUrl === applyForm.siteUrl ? '重新识别' : '自动识别' }}
                </a-button>
              </div>
              <Transition name="inspect-feedback">
                <div v-if="inspectMessage" class="inspect-feedback" :class="inspectState">
                  <Icon :name="inspectState === 'success' ? 'ph:check-circle-fill' : 'ph:warning-circle-fill'" />
                  {{ inspectMessage }}
                </div>
              </Transition>
            </a-form-item>
            <a-form-item label="站点头像"><a-input v-model:value="applyForm.siteAvatar" placeholder="头像 URL（可选）" /></a-form-item>
            <a-form-item label="RSS 地址"><a-input v-model:value="applyForm.siteRssUrl" placeholder="RSS / Atom URL（可选）" /></a-form-item>
            <a-form-item class="span-two" label="站点描述"><a-textarea v-model:value="applyForm.siteDescription" :rows="3" placeholder="用一两句话介绍你的站点" /></a-form-item>
            <a-form-item label="联系邮箱" required><a-input v-model:value="applyForm.contactEmail" type="email" placeholder="用于接收审核结果" /></a-form-item>
            <a-form-item label="友链页面地址" required><a-input v-model:value="applyForm.friendPageUrl" placeholder="已添加本站的友链页 URL" /></a-form-item>
            <div class="form-actions span-two"><span><Icon name="ph:info-bold" /> 开启反链检查时，系统会确认你的页面中已有本站链接。</span><a-button type="primary" html-type="submit" :loading="applySubmitting">提交申请 <Icon name="ph:arrow-right-bold" /></a-button></div>
          </a-form>
        </section>
      </Transition>

      <Transition name="form-reveal">
        <section v-if="showRemoveForm" id="friend-remove-form" class="form-card compact-form">
          <header class="form-card-header">
            <div><span class="form-icon danger"><Icon name="ph:link-break-bold" /></span><div><small>REMOVE MY LINK</small><h2>申请移除</h2></div></div>
            <button type="button" aria-label="关闭" @click="showRemoveForm = false"><Icon name="ph:x-bold" /></button>
          </header>
          <a-form v-if="!removeCodeSent" layout="vertical" @finish="sendRemoveCode">
            <a-form-item label="申请时使用的联系邮箱" required><a-input v-model:value="removeEmail" placeholder="name@example.com" /></a-form-item>
            <a-button type="primary" :loading="removeSending" html-type="submit">发送验证码</a-button>
          </a-form>
          <a-form v-else layout="vertical" @finish="confirmRemove">
            <a-form-item label="邮箱验证码" required><a-input v-model:value="removeCode" placeholder="请输入收到的验证码" /></a-form-item>
            <a-button type="primary" :loading="removeSubmitting" html-type="submit">验证并移除</a-button>
          </a-form>
        </section>
      </Transition>

      <header class="content-heading"><div><span>MY WEB NEIGHBORS</span><h2>友链邻居</h2></div><p>点击卡片前往朋友的站点 <Icon name="ph:arrow-up-right" /></p></header>
      <div v-if="!loading && friends.length" class="friends-grid content-reveal">
        <a v-for="(friend, index) in friends" :key="friend.url" :href="friend.url" target="_blank" rel="noopener noreferrer" class="friend-card">
          <span class="card-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="avatar-ring">
            <img v-if="friend.avatar" :src="mediaUrl(friend.avatar)" :alt="friend.name">
            <span v-else>{{ friend.name.slice(0, 1) }}</span>
            <i />
          </div>
          <div class="friend-copy"><h3>{{ friend.name }}</h3><p>{{ friend.description || '这个站点还没有留下简介。' }}</p></div>
          <span class="friend-domain"><Icon name="ph:globe-simple" />{{ friendHost(friend.url) }}</span>
          <div class="friend-foot"><span v-if="friend.webmasterName"><Icon name="ph:user-circle" />{{ friend.webmasterName }}</span><span v-if="friend.rssUrl"><Icon name="ph:rss-simple" />RSS</span></div>
          <span class="visit-arrow"><Icon name="ph:arrow-up-right-bold" /></span>
        </a>
      </div>
      <div v-else-if="!loading" class="empty-state content-reveal"><Icon name="ph:handshake" /><strong>还没有网络邻居</strong><span>第一条友链会让这里热闹起来。</span></div>
    </main>

    <aside class="sidebar-right">
      <section v-if="mySite" class="right-card site-card">
        <span class="aside-kicker">MY SITE CARD</span>
        <div class="site-avatar"><img v-if="mySite.avatar" :src="mediaUrl(mySite.avatar)" :alt="mySite.name"><Icon v-else name="ph:house-line-bold" /></div>
        <h3>{{ mySite.name }}</h3><p v-if="mySite.description">{{ mySite.description }}</p>
        <dl class="site-details">
          <div><dt><Icon name="ph:globe-simple-bold" />站点</dt><dd>{{ mySite.url }}</dd></div>
          <div v-if="mySite.rssUrl"><dt><Icon name="ph:rss-bold" />RSS</dt><dd>{{ mySite.rssUrl }}</dd></div>
          <div v-if="mySite.contactEmail"><dt><Icon name="ph:envelope-simple-bold" />邮箱</dt><dd>{{ mySite.contactEmail }}</dd></div>
        </dl>
        <button type="button" @click="copySiteUrl"><Icon name="ph:copy-bold" /> 复制本站地址</button>
      </section>
      <section class="right-card stat-card">
        <div class="right-card-title"><span><Icon name="ph:users-three-bold" /> 邻居统计</span></div>
        <div><strong>{{ friends.length }}</strong><span>个友链站点</span><i /></div>
      </section>
      <section class="right-card notice-card">
        <div class="right-card-title"><span><Icon name="ph:check-circle-bold" /> 申请须知</span></div>
        <ol><li>已将本站添加到友链页</li><li>站点能够正常访问</li><li>内容健康且保持更新</li><li>优先个人博客与内容站</li></ol>
      </section>
      <div class="aside-actions"><button type="button" class="primary" @click="openApply"><Icon name="ph:paper-plane-tilt-bold" /> 申请友链</button><button type="button" @click="openRemove"><Icon name="ph:link-break" /> 申请移除</button></div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const friends = ref<any[]>([])
const loading = ref(true)
const showApplyForm = ref(false)
const showRemoveForm = ref(false)
const mySite = ref<{ name: string; url: string; avatar?: string; description?: string; rssUrl?: string; contactEmail?: string } | null>(null)
const applyForm = reactive({ siteName: '', siteUrl: '', siteAvatar: '', siteDescription: '', siteRssUrl: '', contactEmail: '', friendPageUrl: '' })
const applySubmitting = ref(false)
const siteInspecting = ref(false)
const lastInspectedUrl = ref('')
const inspectMessage = ref('')
const inspectState = ref<'success' | 'error'>('success')
type AutoFillField = 'siteName' | 'siteAvatar' | 'siteDescription' | 'siteRssUrl' | 'friendPageUrl'
const autoFilledValues = reactive<Record<AutoFillField, string>>({ siteName: '', siteAvatar: '', siteDescription: '', siteRssUrl: '', friendPageUrl: '' })
const removeEmail = ref('')
const removeCode = ref('')
const removeCodeSent = ref(false)
const removeSending = ref(false)
const removeSubmitting = ref(false)

function normalizeFriend(friend: any) {
  return { name: friend.name || friend.siteName || '', url: friend.url || friend.siteUrl || '', avatar: friend.avatar || friend.siteAvatar || '', description: friend.description || friend.siteDescription || friend.desc || '', rssUrl: friend.rssUrl || friend.siteRssUrl || '', webmasterName: friend.webmasterName || '' }
}
async function loadFriends() {
  try { const res = await api.get<any[]>('/settings/friends'); friends.value = Array.isArray(res) ? res.map(normalizeFriend).filter(friend => friend.name && friend.url) : [] }
  catch { friends.value = [] }
}
async function loadMySite() { try { mySite.value = await api.get<any>('/friend-link/my-site') } catch { mySite.value = null } }
function friendHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}
function validHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) }
  catch { return false }
}
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }
function openApply() { showApplyForm.value = true; showRemoveForm.value = false; nextTick(() => document.querySelector('#friend-apply-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })) }
function openRemove() { showRemoveForm.value = true; showApplyForm.value = false; nextTick(() => document.querySelector('#friend-remove-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })) }
async function copySiteUrl() {
  if (!mySite.value?.url) return
  try { await navigator.clipboard.writeText(mySite.value.url); toast.success('已复制站点地址') }
  catch { toast.warning('复制失败，请手动复制本站地址') }
}

async function inspectSite(forceRequest: boolean) {
  let value = applyForm.siteUrl.trim()
  if (value && !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = `https://${value}`
  if (!validHttpUrl(value)) {
    if (forceRequest) toast.warning('请先填写有效的网站 URL')
    return
  }
  applyForm.siteUrl = value
  if (siteInspecting.value || (!forceRequest && lastInspectedUrl.value === value)) return
  siteInspecting.value = true
  inspectMessage.value = ''
  try {
    const result = await api.post<any>('/friend-link/inspect-site', { url: value })
    const incoming: Record<AutoFillField, string> = {
      siteName: result?.name || '',
      siteAvatar: result?.avatar || '',
      siteDescription: result?.description || '',
      siteRssUrl: result?.rssUrl || '',
      friendPageUrl: result?.friendPageUrl || '',
    }
    let filled = 0
    for (const field of Object.keys(incoming) as AutoFillField[]) {
      const nextValue = incoming[field]?.trim()
      const currentValue = applyForm[field]?.trim()
      if (nextValue && (!currentValue || currentValue === autoFilledValues[field])) {
        applyForm[field] = nextValue
        autoFilledValues[field] = nextValue
        filled += 1
      }
    }
    if (result?.url) applyForm.siteUrl = result.url
    lastInspectedUrl.value = applyForm.siteUrl
    inspectState.value = 'success'
    inspectMessage.value = filled
      ? `已识别并填充 ${filled} 项站点信息，你仍可以手动修改。`
      : '站点可以访问，但没有发现更多可自动填充的信息。'
  } catch (error: any) {
    inspectState.value = 'error'
    inspectMessage.value = error?.message || '自动识别失败，请检查地址或手动填写。'
  } finally {
    siteInspecting.value = false
  }
}

async function submitApply() {
  if (!applyForm.siteName.trim()) { toast.warning('请填写站点名称'); return }
  if (!validHttpUrl(applyForm.siteUrl)) { toast.warning('请填写有效的站点地址'); return }
  if (!validEmail(applyForm.contactEmail)) { toast.warning('请填写有效的联系邮箱'); return }
  if (!validHttpUrl(applyForm.friendPageUrl)) { toast.warning('请填写有效的友链页面地址'); return }
  applySubmitting.value = true
  try {
    await api.post('/friend-link/apply', { ...applyForm }); toast.success('申请已提交，请留意邮箱通知')
    Object.assign(applyForm, { siteName: '', siteUrl: '', siteAvatar: '', siteDescription: '', siteRssUrl: '', contactEmail: '', friendPageUrl: '' }); showApplyForm.value = false
    Object.assign(autoFilledValues, { siteName: '', siteAvatar: '', siteDescription: '', siteRssUrl: '', friendPageUrl: '' })
    lastInspectedUrl.value = ''; inspectMessage.value = ''
  } catch (error: any) { toast.error(error?.message || '申请提交失败，请重试') }
  finally { applySubmitting.value = false }
}
async function sendRemoveCode() {
  if (!validEmail(removeEmail.value.trim())) { toast.warning('请输入有效的联系邮箱'); return }
  removeSending.value = true
  try { await api.post('/friend-link/remove/send-code', { email: removeEmail.value }); toast.success('验证码已发送，请查收邮箱'); removeCodeSent.value = true }
  catch (error: any) { toast.error(error?.message || '发送验证码失败') }
  finally { removeSending.value = false }
}
async function confirmRemove() {
  if (!removeCode.value.trim()) { toast.warning('请输入邮箱验证码'); return }
  removeSubmitting.value = true
  try {
    await api.post('/friend-link/remove/verify', { email: removeEmail.value, code: removeCode.value }); toast.success('友链已移除')
    removeEmail.value = ''; removeCode.value = ''; removeCodeSent.value = false; showRemoveForm.value = false; await loadFriends()
  } catch (error: any) { toast.error(error?.message || '验证失败，请重试') }
  finally { removeSubmitting.value = false }
}
onMounted(async () => { await Promise.allSettled([loadFriends(), loadMySite()]); loading.value = false })
useHead({ title: '友情链接' })
</script>

<style scoped>
.page-layout { position:relative; display:flex; flex:1; overflow:hidden; background:var(--c-bg); color:var(--c-text); isolation:isolate; }.page-layout::before,.page-layout::after { position:absolute; z-index:-1; border-radius:50%; content:''; pointer-events:none; }.page-layout::before { top:-210px; right:60px; width:520px; height:520px; background:radial-gradient(circle,color-mix(in srgb,var(--c-primary) 11%,transparent),transparent 69%); }.page-layout::after { bottom:-260px; left:-190px; width:510px; height:510px; background:radial-gradient(circle,color-mix(in srgb,#8c72de 9%,transparent),transparent 70%); }.main-content { position:relative; z-index:1; flex:1; min-width:0; padding:24px 28px 42px; overflow-y:auto; scrollbar-gutter:stable; }.sidebar-right { position:relative; z-index:1; display:flex; width:var(--right-w); flex:0 0 var(--right-w); flex-direction:column; gap:14px; padding:24px 16px; overflow-y:auto; }
.friend-welcome { position:relative; display:grid; min-height:150px; grid-template-columns:118px minmax(0,1fr) auto; align-items:center; gap:23px; margin:-9px 18px 29px; padding:24px 25px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 68%,transparent); border-radius:0 0 17px 17px; background:linear-gradient(135deg,color-mix(in srgb,var(--ld-bg-card) 92%,var(--c-primary-soft)),var(--ld-bg-card)); box-shadow:0 12px 30px color-mix(in srgb,var(--ld-shadow) 30%,transparent); }.friend-welcome::after { position:absolute; top:-90px; right:110px; width:210px; height:210px; border-radius:50%; background:radial-gradient(circle,var(--c-primary-soft),transparent 70%); content:''; pointer-events:none; }.welcome-orbit { position:relative; display:grid; width:94px; height:94px; border:1px solid color-mix(in srgb,var(--c-primary) 26%,transparent); border-radius:50%; color:var(--c-primary); font-size:2.35rem; place-items:center; }.welcome-orbit::before { position:absolute; inset:13px; border:1px dashed color-mix(in srgb,var(--c-primary) 32%,transparent); border-radius:50%; content:''; }.welcome-orbit>i { position:absolute; width:9px; height:9px; border:2px solid var(--ld-bg-card); border-radius:50%; background:var(--c-primary); box-shadow:0 2px 8px color-mix(in srgb,var(--c-primary) 45%,transparent); }.welcome-orbit>i:first-child { top:8px; right:12px; }.welcome-orbit>i:nth-child(2) { bottom:11px; left:5px; background:#8d78df; }.welcome-copy { position:relative; z-index:1; }.welcome-copy>span { color:var(--c-primary); font-size:.48rem; font-weight:750; letter-spacing:.17em; }.welcome-copy h2 { margin:6px 0 7px; color:var(--c-text); font-family:var(--font-heading); font-size:1rem; }.welcome-copy>p { max-width:580px; margin:0; color:var(--c-text-2); font-size:.62rem; line-height:1.7; }.welcome-steps { display:flex; align-items:center; gap:8px; margin-top:12px; }.welcome-steps span { display:flex; align-items:center; gap:4px; color:var(--c-text-3); font-size:.52rem; }.welcome-steps b { color:var(--c-primary); font-family:var(--font-mono); font-size:.48rem; }.welcome-steps>i { width:18px; height:1px; background:var(--border); }.welcome-actions { position:relative; z-index:1; display:grid; min-width:114px; gap:7px; }.welcome-actions button { display:flex; height:36px; align-items:center; justify-content:center; gap:6px; padding:0 13px; border:1px solid var(--border); border-radius:10px; background:var(--ld-bg-card); color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.61rem; transition:.2s; }.welcome-actions button:hover,.welcome-actions button.active { border-color:color-mix(in srgb,var(--c-primary) 42%,var(--border)); color:var(--c-primary); }.welcome-actions button.primary { border-color:var(--c-primary); background:linear-gradient(135deg,var(--c-primary),#8974df); box-shadow:0 7px 17px color-mix(in srgb,var(--c-primary) 25%,transparent); color:#fff; }
.content-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:0 2px 15px; }.content-heading span,.form-card-header small,.aside-kicker { color:var(--c-primary); font-size:.48rem; font-weight:750; letter-spacing:.18em; }.content-heading h2 { margin:4px 0 0; color:var(--c-text); font-size:1.25rem; }.content-heading>p { display:flex; align-items:center; gap:4px; color:var(--c-text-3); font-size:.58rem; }
.friends-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:13px; }.friend-card { position:relative; display:flex; min-height:228px; flex-direction:column; align-items:center; padding:24px 17px 15px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 66%,transparent); border-radius:17px; background:linear-gradient(160deg,color-mix(in srgb,var(--ld-bg-card) 95%,var(--c-primary-soft)),var(--ld-bg-card)); box-shadow:0 8px 24px color-mix(in srgb,var(--ld-shadow) 30%,transparent); color:inherit; text-align:center; text-decoration:none; transition:.3s cubic-bezier(.16,1,.3,1); }.friend-card::before { position:absolute; inset:0 0 auto; height:68px; background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary-soft) 92%,transparent),transparent); content:''; }.friend-card::after { position:absolute; bottom:0; left:50%; width:0; height:3px; background:linear-gradient(90deg,var(--c-primary),#8e78e1); content:''; transition:.35s; transform:translateX(-50%); }.friend-card:hover { border-color:color-mix(in srgb,var(--c-primary) 38%,var(--border)); box-shadow:0 16px 36px color-mix(in srgb,var(--ld-shadow) 52%,transparent); transform:translateY(-5px); }.friend-card:hover::after { width:100%; }.card-index { position:absolute; top:10px; left:11px; color:var(--c-text-3); font-family:var(--font-mono); font-size:.45rem; opacity:.55; }
.avatar-ring { position:relative; z-index:1; display:grid; width:68px; height:68px; flex:0 0 68px; margin-bottom:12px; border:5px solid var(--ld-bg-card); border-radius:50%; background:linear-gradient(145deg,var(--c-primary-soft),var(--ld-bg-card)); box-shadow:0 7px 20px color-mix(in srgb,var(--ld-shadow) 75%,transparent); color:var(--c-primary); font-size:1.35rem; font-weight:700; place-items:center; }.avatar-ring img { width:100%; height:100%; border-radius:inherit; object-fit:cover; }.avatar-ring>i { position:absolute; right:0; bottom:1px; width:11px; height:11px; border:2px solid var(--ld-bg-card); border-radius:50%; background:#4fc78a; }.friend-copy { min-width:0; }.friend-copy h3 { overflow:hidden; margin:0; color:var(--c-text); font-family:var(--font-heading); font-size:.86rem; text-overflow:ellipsis; white-space:nowrap; }.friend-copy p { display:-webkit-box; overflow:hidden; margin:7px 0 0; color:var(--c-text-2); font-size:.62rem; line-height:1.6; -webkit-box-orient:vertical; -webkit-line-clamp:2; }.friend-domain { display:flex; max-width:100%; align-items:center; gap:4px; margin-top:9px; overflow:hidden; color:var(--c-primary); font-size:.5rem; text-overflow:ellipsis; white-space:nowrap; }.friend-foot { display:flex; flex-wrap:wrap; justify-content:center; gap:5px; margin-top:auto; padding-top:10px; }.friend-foot span { display:flex; align-items:center; gap:3px; padding:3px 7px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.5rem; }.visit-arrow { position:absolute; right:11px; bottom:10px; color:var(--c-primary); opacity:0; transform:translate(-3px,3px); transition:.2s; }.friend-card:hover .visit-arrow { opacity:.8; transform:none; }
.form-card { margin-bottom:27px; padding:24px 26px; border:1px solid color-mix(in srgb,var(--c-primary) 30%,var(--border)); border-radius:17px; background:linear-gradient(145deg,color-mix(in srgb,var(--c-primary-soft) 45%,var(--ld-bg-card)),var(--ld-bg-card)); box-shadow:0 13px 34px color-mix(in srgb,var(--ld-shadow) 40%,transparent); }.form-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }.form-card-header>div { display:flex; align-items:center; gap:11px; }.form-icon { display:grid; width:40px; height:40px; border-radius:12px; background:linear-gradient(145deg,var(--c-primary),#8d77e0); box-shadow:0 7px 17px color-mix(in srgb,var(--c-primary) 25%,transparent); color:#fff; place-items:center; }.form-icon.danger { background:color-mix(in srgb,#e56a6a 75%,var(--c-primary)); }.form-card-header h2 { margin:3px 0 0; color:var(--c-text); font-family:var(--font-heading); font-size:1.05rem; }.form-card-header>button { display:grid; width:30px; height:30px; border:0; border-radius:8px; background:var(--c-bg-2); color:var(--c-text-2); cursor:pointer; place-items:center; }.form-intro { margin:0 0 17px 51px; color:var(--c-text-2); font-size:.64rem; }.apply-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:15px; }.span-two { grid-column:1/-1; }.form-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; }.form-actions>span { display:flex; align-items:center; gap:5px; color:var(--c-text-3); font-size:.56rem; }.compact-form { max-width:560px; }.form-reveal-enter-active,.form-reveal-leave-active { transition:.28s ease; }.form-reveal-enter-from,.form-reveal-leave-to { opacity:0; transform:translateY(-8px); }
.site-url-control { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:7px; }.site-url-control :deep(.ant-btn) { display:flex; align-items:center; gap:5px; border-color:color-mix(in srgb,var(--c-primary) 35%,var(--border)); color:var(--c-primary); font-size:.61rem; }.inspect-feedback { display:flex; align-items:flex-start; gap:5px; margin-top:7px; color:#389868; font-size:.55rem; line-height:1.5; }.inspect-feedback.error { color:#cf6262; }.inspect-feedback>svg { flex:0 0 auto; margin-top:1px; }.inspect-feedback-enter-active,.inspect-feedback-leave-active { transition:.2s ease; }.inspect-feedback-enter-from,.inspect-feedback-leave-to { opacity:0; transform:translateY(-3px); }
.form-intro { display:flex; align-items:center; gap:10px; margin:0 0 20px; padding:11px 13px; border:1px solid color-mix(in srgb,var(--c-primary) 18%,var(--border)); border-radius:8px; background:color-mix(in srgb,var(--c-primary-soft) 55%,var(--ld-bg-card)); }
.form-intro :deep(.icon) { flex:0 0 auto; color:var(--c-primary); font-size:1.15rem; }
.form-intro p { display:flex; min-width:0; flex-direction:column; gap:2px; margin:0; }
.form-intro strong { color:var(--c-text); font-size:.68rem; }
.form-intro span { color:var(--c-text-2); font-size:.58rem; line-height:1.55; }
.form-card :deep(.ant-form-item) { margin-bottom:16px; }
.form-card :deep(.ant-form-item-label>label) { color:var(--c-text-2); font-size:.66rem; font-weight:650; }
.form-card :deep(.ant-input),.form-card :deep(.ant-input-affix-wrapper),.form-card :deep(.ant-btn-default) { border-color:color-mix(in srgb,var(--border) 86%,var(--c-primary)); background:var(--c-bg-1); color:var(--c-text); box-shadow:none; }
.form-card :deep(.ant-input::placeholder),.form-card :deep(textarea::placeholder) { color:var(--c-text-3); }
.form-card :deep(.ant-input:hover),.form-card :deep(.ant-input:focus),.form-card :deep(.ant-input-affix-wrapper:hover),.form-card :deep(.ant-input-affix-wrapper-focused) { border-color:color-mix(in srgb,var(--c-primary) 65%,var(--border)); box-shadow:0 0 0 3px color-mix(in srgb,var(--c-primary) 10%,transparent); }
:global(.dark) .form-card { border-color:color-mix(in srgb,var(--c-primary) 25%,var(--border)); background:color-mix(in srgb,var(--ld-bg-card) 94%,var(--c-primary-soft)); box-shadow:0 18px 40px rgb(0 0 0 / 24%); }
:global(.dark) .form-card :deep(.ant-input),:global(.dark) .form-card :deep(.ant-input-affix-wrapper),:global(.dark) .form-card :deep(.ant-btn-default) { background:color-mix(in srgb,var(--c-bg-1) 92%,#000); color:var(--c-text); }
:global(.dark) .form-card :deep(.ant-btn-default:hover) { background:var(--c-primary-soft); color:var(--c-primary); }
.empty-state { display:flex; min-height:240px; flex-direction:column; align-items:center; justify-content:center; border:1px dashed var(--border); border-radius:16px; color:var(--c-text-3); }.empty-state>svg { margin-bottom:9px; color:var(--c-primary); font-size:2rem; }.empty-state strong { color:var(--c-text-2); font-size:.76rem; }.empty-state span { margin-top:4px; font-size:.6rem; }
.right-card { padding:17px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 25%,transparent); }.site-card { display:flex; flex-direction:column; align-items:center; background:linear-gradient(150deg,var(--c-primary-soft),var(--ld-bg-card) 66%); text-align:center; }.site-card>.aside-kicker { align-self:flex-start; }.site-avatar { display:grid; width:58px; height:58px; margin:13px 0 9px; overflow:hidden; border:4px solid var(--ld-bg-card); border-radius:50%; background:var(--c-primary-soft); box-shadow:0 5px 16px var(--ld-shadow); color:var(--c-primary); place-items:center; }.site-avatar img { width:100%; height:100%; object-fit:cover; }.site-card h3 { margin:0; color:var(--c-text); font-size:.8rem; }.site-card p { margin:6px 0 0; color:var(--c-text-2); font-size:.57rem; line-height:1.55; }.site-card button { display:flex; width:100%; height:32px; align-items:center; justify-content:center; gap:5px; margin-top:13px; border:1px solid color-mix(in srgb,var(--c-primary) 30%,var(--border)); border-radius:9px; background:var(--ld-bg-card); color:var(--c-primary); cursor:pointer; font:inherit; font-size:.59rem; }
.site-details { display:grid; width:100%; gap:6px; margin:12px 0 0; text-align:left; }.site-details>div { display:grid; min-width:0; grid-template-columns:48px minmax(0,1fr); gap:7px; align-items:center; }.site-details dt { display:flex; align-items:center; gap:4px; color:var(--c-text-3); font-size:.55rem; }.site-details dd { min-width:0; margin:0; overflow:hidden; color:var(--c-text-2); font-size:.54rem; text-overflow:ellipsis; white-space:nowrap; }
.right-card-title { margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border); }.right-card-title span { display:flex; align-items:center; gap:6px; color:var(--c-text); font-size:.7rem; font-weight:700; }.stat-card>div { position:relative; display:flex; align-items:baseline; gap:6px; overflow:hidden; }.stat-card strong { color:var(--c-primary); font-size:1.8rem; }.stat-card>div>span { color:var(--c-text-3); font-size:.57rem; }.stat-card i { position:absolute; right:-15px; bottom:-20px; width:72px; height:72px; border-radius:50%; background:var(--c-primary-soft); }.notice-card ol { display:grid; gap:9px; margin:0; padding:0; counter-reset:notice; list-style:none; }.notice-card li { position:relative; padding-left:22px; color:var(--c-text-2); font-size:.58rem; line-height:1.45; counter-increment:notice; }.notice-card li::before { position:absolute; top:-1px; left:0; display:grid; width:16px; height:16px; border-radius:5px; background:var(--c-primary-soft); color:var(--c-primary); content:counter(notice); font-size:.46rem; place-items:center; }.aside-actions { display:grid; gap:7px; }.aside-actions button { display:flex; height:36px; align-items:center; justify-content:center; gap:6px; border:1px solid var(--border); border-radius:10px; background:var(--ld-bg-card); color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.62rem; }.aside-actions button.primary { border-color:var(--c-primary); background:var(--c-primary); box-shadow:0 6px 16px color-mix(in srgb,var(--c-primary) 25%,transparent); color:#fff; }
@media (max-width:1050px) { .friends-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.friend-welcome { grid-template-columns:88px minmax(0,1fr); }.welcome-orbit { width:76px; height:76px; font-size:1.9rem; }.welcome-actions { grid-column:1/-1; grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:640px) { .main-content { padding:max(68px,calc(env(safe-area-inset-top) + 60px)) 16px 24px!important; }.friend-welcome { grid-template-columns:1fr; margin-inline:0; padding:20px; }.welcome-orbit { display:none; }.welcome-steps { flex-wrap:wrap; }.welcome-actions { grid-column:auto; }.friends-grid { gap:10px; }.friend-card { min-height:208px; padding-inline:12px; }.form-card { padding:19px 16px; border-radius:12px; scroll-margin-top:68px; }.apply-form { grid-template-columns:1fr; }.span-two { grid-column:auto; }.form-actions { align-items:stretch; flex-direction:column; }.form-actions :deep(.ant-btn) { width:100%; }.form-intro { margin-left:0; }.content-heading { align-items:flex-start; flex-direction:column; gap:4px; } }
@media (max-width:480px) { .site-url-control { grid-template-columns:1fr; }.site-url-control :deep(.ant-btn) { justify-content:center; } }
@media (max-width:390px) { .friends-grid { grid-template-columns:1fr; } }
.welcome-orbit-track { position:absolute; inset:0; border-radius:50%; animation:welcome-spin 10s linear infinite; }.welcome-orbit-track::before { position:absolute; inset:13px; border:1px dashed color-mix(in srgb,var(--c-primary) 34%,transparent); border-radius:50%; content:''; }.welcome-orbit-track i { position:absolute; width:9px; height:9px; border:2px solid var(--ld-bg-card); border-radius:50%; background:var(--c-primary); box-shadow:0 0 12px color-mix(in srgb,var(--c-primary) 55%,transparent); }.welcome-orbit-track i:first-child { top:8px; right:12px; }.welcome-orbit-track i:last-child { bottom:11px; left:5px; background:var(--ui-accent-warm); }.welcome-orbit>svg { position:relative; z-index:1; animation:welcome-planet 4.5s ease-in-out infinite; }.welcome-orbit-pulse { position:absolute; inset:28px; border-radius:50%; background:var(--c-primary-soft); animation:welcome-pulse 3.2s ease-in-out infinite; }
@keyframes welcome-spin { to { transform:rotate(360deg); } } @keyframes welcome-planet { 50% { transform:translateY(-4px) rotate(8deg); } } @keyframes welcome-pulse { 50% { opacity:.25; transform:scale(1.45); } }
@media (prefers-reduced-motion:reduce) { .welcome-orbit-track,.welcome-orbit>svg,.welcome-orbit-pulse { animation:none; } }
</style>
