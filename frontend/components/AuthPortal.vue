<template>
  <main
    ref="portalRef"
    class="auth-portal"
    :class="{ 'motion-ready': motionReady }"
  >
    <nav class="auth-nav" aria-label="认证页导航">
      <AppLink to="/home" class="auth-back" title="返回首页">
        <Icon name="ph:arrow-left-bold" /><span>返回首页</span>
      </AppLink>
      <div class="auth-theme" aria-label="外观模式">
        <button
          type="button"
          :class="{ active: theme === 'light' }"
          title="亮色"
          @click="setTheme('light')"
        >
          <Icon name="ph:sun-bold" />
        </button>
        <button
          type="button"
          :class="{ active: theme === 'dark' }"
          title="深色"
          @click="setTheme('dark')"
        >
          <Icon name="ph:moon-bold" />
        </button>
        <button
          type="button"
          :class="{ active: theme === 'auto' }"
          title="跟随系统"
          @click="setTheme('auto')"
        >
          <Icon name="ph:desktop-bold" />
        </button>
      </div>
    </nav>

    <section class="auth-brand" aria-label="风隅随笔">
      <div class="auth-current" aria-hidden="true">
        <i v-for="index in 3" :key="index"><span /></i>
      </div>
      <div class="brand-lockup">
        <img src="/logo.png" alt="风隅随笔站点标志" width="58" height="58" />
        <div>
          <strong>{{ siteTitle }}</strong
          ><span>WIND CORNER NOTES</span>
        </div>
      </div>
      <div class="brand-copy">
        <span class="brand-index"
          >{{ mode === "login" ? "01" : "02" }} / AUTH</span
        >
        <h1>{{ headline }}</h1>
        <p>{{ description }}</p>
      </div>
      <footer>
        <span><Icon name="ph:wind-bold" /> CORNER.INK</span>
        <span>{{ currentYear }}</span>
      </footer>
    </section>

    <section class="auth-workspace">
      <div class="auth-panel">
        <slot />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import gsap from "gsap";

defineProps<{
  mode: "login" | "register";
  headline: string;
  description: string;
}>();

const { theme, setTheme } = useTheme();
const { siteTitle } = useSiteSettings();
const currentYear = new Date().getFullYear();
const portalRef = ref<HTMLElement | null>(null);
const motionReady = ref(false);
let motionContext: gsap.Context | null = null;

onMounted(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !portalRef.value) {
    motionReady.value = true;
    return;
  }
  motionContext = gsap.context(() => {
    const revealGroups = gsap.utils.toArray<HTMLElement>(
      ".auth-nav, .brand-lockup, .brand-copy > *, .auth-brand footer, .auth-panel > *",
    );
    gsap.set(revealGroups, { y: 18, opacity: 0, force3D: true });
    gsap.set(".auth-current", { opacity: 0 });
    motionReady.value = true;
    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .to(".auth-nav", { y: 0, opacity: 1, duration: 0.65 }, 0.05)
      .to(".brand-lockup", { y: 0, opacity: 1, duration: 0.75 }, 0.12)
      .to(
        ".brand-copy > *",
        { y: 0, opacity: 1, duration: 0.88, stagger: 0.08 },
        0.22,
      )
      .to(".auth-current", { opacity: 1, duration: 1.1 }, 0.24)
      .to(
        ".auth-panel > *",
        { y: 0, opacity: 1, duration: 0.72, stagger: 0.07 },
        0.34,
      )
      .to(".auth-brand footer", { y: 0, opacity: 1, duration: 0.65 }, 0.5);
  }, portalRef.value);
});

onBeforeUnmount(() => {
  motionContext?.revert();
  motionContext = null;
});
</script>

<style scoped>
.auth-portal {
  position: relative;
  display: grid;
  width: 100%;
  height: 100dvh;
  grid-template-columns: minmax(340px, 46%) minmax(420px, 54%);
  overflow: hidden;
  background: var(--c-bg);
  color: var(--c-text);
  isolation: isolate;
}
.auth-portal::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    linear-gradient(
      color-mix(in srgb, var(--border) 42%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--border) 42%, transparent) 1px,
      transparent 1px
    );
  background-size: 48px 48px;
  content: "";
  opacity: 0.28;
  pointer-events: none;
}
.auth-portal:not(.motion-ready) .auth-nav,
.auth-portal:not(.motion-ready) .brand-lockup,
.auth-portal:not(.motion-ready) .brand-copy > *,
.auth-portal:not(.motion-ready) .auth-brand footer,
.auth-portal:not(.motion-ready) .auth-panel > * {
  opacity: 0;
}
.auth-nav {
  position: fixed;
  z-index: 5;
  top: 22px;
  right: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}
