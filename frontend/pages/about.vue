<template>
  <div class="about-shell">
    <main class="about-scroll">
      <div class="about-page">
        <header class="profile-header">
          <div class="profile-index" aria-hidden="true">
            <span>PROFILE</span>
            <strong>01</strong>
          </div>

          <div class="portrait-wrap">
            <div class="portrait-frame">
              <img :src="avatarSrc" :alt="`${profile.name}的头像`" class="portrait">
            </div>
            <span class="portrait-caption">THIS IS ME · {{ currentYear }}</span>
          </div>

          <div class="profile-intro">
            <p class="eyebrow">ABOUT / 关于我</p>
            <h1>{{ profile.name }}</h1>
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
        </header>

        <div class="profile-body">
          <div class="story-column">
            <section class="story-section">
              <div class="section-marker"><span>01</span><i /></div>
              <div class="section-content">
                <p class="section-kicker">HELLO, STRANGER</p>
                <h2>关于此刻的我</h2>
                <div class="introduction">
                  <p v-for="paragraph in introductionParagraphs" :key="paragraph">{{ paragraph }}</p>
                </div>
              </div>
            </section>

            <section v-if="profile.timeline.length" class="story-section timeline-section">
              <div class="section-marker"><span>02</span><i /></div>
              <div class="section-content">
                <p class="section-kicker">MILESTONES</p>
                <h2>一路走来</h2>
                <ol class="timeline-list">
                  <li v-for="item in profile.timeline" :key="`${item.year}-${item.title}`">
                    <time>{{ item.year }}</time>
                    <div>
                      <h3>{{ item.title }}</h3>
                      <p>{{ item.description }}</p>
                    </div>
                  </li>
                </ol>
              </div>
            </section>
          </div>

          <aside class="profile-notes">
            <section v-if="profile.facts.length" class="notes-block facts-block">
              <p class="notes-label">QUICK NOTES</p>
              <dl>
                <div v-for="fact in profile.facts" :key="fact.label">
                  <dt>{{ fact.label }}</dt>
                  <dd>{{ fact.value }}</dd>
                </div>
              </dl>
            </section>

            <section v-if="profile.skills.length" class="notes-block skills-block">
              <p class="notes-label">WHAT I DO</p>
              <div class="skill-list">
                <div v-for="skill in profile.skills" :key="skill.name" class="skill-row">
                  <div><span>{{ skill.name }}</span><strong>{{ skill.level }}</strong></div>
                  <span class="skill-track"><i :style="{ width: `${skill.level}%` }" /></span>
                </div>
              </div>
            </section>

            <section v-if="profile.tools.length" class="notes-block tools-block">
              <p class="notes-label">CURRENTLY USING</p>
              <div class="tool-list">
                <span v-for="(tool, index) in profile.tools" :key="tool"><b>{{ padIndex(index + 1) }}</b>{{ tool }}</span>
              </div>
            </section>

            <footer class="signature">
              <span>Thanks for stopping by.</span>
              <strong>{{ profile.name }}</strong>
            </footer>
          </aside>
        </div>
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
const currentYear = new Date().getFullYear()

const avatarSrc = computed(() => profile.value.avatarUrl ? mediaUrl(profile.value.avatarUrl) : avatarFallback)
const introductionParagraphs = computed(() => profile.value.introduction.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean))

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

onMounted(async () => {
  try {
    profile.value = normalizeAboutProfile(await api.get('/settings/about_profile'))
  } catch {
    // The built-in profile keeps the page useful before the first admin save.
  }
})

useHead(() => ({
  title: `关于我 - ${profile.value.name}`,
  meta: [{ name: 'description', content: profile.value.motto }],
}))
</script>

<style scoped>
.about-shell {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  background: var(--c-bg-1);
}

