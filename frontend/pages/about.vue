<template>
  <div class="about-shell">
    <main ref="aboutPage" class="about-scroll">
      <div class="about-page">
        <header class="profile-hero">
          <div class="hero-copy hero-reveal">
            <p class="eyebrow"><span>ABOUT / 01</span><i></i><span>PERSONAL ARCHIVE</span></p>
            <p class="hero-role">{{ profile.role }}</p>
            <h1>{{ profile.name }}<span class="hero-period">.</span></h1>
            <p class="hero-badge">{{ profile.badge }}</p>
            <blockquote>“{{ profile.motto }}”</blockquote>
            <div class="hero-meta">
              <span><Icon name="ph:map-pin-bold" />{{ profile.location }}</span>
              <span><i class="status-dot"></i>{{ profile.availability }}</span>
            </div>
            <div v-if="profile.socialLinks.length" class="social-row">
              <a v-for="link in profile.socialLinks" :key="`${link.label}-${link.url}`" :href="safeUrl(link.url)"
                :title="link.label" :aria-label="link.label" :target="isExternalLink(link.url) ? '_blank' : undefined"
                :rel="isExternalLink(link.url) ? 'noopener noreferrer' : undefined">
                <Icon :name="link.icon || 'ph:link-bold'" />
              </a>
            </div>
          </div>
          <div class="hero-portrait hero-reveal">
            <div class="portrait-backdrop" aria-hidden="true"><span>风</span><span>隅</span></div>
            <div class="portrait-frame">
              <img :src="avatarSrc" :alt="`${profile.name}的头像`" class="portrait">
              <span class="portrait-stamp"><i></i> CURRENTLY HERE</span>
            </div>
          </div>
          <div class="hero-scroll-cue"><span>SCROLL TO EXPLORE</span><i></i></div>
        </header>

        <section class="intro-section reveal-block">
          <div class="section-label"><span>02</span><small>A BRIEF ACCOUNT</small></div>
          <div class="intro-layout">
            <h2>{{ profile.sectionTitles.introduction }}</h2>
            <div class="intro-copy"><p v-for="paragraph in introductionParagraphs" :key="paragraph">{{ paragraph }}</p></div>
          </div>
        </section>

        <section v-if="profile.notes.length" class="notes-section reveal-block">
          <div class="section-heading"><div class="section-label"><span>03</span><small>NOTES FROM THE CORNER</small></div><h2>{{ profile.sectionTitles.notes }}</h2></div>
          <div class="notes-grid">
            <article v-for="(note, index) in profile.notes" :key="`${note.title}-${index}`" class="note-item">
              <div class="note-top"><span class="note-number">0{{ index + 1 }}</span><Icon :name="note.icon || 'ph:leaf-bold'" /></div>
              <small>{{ note.subtitle }}</small><h3>{{ note.title }}</h3><p>{{ note.content }}</p>
            </article>
          </div>
        </section>

        <section v-if="profile.skills.length" class="skills-section reveal-block">
          <div class="section-heading"><div class="section-label"><span>04</span><small>WHAT I KEEP LEARNING</small></div><h2>{{ profile.sectionTitles.skills }}</h2></div>
          <div class="skills-list">
            <a v-for="(skill, index) in profile.skills" :key="`${skill.name}-${index}`" class="skill-item"
              :href="skill.url ? safeUrl(skill.url) : undefined" :target="skill.url && isExternalLink(skill.url) ? '_blank' : undefined"
              :rel="skill.url && isExternalLink(skill.url) ? 'noopener noreferrer' : undefined" :class="{ 'is-linked': !!skill.url }">
              <span class="skill-index">0{{ index + 1 }}</span><div><h3>{{ skill.name }}</h3><p>{{ skill.description }}</p></div>
              <Icon v-if="skill.url" name="ph:arrow-up-right-bold" />
            </a>
          </div>
        </section>

        <section class="journey-section reveal-block">
          <div class="journey-heading"><div class="section-label"><span>05</span><small>ON THE WAY</small></div><h2>{{ profile.sectionTitles.timeline }}</h2><p>没有既定路线，只有下一件想做好的事。</p></div>
          <ol class="journey-list">
            <li v-for="(item, index) in profile.timeline" :key="`${item.year}-${item.title}`">
              <div class="journey-year"><span>0{{ index + 1 }}</span><time>{{ item.year }}</time></div>
              <div><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div>
            </li>
          </ol>
        </section>

        <section v-if="profile.values" class="values-section reveal-block">
          <div class="section-label"><span>06</span><small>THE THINGS THAT MATTER</small></div>
          <div class="values-layout"><h2>{{ profile.sectionTitles.values }}</h2><div class="values-copy"><p v-for="(paragraph, i) in valuesParagraphs" :key="i">{{ paragraph }}</p></div></div>
        </section>

        <section v-if="profile.facts.length" class="facts-section reveal-block">
          <div class="section-label"><span>07</span><small>A FEW SMALL FACTS</small></div>
          <div class="facts-layout"><h2>{{ profile.sectionTitles.facts }}</h2><dl class="facts-grid"><div v-for="fact in profile.facts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div></dl></div>
        </section>

        <footer class="about-footer reveal-block"><div class="footer-brand"><img src="/logo.svg" alt="风隅随笔"><div><strong>风隅随笔</strong><span>{{ siteYearLabel }} · WIND CORNER NOTES</span></div></div><div class="footer-signature"><span>{{ profile.motto }}</span><strong>{{ profile.name }}</strong></div></footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import avatarFallback from '@/assets/images/avatar.jpg'
