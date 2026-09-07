<template>
  <main class="not-found-page">
    <div class="wind-field" aria-hidden="true">
      <i v-for="index in 7" :key="index" :style="{ '--line': index }" />
    </div>

    <div class="not-found-layout">
      <section class="not-found-copy">
        <span class="error-code">404 / LOST CORNER</span>
        <div class="error-mark" aria-hidden="true">
          <Icon name="ph:wind-bold" /><i /><i />
        </div>
        <h1>这阵风没有抵达这里</h1>
        <p>
          地址也许已经改变，或它从未被写下。你可以回到首页，继续寻找值得停留的内容。
        </p>
        <div class="error-path">
          <Icon name="ph:map-pin-line-bold" />
          <span>{{ missingPath }}</span>
        </div>
        <div class="error-actions">
          <AppLink to="/home" class="primary-action">
            <Icon name="ph:house-bold" />回到首页
          </AppLink>
          <button type="button" @click="goBack">
            <Icon name="ph:arrow-left-bold" />返回上一页
          </button>
        </div>
      </section>

      <aside class="not-found-visual" aria-hidden="true">
        <span class="visual-number">404</span>
        <div class="route-map">
          <i class="route-path path-one" />
          <i class="route-path path-two" />
          <span class="route-node node-start"><b />ORIGIN</span>
          <span class="route-node node-lost"><b />LOST</span>
          <span class="route-compass"
            ><Icon name="ph:navigation-arrow-bold"
          /></span>
        </div>
        <div class="visual-caption">
          <span>NO. 404</span>
          <p>坐标未收录，风向仍在继续。</p>
        </div>
      </aside>
    </div>

    <footer>
      <span>WIND CORNER</span>
      <i />
      <span>PATH NOT FOUND</span>
    </footer>
  </main>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const missingPath = computed(() => String(route.query.from || route.fullPath));

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push("/home");
}

useHead({
  title: "页面没有找到",
  meta: [{ name: "robots", content: "noindex" }],
});
</script>

<style scoped>
.not-found-page {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--c-bg);
  color: var(--c-text);
  place-items: center;
  isolation: isolate;
}

.not-found-page::before {
  position: absolute;
  z-index: -1;
  top: 0;
  right: 0;
  width: 32%;
  height: 100%;
  background: color-mix(in srgb, var(--c-bg-1) 78%, transparent);
  content: "";
}

.wind-field {
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.wind-field i {
  --line: 1;
  position: absolute;
  top: calc(12% + var(--line) * 10%);
  right: calc(-8% + var(--line) * 2%);
  width: calc(120px + var(--line) * 34px);
  height: 1px;
  background: color-mix(in srgb, var(--c-primary) 22%, transparent);
  opacity: calc(0.18 + var(--line) * 0.055);
  transform: rotate(calc(-4deg + var(--line) * 0.65deg));
  transform-origin: right;
  animation: wind-pass calc(4.8s + var(--line) * 0.42s) ease-in-out infinite;
}

.not-found-layout {
  display: grid;
  width: min(1080px, calc(100% - 72px));
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: center;
  gap: clamp(56px, 7vw, 112px);
}

.not-found-copy {
  width: 100%;
  padding: 48px 0;
}

.error-code {
  color: var(--c-primary);
  font: 700 0.58rem var(--font-mono);
}

.error-mark {
  position: relative;
  display: grid;
  width: 62px;
  height: 62px;
  margin-top: 34px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border));
  border-radius: 8px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 1.65rem;
  place-items: center;
}

.error-mark i {
  position: absolute;
  right: -28px;
  width: 23px;
  height: 1px;
  background: var(--c-primary);
}

.error-mark i:last-child {
  right: -17px;
  bottom: 19px;
  width: 12px;
  opacity: 0.45;
}

.not-found-copy h1 {
  margin: 28px 0 13px;
  font-family: var(--font-heading);
  font-size: 2.25rem;
  line-height: 1.25;
}

.not-found-copy > p {
  max-width: 520px;
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.76rem;
  line-height: 1.9;
}

.error-path {
  display: flex;
  width: min(100%, 460px);
  align-items: center;
  gap: 8px;
  margin-top: 26px;
  padding: 10px 12px;
  border-radius: 7px;
  background: var(--c-bg-2);
  color: var(--c-text-3);
  font: 0.55rem var(--font-mono);
}

.error-path span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 30px;
}

.error-actions a,
.error-actions button {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 15px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.66rem;
  text-decoration: none;
  transition:
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.25s ease;
}

.error-actions a.primary-action {
  border-color: var(--c-primary);
  background: var(--c-primary);
  color: white;
}

.error-actions a:hover,
.error-actions button:hover {
  border-color: color-mix(in srgb, var(--c-primary) 58%, var(--border));
  color: var(--c-primary);
  box-shadow: 0 9px 22px color-mix(in srgb, var(--ld-shadow) 28%, transparent);
  transform: translateY(-3px);
}

