<template>
  <div class="ui-loading" :class="[`ui-loading--${variant}`, { 'is-inline': inline, 'is-fullscreen': fullscreen }]" role="status" aria-live="polite">
    <div v-if="variant === 'welcome'" class="welcome-loading">
      <header><span><img src="/logo.png" alt="" width="30" height="30" /><b>WIND CORNER<small>WELCOME SYSTEM</small></b></span><strong>正在进入</strong></header>
      <div class="welcome-loading__track"><i /></div>
      <footer><span><i />{{ text || '正在同步首页内容与时光轨道' }}</span><small>请稍候</small></footer>
    </div>
    <span class="ui-loading__orbit" aria-hidden="true"><i /><i /><i /></span>
    <strong v-if="title">{{ title }}</strong>
    <small v-if="text">{{ text }}</small>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  text?: string
  variant?: 'default' | 'space' | 'welcome'
  inline?: boolean
  fullscreen?: boolean
}>(), { variant: 'default', inline: false, fullscreen: false })
</script>

<style scoped>
.ui-loading { display: grid; min-height: 180px; align-content: center; justify-items: center; gap: 10px; color: var(--c-text-2); text-align: center; }
.ui-loading.is-fullscreen { position: absolute; z-index: 20; inset: 0; width: 100%; height: 100%; min-height: 0; background: color-mix(in srgb, var(--c-bg) 72%, transparent); backdrop-filter: blur(10px); }
.ui-loading--space.is-fullscreen { background: rgb(3 7 18 / 82%); }
.ui-loading--welcome.is-fullscreen { background: var(--c-bg); }
.ui-loading--welcome > .ui-loading__orbit, .ui-loading--welcome > strong, .ui-loading--welcome > small { display: none; }
.welcome-loading { width: min(420px, calc(100vw - 44px)); padding: 21px 22px 18px; border: 1px solid color-mix(in srgb, var(--border) 78%, var(--c-primary)); border-radius: 14px; background: color-mix(in srgb, var(--c-bg-1) 92%, transparent); box-shadow: 0 22px 58px color-mix(in srgb, var(--ld-shadow) 22%, transparent); text-align: left; }
.welcome-loading header, .welcome-loading footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.welcome-loading header > span { display: inline-flex; align-items: center; gap: 9px; }
.welcome-loading header img { border-radius: 9px; }
.welcome-loading header b { display: grid; color: var(--c-text); font-size: .7rem; letter-spacing: .08em; }
.welcome-loading header b small { margin-top: 2px; color: var(--c-text-3); font-size: .42rem; font-weight: 500; letter-spacing: .16em; }
.welcome-loading header > strong { color: var(--c-primary); font: 700 1rem var(--font-mono); }
.welcome-loading header > strong small { font-size: .5rem; }
.welcome-loading__track { position: relative; height: 4px; margin: 22px 0 14px; overflow: hidden; border-radius: 99px; background: var(--c-bg-2); }
.welcome-loading__track i { position: absolute; inset: 0 auto 0 0; width: 42%; border-radius: inherit; background: linear-gradient(90deg, transparent, var(--c-primary), transparent); animation: welcome-loading-sweep 1.6s ease-in-out infinite; }
.welcome-loading footer { color: var(--c-text-2); font-size: .56rem; }
.welcome-loading footer span { display: inline-flex; align-items: center; gap: 6px; }
.welcome-loading footer span > i { width: 5px; height: 5px; border-radius: 50%; background: var(--c-primary); box-shadow: 0 0 0 4px var(--c-primary-soft); }
.welcome-loading footer small { color: var(--c-text-3); font-size: .52rem; }
@keyframes welcome-loading-sweep { from { transform: translateX(-120%); } to { transform: translateX(290%); } }
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
