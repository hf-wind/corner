<template>
  <AuthPortal
    mode="login"
    headline="让风认出你的名字"
    description="一封邮件就能回到这里。没有账号也没关系，验证邮箱后会自动为你创建。"
  >
    <header>
      <span class="auth-eyebrow">MEMBER ACCESS</span>
      <h2 class="auth-title">登录风隅</h2>
      <p class="auth-subtitle">使用邮箱验证码，轻松继续你的旅程。</p>
    </header>

    <Transition name="auth-step" mode="out-in">
      <section v-if="step === 'email'" key="email" class="auth-step-panel">
        <form
          ref="emailForm"
          class="auth-form"
          :aria-busy="challengeBusy"
          @submit.prevent="openChallenge('email')"
        >
          <div class="field">
            <label for="login-email">邮箱</label>
            <div class="input-shell">
              <Icon name="ph:at-bold" />
              <input
                id="login-email"
                v-model.trim="email"
                class="auth-input"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                required
                :disabled="challengeBusy"
              />
            </div>
          </div>
          <p class="auth-account-note">
            <Icon name="ph:sparkle-bold" />
            未注册邮箱将在验证码通过后自动创建账号。
          </p>
          <button class="submit-button" type="submit" :disabled="challengeBusy">
            <Icon name="ph:arrow-right-bold" />继续
          </button>

          <template v-if="showGitHubLogin">
            <div class="auth-divider"><span>或使用</span></div>
            <GitHubLoginButton
              :loading="githubLoading"
              :disabled="challengeBusy"
              @login="openChallenge('github')"
            />
          </template>
        </form>
      </section>

      <section v-else key="verify" class="auth-step-panel">
        <button
          class="auth-email-summary"
          type="button"
          :disabled="submitting"
          @click="editEmail"
        >
          <span><Icon name="ph:envelope-simple-bold" />{{ email }}</span>
          <Icon name="ph:pencil-simple-bold" />
        </button>

        <div class="auth-tabs" aria-label="登录方式">
          <button
            type="button"
            :disabled="submitting"
            :class="{ active: loginType === 'code' }"
            @click="loginType = 'code'"
          >
            <Icon name="ph:shield-check-bold" />验证码
          </button>
          <button
            type="button"
            :disabled="submitting"
            :class="{ active: loginType === 'password' }"
            @click="loginType = 'password'"
          >
            <Icon name="ph:lock-key-bold" />密码
          </button>
        </div>

        <form
          ref="loginForm"
          class="auth-form auth-form--verify"
          :aria-busy="submitting"
          @submit.prevent="handleLogin"
        >
          <div class="auth-method-field">
            <Transition name="auth-field">
              <div v-if="loginType === 'code'" key="code" class="field">
                <label for="login-code">邮箱验证码</label>
                <div class="code-row">
                  <div class="input-shell">
                    <Icon name="ph:number-square-six-bold" />
                    <input
                      id="login-code"
                      ref="codeInput"
                      v-model.trim="code"
                      class="auth-input"
                      name="code"
                      inputmode="numeric"
                      autocomplete="one-time-code"
                      placeholder="4 位验证码"
                      maxlength="4"
                      required
                      :disabled="submitting"
                    />
                  </div>
                  <button
                    type="button"
                    class="send-code"
                    :disabled="cooldown > 0 || submitting || challengeBusy"
                    @click="openChallenge('resend')"
                  >
                    {{ cooldown > 0 ? `${cooldown}s` : "重新发送" }}
                  </button>
                </div>
              </div>

              <div v-else key="password" class="field">
                <label for="login-password">登录密码</label>
                <div class="input-shell">
                  <Icon name="ph:key-bold" />
                  <input
                    id="login-password"
                    v-model="password"
                    class="auth-input"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="输入你的密码"
                    minlength="6"
                    required
                    :disabled="submitting"
                  />
                </div>
              </div>
            </Transition>
          </div>

          <p v-if="loginType === 'password'" class="form-note">
            <Icon name="ph:info-bold" />
            密码登录需先在个人设置中配置密码。
          </p>
          <p v-else class="form-note">
            <Icon name="ph:paper-plane-tilt-bold" />
            验证码已发送，有效期内仅可使用一次。
          </p>

          <button
            class="submit-button"
            type="submit"
            :disabled="submitting || challengeBusy"
          >
            <Icon
              :name="
                submitting ? 'ph:circle-notch-bold' : 'ph:arrow-right-bold'
              "
              :spin="submitting"
            />
            {{ submitting ? "正在登录" : "进入风隅" }}
          </button>
        </form>
      </section>
    </Transition>

    <p class="auth-privacy">
      <Icon name="ph:shield-check-bold" />邮箱仅用于身份验证与账号安全。
    </p>

    <AuthChallengeModal
      :open="challengeOpen"
      :busy="challengeBusy"
      :title="challengeTitle"
      :description="challengeDescription"
      @cancel="closeChallenge"
      @verified="handleChallengeVerified"
    />
  </AuthPortal>
</template>

