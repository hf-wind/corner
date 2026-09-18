<template>
  <Teleport to="body">
    <Transition name="tp-modal">
      <div
        v-if="open"
        class="tp-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="外观设置"
        @click.self="close"
      >
        <div class="tp-panel">
          <button type="button" class="tp-close" aria-label="关闭" @click="close">
            <Icon name="ph:x-bold" />
          </button>

          <header class="tp-head">
            <span class="tp-eyebrow">APPEARANCE</span>
            <h3 class="tp-title">外观中心</h3>
            <p class="tp-sub">主题色调与互动特效，即刻生效并自动记忆</p>
          </header>

          <nav class="tp-tabs" role="tablist" aria-label="外观设置分区">
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'theme'"
              :class="{ active: activeTab === 'theme' }"
              @click="activeTab = 'theme'"
            >
              <Icon name="ph:palette-bold" />主题
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'effects'"
              :class="{ active: activeTab === 'effects' }"
              @click="activeTab = 'effects'"
            >
              <Icon name="ph:sparkle-bold" />特效
            </button>
            <span class="tp-tab-thumb" :class="`on-${activeTab}`" aria-hidden="true" />
          </nav>

          <div v-if="activeTab === 'theme'" class="tp-body">
            <section class="tp-section" aria-label="主题色调">
              <div class="tp-cards">
                <button
                  v-for="option in paletteOptions"
                  :key="option.id"
                  type="button"
                  class="tp-card"
                  :class="{ 'is-active': palette === option.id }"
                  @click="setPalette(option.id)"
                >
                  <span class="tp-check" aria-hidden="true">
                    <Icon name="ph:check-bold" />
                  </span>
                  <span
                    class="tp-preview"
                    :style="{
                      '--tp-accent': option.chips[0],
                      '--tp-line': option.line,
                      background: option.bg,
                    }"
                    aria-hidden="true"
                  >
                    <span class="tp-preview-dot" :style="{ background: option.chips[0] }" />
                    <span class="tp-preview-hero">
                      <span class="tp-preview-kicker"></span>
                      <span class="tp-preview-line tp-preview-line-long"></span>
                      <span class="tp-preview-line"></span>
                    </span>
                    <span class="tp-preview-chip-row">
                      <i v-for="n in 3" :key="n" class="tp-preview-chip" />
                    </span>
                  </span>
                  <span class="tp-card-meta">
                    <span class="tp-card-name">{{ option.name }}</span>
                    <span class="tp-card-desc">{{ option.desc }}</span>
                  </span>
                </button>
              </div>
            </section>

            <section class="tp-section" aria-label="深浅模式">
              <p class="tp-label">明暗</p>
              <div class="tp-mode" role="group" aria-label="深浅模式">
                <button
                  v-for="mode in modeOptions"
                  :key="mode.id"
                  type="button"
                  :class="{ active: theme === mode.id }"
                  @click="setTheme(mode.id)"
                >
                  <Icon :name="mode.icon" />
                  <span>{{ mode.label }}</span>
                </button>
              </div>
            </section>
          </div>

          <div v-else class="tp-body">
            <section class="tp-section" aria-label="点击特效">
              <p class="tp-label">点击特效</p>
              <div class="tp-choices">
                <button
                  v-for="option in clickOptions"
                  :key="option.id"
                  type="button"
                  class="tp-choice"
                  :class="{ active: config.clickEffect === option.id }"
                  @click="setConfig({ clickEffect: option.id })"
                >
                  <Icon :name="option.icon" />
                  <span>{{ option.label }}</span>
                </button>
              </div>
              <div v-if="config.clickEffect !== 'none'" class="tp-sliders">
                <label class="tp-slider">
                  <span>数量</span>
                  <input
                    type="range"
                    min="8"
                    max="60"
                    step="2"
                    :value="config.clickCount"
                    @input="setConfig({ clickCount: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <b>{{ config.clickCount }}</b>
                </label>
                <label class="tp-slider">
                  <span>速度</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    :value="config.clickSpeed"
                    @input="setConfig({ clickSpeed: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <b>{{ config.clickSpeed.toFixed(1) }}x</b>
                </label>
              </div>
            </section>

            <section class="tp-section" aria-label="全屏氛围特效">
              <p class="tp-label">全屏氛围</p>
              <div class="tp-choices">
                <button
                  v-for="option in ambientOptions"
                  :key="option.id"
                  type="button"
                  class="tp-choice"
                  :class="{ active: config.ambientEffect === option.id }"
                  @click="setConfig({ ambientEffect: option.id })"
                >
                  <Icon :name="option.icon" />
                  <span>{{ option.label }}</span>
                </button>
              </div>
              <div v-if="config.ambientEffect !== 'none'" class="tp-sliders">
                <label class="tp-slider">
                  <span>密度</span>
                  <input
                    type="range"
                    min="4"
                    max="48"
                    step="2"
                    :value="config.ambientDensity"
                    @input="setConfig({ ambientDensity: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <b>{{ config.ambientDensity }}</b>
                </label>
                <label class="tp-slider">
                  <span>速度</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    :value="config.ambientSpeed"
                    @input="setConfig({ ambientSpeed: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <b>{{ config.ambientSpeed.toFixed(1) }}x</b>
                </label>
              </div>
            </section>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useEffectSettings } from "@/composables/useEffectSettings";