.error-actions a.primary-action:hover {
  color: white;
}

.not-found-visual {
  position: relative;
  display: grid;
  width: 100%;
  height: 390px;
  align-content: center;
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(
      color-mix(in srgb, var(--border) 32%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--border) 32%, transparent) 1px,
      transparent 1px
    ),
    color-mix(in srgb, var(--c-bg-2) 54%, transparent);
  background-size: 32px 32px;
}

.visual-number {
  position: absolute;
  top: 24px;
  right: 28px;
  color: color-mix(in srgb, var(--c-primary) 16%, transparent);
  font: 800 5.4rem var(--font-mono);
  line-height: 1;
}

.route-map {
  position: relative;
  width: 82%;
  height: 180px;
  margin: 0 auto;
}

.route-path {
  position: absolute;
  height: 1px;
  background: color-mix(in srgb, var(--c-primary) 48%, transparent);
  transform-origin: left center;
}

.path-one {
  top: 104px;
  left: 16px;
  width: 57%;
  transform: rotate(-18deg);
}

.path-two {
  top: 71px;
  left: 54%;
  width: 32%;
  background: repeating-linear-gradient(
    90deg,
    color-mix(in srgb, var(--c-primary) 38%, transparent) 0 5px,
    transparent 5px 10px
  );
  transform: rotate(28deg);
}

.route-node {
  position: absolute;
  display: grid;
  gap: 7px;
  color: var(--c-text-3);
  font: 0.42rem var(--font-mono);
}

.route-node b {
  width: 8px;
  height: 8px;
  border: 2px solid var(--c-bg-1);
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 5px var(--c-primary-soft);
}

.node-start {
  bottom: 43px;
  left: 11px;
}

.node-lost {
  top: 37px;
  right: 23px;
  color: var(--c-primary);
}

.node-lost b {
  background: var(--c-bg-1);
  box-shadow: 0 0 0 1px var(--c-primary);
  animation: lost-signal 1.8s ease-in-out infinite;
}

.route-compass {
  position: absolute;
  top: 45px;
  left: 45%;
  display: grid;
  width: 48px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 38%, var(--border));
  border-radius: 50%;
  background: var(--ld-bg-card);
  color: var(--c-primary);
  font-size: 1.15rem;
  place-items: center;
  animation: compass-drift 4.6s ease-in-out infinite;
}

.visual-caption {
  position: absolute;
  right: 24px;
  bottom: 22px;
  left: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: var(--c-text-3);
}

.visual-caption span {
  color: var(--c-primary);
  font: 700 0.46rem var(--font-mono);
}

.visual-caption p {
  margin: 0;
  font-size: 0.53rem;
}

.not-found-page footer {
  position: absolute;
  right: 32px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--c-text-3);
  font: 0.47rem var(--font-mono);
}

.not-found-page footer i {
  width: 28px;
  height: 1px;
  background: var(--border);
}

@keyframes wind-pass {
  50% {
    opacity: 0.08;
    transform: translateX(-38px) rotate(calc(-4deg + var(--line) * 0.65deg));
  }
}

@keyframes lost-signal {
  50% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--c-primary) 8%, transparent);
  }
}

@keyframes compass-drift {
  50% {
    transform: translate(5px, -6px) rotate(8deg);
  }
}

@media (max-width: 900px) {
  .not-found-layout {
    width: min(680px, calc(100% - 48px));
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 28px;
  }

  .not-found-copy {
    width: 100%;
    padding-top: max(96px, calc(env(safe-area-inset-top) + 82px));
  }

  .not-found-visual {
    height: 330px;
  }

  .not-found-page::before {
    top: auto;
    width: 100%;
    height: 30%;
  }
}

@media (max-width: 680px) {
  .not-found-page {
    overflow-y: auto;
  }

  .not-found-layout {
    width: calc(100% - 40px);
    grid-template-columns: 1fr;
    gap: 8px;
    padding-bottom: 78px;
  }

  .not-found-copy {
    padding: max(88px, calc(env(safe-area-inset-top) + 74px)) 0 24px;
  }

  .not-found-copy h1 {
    font-size: 1.75rem;
  }

  .error-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .not-found-visual {
    height: 190px;
  }

  .visual-number {
    top: 18px;
    font-size: 3.6rem;
  }

  .route-map {
    height: 140px;
    transform: scale(0.86);
  }

  .visual-caption {
    bottom: 14px;
  }

  .not-found-page footer {
    right: 20px;
    bottom: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wind-field i {
    animation: none;
  }

  .node-lost b,
  .route-compass {
    animation: none;
  }

  .error-actions a,
  .error-actions button {
    transition: none;
  }
}
</style>
