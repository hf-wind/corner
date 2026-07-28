<template>
  <section class="content-hero">
    <div class="hero-glow" aria-hidden="true" />
    <div class="hero-copy">
      <span class="hero-eyebrow"><i />{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="hero-mark" aria-hidden="true"><Icon :name="icon" /></div>
    <div v-if="metric !== undefined" class="hero-metric">
      <strong>{{ metric }}</strong><span>{{ metricLabel }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
  icon: string
  metric?: string | number
  metricLabel?: string
}>()
</script>

<style scoped>
.content-hero { position:relative; display:flex; min-height:190px; align-items:center; justify-content:space-between; gap:30px; margin-bottom:24px; padding:32px 36px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:18px; background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary-soft) 52%,var(--ld-bg-card)),var(--ld-bg-card) 64%); box-shadow:0 8px 30px color-mix(in srgb,var(--ld-shadow) 32%,transparent); }
.content-hero::before { position:absolute; top:28px; bottom:28px; left:0; width:3px; border-radius:0 3px 3px 0; background:linear-gradient(var(--c-primary),transparent); content:''; }
.hero-glow { position:absolute; top:-120px; right:-70px; width:290px; height:290px; border-radius:50%; background:radial-gradient(circle,color-mix(in srgb,var(--c-primary) 13%,transparent),transparent 70%); pointer-events:none; }
.hero-copy { position:relative; z-index:1; max-width:610px; }.hero-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--c-primary); font-size:.54rem; font-weight:750; letter-spacing:.18em; }.hero-eyebrow i { width:6px; height:6px; border-radius:50%; background:var(--c-primary); box-shadow:0 0 0 4px var(--c-primary-soft); }
.hero-copy h1 { margin:0; color:var(--c-text); font-family:var(--font-heading); font-size:clamp(1.75rem,3vw,2.45rem); line-height:1.25; }.hero-copy p { max-width:560px; margin:13px 0 0; color:var(--c-text-2); font-size:.76rem; line-height:1.85; }
.hero-mark { position:absolute; right:95px; bottom:-28px; color:var(--c-primary); font-size:8rem; opacity:.055; transform:rotate(-8deg); }
.hero-metric { position:relative; z-index:1; display:flex; min-width:100px; flex-direction:column; align-items:flex-end; padding-left:24px; border-left:1px solid color-mix(in srgb,var(--border) 75%,transparent); }.hero-metric strong { color:var(--c-primary); font-family:var(--font-heading); font-size:2.35rem; font-variant-numeric:tabular-nums; line-height:1; }.hero-metric span { margin-top:7px; color:var(--c-text-3); font-size:.54rem; letter-spacing:.12em; }
@media (max-width:640px) { .content-hero { min-height:170px; align-items:flex-start; padding:26px 21px; }.hero-copy h1 { font-size:1.75rem; }.hero-copy p { font-size:.71rem; }.hero-metric { min-width:auto; padding-left:12px; }.hero-metric strong { font-size:1.65rem; }.hero-metric span { max-width:48px; text-align:right; }.hero-mark { right:28px; font-size:6rem; } }
</style>
