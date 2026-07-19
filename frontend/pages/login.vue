<template>
  <div>
    <div class="login-bg">
      <div class="login-bg-circle"></div>
      <div class="login-bg-circle"></div>
      <div class="login-bg-circle"></div>
    </div>

    <NuxtLink to="/home" class="back-link">← 返回首页</NuxtLink>

    <div class="theme-toggle">
      <button class="theme-btn" :class="{ active: theme === 'light' }" @click="setTheme('light')" title="亮色"><Icon name="ph:sun-bold" /></button>
      <button class="theme-btn" :class="{ active: theme === 'dark' }" @click="setTheme('dark')" title="深色"><Icon name="ph:moon-bold" /></button>
    </div>

    <div class="login-card">
      <div class="login-header">
        <img class="login-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" alt="avatar">
        <div class="login-title">欢迎回来</div>
        <div class="login-subtitle">登录你的账号</div>
      </div>

      <form class="login-form" @submit.prevent>
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input class="form-input" type="email" placeholder="请输入邮箱地址">
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input class="form-input" type="password" placeholder="请输入密码">
        </div>
        <div class="form-options">
          <label class="form-remember">
            <input type="checkbox"> 记住我
          </label>
          <NuxtLink to="#" class="form-forgot">忘记密码？</NuxtLink>
        </div>
        <button class="login-btn" type="button">登录</button>
      </form>

      <div class="login-divider">或者</div>

      <div class="social-login">
        <button class="social-btn">GitHub</button>
        <button class="social-btn">Twitter</button>
      </div>

      <div class="login-footer">
        还没有账号？<NuxtLink to="#">立即注册</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

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
.login-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; overflow: hidden; background: var(--c-bg); }
.login-bg-circle { position: absolute; border-radius: 50%; }
.login-bg-circle:nth-child(1) { width: 400px; height: 400px; background: var(--c-primary); opacity: 0.06; top: -100px; right: -100px; }
.login-bg-circle:nth-child(2) { width: 300px; height: 300px; background: var(--c-primary); opacity: 0.06; bottom: -80px; left: -80px; }
.login-bg-circle:nth-child(3) { width: 200px; height: 200px; background: linear-gradient(135deg, var(--c-primary), var(--c-bg-2)); opacity: 0.04; top: 50%; left: 50%; transform: translate(-50%, -50%); }

.back-link { position: fixed; top: 20px; left: 20px; z-index: 10; display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; background: var(--ld-bg-card); box-shadow: 0 2px 4px var(--ld-shadow); text-decoration: none; color: var(--c-text-2); font-size: 0.82rem; transition: all 0.2s; }
.back-link:hover { color: var(--c-primary); }

.theme-toggle { position: fixed; top: 20px; right: 20px; z-index: 10; display: flex; gap: 6px; }
.theme-btn { width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--ld-bg-card); color: var(--c-text-2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.2s; box-shadow: 0 2px 4px var(--ld-shadow); }
.theme-btn:hover, .theme-btn.active { border-color: var(--c-primary); color: var(--c-primary); }

.login-card { position: relative; z-index: 1; width: 400px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
.login-card > * { background: var(--ld-bg-card); border-radius: 20px; padding: 40px; box-shadow: 0 4px 24px var(--ld-shadow-md); }

.login-header { text-align: center; margin-bottom: 0; }
.login-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--c-primary); box-shadow: 0 0 0 6px var(--c-primary-soft); margin-bottom: 16px; }
.login-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; color: var(--c-text); }
.login-subtitle { font-size: 0.82rem; color: var(--c-text-2); }

.login-form { display: flex; flex-direction: column; gap: 16px; border-radius: 0 0 20px 20px; padding-top: 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 0.78rem; color: var(--c-text-2); font-weight: 700; }
.form-input { padding: 12px 16px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--c-bg-1); color: var(--c-text); font-family: inherit; font-size: 0.88rem; outline: none; transition: border 0.25s, box-shadow 0.25s; }
.form-input:focus { border-color: var(--c-primary); box-shadow: 0 0 0 3px var(--c-primary-soft); }
.form-input::placeholder { color: var(--c-text-3); }

.form-options { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; }
.form-remember { display: flex; align-items: center; gap: 6px; color: var(--c-text-2); cursor: pointer; }
.form-remember input { accent-color: var(--c-primary); }
.form-forgot { color: var(--c-primary); text-decoration: none; transition: opacity 0.2s; }
.form-forgot:hover { opacity: 0.8; }

.login-btn { width: 100%; padding: 12px; border: none; border-radius: 10px; background: var(--c-primary); color: #fff; font-family: inherit; font-size: 0.92rem; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 8px; box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 30%, transparent); }
.login-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.login-divider { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 0.72rem; color: var(--c-text-2); border-radius: 0; padding: 0 40px; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.social-login { display: flex; gap: 12px; border-radius: 0; padding: 0 40px 40px; }
.social-btn { flex: 1; padding: 10px; border: 1.5px solid var(--border); border-radius: 10px; background: transparent; color: var(--c-text-2); font-family: inherit; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.social-btn:hover { border-color: var(--c-primary); color: var(--c-primary); background: var(--c-primary-soft); }

.login-footer { text-align: center; margin: 0; font-size: 0.78rem; color: var(--c-text-2); border-radius: 0 0 20px 20px; padding: 0 40px 40px; }
.login-footer a { color: var(--c-primary); text-decoration: none; }
.login-footer a:hover { opacity: 0.8; }
</style>
