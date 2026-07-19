<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 关于</div>

      <div class="about-hero">
        <img class="about-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" alt="avatar">
        <div class="about-name">清欢小筑</div>
        <div class="about-slogan">「雨过天晴云破处，这般颜色做将来」</div>
        <div class="about-social">
          <a href="#" title="GitHub"><Icon name="ph:github-logo-bold" /></a>
          <a href="#" title="Twitter"><Icon name="ph:twitter-logo-bold" /></a>
          <a href="#" title="Email"><Icon name="ph:envelope-bold" /></a>
          <a href="#" title="RSS"><Icon name="ph:rss-bold" /></a>
        </div>
      </div>

      <div class="about-section">
        <h3><Icon name="ph:hand-waving-bold" /> Hi there</h3>
        <p>我是一个热爱技术与生活的开发者。白天写代码，晚上写文字。相信代码可以改变世界，文字可以温暖人心。</p>
        <p>这个博客是我的数字花园，记录着技术探索、生活感悟、旅行见闻。希望这些文字能给你带来一些启发或共鸣。</p>
        <p>如果你也喜欢安静地写点东西，欢迎常来坐坐。</p>
      </div>

      <div class="about-section">
        <h3><Icon name="ph:wrench-bold" /> 技能栈</h3>
        <div class="skills-grid">
          <div v-for="s in skills" :key="s.name" class="skill-item">
            <div class="skill-name">{{ s.name }}</div>
            <div class="skill-bar"><div class="skill-fill" :style="{ width: s.level + '%' }"></div></div>
            <div class="skill-percent">{{ s.level }}%</div>
          </div>
        </div>
      </div>

      <div class="about-section">
        <h3><Icon name="ph:calendar-bold" /> 时间线</h3>
        <div class="about-timeline">
          <div v-for="item in timeline" :key="item.year" class="about-timeline-item">
            <div class="about-timeline-date">{{ item.year }}</div>
            <div class="about-timeline-title">{{ item.title }}</div>
            <div class="about-timeline-desc">{{ item.desc }}</div>
          </div>
        </div>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">联系方式</div>
        <div class="contact-list">
          <div v-for="c in contacts" :key="c.label" class="contact-item">
            <span style="width:20px;text-align:center;display:inline-flex;align-items:center;justify-content:center;"><Icon :name="c.icon" /></span>
            <span style="color:var(--text-secondary);">{{ c.value }}</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">站点信息</div>
        <div class="site-info-list">
          <div v-for="info in siteInfo" :key="info.label" class="site-info-item">
            <span>{{ info.label }}</span>
            <span>{{ info.value }}</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">使用工具</div>
        <div class="tools-wrap">
          <span v-for="t in tools" :key="t" class="tool-tag">{{ t }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const skills = [
  { name: 'Vue / Nuxt', level: 90 },
  { name: 'Rust', level: 75 },
  { name: 'TypeScript', level: 88 },
  { name: 'Node.js', level: 82 },
  { name: 'PostgreSQL', level: 70 },
  { name: 'Docker', level: 65 },
]

const timeline = [
  { year: '2025', title: '博客 v3.0 上线', desc: '全新设计，Nuxt 3 + NestJS 重构完成' },
  { year: '2024', title: '开始学习 Rust', desc: '从 Web 开发转向系统编程，探索更多可能' },
  { year: '2023', title: '博客 v2.0', desc: '从 Hexo 迁移到 Vue 自建系统' },
  { year: '2022', title: '开始写博客', desc: '用 Hexo 搭建了第一个博客' },
]

const contacts = [
  { icon: 'ph:envelope-bold', label: 'Email', value: 'hello@corner.ink' },
  { icon: 'ph:github-logo-bold', label: 'GitHub', value: 'github.com/corner' },
  { icon: 'ph:twitter-logo-bold', label: 'Twitter', value: '@corner_ink' },
]

const siteInfo = [
  { label: '建站时间', value: '2022 年' },
  { label: '运行天数', value: '365 天' },
  { label: '文章总数', value: '128 篇' },
  { label: '总字数', value: '28 万' },
]

const tools = ['Nuxt 3', 'NestJS', 'PostgreSQL', 'Redis', 'Docker', 'Vercel']
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  min-width: 0;
}

.section-title {
  font-size: 0.82rem;
  color: var(--c-text-2);
  letter-spacing: 0.12em;
  margin-bottom: 14px;
  padding-left: 4px;
}

.about-hero {
  background: var(--ld-bg-card);
  border-radius: 14px;
  padding: 40px;
  box-shadow: 0 2px 4px var(--ld-shadow);
  margin-bottom: 28px;
  text-align: center;
  transition: all 0.2s;
}

.about-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--c-primary);
  box-shadow: 0 0 0 6px var(--c-primary-soft);
  margin-bottom: 20px;
}

.about-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--c-text);
}

.about-slogan {
  font-size: 0.92rem;
  color: var(--c-text-2);
  font-style: italic;
  margin-bottom: 20px;
}

.about-social {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.about-social a {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.about-social a:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.about-section {
  background: var(--ld-bg-card);
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 2px 4px var(--ld-shadow);
  margin-bottom: 20px;
  transition: box-shadow 0.3s;
}

.about-section:hover {
  box-shadow: 0 8px 24px var(--ld-shadow-md);
}



.about-section h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text);
}

.about-section p {
  font-size: 0.88rem;
  color: var(--c-text-2);
  line-height: 1.8;
  margin-bottom: 12px;
}

.about-section p:last-child {
  margin-bottom: 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.skill-item {
  padding: 16px;
  background: var(--c-bg-1);
  border-radius: 10px;
  transition: background 0.3s;
}

.skill-item:hover {
  background: var(--c-bg-2);
}

.skill-name {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--c-text);
}

.skill-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.skill-fill {
  height: 100%;
  background: var(--c-primary);
  border-radius: 3px;
}

.skill-percent {
  font-size: 0.68rem;
  color: var(--c-text-2);
  text-align: right;
  margin-top: 4px;
}

.about-timeline {
  position: relative;
  padding-left: 20px;
}

.about-timeline::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.about-timeline-item {
  position: relative;
  margin-bottom: 20px;
  padding-left: 16px;
  transition: transform 0.2s;
}

.about-timeline-item:hover {
  transform: translateX(4px);
}

.about-timeline-item::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-soft);
}

.about-timeline-date {
  font-size: 0.7rem;
  color: var(--c-primary);
  font-weight: 700;
  margin-bottom: 4px;
}

.about-timeline-title {
  font-size: 0.88rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--c-text);
}

.about-timeline-desc {
  font-size: 0.78rem;
  color: var(--c-text-2);
  line-height: 1.6;
}

.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 4px var(--ld-shadow);
  transition: all 0.2s;
}

.right-card-title {
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0.05em;
  color: var(--c-text);
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.78rem;
  color: var(--c-text);
}

.site-info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--c-text-2);
}

.site-info-item {
  display: flex;
  justify-content: space-between;
}

.tools-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-tag {
  padding: 4px 10px;
  border-radius: 16px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.7rem;
}
</style>
