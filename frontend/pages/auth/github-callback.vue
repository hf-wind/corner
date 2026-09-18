<template>
  <AuthPortal
    mode="login"
    headline="身份正穿过风隅"
    description="GitHub 已经回应。再确认一次，就把这次相遇安全地留在本站。"
  >
    <section class="callback-panel" aria-live="polite">
      <div
        class="provider-signal"
        :class="{ success: ready, error: error }"
        aria-hidden="true"
      >
        <i /><i />
        <span>
          <Icon
            :name="
              error
                ? 'ph:warning-bold'
                : ready
                  ? 'ph:check-bold'
                  : 'ph:github-logo-bold'
            "
          />
        </span>
      </div>

      <Transition name="callback-state" mode="out-in">
        <div v-if="loading" key="loading" class="callback-state">
          <span class="state-kicker">SECURE HANDSHAKE</span>
          <h2>正在确认 GitHub 身份</h2>
          <p>授权信息正在安全抵达，请稍候。</p>
          <div class="callback-progress"><i /></div>
          <div class="status-row">
            <Icon name="ph:lock-key-bold" />加密连接中
          </div>
        </div>

        <div
          v-else-if="error"
          key="error"
          class="callback-state callback-state--error"
        >
          <span class="state-kicker">CONNECTION PAUSED</span>
          <h2>连接没有完成</h2>
          <p>{{ error }}</p>
          <div class="callback-actions">
            <button class="submit-button" type="button" @click="retry">
              <Icon name="ph:arrow-clockwise-bold" />重新连接
            </button>
            <button class="callback-secondary" type="button" @click="goToLogin">
              返回登录
            </button>
          </div>
        </div>

        <div v-else key="ready" class="callback-state callback-state--ready">
          <span class="state-kicker">IDENTITY READY</span>
          <h2>授权已经就绪</h2>
          <p>确认后将完成本站登录，并前往你刚才想去的页面。</p>
          <div class="identity-ticket">
            <span><Icon name="ph:github-logo-bold" />GitHub</span>
            <i />
            <strong>{{ pendingEmail }}</strong>
            <Icon name="ph:check-circle-fill" />
          </div>
          <button
            class="submit-button confirm-button"
            type="button"
            :disabled="completing"
            @click="completeLogin"
          >
            <Icon
              :name="
                completing ? 'ph:circle-notch-bold' : 'ph:arrow-right-bold'
              "
              :spin="completing"
            />
            {{ completing ? "正在完成登录" : "确认并进入风隅" }}
          </button>
        </div>
      </Transition>
    </section>
  </AuthPortal>
</template>

<script setup lang="ts">
import { useSupabase } from "@/composables/useSupabase";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { getUser } = useSupabase();
const { setSession } = useAuth();
const api = useApi();

const loading = ref(true);
const error = ref<string | null>(null);
const completing = ref(false);
const pendingGithubUser = ref<any | null>(null);
const ready = computed(() => !loading.value && !error.value);
const pendingEmail = computed(
  () => pendingGithubUser.value?.email || "已验证账号",
);

function safeRedirect() {
  const target =
    typeof route.query.redirect === "string" ? route.query.redirect : "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/home";
}

function clearOAuthHash() {
  if (typeof window === "undefined" || !window.location.hash) return;
  window.history.replaceState(
    {},
    document.title,
    `${window.location.pathname}${window.location.search}`,
  );
}

async function handleCallback() {
  try {
    loading.value = true;
    error.value = null;
    const user = await getUser();
    if (!user) throw new Error("没有读取到 GitHub 授权信息");
    clearOAuthHash();

    const geetestToken = String(
      useClientState().getSession("githubGeetestToken", ""),
    );
    if (!geetestToken) throw new Error("安全校验已失效，请重新发起登录");
    pendingGithubUser.value = {
      id: user.id,
      email: user.email,
      username:
        user.user_metadata?.user_name || user.user_metadata?.preferred_username,
      avatar: user.user_metadata?.avatar_url,
      geetestToken,
    };
  } catch (err: any) {
    error.value = err?.message || "GitHub 登录失败，请重试";
  } finally {
    clearOAuthHash();
    loading.value = false;
  }
}