import type { ClickEffectKind, AmbientEffectKind } from "@/utils/effectsEngine";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const { theme, palette, setTheme, setPalette } = useTheme();
const { config, setConfig } = useEffectSettings();

const activeTab = ref<"theme" | "effects">("theme");

const paletteOptions = [
  {
    id: "fresh" as const,
    name: "小清新",
    desc: "草木初生 · 山间微风",
    chips: ["hsl(152 62% 42%)", "hsl(152 45% 58%)", "hsl(45 80% 62%)"],
    line: "hsl(152 12% 40% / 32%)",
    bg: "linear-gradient(140deg, hsl(152 52% 92%), hsl(152 38% 85%))",
  },
  {
    id: "ocean" as const,
    name: "蔚蓝海岸",
    desc: "深海微光 · 晴空万里",
    chips: ["hsl(220 72% 48%)", "hsl(210 62% 58%)", "hsl(200 80% 66%)"],
    line: "hsl(220 12% 40% / 32%)",
    bg: "linear-gradient(140deg, hsl(212 62% 90%), hsl(220 48% 82%))",
  },
];

const modeOptions = [
  { id: "light", label: "亮色", icon: "ph:sun-bold" },
  { id: "dark", label: "深色", icon: "ph:moon-bold" },
  { id: "auto", label: "跟随系统", icon: "ph:monitor-bold" },
];

const clickOptions: { id: ClickEffectKind; label: string; icon: string }[] = [
  { id: "none", label: "关闭", icon: "ph:prohibit-bold" },
  { id: "fireworks", label: "烟花", icon: "ph:confetti-bold" },
  { id: "stardust", label: "星尘", icon: "ph:sparkle-bold" },
  { id: "hearts", label: "爱心", icon: "ph:heart-bold" },
];

const ambientOptions: { id: AmbientEffectKind; label: string; icon: string }[] = [
  { id: "none", label: "关闭", icon: "ph:prohibit-bold" },
  { id: "petals", label: "花瓣", icon: "ph:flower-lotus-bold" },
  { id: "fireflies", label: "萤火", icon: "ph:lightbulb-bold" },
  { id: "starlight", label: "星光", icon: "ph:moon-stars-bold" },
];

function close() {
  emit("update:open", false);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) close();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.tp-overlay {
  position: fixed;
  inset: 0;
  z-index: 12100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, var(--c-text) 24%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.tp-panel {
  position: relative;
  width: min(440px, 100%);
  max-height: min(86dvh, 720px);
  overflow-y: auto;
  padding: 26px 24px 22px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--ld-bg-card) 93%, transparent);
  box-shadow:
    0 32px 80px color-mix(in srgb, var(--ld-shadow) 62%, transparent),
    0 8px 24px color-mix(in srgb, var(--ld-shadow) 34%, transparent);
}

.tp-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-bg-2) 72%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.78rem;
  transition: color 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.tp-close:hover {
  color: var(--c-text);
  border-color: var(--c-primary);
  transform: rotate(90deg);
}

.tp-eyebrow {
  color: var(--c-primary);
  font-family: var(--font-accent);
  font-size: 0.52rem;
  font-weight: 760;
  letter-spacing: 0.22em;
}

.tp-title {
  margin-top: 4px;
  color: var(--c-text);
  font-family: var(--font-brand);
  font-size: 1.14rem;
  font-weight: 760;
  letter-spacing: 0.03em;
}

.tp-sub {
  margin-top: 5px;
  color: var(--c-text-2);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

/* ---- tabs ---- */
.tp-tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 18px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 13px;
  background: color-mix(in srgb, var(--c-bg-2) 68%, transparent);
}

.tp-tabs button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 4px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  transition: color 0.2s ease;
}

.tp-tabs button.active {
  color: var(--c-primary);
}

.tp-tab-thumb {
  position: absolute;
  z-index: 0;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 6px);
  border-radius: 9px;
  background: var(--ld-bg-card);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--ld-shadow) 26%, transparent);
  transition: transform 0.34s cubic-bezier(0.34, 1.3, 0.44, 1);
}

.tp-tab-thumb.on-effects {
  transform: translateX(calc(100% + 4px));
}

