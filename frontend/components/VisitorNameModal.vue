<template>
  <Teleport to="body">
    <Transition name="visitor-name">
      <div
        v-if="visible"
        class="visitor-name-overlay"
        role="presentation"
        @click.self="close"
      >
        <section
          class="visitor-name-card"
          role="dialog"
          aria-modal="true"
          aria-label="身份认证"
        >
          <div class="vn-art" aria-hidden="true">
            <span class="vn-orb" /><span class="vn-ring ring-a" /><span
              class="vn-ring ring-b"
            />
            <span class="vn-star star-a" /><span class="vn-star star-b" />
          </div>

          <div class="vn-tabs" role="tablist" aria-label="选择身份方式">
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'guest'"
              :class="{ active: mode === 'guest' }"
              :disabled="submitting"
              @click="switchMode('guest')"
            >
              <Icon name="ph:face-mask-bold" />访客署名
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'login'"
              :class="{ active: mode === 'login' }"
              :disabled="submitting"
              @click="switchMode('login')"
            >
              <Icon name="ph:sign-in-bold" />登录
            </button>
          </div>

          <template v-if="mode === 'guest'">
            <h2>在这座角落留下名字</h2>
            <p>
              留言与漂流瓶需要署名。名字会随足迹出现在时光留言板与访客记录里。
            </p>
            <div class="vn-input-wrap">
              <input
                v-model="name"
                :maxlength="20"
                class="vn-input"
                placeholder="给自己起一个名字"
                :aria-label="'名字，' + name.length + ' / 20 字'"
                :disabled="submitting"
                @keydown.enter="submit"
                @input="trimGuard"
              />
              <span class="vn-count">{{ name.length }}/20</span>
            </div>
          </template>

          <template v-else-if="mode === 'login'">
            <h2>欢迎回来</h2>
            <p>
              登录后能实时收到瓶子被捞起、被回复的通知，并同步你的访客足迹。
            </p>
            <div class="vn-email-wrap">
              <input
                v-model="email"
                type="email"
                class="vn-input"
                placeholder="邮箱"
                aria-label="邮箱"
                :disabled="submitting"
                @keydown.enter="submit"
              />
            </div>
            <div class="vn-mode-row" v-if="loginType === 'code'">
              <span class="vn-mode-note"
                ><Icon
                  name="ph:info-bold"
                />未注册邮箱验证后会自动创建账号</span
              >
            </div>
            <div v-if="loginType === 'password'" class="vn-email-wrap">
              <input
                v-model="password"
                type="password"
                class="vn-input"
                placeholder="密码"
                aria-label="密码"
                :disabled="submitting"
                @keydown.enter="submit"
              />
            </div>
            <div v-else class="vn-email-wrap">
              <div class="vn-code-row">
                <input
                  v-model="code"
                  type="text"
                  maxlength="4"
                  class="vn-input"
                  placeholder="4 位验证码"
                  aria-label="验证码"
                  :disabled="submitting"
                  @keydown.enter="submit"
                />
                <button
                  type="button"
                  class="vn-sendcode"
                  :disabled="cooldown > 0 || sendingCode || submitting"
                  @click="sendCode"
                >
                  {{
                    sendingCode
                      ? "验证中…"
                      : cooldown > 0
                        ? `${cooldown}s`
                        : "发送验证码"
                  }}
                </button>
              </div>
            </div>
            <div class="vn-switch-row">
              <button
                type="button"
                class="vn-link-btn"
                :disabled="submitting"
                @click="
                  loginType = loginType === 'password' ? 'code' : 'password'
                "
              >
                {{ loginType === "password" ? "用验证码登录" : "用密码登录" }}
              </button>
            </div>
          </template>

          <TurnstileWidget ref="turnstileWidget" v-model="turnstileToken" />
          <div v-if="error" class="vn-error">{{ error }}</div>
          <div v-if="pendingHint" class="vn-pending">
            <Icon name="ph:sparkle-bold" />{{ pendingHint }}
          </div>
          <div class="vn-actions">
            <button
              type="button"
              class="vn-skip"
              :disabled="submitting"
              @click="close"
            >
              稍后再说
            </button>
            <button
              type="button"
              class="vn-submit"
              :disabled="submitting"
              @click="submit"
            >
              <Icon
                :name="submitting ? 'ph:circle-notch-bold' : submitIcon"
                :spin="submitting"
              />
              {{ submitting ? submitLoadingText : submitText }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean;
    initial?: string;
    pendingHint?: string;
  }>(),
  { initial: "", pendingHint: "" },
);
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", name: string, turnstileToken: string): void;
  (e: "authenticated"): void;
}>();

