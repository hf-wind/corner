<template>
  <span
    class="badge-medal"
    :class="[`frame-${frame}`, `medal-${code}`, { locked }]"
    :style="{ '--medal-size': `${size}px` }"
    aria-hidden="true"
  >
    <svg class="medal-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g v-if="code === 'first_visit'">
        <path class="glyph" d="M12 2.6 14.1 9.9 21.4 12 14.1 14.1 12 21.4 9.9 14.1 2.6 12 9.9 9.9Z" />
      </g>
      <g v-else-if="code === 'set_nickname'">
        <path class="glyph" d="M20.2 11.7a5.5 5.5 0 0 0-7.8-7.8L5.5 10.8V19h8.3l6.4-7.3Z" />
        <path class="glyph stroke" d="M15.6 8.4 3 21" />
        <path class="glyph stroke" d="M17.4 14.4H9.6" />
      </g>
      <g v-else-if="code === 'first_message'">
        <rect class="glyph stroke" x="3.6" y="3.6" width="16.8" height="16.8" rx="2.6" />
        <path class="glyph stroke" d="M7.4 9h9.2M7.4 12.4h6" />
        <path class="glyph stroke" d="M14.8 3.6v4h4" />
      </g>
      <g v-else-if="code === 'first_bottle'">
        <path class="glyph" d="M9.8 2.6h4.4M10.6 2.6V5h2.8V2.6" />
        <path class="glyph" d="M10 5h4l1.3 3.9a6.6 6.6 0 1 1-6.6 0Z" />
        <path class="glyph stroke" d="M9.2 9.2h5.6" />
      </g>
      <g v-else-if="code === 'catch_bottle'">
        <path class="glyph stroke" d="M8 3.4h8" />
        <circle class="glyph" cx="12" cy="6.4" r="1.9" />
        <path class="glyph stroke" d="M12 8.3V21" />
        <path class="glyph stroke" d="M4.6 12.2a7.4 7.4 0 0 0 14.8 0" />
        <path class="glyph stroke" d="M17.4 15.6 19.8 13.2l2.2 2.4" />
      </g>
      <g v-else-if="code === 'visits_5'">
        <path class="glyph" d="M12 5.4l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3Z" />
        <path class="glyph dim" d="M6.2 3.9l.5 1 .9.2-.7.6.2 1-.9-.4-.9.4.2-1-.7-.6 1-.2Z" />
        <path class="glyph dim" d="M17.8 3.9l.5 1 .9.2-.7.6.2 1-.9-.4-.9.4.2-1-.7-.6 1-.2Z" />
        <path class="glyph dim" d="M4.6 9.6l.4.9.8.1-.6.6.1.8-.7-.4-.7.4.1-.8-.6-.6.8-.1Z" />
        <path class="glyph dim" d="M19.4 9.6l.4.9.8.1-.6.6.1.8-.7-.4-.7.4.1-.8-.6-.6.8-.1Z" />
      </g>
      <g v-else-if="code === 'visits_30'">
        <path class="glyph" d="M20.4 14.1A8.6 8.6 0 1 1 9.9 3.6a7 7 0 1 0 10.5 10.5Z" />
        <circle class="glyph dim" cx="7.6" cy="7.2" r="0.9" />
        <circle class="glyph dim" cx="18.4" cy="7.6" r="0.7" />
        <circle class="glyph dim" cx="16.6" cy="19.6" r="0.7" />
      </g>
      <g v-else-if="code === 'pages_10'">
        <path class="glyph" d="M12 6.6c-1.8-1.4-4.4-1.8-7-1.7v13.4c2.6-.1 5.2.3 7 1.7 1.8-1.4 4.4-1.8 7-1.7V4.9c-2.6-.1-5.2.3-7 1.7Z" />
        <path class="glyph stroke" d="M12 6.6V20" />
      </g>
      <g v-else-if="code === 'pages_20'">
        <path class="glyph" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
        <circle class="glyph stroke" cx="12" cy="10" r="2.6" />
      </g>
      <g v-else>
        <circle class="glyph" cx="12" cy="12" r="4.2" />
      </g>
    </svg>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    code: string
    size?: number
    locked?: boolean
  }>(),
  { size: 48, locked: false },
);

const FRAME: Record<string, string> = {
  first_visit: "circle",
  set_nickname: "circle",
  first_message: "squircle",
  first_bottle: "squircle",
  catch_bottle: "seal",
  visits_5: "octagon",
  visits_30: "circle",
  pages_10: "squircle",
  pages_20: "circle",
};

const frame = computed(() => FRAME[props.code] ?? "circle");
</script>

