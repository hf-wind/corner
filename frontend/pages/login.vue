<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="login-bg-circle"></div>
      <div class="login-bg-circle"></div>
      <div class="login-bg-circle"></div>
    </div>

    <NuxtLink to="/home" class="back-link">← 返回首页</NuxtLink>

    <div class="theme-toggle">
      <button class="theme-btn" :class="{ active: theme === 'light' }" @click="setTheme('light')" title="亮色">
        <Icon name="ph:sun-bold" />
      </button>
      <button class="theme-btn" :class="{ active: theme === 'dark' }" @click="setTheme('dark')" title="深色">
        <Icon name="ph:moon-bold" />
      </button>
    </div>

    <div class="login-card">
      <div class="login-header">
        <img class="login-avatar" :src="avatarImg" alt="avatar">
        <div class="login-title">欢迎回来</div>
        <div class="login-subtitle">登录你的账号</div>
      </div>

      <div class="login-tabs">
        <button class="tab-btn" :class="{ active: loginType === 'password' }" @click="loginType = 'password'">
          密码登录
        </button>
        <button class="tab-btn" :class="{ active: loginType === 'code' }" @click="loginType = 'code'">
          验证码登录
        </button>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input v-model="email" class="form-input" type="email" placeholder="请输入邮箱地址" required>
        </div>
        
        <div v-if="loginType === 'password'" class="form-group">
          <label class="form-label">密码</label>
          <input v-model="password" class="form-input" type="password" placeholder="请输入密码" required>
        </div>
        
        <div v-else class="form-group">
          <label class="form-label">验证码</label>
          <div class="code-input-row">
            <input v-model="code" class="form-input code-input" type="text" placeholder="请输入6位验证码" required maxlength="6">
            <button type="button" class="send-code-btn" @click="sendCode" :disabled="cooldown > 0 || sendingCode">
              {{ sendingCode ? '验证中…' : cooldown > 0 ? `${cooldown}s` : '发送验证码' }}
            </button>
          </div>
        </div>
        
        <TurnstileWidget ref="turnstileWidget" v-model="turnstileToken" />
        <div v-if="error" class="form-error">{{ error }}</div>
        <div v-if="success" class="form-success">{{ success }}</div>
        <button class="login-btn" type="submit" :disabled="submitting">{{ submitting ? '登录中...' : '登录' }}</button>
      </form>

      <div class="login-divider">或者</div>

      <div class="login-footer">
        <span>没有账号？</span>
        <NuxtLink to="/register" class="login-footer-link">去注册</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
import avatarImg from '~/assets/images/avatar.jpg'

const api = useApi()
const router = useRouter()
const toast = useToast()
const { theme, setTheme } = useTheme()
const loginType = ref<'password' | 'code'>('password')
const email = ref('')
const password = ref('')
const code = ref('')
const error = ref('')
const success = ref('')
const submitting = ref(false)
const sendingCode = ref(false)
const cooldown = ref(0)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void; waitForToken: (timeoutMs?: number) => Promise<string> } | null>(null)
let cooldownTimer: NodeJS.Timeout | null = null

async function resolveTurnstile() {
  if (!import.meta.env.PROD) return turnstileToken.value
  const token = turnstileToken.value || await turnstileWidget.value?.waitForToken(3500) || ''
  if (token) {
    turnstileToken.value = token
    return token
  }
  toast.warning('请先完成人机验证')
  return ''
}

async function sendCode() {
  if (!email.value) {
    toast.warning('请先输入邮箱')
    return
  }
  sendingCode.value = true
  const token = await resolveTurnstile()
  if (!token && import.meta.env.PROD) { sendingCode.value = false; return }
  
  error.value = ''
  success.value = ''
  
  try {
    await api.post('/auth/send-code', { email: email.value, type: 'login', turnstileToken: token })
    toast.success('验证码已发送，请查收邮箱')
    cooldown.value = 60
    cooldownTimer = setInterval(() => {
      cooldown.value--
      if (cooldown.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }, 1000)
  } catch (e: any) {
    toast.error(e?.message || '发送验证码失败')
  } finally {
    sendingCode.value = false
    turnstileWidget.value?.reset()
  }
}

async function handleLogin() {
  error.value = ''
  success.value = ''
  
  if (loginType.value === 'code' && (!code.value || code.value.length !== 6)) {
    toast.warning('请输入6位验证码')
    return
  }
  submitting.value = true
  const token = await resolveTurnstile()
  if (!token && import.meta.env.PROD) { submitting.value = false; return }
  try {
    const payload: any = { email: email.value, turnstileToken: token }
    if (loginType.value === 'password') {
      payload.password = password.value
    } else {
      payload.code = code.value
    }
    
    const res = await api.post<any>('/auth/login', payload)
    const { setSession, panelHome } = useAuth()
    setSession(res.access_token, res.user || {})
    toast.success('登录成功')
    router.push(panelHome())
  } catch (e: any) {
    toast.error(e?.message || '登录失败，请检查邮箱和密码')
    turnstileWidget.value?.reset()
  }
  submitting.value = false
}

</script>

<style scoped>
.login-page {
  height: 100%;
}

.login-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  overflow: hidden;
  background: var(--c-bg);
}