const api = useApi();
const toast = useToast();
const { setSession } = useAuth();

const mode = ref<"guest" | "login">("guest");
const loginType = ref<"password" | "code">("code");
const name = ref(props.initial);
const email = ref("");
const password = ref("");
const code = ref("");
const submitting = ref(false);
const sendingCode = ref(false);
const cooldown = ref(0);
const error = ref("");
const turnstileToken = ref("");
const turnstileWidget = ref<{
  reset: () => void;
  waitForToken: (timeoutMs?: number) => Promise<string>;
} | null>(null);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

let completionDeadline = 0;
let completionTimer: ReturnType<typeof setTimeout> | null = null;

function clearCompletionTimer() {
  if (completionTimer) clearTimeout(completionTimer);
  completionTimer = null;
}

function armCompletionDeadline() {
  completionDeadline = Date.now() + 45_000;
  clearCompletionTimer();
  completionTimer = setTimeout(() => {
    completionTimer = null;
    if (props.visible && Date.now() >= completionDeadline) {
      submitting.value = false;
      error.value = "操作似乎没有完成，请重试或稍后再说";
    }
  }, 45_000);
}

const submitText = computed(() => {
  if (mode.value === "guest") return "开始旅程";
  return "登录";
});
const submitLoadingText = computed(() => {
  if (submitting.value && props.pendingHint) return "正在继续…";
  if (mode.value === "guest") return "起名中…";
  return "登录中…";
});
const submitIcon = computed(() => {
  if (mode.value === "guest") return "ph:feather-bold";
  return "ph:sign-in-bold";
});

watch(
  () => props.visible,
  (open) => {
    if (!open) {
      submitting.value = false;
      error.value = "";
      resetTurnstile();
      clearCompletionTimer();
      password.value = "";
      code.value = "";
      email.value = "";
      cooldown.value = 0;
      if (cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
      return;
    }
    name.value = props.initial;
    error.value = "";
    nextTick(() => {
      const card = document.querySelector<HTMLDivElement>(".visitor-name-card");
      const input = document.querySelector<HTMLInputElement>(
        ".visitor-name-card .vn-input",
      );
      input?.focus();
      if (mode.value === "guest") input?.select();
      card?.scrollTo({ top: 0 });
    });
  },
);

function switchMode(next: "guest" | "login") {
  if (submitting.value) return;
  mode.value = next;
  error.value = "";
  resetTurnstile();
  nextTick(() => {
    document
      .querySelector<HTMLInputElement>(".visitor-name-card .vn-input")
      ?.focus();
  });
}

function resetTurnstile() {
  turnstileToken.value = "";
  turnstileWidget.value?.reset();
}

function trimGuard() {
  name.value = name.value.replace(/\s{2,}/g, " ").slice(0, 20);
}

function close() {
  if (submitting.value) return;
  emit("close");
}

async function resolveTurnstile(): Promise<string> {
  if (!import.meta.env.PROD && !turnstileToken.value) return "local-dev";
  const token =
    turnstileToken.value ||
    (await turnstileWidget.value?.waitForToken(3500)) ||
    "";
  if (token) {
    turnstileToken.value = token;
    return token;
  }
  toast.warning("请先完成人机验证");
  return "";
}

async function sendCode() {
  clearCompletionTimer();
  const clean = email.value.trim();
  if (!clean) {
    toast.warning("请先输入邮箱");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    toast.warning("邮箱格式好像不太对");
    return;
  }
  sendingCode.value = true;
  const token = await resolveTurnstile();
  if (!token) {
    sendingCode.value = false;
    return;
  }
  error.value = "";
  try {
    await api.post("/auth/send-code", {
      email: clean,
      type: "login",
      turnstileToken: token,
    });
    toast.success("验证码已发送，请查收邮箱");
    cooldown.value = 60;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      cooldown.value -= 1;
      if (cooldown.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
    }, 1000);
  } catch (err: any) {
    error.value = err?.message || "发送验证码失败，请稍后再试";
  } finally {
    sendingCode.value = false;
    resetTurnstile();
  }
}

