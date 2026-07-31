<template>
  <section class="content-hero" :class="`hero-${variant}`">
    <div class="hero-copy">
      <span class="hero-eyebrow"><i />{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>

    <div class="hero-visual" aria-hidden="true">
      <span class="visual-ring ring-outer"><i /><i /></span>
      <span class="visual-ring ring-inner"><i /></span>
      <span class="visual-core"><Icon :name="icon" /></span>
      <span v-if="variant === 'archive'" class="visual-trail trail-one" />
      <span v-if="variant === 'archive'" class="visual-trail trail-two" />
      <span v-if="variant === 'category'" class="visual-tile tile-one"><Icon name="ph:folder-open-bold" /></span>
      <span v-if="variant === 'category'" class="visual-tile tile-two"><Icon name="ph:article-bold" /></span>
      <span v-if="variant === 'tags'" class="visual-tag tag-one">#</span>
      <span v-if="variant === 'tags'" class="visual-tag tag-two">#</span>
      <span v-if="variant === 'friends'" class="visual-node node-one"><Icon name="ph:user-bold" /></span>
      <span v-if="variant === 'friends'" class="visual-node node-two"><Icon name="ph:user-bold" /></span>
      <template v-if="variant === 'albums'">
        <span class="visual-shutter shutter-one" /><span class="visual-shutter shutter-two" /><span class="visual-shutter shutter-three" />
      </template>
      <template v-if="variant === 'library'">
        <span class="visual-tile tile-one"><Icon name="ph:book-open-text-bold" /></span>
        <span class="visual-tile tile-two"><Icon name="ph:film-strip-bold" /></span>
      </template>
      <template v-if="variant === 'moments'">
        <span class="visual-spark spark-one"><Icon name="ph:sparkle-fill" /></span>
        <span class="visual-spark spark-two"><Icon name="ph:star-four-fill" /></span>
        <span class="visual-spark spark-three"><Icon name="ph:circle-fill" /></span>
      </template>
      <template v-if="variant === 'journeys'">
        <span class="route-line" /><span class="route-dot route-start" /><span class="route-dot route-end" />
      </template>
      <template v-if="variant === 'stories'">
        <span class="visual-chapter chapter-one">01</span><span class="visual-chapter chapter-two">02</span>
      </template>
    </div>

    <div v-if="metric !== undefined" class="hero-metric">
      <strong>{{ metric }}</strong><span>{{ metricLabel }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow: string
  title: string
  description: string
  icon: string
  metric?: string | number
  metricLabel?: string
  variant?: 'archive' | 'category' | 'tags' | 'friends' | 'albums' | 'library' | 'moments' | 'journeys' | 'stories'
}>(), {
  metricLabel: '',
  variant: 'archive',
})
</script>

<style scoped>
.content-hero {
  position: relative;
  display: flex;
  min-height: 190px;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 24px;
  padding: 32px 36px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: var(--ui-radius-hero);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--c-primary-soft) 52%, var(--ld-bg-card)), var(--ld-bg-card) 64%);
  box-shadow: var(--ui-shadow-panel);
  isolation: isolate;
}
.content-hero::before { position:absolute; top:28px; bottom:28px; left:0; width:3px; border-radius:0 3px 3px 0; background:linear-gradient(var(--c-primary),transparent); content:''; }
.content-hero::after { position:absolute; z-index:-1; right:-70px; bottom:-155px; width:340px; height:340px; border:1px solid color-mix(in srgb,var(--c-primary) 10%,transparent); border-radius:50%; content:''; }
.hero-copy { position:relative; z-index:2; max-width:610px; }
.hero-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--c-primary); font-size:.54rem; font-weight:750; letter-spacing:.18em; }
.hero-eyebrow i { width:6px; height:6px; border-radius:50%; background:var(--c-primary); box-shadow:0 0 0 4px var(--c-primary-soft); animation:hero-signal 2.8s ease-in-out infinite; }
.hero-copy h1 { margin:0; color:var(--c-text); font-family:var(--font-heading); font-size:clamp(1.75rem,3vw,2.45rem); line-height:1.25; }
.hero-copy p { max-width:560px; margin:13px 0 0; color:var(--c-text-2); font-size:.76rem; line-height:1.85; }
.hero-metric { position:relative; z-index:3; display:flex; min-width:100px; flex-direction:column; align-items:flex-end; padding-left:24px; border-left:1px solid color-mix(in srgb,var(--border) 75%,transparent); }
.hero-metric strong { color:var(--c-primary); font-family:var(--font-heading); font-size:2.35rem; font-variant-numeric:tabular-nums; line-height:1; }
.hero-metric span { margin-top:7px; color:var(--c-text-3); font-size:.54rem; letter-spacing:.12em; }

