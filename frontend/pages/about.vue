<template>
  <div class="about-page-shell">
    <main ref="aboutMain" class="about-main" @scroll.passive="handleScroll">
      <div class="about-container">
        <section class="about-hero">
          <div class="hero-intro">
            <div class="hero-kicker">
              <span>ABOUT / {{ currentYear }}</span>
              <i aria-hidden="true"></i>
              <span>PERSONAL FIELD NOTES</span>
            </div>
            <p class="hero-role">{{ profile.role }}</p>
            <h1>{{ profile.name }}<b>.</b></h1>
            <span class="hero-badge">{{ profile.badge }}</span>
            <p class="hero-motto">{{ profile.motto }}</p>
            <div class="hero-facts">
              <span><Icon name="ph:map-pin-bold" />{{ profile.location }}</span>
              <span
                ><i class="online-dot" aria-hidden="true"></i
                >{{ profile.availability }}</span
              >
            </div>
            <div v-if="profile.heroTags.length" class="hero-tags">
              <span v-for="tag in profile.heroTags" :key="tag">{{ tag }}</span>
            </div>
            <div class="hero-actions">
              <button
                class="primary-action"
                type="button"
                @click="scrollToSection('introduction')"
              >
                <Icon name="ph:arrow-down-bold" />
                了解更多
              </button>
              <a
                v-if="primaryContact"
                class="secondary-action"
                :href="safeUrl(primaryContact.url)"
                :target="
                  isExternalLink(primaryContact.url) ? '_blank' : undefined
                "
                :rel="
                  isExternalLink(primaryContact.url)
                    ? 'noopener noreferrer'
                    : undefined
                "
              >
                <Icon name="ph:paper-plane-tilt-bold" />
                联系我
              </a>
            </div>
          </div>

          <div class="hero-portrait-wrap">
            <div class="portrait-note" aria-hidden="true">
              <span>NO. 01</span>
              <span>KEEP MAKING</span>
            </div>
            <div class="portrait-frame">
              <img :src="avatarSrc" :alt="`${profile.name}的头像`" />
              <span class="portrait-mark">
                <i aria-hidden="true"></i>
                CURRENTLY HERE
              </span>
            </div>
            <div class="portrait-caption">
              <span>风隅随笔</span>
              <small>一张靠窗的旧书桌</small>
            </div>
          </div>
        </section>

        <div class="hero-welcome">
          <div class="welcome-symbol" aria-hidden="true">
            <Icon name="ph:wind-duotone" />
            <span></span>
          </div>
          <div class="welcome-content">
            <span class="welcome-kicker">WELCOME TO MY CORNER</span>
            <h2>把生活写成一份仍在更新的档案</h2>
            <p>
              这里没有标准答案，只有一些正在发生的工作、阅读和思考。谢谢你愿意停下来看看。
            </p>
          </div>
          <button
            type="button"
            aria-label="阅读几页闲话"
            @click="
              scrollToSection(profile.notes.length ? 'notes' : 'introduction')
            "
          >
            <Icon name="ph:arrow-right-bold" />
          </button>
        </div>

        <section
          id="introduction"
          class="content-section introduction reveal-block"
        >
          <SectionHeading
            index="01"
            eyebrow="A BRIEF ACCOUNT"
            :title="profile.sectionTitles.introduction"
            :description="profile.sectionDescriptions.introduction"
          />
          <div class="intro-body">
            <div class="prose">
              <p v-for="paragraph in introductionParagraphs" :key="paragraph">
                {{ paragraph }}
              </p>
            </div>
          </div>
        </section>

        <section
          v-if="profile.notes.length"
          id="notes"
          class="content-section notes reveal-block"
        >
          <SectionHeading
            index="02"
            eyebrow="NOTES FROM THE CORNER"
            :title="profile.sectionTitles.notes"
            :description="profile.sectionDescriptions.notes"
          />
          <div class="note-grid">
            <article
              v-for="(note, index) in profile.notes"
              :key="`${note.title}-${index}`"
              class="note-card"
            >
              <div class="note-meta">
                <span class="note-index">{{ padIndex(index + 1) }}</span>
                <span class="note-icon"
                  ><Icon :name="note.icon || 'ph:leaf-bold'"
                /></span>
              </div>
              <span class="note-kicker">{{ note.subtitle }}</span>
              <h3>{{ note.title }}</h3>
              <p>{{ note.content }}</p>
            </article>
          </div>
        </section>

        <section
          v-if="profile.skills.length"
          id="skills"
          class="content-section skills reveal-block"
        >
          <SectionHeading
            index="03"
            eyebrow="SELECTED WORKS"
            :title="profile.sectionTitles.skills"
            :description="profile.sectionDescriptions.skills"
          />
          <div class="works-list">
            <component
              :is="skill.url ? 'a' : 'article'"
              v-for="(skill, index) in profile.skills"
              :key="`${skill.name}-${index}`"
              class="work-item"
              :class="{ linked: Boolean(skill.url) }"
              :href="skill.url ? safeUrl(skill.url) : undefined"
              :target="
                skill.url && isExternalLink(skill.url) ? '_blank' : undefined
              "
              :rel="
                skill.url && isExternalLink(skill.url)
                  ? 'noopener noreferrer'
                  : undefined
              "
            >
              <span class="work-index">{{ padIndex(index + 1) }}</span>
              <span class="work-copy">
                <strong>{{ skill.name }}</strong>
                <small>{{ skill.description }}</small>
              </span>
              <Icon
                v-if="skill.url"
                class="work-arrow"
                name="ph:arrow-up-right-bold"
              />
            </component>
          </div>
        </section>

        <section
          v-if="toolCards.length"
          id="activity"
          class="content-section activity reveal-block"
        >
          <SectionHeading
            index="04"
            eyebrow="TOOLS & LITTLE JOYS"
            :title="profile.sectionTitles.activity"
            :description="profile.sectionDescriptions.activity"
          />
          <div class="workstation">
            <article
              v-for="tool in toolCards"
              :key="tool.name"
              class="workstation-card"
            >
              <span class="workstation-icon"><Icon :name="tool.icon" /></span>
              <h3>{{ tool.name }}</h3>
              <span class="workstation-status">{{ tool.status }}</span>
              <p>{{ tool.description }}</p>
            </article>
          </div>
        </section>

        <section
          v-if="profile.timeline.length"
          id="timeline"
          class="content-section timeline reveal-block"
        >
          <SectionHeading
            index="05"
            eyebrow="ON THE WAY"
            :title="profile.sectionTitles.timeline"
            :description="profile.sectionDescriptions.timeline"
          />
          <ol class="timeline-list">
            <li
              v-for="(item, index) in profile.timeline"
              :key="`${item.year}-${item.title}`"
              class="timeline-item"
            >
              <time>
                <span>{{ padIndex(index + 1) }}</span>
                <strong>{{ item.year }}</strong>
              </time>
              <div class="timeline-content">
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
            </li>
          </ol>
        </section>

        <section
          v-if="profile.values"
          id="values"
          class="content-section values reveal-block"
        >
          <SectionHeading
            index="06"
            eyebrow="THE THINGS THAT MATTER"
            :title="profile.sectionTitles.values"
            :description="profile.sectionDescriptions.values"
          />
          <div class="values-copy">
            <Icon name="ph:quotes-fill" aria-hidden="true" />
            <div>
              <p v-for="(paragraph, index) in valuesParagraphs" :key="index">
                {{ paragraph }}
              </p>
            </div>
          </div>
        </section>

        <section
          v-if="profile.facts.length"
          id="facts"
          class="content-section facts reveal-block"
        >
          <SectionHeading
            index="07"
            eyebrow="A FEW SMALL FACTS"
            :title="profile.sectionTitles.facts"
            :description="profile.sectionDescriptions.facts"
          />
          <dl class="facts-grid">
            <div
              v-for="fact in profile.facts"
              :key="fact.label"
              class="fact-card"
            >
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </section>

        <footer class="about-footer">
          <div>
            <strong>风隅随笔</strong>
            <span>WIND CORNER NOTES · {{ siteYearLabel }}</span>
          </div>
          <div>
            <q>{{ profile.motto }}</q>
            <span>{{ profile.availability }}</span>
          </div>
        </footer>
      </div>
    </main>

    <aside class="about-sidebar" aria-label="关于页面导航">
      <section class="side-card side-profile">
        <span class="side-kicker">A SMALL CORNER</span>
        <div class="side-avatar">
          <img :src="avatarSrc" :alt="`${profile.name}头像`" />
        </div>
        <h2>{{ profile.name }}</h2>
        <p>{{ profile.role }}</p>
        <div class="side-location">
          <Icon name="ph:map-pin-bold" />{{ profile.location }}
        </div>
        <div v-if="profile.socialLinks.length" class="side-socials">
          <a
            v-for="link in profile.socialLinks"
            :key="`${link.label}-${link.url}`"
            :href="safeUrl(link.url)"
            :title="link.label"
            :aria-label="link.label"
            :target="isExternalLink(link.url) ? '_blank' : undefined"
            :rel="isExternalLink(link.url) ? 'noopener noreferrer' : undefined"
            ><Icon :name="link.icon || 'ph:link-bold'"
          /></a>
        </div>
      </section>

      <section class="side-card side-index">
        <div class="side-card-title">
          <span><Icon name="ph:list-numbers-bold" /></span>
          <strong>页面目录</strong>
          <small>{{ Math.round(scrollProgress) }}%</small>
        </div>
        <nav ref="sectionNavEl">
          <button
            v-for="item in sectionNav"
            :key="item.id"
            type="button"
            :data-section="item.id"
            :class="{ active: activeSection === item.id }"
            :aria-current="activeSection === item.id ? 'location' : undefined"
            @click="scrollToSection(item.id)"
          >
            <span>{{ item.index }}</span>
            <strong>{{ item.title }}</strong>
            <Icon name="ph:arrow-right-bold" />
          </button>
        </nav>
        <i class="side-progress" aria-hidden="true"
          ><span :style="{ width: `${scrollProgress}%` }"></span
        ></i>
      </section>

      <section class="side-card side-summary">
        <div class="side-card-title">
          <span><Icon name="ph:archive-tray-bold" /></span>
          <strong>正在整理</strong>
        </div>
        <div class="summary-row">
          <strong>{{ profile.skills.length }}</strong
          ><span>作品项目</span>
        </div>
        <div class="summary-row">
          <strong>{{ profile.notes.length }}</strong
          ><span>生活札记</span>
        </div>
        <div class="summary-row">
          <strong>{{ profile.timeline.length }}</strong
          ><span>人生节点</span>
        </div>
      </section>

      <section class="side-card side-quote">
        <Icon name="ph:quotes-fill" />
        <p>“{{ profile.motto }}”</p>
        <span>{{ profile.availability }}</span>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h } from "vue";