async function completeLogin() {
  if (!pendingGithubUser.value || completing.value) return;
  completing.value = true;
  try {
    const { geetestToken, ...githubUser } = pendingGithubUser.value;
    useClientState().removeSession("githubGeetestToken");
    const response = await api.post<any>("/auth/github", {
      githubUser,
      geetestToken,
    });
    const result =
      response?.data && typeof response.data === "object"
        ? response.data
        : response;
    const accessToken = String(
      result?.access_token || result?.accessToken || "",
    ).trim();
    const nextUser = result?.user;
    if (!accessToken || !nextUser?.id || !nextUser?.username) {
      throw new Error("本站登录凭据无效，请重新尝试");
    }
    setSession(accessToken, {
      id: String(nextUser.id),
      username: String(nextUser.username),
      email: nextUser.email ? String(nextUser.email) : undefined,
      avatar: nextUser.avatar ? String(nextUser.avatar) : null,
      role: nextUser.role ? String(nextUser.role) : "user",
    });
    toast.success(
      result?.account_status === "created"
        ? "账号已创建，GitHub 登录成功"
        : "GitHub 登录成功",
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 240));
    await router.replace(safeRedirect());
  } catch (err: any) {
    error.value = err?.message || "本站登录未完成，请重试";
    pendingGithubUser.value = null;
    toast.error(error.value || "本站登录未完成，请重试");
  } finally {
    completing.value = false;
  }
}

function retry() {
  useClientState().removeSession("githubGeetestToken");
  router.replace({ path: "/login", query: { redirect: safeRedirect() } });
}

function goToLogin() {
  useClientState().removeSession("githubGeetestToken");
  router.push("/login");
}

onMounted(handleCallback);
</script>

<style scoped>
.callback-panel {
  width: 100%;
}

.provider-signal {
  position: relative;
  display: grid;
  width: 76px;
  height: 76px;
  margin-bottom: 26px;
  place-items: center;
}

.provider-signal > span {
  position: relative;
  z-index: 2;
  display: grid;
  width: 56px;
  height: 56px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 40%, var(--border));
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1.55rem;
  place-items: center;
}

.provider-signal > i {
  position: absolute;
  inset: 3px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 24%, transparent);
  border-radius: 50%;
  animation: callback-ring 2.3s ease-out infinite;
}

.provider-signal > i:nth-child(2) {
  animation-delay: -1.15s;
}
.provider-signal.success > span {
  border-color: color-mix(in srgb, #42a77b 46%, var(--border));
  background: color-mix(in srgb, #42a77b 13%, transparent);
  color: #42a77b;
}
.provider-signal.error > span {
  border-color: color-mix(in srgb, #dc6268 46%, var(--border));
  background: color-mix(in srgb, #dc6268 13%, transparent);
  color: #dc6268;
}
.callback-state {
  min-height: 235px;
}
.state-kicker {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.51rem;
  font-weight: 750;
}
.callback-state h2 {
  margin: 9px 0 0;
  color: var(--c-text);
  font-size: 1.65rem;
  letter-spacing: 0;
}
.callback-state > p {
  max-width: 360px;
  margin: 9px 0 0;
  color: var(--c-text-3);
  font-size: 0.7rem;
  line-height: 1.75;
}
.callback-state--error .state-kicker {
  color: #dc6268;
}
.callback-state--ready .state-kicker {
  color: #42a77b;
}

.callback-progress {
  position: relative;
  width: 100%;
  height: 2px;
  margin-top: 35px;
  overflow: hidden;
  background: var(--border);
}
.callback-progress i {
  position: absolute;
  inset: 0 auto 0 -28%;
  width: 34%;
  background: var(--c-primary);
  animation: callback-progress 1.35s ease-in-out infinite;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}

.identity-ticket {
  display: grid;
  grid-template-columns: auto 1px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  height: 48px;
  margin-top: 26px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--c-text-2);
  font-size: 0.61rem;
}
.identity-ticket span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text);
  font-weight: 700;
}
.identity-ticket > i {
  width: 1px;
  height: 18px;
  background: var(--border);
}
.identity-ticket strong {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.identity-ticket > svg {
  color: #42a77b;
}
.confirm-button {
  margin-top: 14px;
}
.callback-actions {
  display: grid;
  gap: 9px;
  margin-top: 27px;
}
.callback-secondary {
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.65rem;
}
.callback-secondary:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.callback-state-enter-active,
.callback-state-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.22s ease;
}
.callback-state-enter-from {
  opacity: 0;
  filter: blur(5px);
  transform: translateX(14px);
}
.callback-state-leave-to {
  opacity: 0;
  filter: blur(4px);
  transform: translateX(-8px);
}

@keyframes callback-ring {
  from {
    opacity: 0.6;
    transform: scale(0.72);
  }
  to {
    opacity: 0;
    transform: scale(1.12);
  }
}
@keyframes callback-progress {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(380%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .provider-signal > i,
  .callback-progress i {
    animation: none;
  }
}
</style>