.login-bg-circle {
  position: absolute;
  border-radius: 50%;
}

.login-bg-circle:nth-child(1) {
  width: 400px;
  height: 400px;
  background: var(--c-primary);
  opacity: 0.06;
  top: -100px;
  right: -100px;
}

.login-bg-circle:nth-child(2) {
  width: 300px;
  height: 300px;
  background: var(--c-primary);
  opacity: 0.06;
  bottom: -80px;
  left: -80px;
}

.login-bg-circle:nth-child(3) {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, var(--c-primary), var(--c-bg-2));
  opacity: 0.04;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.back-link {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: var(--ld-bg-card);
  box-shadow: 0 2px 4px var(--ld-shadow);
  text-decoration: none;
  color: var(--c-text-2);
  font-size: 0.82rem;
  transition: all 0.2s;
}

.back-link:hover {
  color: var(--c-primary);
}

.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  gap: 6px;
}

.theme-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
  box-shadow: 0 2px 4px var(--ld-shadow);
}

.theme-btn:hover,
.theme-btn.active {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  margin: 0 auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-card>* {
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 24px var(--ld-shadow-md);
}

.login-header {
  text-align: center;
  margin-bottom: 0;
}

.login-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--c-primary);
  box-shadow: 0 0 0 6px var(--c-primary-soft);
  margin-bottom: 16px;
}

.login-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--c-text);
}

.login-subtitle {
  font-size: 0.82rem;
  color: var(--c-text-2);
}

.login-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

.tab-btn.active {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 0 0 20px 20px;
  padding-top: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.78rem;
  color: var(--c-text-2);
  font-weight: 700;
}

.form-input {
  padding: 12px 16px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.88rem;
  outline: none;
  transition: border 0.25s, box-shadow 0.25s;
}

.form-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
}

.form-input::placeholder {
  color: var(--c-text-3);
}

.code-input-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
}

.send-code-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.send-code-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-code-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  color: #ef4444;
  font-size: 0.78rem;
  text-align: center;
}

.form-success {
  color: #22c55e;
  font-size: 0.78rem;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 30%, transparent);
}

.login-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 0.72rem;
  color: var(--c-text-2);
  border-radius: 0;
  padding: 0 40px;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.login-footer {
  text-align: center;
  padding: 0 40px 40px;
  font-size: 0.82rem;
  color: var(--c-text-2);
  border-radius: 0;
}

.login-footer-link {
  color: var(--c-primary);
  text-decoration: none;
  font-weight: 600;
}

.login-footer-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .login-page {
    height: 100dvh;
    min-height: 100dvh;
    overflow-y: auto;
  }

  .back-link {
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    padding: 8px 11px;
  }

  .theme-toggle {
    top: max(12px, env(safe-area-inset-top));
    right: max(12px, env(safe-area-inset-right));
  }

  .theme-btn {
    width: 34px;
    height: 34px;
  }

  .login-card {
    width: 100%;
    min-height: 100dvh;
    padding: max(76px, calc(env(safe-area-inset-top) + 66px)) 16px max(24px, env(safe-area-inset-bottom));
  }

  .login-card>* {
    padding-right: 24px;
    padding-left: 24px;
  }

  .login-header {
    padding-top: 28px;
  }

  .login-form {
    padding-top: 0;
  }

  .login-divider {
    padding: 0 24px;
  }

  .login-footer {
    padding: 0 24px 28px;
  }
}
</style>