import avatarFallback from "@/assets/images/avatar.jpg";
import { normalizeAboutProfile } from "@/types/about";

const SectionHeading = defineComponent({
  props: {
    index: { type: String, required: true },
    eyebrow: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h("header", { class: "section-head" }, [
        h("div", { class: "section-head-top" }, [
          h("span", { class: "section-number" }, props.index),
          h("div", null, [
            h("span", { class: "section-eyebrow" }, props.eyebrow),
            h("h2", null, props.title),
          ]),
        ]),
        h("p", null, props.description),
      ]);
  },
});

const api = useApi();
const { mediaUrl } = useMediaUrl();
const profile = ref(normalizeAboutProfile(null));
const aboutMain = ref<HTMLElement | null>(null);
const sectionNavEl = ref<HTMLElement | null>(null);
const activeSection = ref("introduction");
const scrollProgress = ref(0);
const currentYear = new Date().getFullYear();
const siteYearLabel = computed(() =>
  currentYear === 2026 ? "2026" : `2026 - ${currentYear}`,
);
const avatarSrc = computed(() =>
  profile.value.avatarUrl ? mediaUrl(profile.value.avatarUrl) : avatarFallback,
);
const primaryContact = computed(
  () =>
    profile.value.socialLinks.find((link) =>
      /^(mailto:|tel:)/i.test(link.url),
    ) || profile.value.socialLinks[0],
);
const introductionParagraphs = computed(() =>
  splitParagraphs(profile.value.introduction),
);
const valuesParagraphs = computed(() => splitParagraphs(profile.value.values));

