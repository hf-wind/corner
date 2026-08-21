<template>
  <div class="ui-loading" :class="[`ui-loading--${variant}`, { 'is-inline': inline, 'is-fullscreen': fullscreen }]" role="status" aria-live="polite">
    <span class="ui-loading__orbit" aria-hidden="true"><i /><i /><i /></span>
    <strong v-if="title">{{ title }}</strong>
    <small v-if="text">{{ text }}</small>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  text?: string
  variant?: 'default' | 'space'
  inline?: boolean
  fullscreen?: boolean
}>(), { variant: 'default', inline: false, fullscreen: false })
</script>

<style scoped>
.ui-loading { display: grid; min-height: 180px; align-content: center; justify-items: center; gap: 10px; color: var(--c-text-2); text-align: center; }
.ui-loading.is-fullscreen { position: absolute; z-index: 20; inset: 0; width: 100%; height: 100%; min-height: 0; background: color-mix(in srgb, var(--c-bg) 72%, transparent); backdrop-filter: blur(10px); }
.ui-loading--space.is-fullscreen { background: rgb(3 7 18 / 82%); }
.ui-loading.is-inline { display: inline-grid; min-height: 0; }
.ui-loading--space { --loading-accent: #9ed7ff; color: #c7d8ed; }
.ui-loading__orbit { position: relative; display: block; width: 44px; height: 44px; border: 1px solid color-mix(in srgb, var(--loading-accent, var(--c-primary)) 36%, transparent); border-radius: 50%; animation: loading-spin 2.4s linear infinite; }
.ui-loading__orbit::before, .ui-loading__orbit::after { position: absolute; inset: 7px; border: 1px dashed color-mix(in srgb, var(--loading-accent, var(--c-primary)) 28%, transparent); border-radius: 50%; content: ''; }
.ui-loading__orbit::after { inset: 15px; border-style: solid; opacity: .66; }
.ui-loading__orbit i { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--loading-accent, var(--c-primary)); box-shadow: 0 0 12px color-mix(in srgb, var(--loading-accent, var(--c-primary)) 70%, transparent); }
.ui-loading__orbit i:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.ui-loading__orbit i:nth-child(2) { right: 3px; bottom: 8px; }
.ui-loading__orbit i:nth-child(3) { bottom: 4px; left: 6px; }
.ui-loading strong { color: currentColor; font-size: .72rem; font-weight: 650; }
.ui-loading small { color: color-mix(in srgb, currentColor 72%, transparent); font-size: .6rem; }
@keyframes loading-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ui-loading__orbit { animation: none; } }
</style>
