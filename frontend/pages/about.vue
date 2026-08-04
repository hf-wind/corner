<template>
  <div class="about-shell">
    <main ref="aboutPage" class="about-scroll">
      <div class="about-page">
        <header class="profile-hero reveal-block">
          <div v-if="profile.tools.length" class="breeze-strip" aria-hidden="true">
            <div class="breeze-track">
              <span v-for="group in 2" :key="group">
                <i v-for="tool in profile.tools" :key="`${group}-${tool}`">{{ tool }}<b>+</b></i>
              </span>
            </div>
          </div>

          <div class="hero-grid">
            <div class="profile-copy">
              <p class="eyebrow">ABOUT / A QUIET SELF-NARRATIVE</p>
              <div class="name-line">
                <h1>{{ profile.name }}</h1>
                <span v-if="profile.badge">{{ profile.badge }}</span>
              </div>
              <p class="role">{{ profile.role }}</p>
              <blockquote>“{{ profile.motto }}”</blockquote>

              <div class="status-row">
                <span><Icon name="ph:map-pin-bold" /> {{ profile.location }}</span>
                <span class="available"><i />{{ profile.availability }}</span>
              </div>

              <div v-if="profile.socialLinks.length" class="social-row">
                <a
                  v-for="link in profile.socialLinks"
                  :key="`${link.label}-${link.url}`"
                  :href="safeUrl(link.url)"
                  :title="link.label"
                  :aria-label="link.label"
                  :target="isExternalLink(link.url) ? '_blank' : undefined"
                  :rel="isExternalLink(link.url) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="link.icon || 'ph:link-bold'" />
                </a>
              </div>
            </div>

            <div class="portrait-area">
              <span class="wind-ring wind-ring-one" aria-hidden="true" />
              <span class="wind-ring wind-ring-two" aria-hidden="true" />
              <div class="portrait-frame">
                <img :src="avatarSrc" :alt="`${profile.name}的头像`" class="portrait">
              </div>
              <div class="portrait-note">
                <span>CORNER.INK</span>
                <time>{{ currentClock }}</time>
              </div>
            </div>
          </div>
        </header>

        <section class="story-band reveal-block">
          <div class="section-heading">
            <span>01</span>
            <div><p>A BRIEF ACCOUNT</p><h2>小记其人</h2></div>
          </div>

          <div class="story-layout">
            <div class="introduction">
              <p v-for="paragraph in introductionParagraphs" :key="paragraph">{{ paragraph }}</p>
            </div>

            <aside class="now-panel">
              <p class="panel-label">AT THIS MOMENT</p>
              <strong>{{ currentClock }}</strong>
              <span>东八区 · {{ currentDate }}</span>
              <div v-if="profile.tools.length" class="current-thing">
                <i />
                <span>此刻也许在</span>
                <Transition name="word-swap" mode="out-in">
                  <b :key="activeTool">{{ activeTool }}</b>
                </Transition>
              </div>
              <div class="ride-line" aria-hidden="true">
                <span /><Icon name="ph:bicycle-bold" />
              </div>
            </aside>
          </div>
        </section>

        <section v-if="profile.notes.length" class="notes-band reveal-block">
          <div class="section-heading">
            <span>02</span>
            <div><p>NOT A RESUME</p><h2>几页闲话</h2></div>
          </div>
          <div class="note-grid">
            <article v-for="(note, index) in profile.notes" :key="`${note.title}-${index}`">
              <div class="note-number">{{ padIndex(index + 1) }}</div>
              <span class="note-icon"><Icon :name="note.icon || 'ph:leaf-bold'" /></span>
              <small>{{ note.subtitle }}</small>
              <h3>{{ note.title }}</h3>
              <p>{{ note.content }}</p>
            </article>
          </div>
        </section>

        <section v-if="profile.facts.length" class="facts-band reveal-block" aria-label="个人速记">
          <dl>
            <div v-for="fact in profile.facts" :key="fact.label">
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="profile.timeline.length" class="journey-band reveal-block">
          <div class="section-heading">
            <span>03</span>
            <div><p>ON THE WAY</p><h2>来路拾记</h2></div>
          </div>
          <ol class="timeline-list">
            <li v-for="(item, index) in profile.timeline" :key="`${item.year}-${item.title}`">
              <span class="timeline-index">{{ padIndex(index + 1) }}</span>
              <time>{{ item.year }}</time>
              <div><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div>
            </li>
          </ol>
        </section>

        <section v-if="profile.skills.length" class="work-band reveal-block">
          <div class="section-heading">
            <span>04</span>
            <div><p>WHAT I AM LEARNING</p><h2>平日所习</h2></div>
          </div>
          <div class="work-list">
            <article v-for="(skill, index) in profile.skills" :key="skill.name">
              <Icon :name="skillIcons[index % skillIcons.length]" />
              <div><h3>{{ skill.name }}</h3><p>{{ skill.description }}</p></div>
            </article>
          </div>
        </section>

        <footer class="about-footer reveal-block">
          <div>
            <p>{{ profile.motto }}</p>
            <span>{{ siteYearLabel }} · 风隅随笔</span>
          </div>
          <strong>{{ profile.name }}</strong>
        </footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import avatarFallback from '~/assets/images/avatar.jpg'