const sectionNav = computed(() => [
  {
    id: "introduction",
    index: "01",
    title: profile.value.sectionTitles.introduction,
  },
  ...(profile.value.notes.length
    ? [{ id: "notes", index: "02", title: profile.value.sectionTitles.notes }]
    : []),
  ...(profile.value.skills.length
    ? [{ id: "skills", index: "03", title: profile.value.sectionTitles.skills }]
    : []),
  ...(profile.value.tools.length
    ? [
        {
          id: "activity",
          index: "04",
          title: profile.value.sectionTitles.activity,
        },
      ]
    : []),
  ...(profile.value.timeline.length
    ? [
        {
          id: "timeline",
          index: "05",
          title: profile.value.sectionTitles.timeline,
        },
      ]
    : []),
  ...(profile.value.values
    ? [{ id: "values", index: "06", title: profile.value.sectionTitles.values }]
    : []),
  ...(profile.value.facts.length
    ? [{ id: "facts", index: "07", title: profile.value.sectionTitles.facts }]
    : []),
]);

const toolCards = computed(() =>
  profile.value.tools.map((name, index) => ({
    name,
    icon: toolIcon(name),
    status: toolStatus(name, index),
    description: toolDescription(name),
  })),
);

let revealObserver: IntersectionObserver | null = null;
let scrollFrame: number | null = null;

function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url);
}

function safeUrl(url: string) {
  const value = url.trim();
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(value) ? value : "#";
}

function toolIcon(name: string) {
  const value = name.toLowerCase();
  if (/前端|页面|vue|react|小程序/.test(value)) return "ph:code-bold";
  if (/后端|接口|node|服务/.test(value)) return "ph:brackets-curly-bold";
  if (/docker|部署|ci|linux|运维/.test(value)) return "ph:cube-bold";
  if (/ai|模型|智能/.test(value)) return "ph:sparkle-bold";
  if (/可视化|数据|大屏/.test(value)) return "ph:chart-line-up-bold";
  if (/ue|孪生|场景/.test(value)) return "ph:cube-focus-bold";
  if (/骑|车/.test(value)) return "ph:bicycle-bold";
  if (/书|阅读/.test(value)) return "ph:book-open-bold";
  if (/电影|影/.test(value)) return "ph:film-slate-bold";
  if (/发呆|休息/.test(value)) return "ph:coffee-bold";
  return "ph:wrench-bold";
}

function toolStatus(name: string, index: number) {
  if (/骑|书|阅读|电影|发呆|休息/.test(name)) return "生活收藏";
  if (/AI|模型|UE|孪生|场景/i.test(name)) return "探索中";
  return index < 4 ? "日常使用" : "持续练习";
}

function toolDescription(name: string) {
  const value = name.toLowerCase();
  if (/前端|页面|vue|react|小程序/.test(value)) return "页面、组件与交互细节";
  if (/后端|接口|node|服务/.test(value)) return "接口、数据与服务边界";
  if (/docker|部署|ci|linux|运维/.test(value)) return "部署、交付与运行维护";
  if (/ai|模型|智能/.test(value)) return "模型接入与协作工作流";
  if (/可视化|数据|大屏/.test(value)) return "数据叙事与屏幕表达";
  if (/ue|孪生|场景/.test(value)) return "场景联动与数字孪生";
  if (/骑|车/.test(value)) return "在风里重新找回节奏";
  if (/书|阅读/.test(value)) return "技术、文学与散漫阅读";
  if (/电影|影/.test(value)) return "在别人的故事里停一会儿";
  if (/发呆|休息/.test(value)) return "给判断和灵感一点空白";
  return "仍在使用，也仍在慢慢熟悉";
}

function scrollToSection(id: string) {
  const section = aboutMain.value?.querySelector<HTMLElement>(`#${id}`);
  if (!section) return;
  activeSection.value = id;
  section.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}

function setupRevealObserver() {
  revealObserver?.disconnect();
  const blocks =
    aboutMain.value?.querySelectorAll<HTMLElement>(".reveal-block");
  if (!blocks?.length) return;
  if (!("IntersectionObserver" in window)) {
    blocks.forEach((block) => block.classList.add("visible"));
    return;
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver?.unobserve(entry.target);
      });
    },
    { root: aboutMain.value, rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  blocks.forEach((block) => revealObserver?.observe(block));
}