async function submitGuest(): Promise<boolean> {
  const clean = name.value.trim();
  if (!clean) {
    error.value = "名字不能为空，哪怕是代号也好。";
    return false;
  }
  const token = await resolveTurnstile();
  if (!token) return false;
  emit("confirm", clean, token);
  return true;
}

async function submitLogin(): Promise<boolean> {
  const clean = email.value.trim();
  if (!clean) {
    error.value = "请输入邮箱";
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    error.value = "邮箱格式好像不太对，检查一下？";
    return false;
  }
  if (loginType.value === "password") {
    if (!password.value) {
      error.value = "请输入密码";
      return false;
    }
  } else if (!code.value || code.value.length !== 4) {
    error.value = "请输入 4 位验证码";
    return false;
  }
  const payload: Record<string, string> = { email: clean };
  if (loginType.value === "password") {
    const token = await resolveTurnstile();
    if (!token) return false;
    payload.password = password.value;
    payload.turnstileToken = token;
  } else payload.code = code.value;
  try {
    const res = await api.post<{
      access_token: string;
      user: Record<string, unknown>;
    }>("/auth/login", payload);
    setSession(res.access_token, res.user as any);
    toast.success("登录成功");
    emit("authenticated");
    return true;
  } catch (err: any) {
    error.value = err?.message || "登录失败，请检查邮箱和密码";
    resetTurnstile();
    return false;
  }
}

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  error.value = "";
  let ok = false;
  if (mode.value === "guest") ok = await submitGuest();
  else ok = await submitLogin();
  if (!ok) {
    submitting.value = false;
    return;
  }
  // 保持加载态：由父组件执行挂起动作后主动关闭（visible 变 false）；
  // 超时未关闭则恢复可操作状态，避免假死
  armCompletionDeadline();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.visible) close();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  if (cooldownTimer) clearInterval(cooldownTimer);
  clearCompletionTimer();
});
</script>

<style scoped>
.visitor-name-overlay {
  position: fixed;
  z-index: 13100;
  inset: 0;
  display: grid;
  padding: 18px;
  background: rgb(8 15 24 / 34%);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
  place-items: center;
}
.visitor-name-card {
  position: relative;
  width: min(396px, calc(100vw - 36px));
  max-height: min(660px, calc(100vh - 36px));
  padding: 26px 28px 24px;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 22px;
  background: linear-gradient(
    160deg,
    var(--ld-bg-card),
    color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft))
  );
  box-shadow: 0 26px 74px color-mix(in srgb, var(--ld-shadow) 74%, transparent);
  text-align: center;
  animation: vn-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  scrollbar-width: thin;
}
.vn-art {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 32% 28%,
    var(--c-primary-soft),
    color-mix(in srgb, var(--c-primary) 24%, transparent)
  );
  box-shadow:
    inset 0 0 22px color-mix(in srgb, var(--c-primary) 10%, transparent),
    0 12px 30px color-mix(in srgb, var(--c-primary) 16%, transparent);
}
.vn-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 32% 28%,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 55%, transparent)
  );
  box-shadow: 0 0 20px color-mix(in srgb, var(--c-primary) 42%, transparent);
  transform: translate(-50%, -50%);
}
.vn-ring {
  position: absolute;
  inset: 7px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 34%, transparent);
  border-radius: 50%;
  animation: vn-spin 14s linear infinite;
}
.vn-ring.ring-b {
  inset: 15px;
  border-style: solid;
  border-color: color-mix(in srgb, var(--c-primary) 20%, transparent);
  animation-direction: reverse;
  animation-duration: 9s;
}
.vn-star {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c-primary) 60%, transparent);
  animation: vn-pulse 3.4s ease-in-out infinite;
}
.vn-star.star-a {
  top: 9px;
  right: 12px;
}
.vn-star.star-b {
  bottom: 14px;
  left: 10px;
  width: 4px;
  height: 4px;
  animation-delay: -1.4s;
}