import { normalizeAboutProfile } from '~/types/about'

const api = useApi()
const { mediaUrl } = useMediaUrl()
const profile = ref(normalizeAboutProfile(null))
const aboutPage = ref<HTMLElement | null>(null)
const currentYear = new Date().getFullYear()
const siteYearLabel = currentYear === 2026 ? '2026' : `2026 - ${currentYear}`
const now = ref(new Date())
const activeToolIndex = ref(0)
const skillIcons = ['ph:devices-bold', 'ph:chart-line-up-bold', 'ph:cube-focus-bold', 'ph:code-bold']
let clockTimer = 0
let toolTimer = 0
let revealObserver: IntersectionObserver | null = null

const avatarSrc = computed(() => profile.value.avatarUrl ? mediaUrl(profile.value.avatarUrl) : avatarFallback)
const introductionParagraphs = computed(() => profile.value.introduction.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean))
const activeTool = computed(() => profile.value.tools[activeToolIndex.value % profile.value.tools.length] || '发呆')
const currentClock = computed(() => new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(now.value))
const currentDate = computed(() => new Intl.DateTimeFormat('zh-CN', {
  month: 'long', day: 'numeric', weekday: 'short',
}).format(now.value))

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url)
}

function safeUrl(url: string) {
  const trimmed = url.trim()
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed) ? trimmed : '#'
}

function padIndex(index: number) {
  return String(index).padStart(2, '0')
}

function observeSections() {
  revealObserver?.disconnect()
  const blocks = aboutPage.value?.querySelectorAll<HTMLElement>('.reveal-block')
  if (!blocks?.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    blocks?.forEach((block) => block.classList.add('is-visible'))
    return
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      revealObserver?.unobserve(entry.target)
    })
  }, { threshold: 0.12 })
  blocks.forEach((block) => revealObserver?.observe(block))
}

onMounted(async () => {
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
  toolTimer = window.setInterval(() => {
    if (profile.value.tools.length > 1) activeToolIndex.value = (activeToolIndex.value + 1) % profile.value.tools.length
  }, 2600)
  await nextTick()
  observeSections()
  void api.get('/settings/about_profile').then((value) => {
    profile.value = normalizeAboutProfile(value)
  }).catch(() => {
    // Built-in content keeps the page complete before the first seed or admin save.
  })
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(toolTimer)
  revealObserver?.disconnect()
})

useHead(() => ({
  title: `关于我 - ${profile.value.name}`,
  meta: [{ name: 'description', content: profile.value.motto }],
}))
</script>

<style scoped>
.about-shell {
  width: 100%;
  min-width: 0;
  height: 100%;
  background: var(--c-bg);
}

.about-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

.about-page {
  width: min(1120px, calc(100% - 72px));
  margin: 0 auto;
  padding: 42px 0 64px;
}

.profile-hero {
  overflow: hidden;
  border-block: 1px solid var(--border);
}