function handleScroll() {
  if (scrollFrame !== null) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    const main = aboutMain.value;
    if (!main) return;
    const scrollable = main.scrollHeight - main.clientHeight;
    scrollProgress.value =
      scrollable > 0
        ? Math.min(100, Math.max(0, (main.scrollTop / scrollable) * 100))
        : 0;
    const mainTop = main.getBoundingClientRect().top;
    const marker = mainTop + Math.min(main.clientHeight * 0.32, 240);
    let current = sectionNav.value[0]?.id || "introduction";
    for (const item of sectionNav.value) {
      const section = main.querySelector<HTMLElement>(`#${item.id}`);
      if (section && section.getBoundingClientRect().top <= marker)
        current = item.id;
    }
    if (activeSection.value !== current) {
      activeSection.value = current;
      const nav = sectionNavEl.value;
      const activeButton = nav?.querySelector<HTMLElement>(
        `[data-section="${current}"]`,
      );
      if (nav && activeButton && nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({
          left:
            activeButton.offsetLeft -
            (nav.clientWidth - activeButton.offsetWidth) / 2,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    }
  });
}

onMounted(async () => {
  await nextTick();
  setupRevealObserver();
  handleScroll();
  try {
    profile.value = normalizeAboutProfile(
      await api.get("/settings/about_profile"),
    );
    await nextTick();
    setupRevealObserver();
    handleScroll();
  } catch {
    // Defaults keep the public page complete when settings are unavailable.
  }
});

onUnmounted(() => {
  revealObserver?.disconnect();
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
});

useHead(() => ({
  title: `关于我 - ${profile.value.name}`,
  meta: [{ name: "description", content: profile.value.motto }],
}));
</script>

<style scoped>
.about-page-shell {
  --about-card: color-mix(in srgb, var(--ld-bg-card) 94%, var(--c-bg-1));
  --about-soft: color-mix(in srgb, var(--c-primary-soft) 46%, var(--c-bg-1));
  --about-warm-soft: color-mix(
    in srgb,
    var(--ui-accent-warm) 9%,
    var(--ld-bg-card)
  );
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--c-bg);
  color: var(--c-text);
}

.about-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.about-container {
  width: min(1040px, calc(100% - 72px));
  margin: 0 auto;
  padding: 38px 0 72px;
}

.about-hero {
  position: relative;
  display: grid;
  min-height: min(660px, calc(100dvh - 42px));
  grid-template-columns: minmax(0, 1.08fr) minmax(290px, 390px);
  align-items: center;
  gap: clamp(44px, 6vw, 84px);
  padding: 34px 0 68px;
}

.hero-intro {
  min-width: 0;
  animation: hero-rise 0.82s var(--ui-ease-out) both;
}

.hero-kicker,
.section-eyebrow,
.side-kicker,
.welcome-kicker {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.hero-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--c-text-3);
}

.hero-kicker i {
  width: 46px;
  height: 1px;
  background: var(--c-primary);
  opacity: 0.78;
}

.hero-role {
  margin: 62px 0 14px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
}

.hero-intro h1 {
  max-width: 100%;
  margin: 0;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 6rem;
  font-weight: 700;
  line-height: 0.9;
  overflow-wrap: anywhere;
  letter-spacing: 0;
}

.hero-intro h1 b {
  color: var(--c-primary);
  font-weight: inherit;
}

.hero-badge {
  display: inline-flex;
  margin-top: 22px;
  padding: 7px 12px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  border-radius: 999px;
  background: var(--about-soft);
  color: var(--c-primary);
  font-size: 0.72rem;
}

.hero-motto {
  max-width: 470px;
  margin: 23px 0 0;
  color: var(--c-text-1);
  font-family: var(--font-heading);
  font-size: 1.12rem;
  line-height: 1.85;
}

.hero-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 23px;
  margin-top: 22px;
  color: var(--c-text-3);
  font-size: 0.72rem;
}

.hero-facts span,
.side-location {
  display: flex;
  align-items: center;
  gap: 7px;
}

.online-dot,
.portrait-mark i {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #50c58b;
  box-shadow: 0 0 0 4px color-mix(in srgb, #50c58b 12%, transparent);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 21px;
}

.hero-tags span {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 78%, transparent);
  color: var(--c-text-2);
  font-size: 0.68rem;
  transition:
    transform 0.28s var(--ui-ease-out),
    background-color 0.22s ease,
    color 0.22s ease,
    box-shadow 0.28s ease;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 29px;
}

.hero-actions button,
.hero-actions a {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 17px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--c-text-1);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  text-decoration: none;
  transition:
    transform 0.28s var(--ui-ease-out),
    background-color 0.22s ease,
    color 0.22s ease,
    box-shadow 0.28s ease;
}

.hero-actions .primary-action {
  border-color: var(--c-text);
  background: var(--c-text);
  color: var(--c-bg);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c-text) 14%, transparent);
}

.hero-actions .secondary-action {
  background: var(--ld-bg-card);
}

.hero-portrait-wrap {
  position: relative;
  display: grid;
  min-height: 520px;
  place-items: center;
  animation: hero-rise 0.9s 0.14s var(--ui-ease-out) both;
}

.portrait-note {
  position: absolute;
  top: 16px;
  left: -25px;
  display: grid;
  gap: 4px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.14em;
}

.portrait-frame {
  position: relative;
  width: min(340px, 86%);
  aspect-ratio: 4 / 5.25;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 8px;
  background: var(--c-bg-2);
  box-shadow: 0 24px 58px color-mix(in srgb, var(--c-text) 14%, transparent);
  transition:
    transform 0.56s var(--ui-ease-out),
    box-shadow 0.56s var(--ui-ease-out);
}

