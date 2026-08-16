<template>
  <AuthPortal
    mode="register"
    headline="为下一次相遇留下名字"
    description="创建账号，在文章与旅途中留下回应，让每一次来访都有迹可循。"
  >
    <header>
      <span class="auth-eyebrow">NEW TRAVELER</span>
      <h2 class="auth-title">创建账号</h2>
      <p class="auth-subtitle">只需邮箱验证，昵称与头像可以稍后慢慢完善。</p>
    </header>
    <form
      class="auth-form"
      :aria-busy="submitting"
      @submit.prevent="handleRegister"
    >
      <div class="field">
        <label for="register-email">邮箱</label>
        <div class="input-shell">
          <Icon name="ph:at-bold" /><input
            id="register-email"
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
      <div class="field">
        <label for="register-code">验证码</label>
        <div class="code-row">
          <div class="input-shell">
            <Icon name="ph:shield-check-bold" /><input
              id="register-code"
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
      <div class="field">
        <label for="register-password">密码</label>
        <div class="input-shell">
          <Icon name="ph:key-bold" /><input
            id="register-password"
            v-model="password"
            class="auth-input"
            name="password"
            type="password"
            autocomplete="new-password"
            placeholder="至少 6 位"
            minlength="6"
            required
            :disabled="submitting"
          />
        </div>
      </div>
      <div class="field">
        <label for="register-confirm">确认密码</label>
        <div class="input-shell">
          <Icon name="ph:lock-key-bold" /><input
            id="register-confirm"
            v-model="confirmPassword"
            class="auth-input"
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="再次输入密码"
            minlength="6"
            required
            :disabled="submitting"
          />
        </div>
      </div>
      <p class="form-note">
        <Icon
          name="ph:info-bold"
        />注册后会自动分配昵称和头像，可在个人中心修改。
      </p>
      <TurnstileWidget ref="turnstileWidget" v-model="turnstileToken" />
      <button class="submit-button" type="submit" :disabled="submitting">
        <Icon
          :name="submitting ? 'ph:circle-notch-bold' : 'ph:user-plus-bold'"
          :spin="submitting"
        />{{ submitting ? "正在创建" : "加入风隅" }}
      </button>
    </form>
    <p class="auth-switch">
      已经留下过足迹？<AppLink :to="authSwitchTarget('/login')"
        >返回登录</AppLink
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
const email = ref("");
const code = ref("");
const password = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const sendingCode = ref(false);
const cooldown = ref(0);
const turnstileToken = ref("");
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
      type: "register",
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
async function handleRegister() {
  if (password.value !== confirmPassword.value)
    return void toast.warning("两次密码输入不一致");
  if (code.value.length !== 6) return void toast.warning("请输入 6 位验证码");
  if (submitting.value) return;
  submitting.value = true;
  try {
    const token = await resolveTurnstile();
    if (!token) return;
    const result = await api.post<any>("/auth/register", {
      email: email.value,
      password: password.value,
      code: code.value,
      turnstileToken: token,
    });
    const { setSession, panelHome } = useAuth();
    setSession(result.access_token, result.user || {});
    toast.success("注册成功，欢迎加入");
    await router.push(safeRedirect() || panelHome());
  } catch (error: any) {
    toast.error(error?.message || "注册失败，请检查邮箱是否已注册");
    turnstileWidget.value?.reset();
  } finally {
    submitting.value = false;
  }
}
onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>