.tp-body {
  animation: tp-body-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes tp-body-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.tp-section {
  margin-top: 18px;
}

.tp-label {
  margin-bottom: 8px;
  color: var(--c-text-2);
  font-size: 0.66rem;
  font-weight: 650;
  letter-spacing: 0.14em;
}

/* ---- 主题 tab ---- */
.tp-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 10px 12px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--c-bg-1) 78%, transparent);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.25s ease,
    transform 0.25s cubic-bezier(0.34, 1.4, 0.44, 1);
}

.tp-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--ld-shadow) 30%, transparent);
}

.tp-card.is-active {
  border-color: color-mix(in srgb, var(--c-primary) 62%, transparent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--c-primary) 16%, transparent),
    0 12px 28px color-mix(in srgb, var(--ld-shadow) 30%, transparent);
}

.tp-check {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.6rem;
  opacity: 0;
  transform: scale(0.4);
  transition: opacity 0.2s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.5, 1);
}

.tp-card.is-active .tp-check {
  opacity: 1;
  transform: scale(1);
}

.tp-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  height: 96px;
  padding: 12px;
  border-radius: 11px;
  overflow: hidden;
}

.tp-preview-dot {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.5;
}

.tp-preview-hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 9px;
  background: rgb(255 255 255 / 62%);
  box-shadow: 0 4px 14px rgb(15 35 60 / 10%);
}

.tp-preview-kicker {
  width: 34px;
  height: 5px;
  border-radius: 99px;
  background: var(--tp-accent);
  opacity: 0.85;
}

.tp-preview-line {
  width: 82%;
  height: 4px;
  border-radius: 99px;
  background: var(--tp-line);
}

.tp-preview-line-long {
  width: 96%;
}

.tp-preview-chip-row {
  display: flex;
  gap: 5px;
}

.tp-preview-chip {
  width: 18px;
  height: 6px;
  border-radius: 99px;
}

.tp-card-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 2px;
}

.tp-card-name {
  color: var(--c-text);
  font-family: var(--font-brand);
  font-size: 0.84rem;
  font-weight: 720;
  letter-spacing: 0.04em;
}

.tp-card-desc {
  color: var(--c-text-2);
  font-size: 0.64rem;
  letter-spacing: 0.05em;
}

.tp-mode {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 4px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--c-bg-2) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}

.tp-mode button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 620;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.tp-mode button:hover {
  color: var(--c-text);
}

.tp-mode button.active {
  color: var(--c-primary);
  background: var(--ld-bg-card);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--ld-shadow) 30%, transparent);
}

/* ---- 特效 tab ---- */
.tp-choices {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tp-choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 11px 4px 9px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  border-radius: 13px;
  background: color-mix(in srgb, var(--c-bg-1) 74%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 620;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.2s cubic-bezier(0.34, 1.4, 0.44, 1),
    box-shadow 0.2s ease;
}

.tp-choice:hover {
  transform: translateY(-2px);
  color: var(--c-text);
}

.tp-choice.active {
  border-color: color-mix(in srgb, var(--c-primary) 62%, transparent);
  background: color-mix(in srgb, var(--c-primary-soft) 55%, transparent);
  color: var(--c-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 13%, transparent);
}

.tp-choice svg {
  font-size: 1.05rem;
}

.tp-sliders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.tp-slider {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, var(--c-bg-2) 62%, transparent);
}

.tp-slider span {
  color: var(--c-text-2);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.tp-slider b {
  min-width: 30px;
  color: var(--c-primary);
  font-size: 0.66rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tp-slider input[type="range"] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
  outline: none;
}

.tp-slider input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--c-primary);
  border: 2px solid var(--ld-bg-card);
  box-shadow: 0 1px 6px color-mix(in srgb, var(--c-primary) 55%, transparent);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.tp-slider input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.18);
}

.tp-slider input[type="range"]::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--c-primary);
  border: 2px solid var(--ld-bg-card);
  cursor: pointer;
}

.tp-effect-hint {
  margin-top: 16px;
  color: var(--c-text-3);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  text-align: center;
}

/* 进出场动效 */
.tp-modal-enter-active {
  transition: opacity 0.26s ease;
}

.tp-modal-leave-active {
  transition: opacity 0.2s ease;
}

.tp-modal-enter-active .tp-panel {
  transition:
    transform 0.34s cubic-bezier(0.34, 1.45, 0.44, 1),
    opacity 0.24s ease;
}

.tp-modal-leave-active .tp-panel {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.tp-modal-enter-from,
.tp-modal-leave-to {
  opacity: 0;
}

.tp-modal-enter-from .tp-panel {
  transform: translateY(14px) scale(0.96);
  opacity: 0;
}

.tp-modal-leave-to .tp-panel {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}

@media (max-width: 520px) {
  .tp-panel {
    padding: 22px 18px 18px;
    border-radius: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tp-card,
  .tp-check,
  .tp-close,
  .tp-mode button,
  .tp-choice,
  .tp-tab-thumb,
  .tp-body {
    transition: none;
    animation: none;
  }
}
</style>
