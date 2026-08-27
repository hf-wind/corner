<template>
  <main class="callback-container" :class="{ 'is-error': error, 'is-success': !loading && !error }">
    <div class="callback-grid" aria-hidden="true" />
    <div class="callback-orbit callback-orbit--one" aria-hidden="true" />
    <div class="callback-orbit callback-orbit--two" aria-hidden="true" />

    <header class="callback-header">
      <a class="callback-brand" href="/home" aria-label="返回风隅随笔首页">
        <span class="brand-mark"><Icon name="ph:wind-bold" /></span>
        <span>
          <strong>风隅随笔</strong>
          <small>WIND CORNER NOTES</small>
        </span>
      </a>
      <span class="callback-index">AUTH / {{ loading ? "01" : error ? "ERR" : "02" }}</span>
    </header>

    <section class="callback-card" aria-live="polite">
      <div class="provider-mark" aria-hidden="true">
        <Icon name="ph:github-logo-bold" />
        <span class="provider-ring provider-ring--outer" />
        <span class="provider-ring provider-ring--inner" />
      </div>

      <div v-if="loading" class="callback-state">
        <span class="state-kicker">SECURE HANDSHAKE</span>
        <h1>正在连接 GitHub</h1>
        <p>正在确认你的身份，马上就好。</p>
        <div class="progress-track" aria-label="正在连接">
          <span />
        </div>
        <div class="state-meta"><span>安全连接</span><span class="meta-dot" /><span>请稍候</span></div>
      </div>

      <div v-else-if="error" class="callback-state callback-state--error">
        <span class="state-kicker">CONNECTION INTERRUPTED</span>
        <h1>登录没有完成</h1>
        <p>{{ error }}</p>
        <div class="callback-actions">
          <button class="action-primary" type="button" @click="retry">
            <Icon name="ph:arrow-clockwise-bold" />再次尝试
          </button>
          <button class="action-secondary" type="button" @click="goToLogin">返回登录</button>
        </div>
      </div>

      <div v-else class="callback-state callback-state--success">
        <span class="state-kicker">IDENTITY CONFIRMED</span>
        <h1>登录成功</h1>
        <p>正在回到风隅随笔。</p>
        <div class="success-line"><Icon name="ph:check-bold" /><span>连接已建立</span></div>
      </div>

      <footer class="callback-footer"><span>corner.ink</span><span>·</span><span>encrypted session</span></footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'

definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const { getUser } = useSupabase()
const { setSession } = useAuth()
const api = useApi()

const loading = ref(true)
const error = ref<string | null>(null)

const clearOAuthHash = () => {
  if (typeof window === 'undefined' || !window.location.hash) return
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
}

const handleCallback = async () => {
  try {
    loading.value = true
    error.value = null
    
    const user = await getUser()
    
    if (!user) {
      throw new Error('获取用户信息失败')
    }

    // Never leave OAuth access/refresh tokens visible in the address bar,
    // including when the local account request fails and the user retries.
    clearOAuthHash()
    
    const turnstileToken = sessionStorage.getItem('corner:github-turnstile-token') || ''
    const response = await api.post('/auth/github', {
      githubUser: {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
        avatar: user.user_metadata?.avatar_url
      },
      turnstileToken
    })
    
    await setSession(response.access_token, response.user)
    
    sessionStorage.removeItem('corner:github-turnstile-token')
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const redirect = target.startsWith('/') && !target.startsWith('//') ? target : '/home'
    await router.replace(redirect)
  } catch (err: any) {
    error.value = err.message || '登录失败，请重试'
  } finally {
    clearOAuthHash()
    loading.value = false
  }
}

const retry = () => {
  handleCallback()
}

const goToLogin = () => {
  router.push('/login')
}

onMounted(() => {
  handleCallback()
})
</script>

<style scoped>
.callback-container {
  --callback-accent: var(--c-primary, #4f8cff);
  --callback-accent-soft: var(--c-primary-soft, rgb(79 140 255 / 14%));
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  overflow: hidden;
  padding: 88px 24px 40px;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--callback-accent) 12%, transparent), transparent 34%),
    var(--c-bg);
  color: var(--c-text);
  isolation: isolate;
}

.callback-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(color-mix(in srgb, var(--border) 34%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--border) 34%, transparent) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 74%);
  opacity: 0.32;
}

.callback-orbit {
  position: absolute;
  z-index: -1;
  width: min(74vw, 780px);
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--callback-accent) 16%, transparent);
  border-radius: 50%;
  pointer-events: none;
}

.callback-orbit::after {
  position: absolute;
  top: 10%;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--callback-accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--callback-accent) 12%, transparent), 0 0 24px var(--callback-accent);
  content: "";
}

.callback-orbit--one { transform: rotate(-22deg) scaleY(0.48); animation: orbit-drift 13s ease-in-out infinite; }
.callback-orbit--two { width: min(53vw, 560px); transform: rotate(34deg) scaleY(0.52); opacity: 0.62; animation: orbit-drift 16s ease-in-out -4s infinite reverse; }

