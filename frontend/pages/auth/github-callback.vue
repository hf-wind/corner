<template>
  <div class="callback-container">
    <div class="callback-card">
      <div v-if="loading" class="callback-loading">
        <div class="spinner"></div>
        <p>正在完成登录...</p>
      </div>
      <div v-else-if="error" class="callback-error">
        <Icon name="ph:warning-circle-bold" />
        <p>{{ error }}</p>
        <button @click="retry">重试</button>
        <button @click="goToLogin">返回登录</button>
      </div>
      <div v-else class="callback-success">
        <Icon name="ph:check-circle-bold" />
        <p>登录成功，正在跳转...</p>
      </div>
    </div>
  </div>
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

const loading = ref(true)
const error = ref<string | null>(null)

const handleCallback = async () => {
  try {
    loading.value = true
    error.value = null
    
    const user = await getUser()
    
    if (!user) {
      throw new Error('获取用户信息失败')
    }
    
    const response = await $fetch('/api/auth/github', {
      method: 'POST',
      body: {
        githubUser: {
          id: user.id,
          email: user.email,
          username: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
          avatar: user.user_metadata?.avatar_url
        }
      }
    })
    
    await setSession(response.token, response.user)
    
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  } catch (err: any) {
    error.value = err.message || '登录失败，请重试'
  } finally {
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  background: var(--c-bg);
}

.callback-card {
  padding: 40px;
  background: var(--c-bg-1);
  border-radius: 14px;
  box-shadow: var(--ui-shadow-panel);
  text-align: center;
  min-width: 320px;
}

.callback-loading,
.callback-error,
.callback-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.callback-error {
  color: #ef4444;
}

.callback-success {
  color: #22c55e;
}

.callback-error button {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--c-bg);
  color: var(--c-text);
  cursor: pointer;
  font-size: 0.72rem;
}

.callback-error button:hover {
  background: var(--c-bg-2);
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
