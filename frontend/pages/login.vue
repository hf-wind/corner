<template>
  <AuthPortal
    mode="login"
    headline="欢迎回到风经过的地方"
    description="继续读完未完的文字，也把新的回应留在这里。"
  >
    <header>
      <span class="auth-eyebrow">MEMBER ACCESS</span>
      <h2 class="auth-title">登录账号</h2>
      <p class="auth-subtitle">选择你习惯的方式，继续这段旅程。</p>
    </header>

    <div class="auth-tabs" aria-label="登录方式">
      <button
        type="button"
        :disabled="submitting"
        :class="{ active: loginType === 'password' }"
        @click="loginType = 'password'"
      >
        <Icon name="ph:lock-key-bold" />密码登录
      </button>
      <button
        type="button"
        :disabled="submitting"
        :class="{ active: loginType === 'code' }"
        @click="loginType = 'code'"
      >
        <Icon name="ph:envelope-simple-bold" />验证码登录
      </button>
    </div>

    <form
      class="auth-form"
      :aria-busy="submitting"
      @submit.prevent="handleLogin"
    >
      <div class="field">
        <label for="login-email">邮箱</label>
        <div class="input-shell">
          <Icon name="ph:at-bold" /><input
            id="login-email"
            v-model.trim="email"
            class="auth-input"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="name@example.com"
            required
            :disabled="submitting"
          />
        </div>
      </div>
      <div class="auth-method-field">
        <Transition name="auth-field">
          <div v-if="loginType === 'password'" key="password" class="field">
            <label for="login-password">密码</label>
            <div class="input-shell">
              <Icon name="ph:key-bold" /><input
                id="login-password"
                v-model="password"
                class="auth-input"
                name="password"
                type="password"
                autocomplete="current-password"
                placeholder="输入你的密码"
                required
                :disabled="submitting"
              />
            </div>
          </div>
          <div v-else key="code" class="field">
            <label for="login-code">验证码</label>
            <div class="code-row">
              <div class="input-shell">
                <Icon name="ph:shield-check-bold" /><input
                  id="login-code"
                  v-model.trim="code"
                  class="auth-input"
                  name="code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="6 位验证码"
                  maxlength="6"
                  required
                  :disabled="submitting"
                />
              </div>
              <button
                type="button"
                class="send-code"
                :disabled="cooldown > 0 || sendingCode || submitting"
                @click="sendCode"
              >
                {{
                  sendingCode
                    ? "验证中..."
                    : cooldown > 0
                      ? `${cooldown}s 后重发`
                      : "发送验证码"
                }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
      <TurnstileWidget ref="turnstileWidget" v-model="turnstileToken" />
      <template v-if="supabaseEnabled">
        <div class="auth-divider">
          <span>或</span>
        </div>
        <GitHubLoginButton 
          :loading="githubLoading" 
          @login="handleGitHubLogin" 
        />
      </template>
      <button class="submit-button" type="submit" :disabled="submitting">
        <Icon
          :name="submitting ? 'ph:circle-notch-bold' : 'ph:arrow-right-bold'"
          :spin="submitting"
        />{{ submitting ? "正在登录" : "进入风隅" }}
      </button>
    </form>
    <p class="auth-switch">
      第一次来到这里？<AppLink :to="authSwitchTarget('/register')"
        >创建账号</AppLink
      >
    </p>
  </AuthPortal>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });
const api = useApi();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const { signInWithGitHub, enabled: supabaseEnabled } = useSupabase();
const loginType = ref<"password" | "code">("password");
const email = ref("");
const password = ref("");
const code = ref("");
const submitting = ref(false);
const sendingCode = ref(false);
const cooldown = ref(0);
const turnstileToken = ref("");
const githubLoading = ref(false);
const turnstileWidget = ref<{
  reset: () => void;
  waitForToken: (timeoutMs?: number) => Promise<string>;
} | null>(null);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

function safeRedirect() {
  const target =
    typeof route.query.redirect === "string" ? route.query.redirect : "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "";
}
function authSwitchTarget(path: string) {
  const redirect = safeRedirect();
  return redirect ? { path, query: { redirect } } : path;
}
async function resolveTurnstile() {
  const token =
    turnstileToken.value ||
    (await turnstileWidget.value?.waitForToken(5000)) ||
    "";
  if (token) return (turnstileToken.value = token);
  toast.warning("请先完成人机验证");
  return "";
}
function startCooldown() {
  cooldown.value = 60;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}
async function sendCode() {
  if (!email.value) return void toast.warning("请先输入邮箱");
  if (sendingCode.value) return;
  sendingCode.value = true;
  try {
    const token = await resolveTurnstile();
    if (!token) return;
    await api.post("/auth/send-code", {
      email: email.value,
      type: "login",
      turnstileToken: token,
    });
    toast.success("验证码已发送，请查收邮箱");
    startCooldown();
  } catch (error: any) {
    toast.error(error?.message || "发送验证码失败");
  } finally {
    sendingCode.value = false;
    turnstileWidget.value?.reset();
  }
}
async function handleGitHubLogin() {
  if (githubLoading.value) return;
  githubLoading.value = true;
  try {
    const token = await resolveTurnstile();
    if (!token) return;
    sessionStorage.setItem("corner:github-turnstile-token", token);
    await signInWithGitHub({ redirect: safeRedirect() || "/home" });
  } catch (err: any) {
    sessionStorage.removeItem("corner:github-turnstile-token");
    toast.error(err.message || "GitHub登录失败");
  } finally {
    githubLoading.value = false;
  }
}
async function handleLogin() {
  if (loginType.value === "code" && code.value.length !== 6)
    return void toast.warning("请输入 6 位验证码");
  if (submitting.value) return;
  submitting.value = true;
  try {
    const token = await resolveTurnstile();
    if (!token) return;
    const payload: Record<string, string> = {
      email: email.value,
      turnstileToken: token,
    };
    payload[loginType.value === "password" ? "password" : "code"] =
      loginType.value === "password" ? password.value : code.value;
    const result = await api.post<any>("/auth/login", payload);
    const { setSession, panelHome } = useAuth();
    setSession(result.access_token, result.user || {});
    toast.success("登录成功");
    await router.push(safeRedirect() || panelHome());
  } catch (error: any) {
    toast.error(error?.message || "登录失败，请检查邮箱和密码");
    turnstileWidget.value?.reset();
  } finally {
    submitting.value = false;
  }
}
onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>