.callback-header {
  position: absolute;
  top: 24px;
  right: 28px;
  left: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.callback-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--c-text);
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--callback-accent) 35%, var(--border));
  border-radius: 10px;
  background: var(--callback-accent-soft);
  color: var(--callback-accent);
  place-items: center;
}

.callback-brand strong,
.callback-brand small { display: block; }
.callback-brand strong { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em; }
.callback-brand small { margin-top: 2px; color: var(--c-text-3); font-size: 0.46rem; letter-spacing: 0.18em; }
.callback-index { color: var(--c-text-3); font-size: 0.52rem; letter-spacing: 0.16em; }

.callback-card {
  display: flex;
  width: min(100%, 430px);
  min-height: 455px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 42px 27px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, var(--callback-accent));
  border-radius: 20px;
  background: color-mix(in srgb, var(--c-bg-1) 84%, transparent);
  box-shadow: 0 26px 70px color-mix(in srgb, var(--ld-shadow) 24%, transparent), inset 0 1px color-mix(in srgb, white 30%, transparent);
  backdrop-filter: blur(22px);
  text-align: center;
  animation: card-in 0.72s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.provider-mark {
  position: relative;
  display: grid;
  width: 92px;
  height: 92px;
  margin-bottom: 28px;
  border: 1px solid color-mix(in srgb, var(--callback-accent) 40%, var(--border));
  border-radius: 50%;
  background: var(--callback-accent-soft);
  color: var(--callback-accent);
  font-size: 2.15rem;
  place-items: center;
}

.provider-ring { position: absolute; inset: -10px; border: 1px solid color-mix(in srgb, var(--callback-accent) 28%, transparent); border-radius: 50%; animation: ring-pulse 2.6s ease-out infinite; }
.provider-ring--inner { inset: -4px; animation-delay: -1.3s; opacity: 0.7; }
.is-error .provider-mark { color: #e76f73; border-color: color-mix(in srgb, #e76f73 42%, var(--border)); background: color-mix(in srgb, #e76f73 12%, transparent); }
.is-success .provider-mark { color: #4eb889; border-color: color-mix(in srgb, #4eb889 42%, var(--border)); background: color-mix(in srgb, #4eb889 12%, transparent); }

.callback-state { width: 100%; }
.state-kicker { color: var(--callback-accent); font-size: 0.52rem; font-weight: 700; letter-spacing: 0.18em; }
.callback-state h1 { margin: 11px 0 8px; font-size: clamp(1.35rem, 4vw, 1.7rem); font-weight: 700; letter-spacing: 0; }
.callback-state p { min-height: 22px; margin: 0; color: var(--c-text-2); font-size: 0.76rem; line-height: 1.7; overflow-wrap: anywhere; }
.callback-state--error .state-kicker { color: #e76f73; }
.callback-state--success .state-kicker { color: #4eb889; }

.progress-track { position: relative; width: 100%; height: 4px; margin: 29px 0 14px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, var(--border) 74%, transparent); }
.progress-track span { position: absolute; inset: 0 auto 0 -35%; width: 42%; border-radius: inherit; background: linear-gradient(90deg, transparent, var(--callback-accent), transparent); animation: progress-sweep 1.55s ease-in-out infinite; }
.state-meta { display: flex; align-items: center; justify-content: center; gap: 9px; color: var(--c-text-3); font-size: 0.58rem; letter-spacing: 0.04em; }
.meta-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--callback-accent); }

.callback-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; margin-top: 24px; }
.callback-actions button { min-height: 38px; padding: 0 16px; border-radius: 9px; font: inherit; font-size: 0.68rem; cursor: pointer; transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease; }
.callback-actions button:hover { transform: translateY(-1px); }
.action-primary { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--callback-accent); background: var(--callback-accent); color: #fff; }
.action-secondary { border: 1px solid var(--border); background: transparent; color: var(--c-text-2); }
.action-secondary:hover { border-color: var(--callback-accent); color: var(--callback-accent); }
.success-line { display: inline-flex; align-items: center; gap: 7px; margin-top: 26px; color: #4eb889; font-size: 0.65rem; }
.success-line :deep(svg) { width: 15px; height: 15px; padding: 3px; border-radius: 50%; background: color-mix(in srgb, #4eb889 16%, transparent); }
.callback-footer { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 34px; color: var(--c-text-3); font-size: 0.5rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.78; }

@keyframes card-in { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes progress-sweep { from { transform: translateX(0); } to { transform: translateX(320%); } }
@keyframes ring-pulse { 0%, 100% { opacity: 0.22; transform: scale(0.96); } 50% { opacity: 0.7; transform: scale(1.04); } }
@keyframes orbit-drift { 0%, 100% { translate: 0 0; } 50% { translate: 0 -9px; } }

@media (max-width: 560px) {
  .callback-container { padding: 76px 16px 28px; }
  .callback-header { top: 18px; right: 18px; left: 18px; }
  .callback-card { min-height: 420px; padding: 38px 25px 24px; border-radius: 17px; }
  .provider-mark { width: 80px; height: 80px; margin-bottom: 24px; font-size: 1.85rem; }
  .callback-brand small { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .callback-card, .callback-orbit, .provider-ring, .progress-track span { animation: none; }
}
</style>