.portrait-frame::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    155deg,
    transparent 52%,
    color-mix(in srgb, var(--c-text) 12%, transparent)
  );
  content: "";
  pointer-events: none;
}

.portrait-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.86) contrast(0.98);
  transition:
    transform 0.7s var(--ui-ease-out),
    filter 0.45s ease;
}

.portrait-mark {
  position: absolute;
  right: 15px;
  bottom: 15px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ld-bg-card) 84%, transparent);
  color: var(--c-text-1);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  backdrop-filter: blur(14px);
}

.portrait-caption {
  position: absolute;
  bottom: 5px;
  left: 0;
  display: grid;
  gap: 3px;
}

.portrait-caption span {
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 650;
}

.portrait-caption small {
  color: var(--c-text-3);
  font-size: 0.6rem;
}

.hero-welcome {
  position: relative;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
  padding: 19px 22px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 13%, var(--border));
  border-radius: 8px;
  background: var(--about-soft);
  animation: hero-rise 0.82s 0.26s var(--ui-ease-out) both;
}

.welcome-symbol {
  position: relative;
  display: grid;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--c-text);
  color: var(--c-bg);
  font-size: 1.25rem;
  place-items: center;
}

.welcome-symbol span {
  position: absolute;
  inset: 7px;
  border: 1px dashed color-mix(in srgb, var(--c-bg) 35%, transparent);
  border-radius: 50%;
  animation: spin 11s linear infinite;
}

.welcome-content {
  min-width: 0;
}

.welcome-content h2 {
  margin: 5px 0 3px;
  color: var(--c-text);
  font-size: 1.08rem;
  line-height: 1.35;
}

.welcome-content p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.74rem;
  line-height: 1.7;
}

.hero-welcome button {
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ld-bg-card);
  color: var(--c-primary);
  cursor: pointer;
  place-items: center;
  transition:
    transform 0.28s var(--ui-ease-out),
    background-color 0.22s ease,
    box-shadow 0.28s ease;
}

.content-section {
  padding: 82px 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  scroll-margin-top: 20px;
}

:deep(.section-head) {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 35px;
}

:deep(.section-head-top) {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 14px;
}

:deep(.section-number) {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  place-items: center;
}

:deep(.section-eyebrow) {
  display: block;
  color: var(--c-text-3);
  font-size: 0.57rem;
}

:deep(.section-head h2) {
  margin: 7px 0 0;
  color: var(--c-text);
  font-size: 2.15rem;
  line-height: 1.15;
  letter-spacing: 0;
}

:deep(.section-head > p) {
  max-width: 390px;
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.78rem;
  line-height: 1.75;
  text-align: right;
}

.intro-body {
  max-width: 790px;
}

.prose {
  color: var(--c-text-2);
  font-size: 0.93rem;
  line-height: 2.08;
}

.prose p {
  margin: 0;
}
.prose p + p {
  margin-top: 21px;
}

.prose p:first-child::first-letter {
  float: left;
  margin: 0.12em 9px 0 0;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 3.45em;
  font-weight: 700;
  line-height: 0.82;
}

.note-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 15px;
}

.note-card {
  position: relative;
  min-width: 0;
  min-height: 272px;
  padding: 23px 22px 25px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--about-card);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ld-shadow) 20%, transparent);
  transition:
    transform 0.32s var(--ui-ease-out),
    background-color 0.22s ease,
    box-shadow 0.32s var(--ui-ease-out);
}

.note-card::before,
.workstation-card::before,
.fact-card::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--c-primary);
  content: "";
  opacity: 0.48;
  transition: opacity 0.22s ease;
}

.note-card:nth-child(2)::before,
.workstation-card:nth-child(3n + 2)::before,
.fact-card:nth-child(3n + 2)::before {
  background: var(--ui-accent-warm);
}

.note-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
}

.note-index {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.62rem;
}

.note-icon,
.workstation-icon {
  display: grid;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--about-soft);
  color: var(--c-primary);
  font-size: 1.08rem;
  place-items: center;
  transition:
    transform 0.34s var(--ui-ease-out),
    background-color 0.22s ease;
}

.note-card:nth-child(2) .note-icon,
.workstation-card:nth-child(3n + 2) .workstation-icon {
  background: var(--about-warm-soft);
  color: var(--ui-accent-warm);
}

.note-kicker {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.13em;
}

.note-card h3 {
  margin: 8px 0 0;
  color: var(--c-text);
  font-size: 1.08rem;
}
.note-card p {
  margin: 14px 0 0;
  color: var(--c-text-2);
  font-size: 0.76rem;
  line-height: 1.88;
}

.works-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 44px;
  border-top: 1px solid var(--border);
}

.work-item {
  display: grid;
  min-width: 0;
  grid-template-columns: 34px minmax(0, 1fr) 16px;
  align-items: start;
  gap: 15px;
  margin: 0;
  padding: 20px 9px;
  border-bottom: 1px solid var(--border);
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.3s var(--ui-ease-out),
    background-color 0.22s ease,
    color 0.22s ease;
}

.work-index {
  display: grid;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  place-items: center;
  transition:
    background-color 0.22s ease,
    color 0.22s ease;
}

.work-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.work-copy strong {
  color: var(--c-text);
  font-size: 0.91rem;
  transition: color 0.22s ease;
}
.work-copy small {
  color: var(--c-text-2);
  font-size: 0.73rem;
  line-height: 1.65;
}

.work-arrow {
  margin-top: 8px;
  color: var(--c-primary);
  opacity: 0.28;
  transition:
    transform 0.3s var(--ui-ease-out),
    opacity 0.22s ease;
}