/* ===== Tabs ===== */
.vn-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px;
  margin-bottom: 18px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 13px;
  background: var(--c-bg-1);
}
.vn-tabs button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--c-text-2);
  font: inherit;
  font-size: 0.64rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}
.vn-tabs button > svg {
  font-size: 0.8rem;
}
.vn-tabs button.active {
  background: var(--c-primary);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--c-primary) 30%, transparent);
  color: #fff;
}
.vn-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.visitor-name-card h2 {
  margin: 0 0 8px;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 1.08rem;
  letter-spacing: 0.02em;
}
.visitor-name-card > p {
  margin: 0 auto 18px;
  max-width: 310px;
  color: var(--c-text-2);
  font-size: 0.68rem;
  line-height: 1.7;
}
.vn-input-wrap {
  position: relative;
}
.vn-email-wrap {
  margin-top: 10px;
  text-align: left;
}
.vn-email-note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 7px;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.65;
}
.vn-email-note > svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--c-primary);
  font-size: 0.72rem;
  opacity: 0.85;
}
.vn-input {
  width: 100%;
  height: 42px;
  padding: 0 13px 0 15px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 32%, var(--border));
  border-radius: 13px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font: inherit;
  font-size: 0.8rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.vn-input::placeholder {
  color: var(--c-text-3);
}
.vn-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 12%, transparent);
}
.vn-input:disabled {
  opacity: 0.7;
}
.vn-count {
  position: absolute;
  top: 50%;
  right: 13px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  transform: translateY(-50%);
}
.vn-mode-row {
  margin-top: 8px;
  text-align: left;
}
.vn-mode-note {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.vn-code-row {
  display: flex;
  gap: 8px;
}
.vn-code-row .vn-input {
  flex: 1;
  padding-right: 13px;
}
.vn-sendcode {
  flex: 0 0 auto;
  height: 42px;
  padding: 0 13px;
  border: 1px solid var(--c-primary);
  border-radius: 13px;
  background: var(--c-primary);
  color: #fff;
  font: inherit;
  font-size: 0.64rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.vn-sendcode:hover:not(:disabled) {
  transform: translateY(-1px);
}
.vn-sendcode:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.vn-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
}
.vn-link-btn {
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: var(--c-primary);
  font: inherit;
  font-size: 0.6rem;
  cursor: pointer;
}
.vn-link-btn:hover {
  text-decoration: underline;
}
.vn-link-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.vn-error {
  margin-top: 9px;
  color: #d65463;
  font-size: 0.62rem;
  line-height: 1.5;
}
.vn-pending {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 12px;
  padding: 9px 12px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 38%, var(--border));
  border-radius: 11px;
  background: color-mix(in srgb, var(--c-primary-soft) 46%, var(--ld-bg-card));
  color: var(--c-primary);
  font-size: 0.62rem;
  font-weight: 600;
}
.vn-pending > svg {
  font-size: 0.8rem;
}

.vn-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 16px;
}
.vn-actions button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 15px;
  border-radius: 11px;
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}
.vn-actions button:hover:not(:disabled) {
  transform: translateY(-1px);
}
.vn-skip {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--c-text-3);
}
.vn-skip:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.vn-submit {
  border: 1px solid var(--c-primary);
  background: var(--c-primary);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--c-primary) 26%, transparent);
  color: #fff;
  font-weight: 700;
}
.vn-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.vn-name-enter-active {
  transition: opacity 0.24s ease;
}
.vn-name-leave-active {
  transition: opacity 0.18s ease;
}
.vn-name-enter-from,
.vn-name-leave-to {
  opacity: 0;
}
@keyframes vn-card-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
}
@keyframes vn-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes vn-pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}
@media (prefers-reduced-motion: reduce) {
  .vn-ring,
  .vn-star {
    animation: none;
  }
  .visitor-name-card {
    animation: none;
  }
  .vn-name-enter-active,
  .vn-name-leave-active {
    transition: none;
  }
}
</style>