.hero-visual { position:absolute; z-index:1; top:50%; right:105px; width:150px; height:150px; color:var(--c-primary); opacity:.48; pointer-events:none; transform:translateY(-50%); }
.visual-ring { position:absolute; border:1px solid color-mix(in srgb,var(--c-primary) 34%,transparent); border-radius:50%; }
.visual-ring>i { position:absolute; width:7px; height:7px; border:2px solid var(--ld-bg-card); border-radius:50%; background:var(--c-primary); box-shadow:0 0 12px color-mix(in srgb,var(--c-primary) 65%,transparent); }
.ring-outer { inset:5px; animation:hero-orbit 18s linear infinite; }
.ring-outer>i:first-child { top:9px; right:22px; }
.ring-outer>i:last-child { right:-4px; bottom:42px; background:var(--ui-accent-warm); }
.ring-inner { inset:30px; border-style:dashed; animation:hero-orbit 13s linear infinite reverse; }
.ring-inner>i { bottom:-4px; left:22px; }
.visual-core { --core-rotation:0deg; position:absolute; inset:48px; display:grid; border:1px solid color-mix(in srgb,var(--c-primary) 28%,var(--border)); border-radius:12px; background:color-mix(in srgb,var(--ld-bg-card) 82%,transparent); box-shadow:0 8px 24px color-mix(in srgb,var(--ld-shadow) 38%,transparent); font-size:1.35rem; place-items:center; animation:hero-float 4.6s ease-in-out infinite; }

.hero-archive .visual-core { border-radius:50%; }
.visual-trail { position:absolute; left:18px; width:110px; height:1px; background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--c-primary) 55%,transparent),transparent); transform:rotate(-14deg); animation:timeline-pass 4.8s ease-in-out infinite; }
.trail-one { top:52px; }.trail-two { top:94px; animation-delay:-2.1s; }
.hero-category .visual-ring { border-radius:18px; transform:rotate(12deg); }
.visual-tile { position:absolute; display:grid; width:28px; height:28px; border:1px solid var(--border); border-radius:9px; background:var(--ld-bg-card); box-shadow:0 7px 18px color-mix(in srgb,var(--ld-shadow) 42%,transparent); place-items:center; animation:tile-drift 5s ease-in-out infinite; }
.tile-one { top:15px; right:13px; }.tile-two { bottom:12px; left:8px; animation-delay:-2.4s; }
.hero-tags .ring-outer { transform:scaleX(1.15) rotate(-10deg); }.hero-tags .ring-inner { transform:scaleX(1.28) rotate(14deg); }
.visual-tag { position:absolute; display:grid; width:27px; height:27px; border:1px solid color-mix(in srgb,var(--c-primary) 25%,var(--border)); border-radius:9px; background:var(--ld-bg-card); font-weight:800; place-items:center; animation:tag-drift 4.4s ease-in-out infinite; }
.tag-one { top:12px; left:23px; }.tag-two { right:8px; bottom:22px; color:var(--ui-accent-warm); animation-delay:-2s; }
.hero-friends .ring-outer { border-style:dashed; }.hero-friends .visual-core { border-radius:50%; }
.visual-node { position:absolute; display:grid; width:25px; height:25px; border:1px solid color-mix(in srgb,var(--c-primary) 34%,var(--border)); border-radius:50%; background:var(--ld-bg-card); font-size:.72rem; place-items:center; animation:node-pulse 3.8s ease-in-out infinite; }
.node-one { top:12px; left:18px; }.node-two { right:5px; bottom:28px; color:var(--ui-accent-warm); animation-delay:-1.9s; }
.hero-albums .visual-core { border-radius:50%; }.hero-albums .ring-inner { border-style:solid; }
.visual-shutter { position:absolute; top:50%; left:50%; width:42px; height:1px; background:color-mix(in srgb,var(--c-primary) 48%,transparent); transform-origin:left center; animation:shutter-turn 9s linear infinite; }
.shutter-one { transform:rotate(0deg); }.shutter-two { transform:rotate(120deg); }.shutter-three { transform:rotate(240deg); }
.hero-library .ring-outer { border-radius:42% 58% 45% 55%; }.hero-library .visual-core { --core-rotation:-4deg; }
.hero-moments .visual-ring { border-style:dotted; }.hero-moments .visual-core { border:0; background:var(--c-primary-soft); }
.visual-spark { position:absolute; display:grid; color:var(--c-primary); animation:spark-breathe 3.4s ease-in-out infinite; place-items:center; }.spark-one { top:12px; right:25px; font-size:1rem; }.spark-two { bottom:22px; left:11px; color:var(--ui-accent-warm); font-size:.76rem; animation-delay:-1.2s; }.spark-three { top:35px; left:14px; font-size:.35rem; animation-delay:-2.1s; }
.hero-journeys .visual-ring { border-style:dashed; transform:rotate(-12deg) scaleY(.72); }.hero-journeys .visual-core { --core-rotation:-45deg; border-radius:50% 50% 50% 8px; }.hero-journeys .visual-core :deep(svg) { transform:rotate(45deg); }
.route-line { position:absolute; top:80px; left:8px; width:134px; height:34px; border-top:1px dashed color-mix(in srgb,var(--c-primary) 48%,transparent); border-radius:50%; transform:rotate(13deg); animation:route-drift 5s ease-in-out infinite; }.route-dot { position:absolute; width:7px; height:7px; border:2px solid var(--ld-bg-card); border-radius:50%; background:var(--c-primary); box-shadow:0 0 12px color-mix(in srgb,var(--c-primary) 50%,transparent); }.route-start { top:81px; left:10px; }.route-end { right:9px; bottom:28px; background:var(--ui-accent-warm); }
.hero-stories .ring-inner { border-style:dashed; }.hero-stories .visual-core { border-radius:50%; }.visual-chapter { position:absolute; display:grid; width:30px; height:24px; border:1px solid var(--border); border-radius:7px; background:var(--ld-bg-card); color:var(--c-text-3); font-family:var(--font-mono); font-size:.46rem; box-shadow:0 6px 16px color-mix(in srgb,var(--ld-shadow) 35%,transparent); place-items:center; animation:chapter-float 4.8s ease-in-out infinite; }.chapter-one { top:9px; left:14px; }.chapter-two { right:3px; bottom:25px; color:var(--ui-accent-warm); animation-delay:-2.4s; }