.auth-back,
.auth-theme {
  pointer-events: auto;
}
.auth-back {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 7px;
  color: var(--c-text-2);
  font-size: 0.68rem;
  text-decoration: none;
}
.auth-back:hover {
  color: var(--c-primary);
}
.auth-theme {
  display: flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  box-shadow: var(--ui-shadow-soft);
  backdrop-filter: blur(14px);
}
.auth-theme button {
  display: grid;
  width: 31px;
  height: 29px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
}
.auth-theme button:hover {
  color: var(--c-primary);
}
.auth-theme button.active {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.auth-brand {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 92px clamp(38px, 6vw, 92px) 34px;
  overflow: hidden;
  border-right: 1px solid var(--border);
  background: color-mix(in srgb, var(--c-bg-1) 88%, var(--c-primary-soft));
}
.auth-current {
  position: absolute;
  inset: 18% -12% 14% 8%;
  overflow: hidden;
  pointer-events: none;
}
.auth-current > i {
  position: absolute;
  right: 0;
  left: 0;
  height: 42%;
  border-top: 1px solid color-mix(in srgb, var(--c-primary) 16%, transparent);
  border-radius: 50%;
  transform: rotate(var(--current-angle));
}
.auth-current > i:nth-child(1) {
  --current-angle: -8deg;
  top: 12%;
}
.auth-current > i:nth-child(2) {
  --current-angle: 4deg;
  top: 43%;
}
.auth-current > i:nth-child(3) {
  --current-angle: -2deg;
  top: 72%;
}
.auth-current span {
  position: absolute;
  top: -3px;
  left: 12%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 55%, transparent);
  animation: auth-current-flow 9s ease-in-out infinite alternate;
}
.auth-current > i:nth-child(2) span {
  animation-delay: -3s;
  animation-duration: 11s;
}
.auth-current > i:nth-child(3) span {
  animation-delay: -6s;
  animation-duration: 13s;
}
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 13px;
}
.brand-lockup img {
  width: 58px;
  height: 58px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 26%, var(--border));
  border-radius: 8px;
  box-shadow: var(--ui-shadow-panel);
}
.brand-lockup > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.brand-lockup strong {
  font-size: 0.9rem;
}
.brand-lockup span {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.46rem;
}
.brand-copy {
  position: relative;
  z-index: 1;
  max-width: 430px;
}
.brand-index {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  font-weight: 700;
}
.brand-copy h1 {
  max-width: 7em;
  margin: 18px 0 0;
  color: var(--c-text);
  font-size: clamp(2.5rem, 4.4vw, 4.8rem);
  font-weight: var(--font-heading-weight);
  line-height: 1.08;
}
.brand-copy p {
  max-width: 330px;
  margin: 20px 0 0;
  color: var(--c-text-2);
  font-size: 0.76rem;
  line-height: 1.9;
}
.auth-brand footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.48rem;
}
.auth-brand footer span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.auth-workspace {
  display: grid;
  min-width: 0;
  overflow-y: auto;
  padding: 76px clamp(28px, 6vw, 84px) 38px;
  place-items: center;
}
.auth-panel {
  position: relative;
  width: min(420px, 100%);
}
.auth-panel::before {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: -24px;
  width: 1px;
  background: color-mix(in srgb, var(--border) 72%, transparent);
  content: "";
}
.auth-panel::after {
  position: absolute;
  top: 2px;
  left: -27px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 54%, transparent);
  content: "";
}
.auth-panel :deep(.auth-eyebrow) {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.52rem;
  font-weight: 700;
}
.auth-panel :deep(.auth-title) {
  margin: 9px 0 0;
  color: var(--c-text);
  font-size: 1.65rem;
}
.auth-panel :deep(.auth-subtitle) {
  margin: 7px 0 0;
  color: var(--c-text-3);
  font-size: 0.7rem;
  line-height: 1.7;
}
.auth-panel :deep(.auth-tabs) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 25px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-1);
}
.auth-panel :deep(.auth-tabs button) {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font: inherit;
  font-size: 0.68rem;
}
.auth-panel :deep(.auth-tabs button.active) {
  background: var(--ld-bg-card);
  color: var(--c-text);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--ld-shadow) 30%, transparent);
  transform: translateY(-1px);
}
.auth-panel :deep(.auth-form) {
  display: grid;
  gap: 15px;
  margin-top: 22px;
}
.auth-panel :deep(.auth-method-field) {
  position: relative;
  min-height: 68px;
}
.auth-panel :deep(.auth-method-field > .field) {
  position: absolute;
  inset: 0;
}
.auth-panel :deep(.field) {
  display: grid;
  gap: 7px;
}
.auth-panel :deep(.field label) {
  color: var(--c-text-2);
  font-size: 0.64rem;
  font-weight: 650;
}
.auth-panel :deep(.input-shell) {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
}
.auth-panel :deep(.input-shell > svg) {
  position: absolute;
  left: 13px;
  color: var(--c-text-3);
  font-size: 0.88rem;
  pointer-events: none;
}
.auth-panel :deep(.auth-input) {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 13px 0 39px;
  border: 1px solid var(--border);
  border-radius: 7px;
  outline: 0;
  background: var(--c-bg-1);
  color: var(--c-text);
  font: inherit;
  font-size: 0.75rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}