.about-scroll {
  width: 100%;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

.about-page {
  width: min(1120px, calc(100% - 64px));
  margin: 32px auto 72px;
  border: 1px solid var(--border);
  background: var(--c-bg);
  box-shadow: 0 18px 60px color-mix(in srgb, var(--c-text) 8%, transparent);
}

.profile-header {
  position: relative;
  display: grid;
  grid-template-columns: 92px minmax(220px, 320px) minmax(0, 1fr);
  min-height: 430px;
  border-bottom: 1px solid var(--border);
}

.profile-index {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  padding-top: 42px;
  border-right: 1px solid var(--border);
  color: var(--c-text-3);
}

.profile-index span {
  font-size: .6rem;
  letter-spacing: .2em;
  writing-mode: vertical-rl;
}

.profile-index strong {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 1.15rem;
}

.portrait-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  padding: 44px 32px;
  background: color-mix(in srgb, var(--c-primary-soft) 28%, var(--c-bg));
}

.portrait-frame {
  position: relative;
  width: min(230px, 100%);
  aspect-ratio: 4 / 5;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 48%, var(--border));
  background: var(--c-bg);
}

.portrait-frame::before,
.portrait-frame::after {
  position: absolute;
  z-index: 1;
  width: 34px;
  height: 34px;
  border-color: var(--c-primary);
  content: '';
  pointer-events: none;
}

.portrait-frame::before {
  top: -6px;
  left: -6px;
  border-top: 2px solid;
  border-left: 2px solid;
}

.portrait-frame::after {
  right: -6px;
  bottom: -6px;
  border-right: 2px solid;
  border-bottom: 2px solid;
}

.portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(.9) contrast(1.03);
}

.portrait-caption {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: .58rem;
  letter-spacing: .13em;
}

.profile-intro {
  align-self: center;
  padding: 52px clamp(34px, 6vw, 82px);
}

.eyebrow,
.section-kicker,
.notes-label {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .16em;
}

.profile-intro h1 {
  margin: 14px 0 8px;
  color: var(--c-text);
  font-size: 4.7rem;
  line-height: 1.06;
}

.role {
  color: var(--c-text-2);
  font-size: .84rem;
  letter-spacing: .08em;
}

.profile-intro blockquote {
  max-width: 590px;
  margin: 38px 0 26px;
  padding-left: 18px;
  border-left: 3px solid var(--c-primary);
  color: var(--c-text-1);
  font-family: var(--font-wenkai);
  font-size: 1.12rem;
  line-height: 1.8;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  color: var(--c-text-2);
  font-size: .72rem;
}

.status-row span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-row .available {
  color: #1e8b59;
}

.available i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 14%, transparent);
}

.social-row {
  display: flex;
  gap: 8px;
  margin-top: 26px;
}

.social-row a {
  display: grid;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  color: var(--c-text-1);
  font-size: 1rem;
  place-items: center;
  transition: background .18s, border-color .18s, color .18s, transform .18s;
}

.social-row a:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: translateY(-2px);
}

.profile-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
}

.story-column {
  padding: 60px clamp(34px, 6vw, 76px);
  border-right: 1px solid var(--border);
}

.story-section {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 26px;
}

.story-section + .story-section {
  margin-top: 72px;
}

.section-marker {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: .65rem;
}

.section-marker i {
  width: 1px;
  min-height: 92px;
  flex: 1;
  background: var(--border);
}

.section-content h2 {
  margin: 7px 0 24px;
  color: var(--c-text);
  font-size: 1.55rem;
}

.introduction {
  color: var(--c-text-2);
  font-size: .88rem;
  line-height: 2;
}

.introduction p + p {
  margin-top: 14px;
}

.timeline-list {
  list-style: none;
}

.timeline-list li {
  position: relative;
  display: grid;
  grid-template-columns: 66px 1fr;
  gap: 20px;
  padding: 0 0 28px 18px;
  border-left: 1px solid var(--border);
}

.timeline-list li:last-child {
  padding-bottom: 0;
}

.timeline-list li::before {
  position: absolute;
  top: 5px;
  left: -4px;
  width: 7px;
  height: 7px;
  border: 2px solid var(--c-bg);
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 1px var(--c-primary);
  content: '';
}