@keyframes hero-orbit { to { transform:rotate(360deg); } }
@keyframes hero-float { 0%,100% { transform:translateY(0) rotate(var(--core-rotation)); } 50% { transform:translateY(-5px) rotate(var(--core-rotation)); } }
@keyframes hero-signal { 50% { box-shadow:0 0 0 7px color-mix(in srgb,var(--c-primary-soft) 55%,transparent); } }
@keyframes timeline-pass { 0%,100% { opacity:.15; transform:translateX(-10px) rotate(-14deg); } 50% { opacity:.8; transform:translateX(10px) rotate(-14deg); } }
@keyframes tile-drift { 50% { transform:translate3d(5px,-6px,0) rotate(4deg); } }
@keyframes tag-drift { 50% { transform:translate3d(-4px,6px,0) rotate(-6deg); } }
@keyframes node-pulse { 50% { box-shadow:0 0 0 7px color-mix(in srgb,var(--c-primary-soft) 42%,transparent); transform:scale(1.08); } }
@keyframes shutter-turn { to { rotate:360deg; } }
@keyframes spark-breathe { 50% { opacity:.35; transform:translateY(-5px) scale(.82) rotate(12deg); } }
@keyframes route-drift { 50% { transform:translateY(-5px) rotate(13deg); } }
@keyframes chapter-float { 50% { transform:translate3d(4px,-6px,0) rotate(3deg); } }

@media (max-width:640px) {
  .content-hero { min-height:170px; align-items:flex-start; padding:26px 21px; }
  .hero-copy { max-width:78%; }
  .hero-copy h1 { font-size:1.75rem; }
  .hero-copy p { font-size:.71rem; }
  .hero-metric { min-width:auto; padding-left:12px; }
  .hero-metric strong { font-size:1.65rem; }
  .hero-metric span { max-width:48px; text-align:right; }
  .hero-visual { right:20px; width:112px; height:112px; opacity:.22; }
  .ring-inner { inset:23px; }.visual-core { inset:37px; }
}
@media (prefers-reduced-motion:reduce) { .content-hero * { animation:none!important; } }
</style>