import { normalizeAboutProfile } from '@/types/about'

const api = useApi()
const { mediaUrl } = useMediaUrl()
const profile = ref(normalizeAboutProfile(null))
const aboutPage = ref<HTMLElement | null>(null)
const currentYear = new Date().getFullYear()
const siteYearLabel = currentYear === 2026 ? '2026' : `2026 - ${currentYear}`
let revealObserver: IntersectionObserver | null = null
let revealFrame = 0

const avatarSrc = computed(() => profile.value.avatarUrl ? mediaUrl(profile.value.avatarUrl) : avatarFallback)
const introductionParagraphs = computed(() => profile.value.introduction.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean))
const valuesParagraphs = computed(() => profile.value.values.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean))

function isExternalLink(url: string) { return /^https?:\/\//i.test(url) }
function safeUrl(url: string) { const trimmed = url.trim(); return /^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed) ? trimmed : '#' }

function revealPassedSections() {
  const scroller = aboutPage.value
  if (!scroller) return
  const rootBottom = scroller.getBoundingClientRect().bottom
  scroller.querySelectorAll<HTMLElement>('.reveal-block:not(.is-visible)').forEach((block) => {
    if (block.getBoundingClientRect().top >= rootBottom) return
    block.classList.add('is-visible')
    revealObserver?.unobserve(block)
  })
}

function handleAboutScroll() {
  if (revealFrame) return
  revealFrame = requestAnimationFrame(() => {
    revealFrame = 0
    revealPassedSections()
  })
}

function observeSections() {
  revealObserver?.disconnect()
  const blocks = aboutPage.value?.querySelectorAll<HTMLElement>('.reveal-block')
  if (!blocks?.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { blocks?.forEach((block) => block.classList.add('is-visible')); return }
  revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return
    entry.target.classList.add('is-visible')
    revealObserver?.unobserve(entry.target)
  }), { root: aboutPage.value, threshold: 0.12, rootMargin: '-5% 0px -5% 0px' })
  blocks.forEach((block) => revealObserver?.observe(block))
  revealPassedSections()
}

onMounted(async () => {
  await nextTick()
  aboutPage.value?.addEventListener('scroll', handleAboutScroll, { passive: true })
  observeSections()
  void api.get('/settings/about_profile').then(async (value) => {
    profile.value = normalizeAboutProfile(value)
    await nextTick()
    observeSections()
  }).catch(() => { })
})
onUnmounted(() => {
  revealObserver?.disconnect()
  aboutPage.value?.removeEventListener('scroll', handleAboutScroll)
  if (revealFrame) cancelAnimationFrame(revealFrame)
})
useHead(() => ({ title: `关于我 - ${profile.value.name}`, meta: [{ name: 'description', content: profile.value.motto }] }))
</script>