.workstation {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.workstation-card,
.fact-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--about-card);
  box-shadow: 0 3px 13px color-mix(in srgb, var(--ld-shadow) 18%, transparent);
  transition:
    transform 0.3s var(--ui-ease-out),
    background-color 0.22s ease,
    box-shadow 0.3s var(--ui-ease-out);
}

.workstation-card {
  min-height: 188px;
  padding: 21px 19px;
}
.workstation-card h3 {
  margin: 18px 0 8px;
  color: var(--c-text);
  font-size: 0.93rem;
}

.workstation-status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--about-soft);
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.54rem;
}

.workstation-card p {
  margin: 11px 0 0;
  color: var(--c-text-3);
  font-size: 0.71rem;
  line-height: 1.65;
}

.timeline-list {
  position: relative;
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0 0 0 69px;
  list-style: none;
}

.timeline-list::before {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 23px;
  width: 1px;
  background: color-mix(in srgb, var(--c-primary) 38%, var(--border));
  content: "";
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 32px;
  padding: 23px 0;
  border-bottom: 1px solid var(--border);
  transition:
    transform 0.3s var(--ui-ease-out),
    background-color 0.22s ease;
}

.timeline-item:last-child {
  border-bottom: 0;
}

.timeline-item::before {
  position: absolute;
  top: 30px;
  left: -51px;
  width: 10px;
  height: 10px;
  border: 3px solid var(--c-bg);
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 1px var(--c-primary);
  content: "";
  transition:
    transform 0.3s var(--ui-ease-out),
    box-shadow 0.3s ease;
}

.timeline-item time {
  display: grid;
  align-content: start;
  gap: 8px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-style: normal;
}
.timeline-item time span {
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.timeline-item time strong {
  color: var(--c-text-1);
  font-size: 0.88rem;
}
.timeline-content h3 {
  margin: 0 0 7px;
  color: var(--c-text);
  font-size: 0.96rem;
}
.timeline-content p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.76rem;
  line-height: 1.8;
}

.values-copy {
  display: grid;
  max-width: 840px;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 17px;
  padding: 29px 34px;
  border-left: 2px solid var(--c-primary);
  border-radius: 0 8px 8px 0;
  background: var(--about-soft);
  color: var(--c-text-2);
}

.values-copy > :deep(svg) {
  color: var(--c-primary);
  font-size: 1.4rem;
  opacity: 0.55;
}
.values-copy p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.95;
}
.values-copy p + p {
  margin-top: 17px;
}

.facts-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 11px;
  margin: 0;
}

.fact-card {
  padding: 18px 19px 20px;
}
.fact-card dt {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
}
.fact-card dd {
  margin: 8px 0 0;
  color: var(--c-text);
  font-size: 0.88rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.about-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-top: 28px;
  padding: 34px 0 8px;
  border-top: 1px solid var(--border);
}

.about-footer > div {
  display: grid;
  gap: 6px;
}
.about-footer > div:last-child {
  justify-items: end;
  text-align: right;
}
.about-footer strong,
.about-footer q {
  color: var(--c-text-1);
  font-family: var(--font-heading);
  font-size: 0.9rem;
}
.about-footer q::before,
.about-footer q::after {
  content: none;
}
.about-footer span {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.06em;
}

.reveal-block {
  opacity: 0;
  transform: translate3d(0, 24px, 0);
  transition:
    opacity 0.72s ease,
    transform 0.72s var(--ui-ease-out);
}

.reveal-block.visible {
  opacity: 1;
  transform: none;
}

.about-sidebar {
  display: flex;
  width: 272px;
  min-width: 0;
  min-height: 0;
  flex: 0 0 272px;
  flex-direction: column;
  gap: 12px;
  padding: 22px 16px;
  overflow-x: hidden;
  overflow-y: auto;
  border-left: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  background: color-mix(in srgb, var(--c-bg-1) 76%, var(--c-bg));
  scrollbar-width: thin;
}

.side-card {
  min-width: 0;
  padding: 17px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--about-card);
  box-shadow: 0 3px 13px color-mix(in srgb, var(--ld-shadow) 20%, transparent);
}

.side-profile {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 20px 17px;
  text-align: center;
}
.side-profile > .side-kicker {
  align-self: flex-start;
}

.side-avatar {
  width: 78px;
  height: 78px;
  margin: 17px 0 10px;
  overflow: hidden;
  border: 4px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-bg-2);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c-text) 13%, transparent);
  transition:
    transform 0.42s var(--ui-ease-out),
    box-shadow 0.42s ease;
}

.side-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.side-profile h2 {
  max-width: 100%;
  margin: 0;
  color: var(--c-text);
  font-size: 1.13rem;
  overflow-wrap: anywhere;
}
.side-profile > p {
  margin: 4px 0 0;
  color: var(--c-text-2);
  font-size: 0.68rem;
  line-height: 1.55;
}
.side-location {
  margin-top: 10px;
  color: var(--c-text-3);
  font-size: 0.65rem;
}

.side-socials {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin-top: 14px;
}

.side-socials a {
  display: grid;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-1);
  color: var(--c-text-2);
  place-items: center;
  transition:
    transform 0.28s var(--ui-ease-out),
    background-color 0.22s ease,
    color 0.22s ease,
    box-shadow 0.28s ease;
}

.side-card-title {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.side-card-title > span {
  display: grid;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--about-soft);
  color: var(--c-primary);
  place-items: center;
}
.side-card-title strong {
  color: var(--c-text-1);
  font-size: 0.68rem;
}
.side-card-title small {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.54rem;
}
.side-index nav {
  display: grid;
  gap: 2px;
}