.timeline-list time {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .72rem;
  font-weight: 700;
}

.timeline-list h3 {
  margin-bottom: 5px;
  color: var(--c-text);
  font-size: .88rem;
}

.timeline-list p {
  color: var(--c-text-2);
  font-size: .76rem;
  line-height: 1.7;
}

.profile-notes {
  background: var(--c-bg-1);
}

.notes-block {
  padding: 34px 30px;
  border-bottom: 1px solid var(--border);
}

.notes-label {
  margin-bottom: 22px;
}

.facts-block dl {
  display: grid;
  gap: 15px;
}

.facts-block dl > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border);
}

.facts-block dt {
  color: var(--c-text-3);
  font-size: .7rem;
}

.facts-block dd {
  color: var(--c-text-1);
  font-size: .72rem;
  font-weight: 700;
  text-align: right;
}

.skill-list {
  display: grid;
  gap: 18px;
}

.skill-row > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--c-text-1);
  font-size: .72rem;
}

.skill-row strong {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: .62rem;
}

.skill-track {
  display: block;
  height: 3px;
  overflow: hidden;
  background: var(--c-bg-3);
}

.skill-track i {
  display: block;
  height: 100%;
  background: var(--c-primary);
}

.tool-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tool-list span {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  color: var(--c-text-2);
  font-size: .7rem;
}

.tool-list b {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .55rem;
}

.signature {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 8px;
  padding: 36px 30px 46px;
  color: var(--c-text-3);
  font-size: .62rem;
}

.signature strong {
  color: var(--c-text-1);
  font-family: var(--font-wenkai);
  font-size: 1.45rem;
  font-weight: 400;
}

@media (max-width: 980px) {
  .about-page {
    width: min(100% - 32px, 820px);
  }

  .profile-header {
    grid-template-columns: 70px 250px minmax(0, 1fr);
  }

  .profile-body {
    grid-template-columns: minmax(0, 1fr) 270px;
  }

  .story-column {
    padding-right: 36px;
    padding-left: 36px;
  }
}

@media (max-width: 900px) {
  .about-scroll {
    padding-top: max(64px, calc(env(safe-area-inset-top) + 58px));
  }

  .profile-intro h1 {
    font-size: 3.3rem;
  }
}

@media (max-width: 760px) {
  .about-page {
    width: 100%;
    margin: 0;
    border: 0;
    box-shadow: none;
  }

  .profile-header {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .profile-index {
    grid-row: span 2;
  }

  .portrait-wrap {
    padding: 32px 24px 24px;
  }

  .portrait-frame {
    width: min(210px, 72vw);
  }

  .profile-intro {
    padding: 32px 26px 42px;
  }

  .profile-intro h1 {
    font-size: 2.5rem;
  }

  .profile-intro blockquote {
    margin-top: 28px;
  }

  .profile-body {
    grid-template-columns: 1fr;
  }

  .story-column {
    padding: 44px 24px;
    border-right: 0;
  }

  .profile-notes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--border);
  }

  .notes-block,
  .signature {
    border-right: 1px solid var(--border);
  }
}

@media (max-width: 520px) {
  .profile-header {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .profile-index {
    padding-top: 26px;
  }

  .profile-index span {
    font-size: .5rem;
  }

  .portrait-wrap {
    padding-right: 18px;
    padding-left: 18px;
  }

  .profile-intro {
    padding-right: 20px;
    padding-left: 20px;
  }

  .profile-intro h1 {
    font-size: 2.1rem;
  }

  .story-column {
    padding-right: 18px;
    padding-left: 14px;
  }

  .story-section {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 15px;
  }

  .timeline-list li {
    grid-template-columns: 52px 1fr;
    gap: 12px;
  }

  .profile-notes {
    grid-template-columns: 1fr;
  }

  .notes-block,
  .signature {
    border-right: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .social-row a {
    transition: none;
  }
}
</style>