.breeze-strip {
  height: 34px;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: .6rem;
  white-space: nowrap;
}

.breeze-track {
  display: flex;
  width: max-content;
  animation: breeze-move 28s linear infinite;
}

.breeze-track > span {
  display: flex;
  height: 33px;
  align-items: center;
}

.breeze-track i {
  display: inline-flex;
  align-items: center;
  gap: 24px;
  padding-right: 24px;
  font-style: normal;
}

.breeze-track b { color: var(--c-primary); font-weight: 400; }

.hero-grid {
  display: grid;
  min-height: 510px;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr);
}

.profile-copy {
  display: flex;
  justify-content: center;
  flex-direction: column;
  padding: 64px 72px 64px 44px;
}

.eyebrow,
.section-heading p,
.panel-label {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: 0;
}

.name-line {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  margin: 14px 0 6px;
}

.name-line h1 {
  margin: 0;
  color: var(--c-text);
  font-size: 4rem;
  line-height: 1;
}

.name-line > span {
  margin-bottom: 7px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--c-text-3);
  font-size: .65rem;
}

.role { color: var(--c-text-2); font-size: .86rem; }

.profile-copy blockquote {
  max-width: 560px;
  margin: 46px 0 28px;
  color: var(--c-text-1);
  font-family: var(--font-heading);
  font-size: 1.28rem;
  line-height: 1.8;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  color: var(--c-text-2);
  font-size: .72rem;
}

.status-row span { display: inline-flex; align-items: center; gap: 6px; }
.status-row .available { color: #258052; }
.available i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 14%, transparent);
  animation: status-pulse 2.4s ease-in-out infinite;
}

.social-row { display: flex; gap: 8px; margin-top: 28px; }
.social-row a {
  display: grid;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--c-text-1);
  font-size: 1rem;
  place-items: center;
  transition: transform .18s, border-color .18s, color .18s, background .18s;
}
.social-row a:hover { border-color: var(--c-primary); background: var(--c-primary-soft); color: var(--c-primary); transform: translateY(-3px); }

.portrait-area {
  position: relative;
  display: grid;
  min-width: 0;
  overflow: hidden;
  border-left: 1px solid var(--border);
  background: var(--c-bg-1);
  place-items: center;
}

.portrait-frame {
  position: relative;
  z-index: 2;
  width: 238px;
  aspect-ratio: 4 / 5;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 50%, var(--border));
  background: var(--c-bg);
  transform: rotate(1.5deg);
}

.portrait { width: 100%; height: 100%; object-fit: cover; filter: saturate(.88) contrast(1.03); }

.wind-ring {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, transparent);
  border-radius: 50%;
}
.wind-ring::after {
  position: absolute;
  top: 50%;
  left: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d95d39;
  content: '';
}
.wind-ring-one { width: 340px; height: 340px; animation: ring-spin 18s linear infinite; }
.wind-ring-two { width: 410px; height: 410px; border-style: dashed; opacity: .55; animation: ring-spin 26s linear infinite reverse; }

.portrait-note {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: .58rem;
}
.portrait-note time { color: var(--c-text-1); font-size: .72rem; font-variant-numeric: tabular-nums; }

.story-band,
.notes-band,
.journey-band,
.work-band { padding: 78px 44px; border-bottom: 1px solid var(--border); }

.section-heading { display: flex; align-items: flex-start; gap: 18px; margin-bottom: 42px; }
.section-heading > span {
  display: grid;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .62rem;
  place-items: center;
}
.section-heading h2 { margin: 5px 0 0; color: var(--c-text); font-size: 1.65rem; }

.story-layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 72px; }
.introduction { color: var(--c-text-2); font-family: var(--font-body); font-size: .95rem; font-weight:420; line-height: 2.15; }
.introduction p + p { margin-top: 18px; }