.side-index button {
  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: 23px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 6px;
  padding: 8px 7px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    transform 0.26s var(--ui-ease-out),
    background-color 0.22s ease,
    color 0.22s ease;
}

.side-index button > span {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.53rem;
}
.side-index button > strong {
  min-width: 0;
  overflow: hidden;
  font-size: 0.66rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side-index button > :deep(svg) {
  opacity: 0;
  transition:
    transform 0.26s var(--ui-ease-out),
    opacity 0.22s ease;
}
.side-index button.active {
  background: var(--about-soft);
  color: var(--c-primary);
}

.side-index button.active::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 2px;
  height: 15px;
  border-radius: 999px;
  background: var(--c-primary);
  content: "";
  transform: translateY(-50%);
}

.side-index button.active > span,
.side-index button.active > :deep(svg) {
  color: var(--c-primary);
  opacity: 1;
}

.side-progress {
  display: block;
  height: 3px;
  margin-top: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--c-bg-2);
}
.side-progress span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary);
  transition: width 0.16s linear;
}

.summary-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 2px;
  border-bottom: 1px solid var(--border);
}
.summary-row:last-child {
  border-bottom: 0;
}
.summary-row strong {
  color: var(--c-primary);
  font-family: var(--font-heading);
  font-size: 1.18rem;
}
.summary-row span {
  color: var(--c-text-2);
  font-size: 0.66rem;
}

.side-quote {
  display: grid;
  gap: 7px;
  background: var(--about-warm-soft);
}
.side-quote > :deep(svg) {
  color: var(--ui-accent-warm);
  font-size: 1.2rem;
}
.side-quote p {
  margin: 0;
  color: var(--c-text-1);
  font-family: var(--font-heading);
  font-size: 0.77rem;
  line-height: 1.7;
}
.side-quote span {
  color: var(--c-text-3);
  font-size: 0.58rem;
  line-height: 1.55;
}

@media (hover: hover) and (pointer: fine) {
  .hero-tags span:hover,
  .note-card:hover,
  .workstation-card:hover,
  .fact-card:hover,
  .side-socials a:hover {
    transform: translateY(-2px);
    box-shadow: 0 11px 26px
      color-mix(in srgb, var(--ld-shadow) 38%, transparent);
  }
  .hero-tags span:hover,
  .side-socials a:hover {
    background: var(--about-soft);
    color: var(--c-primary);
  }
  .hero-actions button:hover,
  .hero-actions a:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px color-mix(in srgb, var(--c-text) 15%, transparent);
  }
  .hero-actions .primary-action:hover {
    background: color-mix(in srgb, var(--c-text) 88%, var(--c-primary));
  }
  .hero-actions .secondary-action:hover,
  .hero-welcome button:hover {
    background: var(--about-soft);
    color: var(--c-primary);
  }
  .hero-welcome button:hover {
    transform: translateX(2px);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--ld-shadow) 34%, transparent);
  }
  .portrait-frame:hover {
    transform: translateY(-4px);
    box-shadow: 0 30px 68px color-mix(in srgb, var(--c-text) 17%, transparent);
  }
  .portrait-frame:hover img {
    transform: scale(1.018);
    filter: saturate(0.94) contrast(1);
  }
  .note-card:hover,
  .workstation-card:hover,
  .fact-card:hover {
    background: var(--ld-bg-card);
  }
  .note-card:hover::before,
  .workstation-card:hover::before,
  .fact-card:hover::before {
    opacity: 1;
  }
  .note-card:hover .note-icon,
  .workstation-card:hover .workstation-icon {
    transform: rotate(-4deg) scale(1.04);
  }
  .work-item:hover {
    background: var(--about-soft);
    transform: translateX(2px);
  }
  .work-item:hover .work-index {
    background: var(--c-text);
    color: var(--c-bg);
  }
  .work-item:hover .work-copy strong {
    color: var(--c-primary);
  }
  .work-item:hover .work-arrow {
    opacity: 1;
    transform: translate(2px, -2px);
  }
  .timeline-item:hover {
    background: color-mix(in srgb, var(--about-soft) 54%, transparent);
    transform: translateX(2px);
  }
  .timeline-item:hover::before {
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--c-primary) 10%, transparent);
    transform: scale(1.08);
  }
  .side-profile:hover .side-avatar {
    transform: translateY(-2px) rotate(-2deg);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--c-text) 16%, transparent);
  }
  .side-index button:hover {
    background: var(--about-soft);
    color: var(--c-primary);
    transform: translateX(2px);
  }
  .side-index button:hover > :deep(svg) {
    opacity: 1;
    transform: translateX(2px);
  }
}

.hero-actions button:active,
.hero-actions a:active,
.hero-welcome button:active,
.side-socials a:active,
.side-index button:active,
.note-card:active,
.workstation-card:active,
.fact-card:active {
  transform: translateY(1px) scale(0.99);
}

.hero-actions button:focus-visible,
.hero-actions a:focus-visible,
.hero-welcome button:focus-visible,
.side-socials a:focus-visible,
.side-index button:focus-visible,
.work-item:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 3px;
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 22px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1280px) {
  .about-container {
    width: min(920px, calc(100% - 52px));
  }
  .about-hero {
    grid-template-columns: minmax(0, 1fr) minmax(270px, 35%);
    gap: 42px;
  }
  .hero-intro h1 {
    font-size: 5.25rem;
  }
}

@media (max-width: 1160px) {
  .about-sidebar {
    width: 220px;
    flex-basis: 220px;
    padding-inline: 12px;
  }
  .side-card {
    padding-inline: 14px;
  }
  .about-container {
    width: min(850px, calc(100% - 44px));
  }
  .hero-intro h1 {
    font-size: 4.75rem;
  }
}