<style scoped>
.badge-medal {
  --medal-size: 48px;
  position: relative;
  display: inline-grid;
  width: var(--medal-size);
  height: var(--medal-size);
  flex: 0 0 var(--medal-size);
  place-items: center;
  isolation: isolate;
}

.medal-svg {
  width: 62%;
  height: 62%;
}
.glyph {
  fill: currentColor;
}
.glyph.stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.glyph.dim {
  opacity: 0.62;
}

/* ===== 框架（每种徽章不同的边框与底色） ===== */
.badge-medal::before {
  position: absolute;
  z-index: -2;
  inset: 0;
  border-radius: inherit;
  background: var(--medal-bg, var(--c-primary-soft));
  content: "";
}
.badge-medal::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  border: 1px solid var(--medal-border, color-mix(in srgb, var(--c-primary) 32%, transparent));
  content: "";
}

.frame-circle {
  border-radius: 50%;
}
.frame-squircle {
  border-radius: 26%;
}
.frame-octagon {
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
}
.badge-medal.frame-octagon::before,
.badge-medal.frame-octagon::after {
  border-radius: 0;
}

/* seal：双层圆环 */
.frame-seal {
  border-radius: 50%;
}
.frame-seal::after {
  inset: 3px;
  border-width: 1.5px;
  border-style: dashed;
}

/* ===== 每种徽章的配色 ===== */
.medal-first_visit {
  --medal-bg: radial-gradient(circle at 32% 28%, #7aa7ff, #3f6ee8 78%);
  --medal-border: color-mix(in srgb, #9dbdff 65%, transparent);
  color: #fff;
  filter: drop-shadow(0 3px 8px rgb(75 118 232 / 45%));
}
.medal-set_nickname {
  --medal-bg: radial-gradient(circle at 32% 28%, #5ed6a6, #1f9e70 78%);
  --medal-border: color-mix(in srgb, #8ce8c2 60%, transparent);
  color: #fff;
  filter: drop-shadow(0 3px 8px rgb(31 158 112 / 45%));
}
.medal-first_message {
  --medal-bg: radial-gradient(circle at 32% 28%, #ffc878, #f09a2e 80%);
  --medal-border: color-mix(in srgb, #ffdba6 60%, transparent);
  color: #5a3a0a;
  filter: drop-shadow(0 3px 8px rgb(240 154 46 / 45%));
}
.medal-first_bottle {
  --medal-bg: radial-gradient(circle at 32% 28%, #6fb6ff, #2f7fe0 80%);
  --medal-border: color-mix(in srgb, #9ccdff 60%, transparent);
  color: #fff;
  filter: drop-shadow(0 3px 8px rgb(47 127 224 / 45%));
}
.medal-catch_bottle {
  --medal-bg: radial-gradient(circle at 32% 28%, #4dd4d2, #159aae 80%);
  --medal-border: color-mix(in srgb, #7fe5e2 60%, transparent);
  color: #063a44;
  filter: drop-shadow(0 3px 8px rgb(21 154 174 / 45%));
}
.medal-visits_5 {
  --medal-bg: linear-gradient(160deg, #b78df2, #7a4ed6 78%);
  --medal-border: color-mix(in srgb, #d3b8fb 60%, transparent);
  color: #fff;
  filter: drop-shadow(0 3px 8px rgb(122 78 214 / 45%));
}
.medal-visits_30 {
  --medal-bg: radial-gradient(circle at 32% 28%, #8d7ff0, #5142bd 82%);
  --medal-border: color-mix(in srgb, #b7adf8 60%, transparent);
  color: #e8e4ff;
  filter: drop-shadow(0 3px 8px rgb(81 66 189 / 45%));
}
.medal-pages_10 {
  --medal-bg: radial-gradient(circle at 32% 28%, #f893b4, #df4f8a 80%);
  --medal-border: color-mix(in srgb, #ffb8cf 60%, transparent);
  color: #fff;
  filter: drop-shadow(0 3px 8px rgb(223 79 138 / 45%));
}
.medal-pages_20 {
  --medal-bg: radial-gradient(circle at 32% 28%, #86d477, #3da64a 82%);
  --medal-border: color-mix(in srgb, #b0ec9c 60%, transparent);
  color: #0d3d15;
  filter: drop-shadow(0 3px 8px rgb(61 166 74 / 45%));
}

/* ===== 未点亮 ===== */
.badge-medal.locked {
  --medal-bg: var(--c-bg-2);
  --medal-border: color-mix(in srgb, var(--border) 85%, transparent);
  color: var(--c-text-3);
  filter: none;
  opacity: 0.72;
}
.badge-medal.locked .medal-svg {
  opacity: 0.75;
}

@media (prefers-reduced-motion: reduce) {
  .badge-medal {
    transition: none;
  }
}
</style>
