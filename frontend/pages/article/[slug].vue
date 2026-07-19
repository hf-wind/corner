<template>
  <div class="page-layout">
    <main class="article-main">
    <NuxtLink to="/home" class="back-btn">← 返回首页</NuxtLink>

    <div class="article-header">
      <span class="article-tag">{{ article.tag }}</span>
      <h1>{{ article.title }}</h1>
      <div class="article-meta">
        <span>📅 {{ article.date }}</span>
        <span>⏱ 阅读 {{ article.readTime }} 分钟</span>
        <span>💬 {{ article.comments }} 条</span>
        <span>👁 {{ article.views }} 阅读</span>
      </div>
    </div>

    <img v-if="article.hero" class="article-hero-img" :src="article.hero" alt="cover">

    <div class="article-content" v-html="article.content" />

    <div class="article-tags">
      <span>标签：</span>
      <span v-for="tag in article.tags" :key="tag" class="tag-item">{{ tag }}</span>
    </div>
    </main>
    <aside class="sidebar-right">
    <div class="toc-card">
      <h3>目录</h3>
      <ul class="toc-list">
        <li v-for="item in toc" :key="item.text">
          <a :class="{ indent: item.level === 3 }" href="#">{{ item.text }}</a>
        </li>
      </ul>
    </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const article = ref({
  tag: '技术',
  title: '用 Rust 重写我的个人博客系统',
  date: '2025-07-10',
  readTime: 12,
  comments: 36,
  views: '2.1K',
  hero: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900&h=400&fit=crop',
  content: `
    <h2>为什么是 Rust？</h2>
    <p>在过去的三年里，我的博客一直运行在 Node.js + Express 的架构上。虽然它工作得很好，但随着文章数量的增加，构建时间越来越长，内存占用也越来越高。作为一个对性能有追求的开发者，我决定用 Rust 来重写整个系统。</p>
    <blockquote><p>Rust 不仅是一门编程语言，更是一种思维方式。它教会你用更安全、更高效的方式思考问题。</p></blockquote>
    <h2>技术选型</h2>
    <p>经过仔细调研，我选择了以下技术栈：</p>
    <ul>
      <li><strong>Actix Web</strong> 作为 Web 框架</li>
      <li><strong>Askama</strong> 作为模板引擎</li>
      <li><strong>Sled</strong> 作为嵌入式数据库</li>
      <li><strong>Pulldown-cmark</strong> 解析 Markdown</li>
    </ul>
    <h3>项目结构</h3>
    <pre><code>blog-rust/\n├── src/\n│   ├── main.rs\n│   ├── routes/\n│   │   ├── mod.rs\n│   │   ├── index.rs\n│   │   └── article.rs\n│   ├── models/\n│   │   └── post.rs\n│   └── templates/\n│       ├── base.html\n│       └── index.html\n├── content/\n│   └── posts/\n├── Cargo.toml\n└── static/</code></pre>
    <h2>核心实现</h2>
    <p>整个系统的核心在于 Markdown 到 HTML 的转换，以及文章的索引和搜索功能。Rust 的零成本抽象让这一切变得异常高效。</p>
    <p>构建时间从 Node.js 的 <code>45s</code> 缩短到了 Rust 的 <code>1.2s</code>，内存占用从 <code>256MB</code> 降到了 <code>18MB</code>。这不仅仅是数字上的提升，更是一种开发体验的质变。</p>
    <h2>遇到的挑战</h2>
    <p>当然，迁移过程并非一帆风顺。Rust 的所有权系统、生命周期标注都让我吃了不少苦头。但正是这些"麻烦"，最终让代码变得更加健壮和可靠。</p>
    <p>特别是处理 Markdown 中的图片路径转换时，我花了整整一个下午来理解借用检查器的逻辑。但最终的代码简洁得令人满意。</p>
    <pre><code>fn transform_image_paths(html: &str, base_url: &str) -> String {\n    let re = Regex::new(r#"src="([^"]+)"#).unwrap();\n    re.replace_all(html, |caps: &Captures| {\n        let path = &caps[1];\n        if path.starts_with("http") {\n            format!("src=\\"{}\\"", path)\n        } else {\n            format!("src=\\"{}/{}\\"", base_url, path)\n        }\n    }).to_string()\n}</code></pre>
    <h2>总结</h2>
    <p>这次重写让我深刻体会到：选择合适的工具是多么重要。Rust 不是银弹，但它确实是构建高性能、高可靠性系统的绝佳选择。</p>
    <p>如果你也在考虑重写自己的博客系统，不妨试试 Rust。虽然学习曲线陡峭，但收获的远比付出的多。</p>
  `,
  tags: ['Rust', '博客', '前端', '性能优化']
})

const toc = computed(() => {
  const div = document.createElement('div')
  div.innerHTML = article.value.content
  const headings = div.querySelectorAll('h2, h3')
  return Array.from(headings).map(h => ({
    text: h.textContent || '',
    level: Number(h.tagName[1])
  }))
})
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.article-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 48px;
  min-width: 0;
}
.article-main::-webkit-scrollbar {
  display: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 20px;
  transition: color 0.2s;
}
.back-btn:hover {
  color: var(--accent);
}

.article-header {
  margin-bottom: 32px;
}
.article-tag {
  display: inline-block;
  font-size: 0.68rem;
  padding: 3px 12px;
  border-radius: 20px;
  background: var(--accent-light);
  color: var(--accent);
  margin-bottom: 12px;
}
.article-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 12px;
}
.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.article-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.article-hero-img {
  width: 100%;
  border-radius: 14px;
  margin-bottom: 32px;
  max-height: 360px;
  object-fit: cover;
}

.article-content {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--text);
}
.article-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 32px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.article-content h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 24px 0 10px;
}
.article-content p {
  margin-bottom: 16px;
}
.article-content code {
  background: var(--code-bg);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.85em;
}
.article-content pre {
  background: var(--code-bg);
  border-radius: 10px;
  padding: 18px 20px;
  margin: 20px 0;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.7;
}
.article-content pre code {
  background: none;
  padding: 0;
}
.article-content blockquote {
  border-left: 3px solid var(--accent);
  padding: 12px 18px;
  margin: 20px 0;
  background: var(--accent-light);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
  font-style: italic;
}
.article-content ul, .article-content ol {
  margin: 12px 0 16px 20px;
}
.article-content li {
  margin-bottom: 6px;
}
.article-content img {
  max-width: 100%;
  border-radius: 10px;
  margin: 16px 0;
}

.article-tags {
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}
.article-tags span {
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.tag-item {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  font-size: 0.72rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.tag-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 16px;
  overflow-y: auto;
}
.sidebar-right::-webkit-scrollbar {
  display: none;
}

.toc-card {
  position: sticky;
  top: 0;
}
.toc-card h3 {
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0.05em;
}
.toc-list {
  list-style: none;
}
.toc-list li {
  margin-bottom: 4px;
}
.toc-list a {
  display: block;
  padding: 5px 0 5px 12px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: all 0.2s;
  line-height: 1.5;
}
.toc-list a:hover,
.toc-list a.active {
  color: var(--accent);
  border-left-color: var(--accent);
}
.toc-list .indent {
  padding-left: 26px;
  font-size: 0.74rem;
}
</style>