.now-panel {
  align-self: start;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-1);
}
.now-panel > strong { display: block; margin-top: 18px; color: var(--c-text); font-family: var(--font-mono); font-size: 2rem; font-variant-numeric: tabular-nums; }
.now-panel > span { color: var(--c-text-3); font-size: .66rem; }
.current-thing { display: grid; grid-template-columns: 8px auto minmax(0, 1fr); align-items: center; gap: 7px; margin-top: 30px; color: var(--c-text-3); font-size: .7rem; }
.current-thing > i { width: 6px; height: 6px; border-radius: 50%; background: #258052; }
.current-thing b { overflow: hidden; color: var(--c-primary); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.word-swap-enter-active, .word-swap-leave-active { transition: opacity .2s, transform .2s; }
.word-swap-enter-from { opacity: 0; transform: translateY(6px); }
.word-swap-leave-to { opacity: 0; transform: translateY(-6px); }

.ride-line { position: relative; height: 34px; margin-top: 24px; overflow: hidden; color: #d95d39; }
.ride-line > span { position: absolute; right: 0; bottom: 7px; left: 0; height: 1px; background: var(--border); }
.ride-line > span::after { position: absolute; right: 12%; bottom: -2px; width: 5px; height: 5px; border-radius: 50%; background: var(--c-primary); content: ''; }
.ride-line :deep(svg) { position: absolute; bottom: 8px; left: 0; font-size: 1.15rem; animation: ride-across 7s ease-in-out infinite; }

.note-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.note-grid article { position: relative; min-height: 260px; padding: 30px 25px 26px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--border) 76%, transparent); border-radius: 20px; background: linear-gradient(145deg, color-mix(in srgb, var(--c-primary-soft) 35%, var(--ld-bg-card)), var(--ld-bg-card) 55%); }
.note-grid article::after { position: absolute; right: -42px; bottom: -48px; width: 125px; height: 125px; border: 1px dashed color-mix(in srgb, var(--c-primary) 18%, transparent); border-radius: 50%; content: ''; }
.note-number { position: absolute; top: 16px; right: 18px; color: var(--c-text-3); font-family: var(--font-accent); font-size: .58rem; }
.note-icon { display: grid; width: 42px; height: 42px; border-radius: 14px; background: var(--c-primary-soft); color: var(--c-primary); font-size: 1.2rem; place-items: center; }
.note-grid small { display: block; margin-top: 25px; color: var(--c-primary); font-family: var(--font-accent); font-size: .48rem; font-weight: 750; letter-spacing: .13em; }
.note-grid h3 { margin: 7px 0 0; font-size: 1.08rem; }
.note-grid p { position: relative; z-index: 1; margin: 14px 0 0; color: var(--c-text-2); font-size: .75rem; line-height: 1.95; }

.facts-band { padding: 0 44px; border-bottom: 1px solid var(--border); }
.facts-band dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.facts-band dl > div { min-width: 0; padding: 24px 20px; border-right: 1px solid var(--border); }
.facts-band dl > div:nth-child(3n) { border-right: 0; }
.facts-band dl > div:nth-child(n + 4) { border-top: 1px solid var(--border); }
.facts-band dt { margin-bottom: 7px; color: var(--c-text-3); font-size: .64rem; }
.facts-band dd { overflow-wrap: anywhere; color: var(--c-text-1); font-size: .78rem; font-weight: 700; }

.timeline-list { list-style: none; }
.timeline-list li { display: grid; grid-template-columns: 44px 84px minmax(0, 1fr); gap: 20px; padding: 25px 0; border-top: 1px solid var(--border); }
.timeline-list li:last-child { border-bottom: 1px solid var(--border); }
.timeline-index { color: var(--c-text-3); font-family: var(--font-mono); font-size: .62rem; }
.timeline-list time { color: var(--c-primary); font-family: var(--font-mono); font-size: .72rem; font-weight: 700; }
.timeline-list h3 { margin-bottom: 7px; color: var(--c-text); font-size: .9rem; }
.timeline-list p { color: var(--c-text-2); font-size: .76rem; line-height: 1.8; }

.work-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
.work-list article { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 18px; min-height: 150px; padding: 28px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.work-list :deep(svg) { color: #d95d39; font-size: 1.45rem; }
.work-list h3 { margin-bottom: 9px; color: var(--c-text); font-size: .9rem; }
.work-list p { color: var(--c-text-2); font-size: .75rem; line-height: 1.8; }

.about-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; padding: 60px 44px 8px; }
.about-footer p { color: var(--c-text-1); font-family: var(--font-heading); font-size: 1rem; }
.about-footer span { display: block; margin-top: 8px; color: var(--c-text-3); font-family: var(--font-mono); font-size: .6rem; }
.about-footer strong { color: var(--c-text); font-family: var(--font-brand); font-size: 1.7rem; font-weight: 650; }

.reveal-block { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s cubic-bezier(.16, 1, .3, 1); }
.reveal-block.is-visible { opacity: 1; transform: none; }

@keyframes breeze-move { to { transform: translateX(-50%); } }
@keyframes ring-spin { to { transform: rotate(360deg); } }
@keyframes status-pulse { 50% { box-shadow: 0 0 0 7px color-mix(in srgb, currentColor 5%, transparent); } }
@keyframes ride-across { 0%, 8% { transform: translateX(-24px); } 50% { transform: translateX(205px) rotate(-2deg); } 92%, 100% { transform: translateX(-24px); } }

@media (max-width: 980px) {
  .about-page { width: min(100% - 32px, 820px); }
  .hero-grid { grid-template-columns: minmax(0, 1fr) 300px; }
  .profile-copy { padding-right: 40px; padding-left: 36px; }
  .story-layout { gap: 40px; }
}

@media (max-width: 900px) {
  .about-page { padding-top: max(70px, calc(env(safe-area-inset-top) + 64px)); }
  .name-line h1 { font-size: 3.2rem; }
}

@media (max-width: 760px) {
  .about-page { width: 100%; padding-bottom: 38px; }
  .profile-hero { border-top: 0; }
  .hero-grid { grid-template-columns: 1fr; }
  .profile-copy { order: 2; padding: 42px 24px 50px; }
  .portrait-area { min-height: 420px; border-bottom: 1px solid var(--border); border-left: 0; }
  .profile-copy blockquote { margin-top: 34px; }
  .story-band, .notes-band, .journey-band, .work-band { padding: 58px 24px; }
  .story-layout { grid-template-columns: 1fr; gap: 34px; }
  .note-grid { grid-template-columns: 1fr; }
  .note-grid article { min-height: 0; }
  .facts-band { padding: 0 24px; }
  .facts-band dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .facts-band dl > div:nth-child(3n) { border-right: 1px solid var(--border); }
  .facts-band dl > div:nth-child(2n) { border-right: 0; }
  .facts-band dl > div:nth-child(n + 3) { border-top: 1px solid var(--border); }
  .work-list { grid-template-columns: 1fr; }
  .about-footer { padding: 48px 24px 8px; }
}

@media (max-width: 520px) {
  .portrait-area { min-height: 370px; }
  .portrait-frame { width: 208px; }
  .wind-ring-one { width: 292px; height: 292px; }
  .wind-ring-two { width: 350px; height: 350px; }
  .name-line { align-items: flex-start; flex-direction: column; gap: 8px; }
  .name-line h1 { font-size: 2.7rem; }
  .name-line > span { margin-bottom: 0; }
  .profile-copy blockquote { font-size: 1.1rem; }
  .section-heading { margin-bottom: 32px; }
  .timeline-list li { grid-template-columns: 32px minmax(0, 1fr); gap: 14px; }
  .timeline-list time { grid-column: 2; grid-row: 1; }
  .timeline-list li > div { grid-column: 2; }
  .facts-band dl { grid-template-columns: 1fr; }
  .facts-band dl > div { border-right: 0 !important; border-top: 1px solid var(--border); }
  .facts-band dl > div:first-child { border-top: 0; }
  .about-footer { align-items: flex-start; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  .breeze-track, .wind-ring, .available i, .ride-line :deep(svg) { animation: none; }
  .reveal-block { opacity: 1; transform: none; transition: none; }
  .social-row a, .word-swap-enter-active, .word-swap-leave-active { transition: none; }
}
</style>