@media (max-width: 1024px) {
  .about-page-shell {
    flex-direction: column;
  }
  .about-sidebar {
    z-index: 40;
    display: block;
    width: 100%;
    flex: 0 0 auto;
    order: -1;
    padding: 8px 16px;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
    border-left: 0;
    background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
    backdrop-filter: blur(16px);
  }
  .side-profile,
  .side-summary,
  .side-quote {
    display: none;
  }
  .side-index {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
  .side-card-title {
    display: flex;
    gap: 7px;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .side-card-title strong,
  .side-card-title small,
  .side-progress {
    display: none;
  }
  .side-index nav {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .side-index nav::-webkit-scrollbar {
    display: none;
  }
  .side-index button {
    width: auto;
    min-width: max-content;
    grid-template-columns: auto auto;
    gap: 6px;
    padding: 8px 10px;
  }
  .side-index button > :deep(svg) {
    display: none;
  }
  .side-index button.active::before {
    top: auto;
    right: 10px;
    bottom: 2px;
    left: 10px;
    width: auto;
    height: 2px;
    transform: none;
  }
  .about-main {
    min-height: 0;
  }
  .about-container {
    width: min(850px, calc(100% - 44px));
    padding-top: 24px;
  }
}

@media (max-width: 820px) {
  .about-hero {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 28px 0 58px;
  }
  .hero-portrait-wrap {
    min-height: 450px;
    order: -1;
  }
  .portrait-frame {
    width: min(320px, 78%);
  }
  .portrait-note {
    left: 9%;
  }
  .portrait-caption {
    left: 6%;
  }
  .hero-role {
    margin-top: 45px;
  }
  .hero-intro h1 {
    font-size: 4.65rem;
  }
  .note-grid,
  .workstation {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .works-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .about-sidebar {
    padding-right: max(12px, env(safe-area-inset-right));
    padding-left: max(58px, calc(env(safe-area-inset-left) + 58px));
  }
  .side-index {
    display: block;
  }
  .side-card-title {
    display: none;
  }
  .about-container {
    width: calc(100% - 32px);
    padding: 18px 0 max(44px, env(safe-area-inset-bottom));
  }
  .about-hero {
    gap: 26px;
    padding: 20px 0 48px;
  }
  .hero-portrait-wrap {
    min-height: 405px;
  }
  .portrait-frame {
    width: min(290px, 82%);
  }
  .portrait-note {
    top: 8px;
    left: 2px;
  }
  .portrait-caption {
    left: 1px;
  }
  .hero-kicker {
    flex-wrap: wrap;
    gap: 7px 10px;
  }
  .hero-kicker i {
    width: 30px;
  }
  .hero-role {
    margin-top: 38px;
  }
  .hero-intro h1 {
    font-size: 4.05rem;
  }
  .hero-motto {
    font-size: 1rem;
  }
  .hero-facts {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
  .hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero-actions button,
  .hero-actions a {
    width: 100%;
    padding-inline: 10px;
  }
  .hero-welcome {
    grid-template-columns: 44px minmax(0, 1fr) 34px;
    gap: 12px;
    padding: 16px;
  }
  .welcome-symbol {
    width: 42px;
    height: 42px;
  }
  .welcome-content h2 {
    font-size: 0.96rem;
  }
  .welcome-content p {
    margin-top: 5px;
    font-size: 0.69rem;
  }
  .hero-welcome button {
    width: 34px;
    height: 34px;
  }
  .content-section {
    padding: 62px 0;
    scroll-margin-top: 14px;
  }
  :deep(.section-head) {
    display: block;
    margin-bottom: 28px;
  }
  :deep(.section-head h2) {
    font-size: 1.72rem;
  }
  :deep(.section-head > p) {
    margin-top: 15px;
    text-align: left;
  }
  .prose {
    font-size: 0.87rem;
    line-height: 2;
  }
  .note-grid,
  .workstation {
    grid-template-columns: 1fr;
  }
  .note-card {
    min-height: 0;
  }
  .workstation-card {
    min-height: 164px;
  }
  .work-item {
    grid-template-columns: 32px minmax(0, 1fr) 14px;
    gap: 12px;
    padding-inline: 4px;
  }
  .timeline-list {
    padding-left: 35px;
  }
  .timeline-list::before {
    left: 11px;
  }
  .timeline-item {
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 13px;
    padding: 20px 0;
  }
  .timeline-item::before {
    top: 26px;
    left: -29px;
  }
  .values-copy {
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 11px;
    padding: 23px 18px;
  }
  .facts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .about-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  .about-footer > div:last-child {
    justify-items: start;
    text-align: left;
  }
}

@media (max-width: 420px) {
  .hero-portrait-wrap {
    min-height: 365px;
  }
  .portrait-frame {
    width: min(260px, 84%);
  }
  .hero-intro h1 {
    font-size: 3.45rem;
  }
  .hero-actions {
    grid-template-columns: 1fr;
  }
  .hero-welcome {
    grid-template-columns: 40px minmax(0, 1fr);
  }
  .hero-welcome button {
    display: none;
  }
  .facts-grid {
    grid-template-columns: 1fr;
  }
  .timeline-item {
    grid-template-columns: 72px minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .about-main {
    scroll-behavior: auto;
  }
  .hero-intro,
  .hero-portrait-wrap,
  .hero-welcome,
  .welcome-symbol span {
    animation: none;
  }
  .reveal-block {
    opacity: 1;
    transform: none;
  }
  .about-page-shell * {
    scroll-behavior: auto;
    transition-duration: 0.01ms !important;
  }
}
</style>