.auth-panel :deep(.auth-input:focus) {
  border-color: var(--c-primary);
  background: var(--ld-bg-card);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
}
.auth-panel :deep(.input-shell:focus-within > svg) {
  color: var(--c-primary);
  transform: translateX(1px);
}
.auth-panel :deep(.auth-input::placeholder) {
  color: var(--c-text-3);
}
.auth-panel :deep(.code-row) {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
.auth-panel :deep(.send-code) {
  min-width: 108px;
  padding: 0 13px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 40%, var(--border));
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.63rem;
  font-weight: 700;
}
.auth-panel :deep(.send-code:hover:not(:disabled)) {
  border-color: var(--c-primary);
}
.auth-panel :deep(button:disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}
.auth-panel :deep(.form-note) {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.65;
}
.auth-panel :deep(.form-note svg) {
  flex: none;
  margin-top: 2px;
  color: var(--c-primary);
}
.auth-panel :deep(.submit-button) {
  position: relative;
  display: flex;
  width: 100%;
  height: 45px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  border: 1px solid var(--c-primary);
  border-radius: 7px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  box-shadow: 0 9px 24px color-mix(in srgb, var(--c-primary) 22%, transparent);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  overflow: hidden;
}
.auth-panel :deep(.submit-button:hover:not(:disabled)) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--c-primary) 30%, transparent);
}
.auth-panel :deep(.submit-button:disabled) {
  cursor: wait;
  opacity: 1;
}
.auth-panel :deep(.submit-button:disabled::after) {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgb(255 255 255 / 82%);
  content: "";
  transform: scaleX(0.18);
  transform-origin: left;
  animation: auth-loading-line 1.15s ease-in-out infinite;
}
.auth-panel :deep(.auth-field-enter-active),
.auth-panel :deep(.auth-field-leave-active) {
  transition:
    opacity 0.24s ease,
    transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
}
.auth-panel :deep(.auth-field-enter-from) {
  opacity: 0;
  transform: translateY(8px);
}
.auth-panel :deep(.auth-field-leave-to) {
  opacity: 0;
  transform: translateY(-5px);
}
.auth-panel :deep(.auth-switch) {
  margin: 20px 0 0;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  color: var(--c-text-3);
  font-size: 0.64rem;
}
.auth-panel :deep(.auth-switch a) {
  margin-left: 5px;
  color: var(--c-primary);
  font-weight: 700;
  text-decoration: none;
}
.auth-panel :deep(.auth-switch a:hover) {
  text-decoration: underline;
}
@media (max-width: 820px) {
  .auth-portal {
    display: block;
    height: 100dvh;
    overflow-y: auto;
  }
  .auth-brand {
    min-height: 250px;
    padding: 76px 24px 26px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .brand-copy {
    margin-top: 44px;
  }
  .brand-copy h1 {
    max-width: none;
    margin-top: 10px;
    font-size: 2rem;
  }
  .brand-copy p {
    margin-top: 10px;
  }
  .auth-brand footer {
    display: none;
  }
  .brand-lockup img {
    width: 45px;
    height: 45px;
  }
  .auth-workspace {
    min-height: calc(100dvh - 250px);
    padding: 34px 20px max(32px, env(safe-area-inset-bottom));
  }
  .auth-panel::before,
  .auth-panel::after {
    display: none;
  }
  .auth-nav {
    top: max(12px, env(safe-area-inset-top));
    right: 14px;
    left: 14px;
  }
  .auth-back span {
    display: none;
  }
}
@media (max-width: 420px) {
  .auth-panel :deep(.code-row) {
    grid-template-columns: 1fr;
  }
  .auth-panel :deep(.send-code) {
    height: 40px;
  }
}
@keyframes auth-current-flow {
  to {
    transform: translate3d(64vw, -2px, 0);
  }
}
@keyframes auth-loading-line {
  0% {
    transform: translateX(-42%) scaleX(0.18);
  }
  55% {
    transform: translateX(28%) scaleX(0.48);
  }
  100% {
    transform: translateX(112%) scaleX(0.18);
  }
}
@media (prefers-reduced-motion: reduce) {
  .auth-panel :deep(*),
  .auth-back {
    transition: none !important;
  }
  .auth-current span,
  .auth-panel :deep(.submit-button:disabled::after) {
    animation: none;
  }
}
</style>