<style scoped>
.about-shell { width: 100%; min-width: 0; height: 100%; background: var(--c-bg); }
.about-scroll { width: 100%; height: 100%; overflow-y: auto; overscroll-behavior: none; scrollbar-gutter: stable; }
.about-page { width: min(1160px, calc(100% - 96px)); margin: 0 auto; padding: 32px 0 70px; }
.profile-hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(350px, 46%); gap: clamp(40px, 8vw, 120px); align-items: center; min-height: min(720px, calc(100vh - 90px)); padding: 44px 0 92px; }
.hero-copy { position: relative; z-index: 2; }.eyebrow, .section-label { display: flex; align-items: center; gap: 11px; color: var(--c-text-3); font: .6rem var(--font-mono); letter-spacing: .14em; text-transform: uppercase; }.eyebrow i { width: 32px; height: 1px; background: var(--c-primary); }
.hero-role { margin: 78px 0 12px; color: var(--c-text-3); font: .75rem var(--font-mono); letter-spacing: .08em; }.hero-copy h1 { margin: 0; color: var(--c-text); font-size: clamp(4.4rem, 9vw, 8.4rem); font-weight: 680; line-height: .92; letter-spacing: 0; }.hero-period { color: var(--c-primary); }.hero-badge { margin: 25px 0 0; color: var(--c-primary); font: .72rem var(--font-mono); letter-spacing: .1em; }.hero-copy blockquote { max-width: 390px; margin: 34px 0 0; color: var(--c-text-1); font: 1.2rem/1.8 var(--font-heading); }
.hero-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 26px; color: var(--c-text-3); font-size: .72rem; }.hero-meta span { display: inline-flex; align-items: center; gap: 6px; }.status-dot, .portrait-stamp i { width: 7px; height: 7px; border-radius: 50%; background: #57d7a0; box-shadow: 0 0 0 4px color-mix(in srgb, #57d7a0 15%, transparent); }.social-row { display: flex; gap: 8px; margin-top: 30px; }.social-row a { display: grid; width: 38px; height: 38px; border: 1px solid var(--border); border-radius: 50%; color: var(--c-text-2); place-items: center; transition: color .35s, background .35s, transform .5s cubic-bezier(.16,1,.3,1); }.social-row a:hover { background: var(--c-primary); color: var(--c-bg); transform: translateY(-4px) rotate(-8deg); }
.hero-portrait { position: relative; display: grid; justify-items: center; align-content: center; min-height: 540px; }.portrait-backdrop { position: absolute; inset: 0 3% 3% 7%; display: flex; justify-content: space-around; overflow: hidden; background: var(--c-primary-soft); color: color-mix(in srgb, var(--c-primary) 25%, transparent); font-family: var(--font-brand); font-size: clamp(7rem, 18vw, 14rem); line-height: .8; writing-mode: vertical-rl; }.portrait-backdrop span:first-child { transform: translateY(-16%); }.portrait-backdrop span:last-child { transform: translateY(16%); }.portrait-frame { position: relative; z-index: 1; width: min(390px, 80%); aspect-ratio: .82; padding: 12px; background: var(--c-bg); box-shadow: 24px 24px 0 color-mix(in srgb, var(--c-primary) 38%, transparent); transform: rotate(3deg); transition: transform .7s cubic-bezier(.16,1,.3,1), box-shadow .7s; }.hero-portrait:hover .portrait-frame { transform: rotate(0) translateY(-8px); box-shadow: 15px 20px 0 color-mix(in srgb, var(--c-primary) 50%, transparent); }.portrait { width: 100%; height: 100%; object-fit: cover; filter: saturate(.85) contrast(1.03); }.portrait-stamp { position: absolute; right: -28px; bottom: 20px; display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px; background: var(--c-text); color: var(--c-bg); font: .52rem var(--font-mono); letter-spacing: .08em; transform: rotate(-3deg); }.hero-scroll-cue { position: absolute; bottom: 28px; left: 0; display: flex; align-items: center; gap: 12px; color: var(--c-text-3); font: .57rem var(--font-mono); letter-spacing: .14em; }.hero-scroll-cue i { display: block; width: 58px; height: 1px; background: var(--c-primary); animation: cue-slide 2.4s ease-in-out infinite; transform-origin: left; }
.section-label span { color: var(--c-primary); font-size: .72rem; }.section-label small { line-height: 1.45; }.intro-section, .notes-section, .skills-section, .journey-section, .values-section, .facts-section { padding: 105px 0; border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent); }.intro-layout, .values-layout, .facts-layout { display: grid; grid-template-columns: minmax(180px, 30%) minmax(0, 1fr); gap: 55px; margin-top: 44px; }.intro-layout h2, .values-layout h2, .facts-layout h2, .section-heading h2 { margin: 0; color: var(--c-text); font-family: var(--font-heading); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 600; line-height: 1.15; }.intro-copy { max-width: 670px; color: var(--c-text-2); font-size: .95rem; line-height: 2.1; }.intro-copy p { margin: 0; }.intro-copy p + p { margin-top: 22px; }.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 44px; }.section-heading .section-label { align-self: start; }
.notes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }.note-item { min-height: 285px; padding: 28px 25px 25px; background: var(--c-bg-1); transition: transform .6s cubic-bezier(.16,1,.3,1), background .35s; }.note-item:nth-child(2) { transform: translateY(28px); background: var(--c-primary-soft); }.note-item:hover { transform: translateY(-7px); background: var(--c-primary-soft); }.note-item:nth-child(2):hover { transform: translateY(18px); }.note-top { display: flex; justify-content: space-between; color: var(--c-primary); font-size: 1.3rem; }.note-number { font: .66rem var(--font-mono); }.note-item small { display: block; margin-top: 46px; color: var(--c-primary); font: .56rem var(--font-mono); letter-spacing: .12em; }.note-item h3 { margin: 8px 0 0; color: var(--c-text); font-size: 1.15rem; }.note-item p { margin: 16px 0 0; color: var(--c-text-2); font-size: .8rem; line-height: 1.85; }
.skills-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 52px; }.skill-item { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 16px; align-items: start; padding: 23px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none; transition: padding .45s, color .35s; }.skill-item:hover { padding-left: 10px; color: var(--c-primary); }.skill-index { padding-top: 3px; color: var(--c-primary); font: .62rem var(--font-mono); }.skill-item h3 { margin: 0; color: var(--c-text); font-size: .96rem; }.skill-item p { margin: 7px 0 0; color: var(--c-text-2); font-size: .77rem; line-height: 1.7; }.skill-item > :deep(svg) { margin-top: 4px; color: var(--c-primary); opacity: 0; transition: opacity .35s, transform .45s; }.skill-item:hover > :deep(svg) { opacity: 1; transform: translate(3px, -3px); }
.journey-section { background: color-mix(in srgb, var(--c-bg-1) 88%, var(--c-primary) 12%); color: var(--c-text); padding-inline: clamp(24px, 6vw, 88px); border-block: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border)); }.journey-section .section-label, .journey-section p { color: var(--c-text-2); }.journey-section .section-label span { color: var(--c-primary); }.journey-heading { display: grid; grid-template-columns: 30% 1fr; gap: 55px; align-items: end; }.journey-heading h2 { margin: 0; color: var(--c-text); font: 600 clamp(2rem, 4vw, 3.5rem)/1.15 var(--font-heading); }.journey-heading p { grid-column: 2; margin: -27px 0 0; font-size: .8rem; }.journey-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin: 75px 0 0; padding: 0; list-style: none; }.journey-list li { position: relative; padding: 0 20px 0 0; }.journey-list li:not(:last-child)::after { position: absolute; top: 5px; right: 20px; width: 1px; height: 100px; background: color-mix(in srgb, var(--c-primary) 22%, var(--border)); content: ''; }.journey-year { display: flex; flex-direction: column; gap: 24px; color: var(--c-primary); font: .7rem var(--font-mono); }.journey-year span { color: var(--c-text-3); }.journey-list h3 { margin: 36px 0 8px; color: var(--c-text); font-size: .95rem; }.journey-list p { margin: 0; padding-right: 28px; font-size: .75rem; line-height: 1.8; }
.values-section { background: var(--c-primary-soft); padding-inline: clamp(24px, 6vw, 88px); }.values-copy { max-width: 680px; color: var(--c-text-2); font-size: .95rem; line-height: 2; }.values-copy p { margin: 0; }.values-copy p + p { margin-top: 22px; }.facts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin: 0; }.facts-grid div { padding: 0 20px 24px 0; }.facts-grid dt { color: var(--c-text-3); font-size: .65rem; }.facts-grid dd { margin: 8px 0 0; color: var(--c-text); font-size: .86rem; font-weight: 600; }
.about-footer { display: flex; justify-content: space-between; align-items: end; gap: 30px; padding: 50px 0 12px; }.footer-brand, .footer-signature { display: flex; align-items: center; gap: 12px; }.footer-brand img { width: 34px; height: 34px; opacity: .8; }.footer-brand strong { display: block; color: var(--c-text-1); font-size: .86rem; }.about-footer span { display: block; margin-top: 7px; color: var(--c-text-3); font: .58rem var(--font-mono); }.footer-signature { flex-direction: column; align-items: end; gap: 2px; }.footer-signature span { margin: 0; color: var(--c-text-2); font: .8rem var(--font-heading); }.footer-signature strong { color: var(--c-text); font: 650 1.5rem var(--font-brand); }
.reveal-block { opacity: 0; transform: translateY(34px); transition: opacity .9s ease, transform .9s cubic-bezier(.16,1,.3,1); }.reveal-block.is-visible { opacity: 1; transform: none; }.hero-reveal { animation: hero-rise 1s both cubic-bezier(.16,1,.3,1); }.hero-copy { animation-delay: .08s; }.hero-portrait { animation-delay: .22s; }
@keyframes hero-rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } } @keyframes cue-slide { 0%,100% { transform: scaleX(.35); opacity: .4; } 50% { transform: scaleX(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .reveal-block, .hero-reveal, .hero-scroll-cue i { animation: none; transition: none; opacity: 1; transform: none; } }
@media (max-width: 760px) { .about-page { width: min(100% - 40px, 600px); padding-top: 20px; }.profile-hero { display: flex; flex-direction: column; align-items: stretch; min-height: auto; gap: 42px; padding: 34px 0 76px; }.hero-role { margin-top: 54px; }.hero-copy h1 { font-size: clamp(4rem, 21vw, 6.5rem); }.hero-copy blockquote { font-size: 1.05rem; }.hero-portrait { min-height: 440px; order: -1; }.portrait-backdrop { inset: 0 0 0 5%; }.portrait-frame { width: min(330px, 76%); }.portrait-stamp { right: -13px; }.hero-scroll-cue { bottom: 24px; }.intro-section, .notes-section, .skills-section, .journey-section, .values-section, .facts-section { padding: 76px 0; }.intro-layout, .values-layout, .facts-layout { grid-template-columns: 1fr; gap: 28px; margin-top: 32px; }.section-heading { display: block; margin-bottom: 30px; }.section-heading h2 { margin-top: 22px; }.notes-grid { grid-template-columns: 1fr; gap: 12px; }.note-item { min-height: 0; }.note-item:nth-child(2) { transform: none; }.note-item:nth-child(2):hover { transform: translateY(-7px); }.skills-list { grid-template-columns: 1fr; }.journey-section, .values-section { margin-inline: -20px; padding-inline: 20px; }.journey-heading { grid-template-columns: 1fr; gap: 22px; }.journey-heading h2 { grid-column: 1; }.journey-heading p { grid-column: 1; margin: 0; }.journey-list { grid-template-columns: 1fr; gap: 30px; margin-top: 48px; }.journey-list li { display: grid; grid-template-columns: 82px 1fr; gap: 15px; padding: 0 0 30px; border-bottom: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border)); }.journey-list li:not(:last-child)::after { display: none; }.journey-year { gap: 12px; }.journey-list h3 { margin: 0 0 8px; }.facts-grid { grid-template-columns: repeat(2, 1fr); gap: 25px 0; }.facts-grid div { padding-bottom: 0; }.about-footer { flex-direction: column; align-items: flex-start; padding-top: 38px; }.footer-signature { align-items: flex-start; }.about-footer span { line-height: 1.5; } }
</style>