<script setup lang="ts">
type ChallengeAction = "email" | "resend" | "password" | "github";

const api = useApi();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const { signInWithGitHub, enabled: supabaseEnabled } = useSupabase();
const showGitHubLogin = import.meta.env.PROD && supabaseEnabled;

const step = ref<"email" | "verify">("email");
const loginType = ref<"code" | "password">("code");
const email = ref("");
const code = ref("");
const password = ref("");
const submitting = ref(false);
const cooldown = ref(0);
const githubLoading = ref(false);
const challengeOpen = ref(false);
const challengeBusy = ref(false);
const challengeAction = ref<ChallengeAction>("email");
const emailForm = ref<HTMLFormElement | null>(null);
const loginForm = ref<HTMLFormElement | null>(null);
const codeInput = ref<HTMLInputElement | null>(null);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const challengeTitle = computed(() =>
  challengeAction.value === "github" ? "连接 GitHub" : "确认是你本人",
);
const challengeDescription = computed(() =>
  challengeAction.value === "github"
    ? "完成安全校验后，将前往 GitHub 授权。"
    : challengeAction.value === "password"
      ? "完成安全校验后，将使用密码登录。"
      : "完成安全校验后，验证码会立即发送到邮箱。",
);

function safeRedirect() {
  const target =
    typeof route.query.redirect === "string" ? route.query.redirect : "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "";
}

function readEmailFromForm() {
  const submitted = emailForm.value ? new FormData(emailForm.value) : null;
  const value = String(submitted?.get("email") || email.value)
    .trim()
    .toLowerCase();
  email.value = value;
  return value;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function openChallenge(action: ChallengeAction) {
  if (challengeOpen.value || challengeBusy.value || submitting.value) return;
  if (action !== "github") {
    const value = readEmailFromForm();
    if (!value) return void toast.warning("请先输入邮箱");
    if (!validEmail(value)) return void toast.warning("请检查邮箱格式");
  }
  challengeAction.value = action;
  challengeOpen.value = true;
}

function closeChallenge() {
  if (!challengeBusy.value) challengeOpen.value = false;
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

async function sendLoginCode(geetestToken: string) {
  await api.post("/auth/send-code", {
    email: email.value,
    type: "login",
    geetestToken,
  });
  startCooldown();
  loginType.value = "code";
  step.value = "verify";
  toast.success("验证码已发送，请查收邮箱");
  await nextTick();
  codeInput.value?.focus();
}

async function handleChallengeVerified(geetestToken: string) {
  if (challengeBusy.value) return;
  challengeBusy.value = true;
  const action = challengeAction.value;
  try {
    if (action === "email" || action === "resend") {
      await sendLoginCode(geetestToken);
      challengeOpen.value = false;
      return;
    }
    if (action === "password") {
      await completePasswordLogin(geetestToken);
      challengeOpen.value = false;
      return;
    }

    githubLoading.value = true;
    useClientState().setSession("githubGeetestToken", geetestToken);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 160)),
    );
    await signInWithGitHub({ redirect: safeRedirect() || "/home" });
  } catch (error: any) {
    if (action === "github") {
      githubLoading.value = false;
      useClientState().removeSession("githubGeetestToken");
    }
    challengeOpen.value = false;
    toast.error(
      error?.message ||
        (action === "github" ? "GitHub 登录失败" : "操作没有完成，请重试"),
    );
  } finally {
    challengeBusy.value = false;
  }
}

function editEmail() {
  if (submitting.value) return;
  step.value = "email";
  code.value = "";
  password.value = "";
  nextTick(() =>
    emailForm.value?.querySelector<HTMLInputElement>("input")?.focus(),
  );
}

async function finishLogin(result: any) {
  const { setSession, panelHome } = useAuth();
  setSession(result.access_token, result.user || {});
  toast.success(
    result.account_status === "created"
      ? "账号已创建，登录成功"
      : "登录成功，欢迎回来",
  );
  await router.push(safeRedirect() || panelHome());
}

async function completePasswordLogin(geetestToken: string) {
  const submitted = loginForm.value ? new FormData(loginForm.value) : null;
  const submittedPassword = String(
    submitted?.get("password") || password.value,
  );
  password.value = submittedPassword;
  if (!submittedPassword) throw new Error("请输入密码");
  submitting.value = true;
  try {
    const result = await api.post<any>("/auth/login", {
      email: email.value,
      password: submittedPassword,
      geetestToken,
    });
    await finishLogin(result);
  } finally {
    submitting.value = false;
  }
}

async function handleLogin() {
  if (submitting.value || challengeBusy.value) return;
  if (loginType.value === "password") {
    openChallenge("password");
    return;
  }
  if (!/^\d{4}$/.test(code.value))
    return void toast.warning("请输入 4 位验证码");
  submitting.value = true;
  try {
    const result = await api.post<any>("/auth/login", {
      email: email.value,
      code: code.value,
    });
    await finishLogin(result);
  } catch (error: any) {
    toast.error(error?.message || "验证码无效或已过期");
  } finally {
    submitting.value = false;
  }
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>
