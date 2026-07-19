<template>
  <div class="page-layout">
    <main id="main-content" class="article-main">
      <NuxtLink to="/home" class="back-btn">
        <Icon name="ph:arrow-left-bold" />
        返回首页
      </NuxtLink>

      <div class="post-header" :class="{ 'has-cover': article.hero }">
        <img v-if="article.hero" :src="article.hero" class="post-cover" :alt="article.title" />

        <div class="post-nav">
          <div class="operations">
            <button class="z-btn" id="share-btn" title="复制分享文本" @click="shareText">
              <Icon name="ph:share-bold" />
              <span>{{ shared ? '已复制' : '文字分享' }}</span>
            </button>
            <button class="z-btn" id="poster-btn" title="生成分享海报">
              <Icon name="ph:image-bold" />
              <span>海报分享</span>
            </button>
          </div>

          <div class="post-info">
            <a href="#" class="author-capsule">
              <img src="https://cdn.ncii.cn/picbase/lsky/2026/03/13/69b35f2e0be57.png" alt="作者" loading="lazy" />
              <span>{{ article.author || '作者' }}</span>
            </a>

            <span>
              <Icon name="ph:calendar-dots-bold" />
              <time>{{ article.date }}</time>
            </span>

            <span>
              <Icon name="ph:chat-circle-dots-bold" />
              <span>{{ article.comments }}</span> 评论
            </span>

            <span>
              <Icon name="ph:folder-bold" />
              <a>{{ article.tag }}</a>
            </span>

            <span>
              <Icon name="ph:eye-bold" />
              <span>{{ article.views }}</span> 阅读
            </span>
          </div>
        </div>

        <h1 class="post-title text-creative">{{ article.title }}</h1>
      </div>

      <div class="md-excerpt gradient-card" ref="excerptRef" data-animation="true" data-speed="30">
        <Icon name="ph:highlighter-bold" />
        <span id="excerpt-text" :data-text="article.excerpt"></span>
        <span id="excerpt-caret" class="excerpt-caret">_</span>
      </div>

      <div class="outdated-notice" ref="noticeRef" :data-publish-time="article.date" data-threshold="180" data-message="本文发布于 {days} 天前，内容可能已过时，请注意甄别。">
        <Icon name="ph:warning-circle-bold" />
        <span class="notice-text"></span>
      </div>

      <article class="article" ref="articleRef" v-html="article.content"></article>

      <div class="post-footer">
        <section class="tags-section">
          <div class="title text-creative">文章标签</div>
          <div class="content tags-list">
            <a v-for="tag in article.tags" :key="tag" href="#" class="tag-item">#{{ tag }}</a>
          </div>
        </section>

        <section class="license">
          <div class="title text-creative">许可协议</div>
          <div class="content">
            本文采用
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="vertical-align: -0.125em; display: inline">
                <path fill="currentColor" d="M9 8c1.104 0 2.105.448 2.829 1.173l-1.414 1.413a2 2 0 1 0 0 2.828l1.413 1.414A4.001 4.001 0 0 1 5 12c0-2.208 1.792-4 4-4m9.829 1.173A4.001 4.001 0 0 0 12 12a4.001 4.001 0 0 0 6.828 2.828l-1.414-1.414a2 2 0 1 1 0-2.828zM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12m10-8a8 8 0 1 0 0 16a8 8 0 0 0 0-16"/>
              </svg>
              <span>署名-非商业性使用-相同方式共享 4.0 国际</span>
            </a>
            许可协议，转载请注明出处。
          </div>
        </section>
      </div>

      <div class="surround-post">
        <a href="#" class="surround-link">
          <Icon name="solar:rewind-back-bold-duotone" />
          <div class="surround-text">
            <strong class="title text-creative">{{ prevArticle.title }}</strong>
            <span class="date">{{ prevArticle.date }}</span>
          </div>
        </a>

        <div class="surround-link align-end no-link">
          <Icon name="solar:reel-bold-duotone" />
          <div class="surround-text">
            <strong class="title">已抵达博客尽头</strong>
          </div>
        </div>
      </div>

      <h3 class="comment-title">
        <Icon name="ph:chat-circle-text-bold" />
        <span>评论区</span>
      </h3>

      <section class="z-comment" id="comment">
        <div class="comment-form-card">
          <div class="comment-form-header">
            <div class="comment-form-avatar">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" alt="avatar" />
            </div>
            <div class="comment-form-tabs">
              <button :class="{ active: commentTab === 'write' }" @click="commentTab = 'write'">
                <Icon name="ph:pencil-bold" />
                撰写
              </button>
              <button :class="{ active: commentTab === 'preview' }" @click="commentTab = 'preview'">
                <Icon name="ph:eye-bold" />
                预览
              </button>
            </div>
          </div>

          <div class="comment-form-body" v-show="commentTab === 'write'">
            <textarea v-model="newComment.content" class="comment-textarea" placeholder="写下你的评论..." rows="4" @input="autoResize" ref="commentTextarea"></textarea>
          </div>
          <div class="comment-preview" v-show="commentTab === 'preview'" v-html="renderedPreview"></div>

          <div class="comment-form-actions">
            <div class="comment-form-fields">
              <div class="field-row">
                <span class="field-icon"><Icon name="ph:user-bold" /></span>
                <input v-model="newComment.name" class="comment-input" placeholder="昵称 *" maxlength="20">
              </div>
              <div class="field-row">
                <span class="field-icon"><Icon name="ph:envelope-bold" /></span>
                <input v-model="newComment.email" class="comment-input" placeholder="邮箱">
              </div>
              <div class="field-row">
                <span class="field-icon"><Icon name="ph:link-bold" /></span>
                <input v-model="newComment.website" class="comment-input" placeholder="网站">
              </div>
            </div>
            <div class="form-bottom">
              <label class="comment-remember">
                <input type="checkbox" v-model="rememberMe">
                <span>记住我</span>
              </label>
              <button class="comment-submit" @click="submitComment" :disabled="!canSubmit">
                <Icon name="ph:paper-plane-right-fill" />
                <span>{{ submitting ? '提交中...' : '发表评论' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="comment-stats">
          <span class="comment-count-badge">
            <Icon name="ph:chat-circle-dots-bold" />
            {{ comments.length }} 条评论
          </span>
          <span class="comment-sort" @click="sortDesc = !sortDesc">
            <Icon :name="sortDesc ? 'ph:arrow-down-bold' : 'ph:arrow-up-bold'" />
            {{ sortDesc ? '最新优先' : '最早优先' }}
          </span>
        </div>

        <div v-if="comments.length === 0" class="comment-empty">
          <Icon name="ph:chat-centered-dots-bold" class="empty-icon" />
          <p>暂无评论，快来抢沙发吧~</p>
        </div>

        <transition-group name="comment-fade" tag="div" class="comment-list">
          <div v-for="(c, i) in sortedComments" :key="c.id || i" class="comment-item" :class="{ 'comment-hot': c.hot }">
            <img class="comment-avatar" :src="c.avatar" :alt="c.name">
            <div class="comment-body">
              <div class="comment-meta-row">
                <span class="comment-author">{{ c.name }}</span>
                <span v-if="c.hot" class="comment-badge hot"><Icon name="ph:fire-bold" /> 热评</span>
                <span v-if="c.author" class="comment-badge author">博主</span>
                <span class="comment-time">
                  <Icon name="ph:clock-bold" />
                  {{ c.time }}
                </span>
              </div>
              <div class="comment-text">{{ c.content }}</div>
              <div class="comment-actions">
                <button class="comment-action-btn" @click="likeComment(i)">
                  <Icon :name="c.liked ? 'ph:thumbs-up-fill' : 'ph:thumbs-up-bold'" />
                  <span>{{ c.likes || '' }}</span>
                </button>
                <button class="comment-action-btn" @click="replyTo(i)">
                  <Icon name="ph:arrow-bend-left-down-bold" />
                  <span>回复</span>
                </button>
                <button class="comment-action-btn" @click="reportComment(i)">
                  <Icon name="ph:flag-bold" />
                  <span>举报</span>
                </button>
              </div>
              <div v-if="c.replies && c.replies.length" class="comment-replies">
                <div v-for="(r, ri) in c.replies" :key="ri" class="reply-item">
                  <img class="reply-avatar" :src="r.avatar" :alt="r.name">
                  <div class="reply-body">
                    <span class="reply-author">{{ r.name }}</span>
                    <span class="reply-time">{{ r.time }}</span>
                    <div class="reply-text">{{ r.content }}</div>
                  </div>
                </div>
              </div>
              <div v-if="replyTarget === i" class="comment-reply-form">
                <input v-model="replyContent" class="reply-input" placeholder="写下你的回复..." @keyup.enter="submitReply">
                <button class="reply-submit" @click="submitReply">
                  <Icon name="ph:arrow-bend-right-up-bold" />
                </button>
              </div>
            </div>
          </div>
        </transition-group>

        <div v-if="comments.length >= 5" class="comment-more">
          <button class="load-more-btn" @click="loadMore">
            <Icon name="ph:arrow-circle-down-bold" />
            加载更多评论
          </button>
        </div>
      </section>
    </main>

    <aside id="z-aside" class="sidebar-right">
      <section class="widget toc-widget" id="catalog-widget" ref="catalogWidget">
        <hgroup class="widget-title">
          <span class="title-text">文章目录</span>
          <a href="#" aria-label="点赞文章" :class="{ liked }" @click.prevent="toggleLike">
            <Icon :name="liked ? 'ph:heart-fill' : 'ph:heart-bold'" />
            <span class="like-count" v-if="likeCount > 0">{{ likeCount }}</span>
          </a>
          <a href="#main-content" aria-label="返回顶部" data-title="返回顶部" @click.prevent="scrollToTop">
            <Icon name="ph:arrow-circle-up-bold" />
          </a>
          <a href="#comment" aria-label="评论区" data-title="评论区" @click.prevent="scrollToComment">
            <Icon name="ph:chat-circle-text-bold" />
          </a>
        </hgroup>

        <div class="widget-body widget-card toc-body">
          <nav id="catalog-content" class="toc-nav"></nav>
          <p id="no-toc-tip" class="no-toc" style="display: none">暂无目录信息</p>
        </div>
      </section>

      <footer class="z-footer">
        <div class="footer-inject"></div>
        <p>© <span>{{ new Date().getFullYear() }}</span> <span>Corner Blog</span></p>
      </footer>
    </aside>
  </div>
</template>

<script setup lang="ts">
interface Reply {
  name: string
  avatar: string
  time: string
  content: string
}

interface Comment {
  id?: number
  name: string
  avatar: string
  time: string
  content: string
  hot?: boolean
  author?: boolean
  liked?: boolean
  likes?: number
  replies?: Reply[]
}

const route = useRoute()
const slug = route.params.slug as string

const article = ref({
  author: 'Swaggy Macro',
  tag: '游戏人生',
  title: '《极限竞速：地平线 6》还未上线就被提前破解？附下载地址',
  date: '2026-05-11',
  comments: 6,
  views: 186,
  hero: 'https://cdn.ncii.cn/picbase/lsky/2026/05/11/6a014be8ac989.webp',
  excerpt: '《极限竞速：地平线6》因Steamworks失误导致游戏文件泄露，微软采取极端措施对提前体验的玩家实施硬件ID封禁，封禁期限设定为9999年12月31日。',
  content: `
    <p><strong>由于 Steamworks 发布失误，《极限竞速：地平线 6》在发售前出现无 DRM 保护的可玩版本泄露。</strong></p>
    <p>微软随即采取空前严厉措施，对提前进入游戏的玩家处以硬件 ID 封禁。</p>
    <h1 id="qian-yan">前言</h1>
    <p>《极限竞速：地平线 6》疑似遭遇数据泄露，开发商 Playground Games 上传了约 155 GB 未加密游戏文件。</p>
  `,
  tags: ['极限竞速', '破解版', '游戏', '地平线6']
})

const prevArticle = ref({
  title: '部署私有化端到端加密即时通讯平台并实现消息定期清空',
  date: '2026-05-05'
})

const shared = ref(false)
const liked = ref(false)
const likeCount = ref(0)
const commentTab = ref<'write' | 'preview'>('write')
const submitting = ref(false)
const rememberMe = ref(true)
const sortDesc = ref(true)
const replyTarget = ref<number | null>(null)
const replyContent = ref('')
const commentTextarea = ref<HTMLTextAreaElement | null>(null)

const excerptRef = ref<HTMLElement | null>(null)
const noticeRef = ref<HTMLElement | null>(null)
const articleRef = ref<HTMLElement | null>(null)
const catalogWidget = ref<HTMLElement | null>(null)

const newComment = ref({ name: '游客', email: '', website: '', content: '' })

const comments = ref<Comment[]>([
  {
    id: 1, name: '林间小径', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop&crop=face',
    time: '3 天前', content: '写得好！Rust 确实是一门值得学习的语言。封禁到 9999 年也太狠了😂',
    hot: true, likes: 12, liked: false,
    replies: [
      { name: 'Swaggy Macro', avatar: 'https://cdn.ncii.cn/picbase/lsky/2026/03/13/69b35f2e0be57.png', time: '2 天前', content: '确实，硬件封禁基本等于要换主板了。' }
    ]
  },
  {
    id: 2, name: '数字花园', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face',
    time: '1 天前', content: '155GB 未加密文件直接上传，这操作也太离谱了。',
    likes: 5, liked: false
  },
  {
    id: 3, name: '代码诗人', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=48&h=48&fit=crop&crop=face',
    time: '5 小时前', content: '强烈建议支持正版！不过确实想提前体验一下🤔', author: true, likes: 8, liked: false
  },
])

const commentsPool = ref<Comment[]>([])
const page = ref(1)

const sortedComments = computed(() => {
  const list = [...comments.value]
  return sortDesc.value ? list.reverse() : list
})

const canSubmit = computed(() =>
  newComment.value.content.trim().length > 0 && newComment.value.name.trim().length > 0
)

function submitComment() {
  if (!canSubmit.value) return
  submitting.value = true
  const c: Comment = {
    id: Date.now(),
    name: newComment.value.name,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=face',
    time: '刚刚',
    content: newComment.value.content,
    likes: 0,
    liked: false,
    replies: []
  }
  comments.value.push(c)
  newComment.value = { name: newComment.value.name, email: '', website: '', content: '' }
  setTimeout(() => { submitting.value = false }, 300)
}

function likeComment(i: number) {
  const c = comments.value[i]
  if (!c) return
  c.liked = !c.liked
  c.likes = (c.likes || 0) + (c.liked ? 1 : -1)
}

function replyTo(i: number) {
  replyTarget.value = replyTarget.value === i ? null : i
}

function submitReply() {
  if (!replyContent.value.trim() || replyTarget.value === null) return
  const c = comments.value[replyTarget.value]
  if (!c) return
  if (!c.replies) c.replies = []
  c.replies.push({
    name: newComment.value.name || '游客',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
    time: '刚刚',
    content: replyContent.value
  })
  replyContent.value = ''
  replyTarget.value = null
}

function reportComment(i: number) {
  const c = comments.value[i]
  if (!c) return
  alert('已举报该评论，我们将尽快处理。')
}

function loadMore() {
  page.value++
}

const renderedPreview = computed(() => {
  const text = newComment.value.content
  return text.replace(/\n/g, '<br>').replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank">$&</a>')
})

function autoResize(e: Event) {
  const ta = e.target as HTMLTextAreaElement
  ta.style.height = 'auto'
  ta.style.height = ta.scrollHeight + 'px'
}

function shareText() {
  const text = `【卖烤肉】${article.value.title}\n\n${article.value.excerpt || ''}\n\n${window.location.href}`
  navigator.clipboard.writeText(text).then(() => {
    shared.value = true
    setTimeout(() => { shared.value = false }, 2000)
  })
}

function toggleLike() {
  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToComment() {
  document.getElementById('comment')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  typeExcerpt()
  checkOutdated()
  generateCatalog()
})

function typeExcerpt() {
  const container = excerptRef.value
  if (!container || container.dataset.animation === 'false') return
  const el = document.getElementById('excerpt-text')
  const caret = document.getElementById('excerpt-caret')
  if (!el) return
  const text = el.dataset.text || ''
  const speed = parseInt(container.dataset.speed || '30')
  let index = 0
  function type() {
    if (index < text.length) {
      el.textContent += text[index]
      index++
      setTimeout(type, speed)
    } else {
      if (caret) caret.style.display = 'none'
    }
  }
  type()
}

function checkOutdated() {
  const notice = noticeRef.value
  if (!notice) return
  const publishTime = new Date(notice.dataset.publishTime!).getTime()
  const threshold = parseInt(notice.dataset.threshold || '180')
  const messageTemplate = notice.dataset.message || ''
  const now = Date.now()
  const daysPassed = Math.floor((now - publishTime) / (1000 * 60 * 60 * 24))
  if (daysPassed >= threshold) {
    const text = messageTemplate.replace('{days}', String(daysPassed))
    notice.querySelector('.notice-text')!.textContent = text
    notice.style.display = 'flex'
  }
}

function generateCatalog() {
  const article = articleRef.value || document.querySelector('.article')
  const catalogWidget = document.getElementById('catalog-widget')
  const catalogContent = document.getElementById('catalog-content')
  const noTocTip = document.getElementById('no-toc-tip')
  if (!article || !catalogWidget || !catalogContent) return

  const headers = Array.from(article.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  if (headers.length === 0) {
    catalogWidget.style.display = 'block'
    catalogContent.style.display = 'none'
    if (noTocTip) noTocTip.style.display = 'block'
    return
  }

  catalogWidget.style.display = 'block'
  catalogContent.style.display = 'block'
  if (noTocTip) noTocTip.style.display = 'none'
  catalogContent.innerHTML = ''

  const root: any = { children: [] }
  const stack: any[] = [root]

  headers.forEach((header: any, index: number) => {
    if (!header.id) header.id = 'heading-' + index
    const level = parseInt(header.tagName.substring(1))
    const item: any = { id: header.id, text: header.textContent, level, children: [] }
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
    stack[stack.length - 1].children.push(item)
    stack.push(item)
  })

  function renderTree(items: any[]): HTMLElement | null {
    if (!items.length) return null
    const ol = document.createElement('ol')
    items.forEach(item => {
      const li = document.createElement('li')
      li.dataset.id = item.id
      li.dataset.level = String(item.level || 1)
      if (item.children && item.children.length > 0) li.classList.add('toc-collapsed')
      const wrapper = document.createElement('div')
      wrapper.className = 'toc-item-wrapper'
      const a = document.createElement('a')
      a.href = '#' + item.id
      a.textContent = item.text
      a.title = item.text
      a.onclick = (e) => {
        e.preventDefault()
        const target = document.getElementById(item.id)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' })
          history.pushState(null, null, '#' + item.id)
        }
      }
      wrapper.appendChild(a)
      if (item.children && item.children.length > 0) {
        const toggle = document.createElement('span')
        toggle.className = 'toc-toggle'
        toggle.innerHTML = '▸'
        toggle.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          li.classList.toggle('toc-collapsed')
          li.classList.toggle('toc-expanded')
        }
        wrapper.appendChild(toggle)
      }
      li.appendChild(wrapper)
      const childrenOl = renderTree(item.children)
      if (childrenOl) {
        childrenOl.className = 'toc-children'
        li.appendChild(childrenOl)
      }
      ol.appendChild(li)
    })
    return ol
  }

  const treeDom = renderTree(root.children)
  if (treeDom) catalogContent.appendChild(treeDom)
}
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
  padding: 28px 32px;
  min-width: 0;
}
.article-main::-webkit-scrollbar {
  display: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--c-text-2);
  text-decoration: none;
  margin-bottom: 18px;
  transition: color 0.2s;
}
.back-btn:hover {
  color: var(--c-primary);
}

/* ===== Post Header ===== */
.post-header {
  margin-bottom: 24px;
}
.post-cover {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 20px;
  max-height: 360px;
  object-fit: cover;
  display: block;
}
.post-nav {
  margin-bottom: 16px;
}
.operations {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.z-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}
.z-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.z-btn .icon {
  font-size: 0.85rem;
}

.post-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 0.72rem;
  color: var(--c-text-2);
}
.post-info span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.post-info a {
  color: var(--c-text-2);
  text-decoration: none;
}
.post-info a:hover {
  color: var(--c-primary);
}
.author-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: var(--c-text-1);
  font-weight: 600;
}
.author-capsule img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}
.post-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--c-text);
  margin: 0;
}

/* ===== Excerpt ===== */
.md-excerpt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 20px;
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.7;
  color: var(--c-text-2);
  position: relative;
  overflow: hidden;
}
.md-excerpt::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--c-primary-soft), transparent 60%);
  opacity: 0.3;
  pointer-events: none;
}
.md-excerpt .icon {
  flex-shrink: 0;
  font-size: 0.9rem;
  position: relative;
  z-index: 0;
}
#excerpt-text {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 0;
}
.excerpt-caret {
  animation: blink 0.8s infinite;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* ===== Outdated Notice ===== */
.outdated-notice {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 20px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #b45309;
  font-size: 0.75rem;
}
:root.dark .outdated-notice {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

/* ===== Article Content ===== */
.article {
  font-size: 0.95rem;
  line-height: 1.9;
  color: var(--c-text);
}
.article h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 30px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  color: var(--c-text);
}
.article h2 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 26px 0 10px;
  padding-bottom: 6px;
  color: var(--c-text);
}
.article h3 {
  font-size: 1.02rem;
  font-weight: 700;
  margin: 20px 0 8px;
  color: var(--c-text);
}
.article p {
  margin-bottom: 14px;
}
.article code {
  background: var(--code-bg);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--c-text);
}
.article pre {
  background: var(--code-bg);
  border-radius: 10px;
  padding: 16px 18px;
  margin: 18px 0;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.7;
}
.article pre code {
  background: none;
  padding: 0;
}
.article blockquote {
  border-left: 3px solid var(--c-primary);
  padding: 10px 16px;
  margin: 18px 0;
  background: var(--c-primary-soft);
  border-radius: 0 8px 8px 0;
  color: var(--c-text-2);
  font-style: italic;
}
.article ul, .article ol {
  margin: 10px 0 14px 20px;
}
.article li {
  margin-bottom: 5px;
}
.article img {
  max-width: 100%;
  border-radius: 10px;
  margin: 14px 0;
}
.article table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 0.85rem;
}
.article th, .article td {
  padding: 8px 12px;
  border: 1px solid var(--border);
  text-align: left;
}
.article th {
  background: var(--c-bg-2);
  font-weight: 600;
}

/* ===== Post Footer ===== */
.post-footer {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.title.text-creative {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 10px;
  letter-spacing: 0.03em;
}
.tags-section {
  margin-bottom: 24px;
}
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-item {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
  font-size: 0.7rem;
  color: var(--c-text-2);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}
.tag-item:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.license .content {
  font-size: 0.75rem;
  color: var(--c-text-2);
  line-height: 1.6;
}
.license a {
  color: var(--c-primary);
  text-decoration: none;
}

/* ===== Surround Post ===== */
.surround-post {
  display: flex;
  gap: 14px;
  margin-top: 24px;
}
.surround-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--ld-bg-card);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}
.surround-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5em 1em var(--ld-shadow);
}
.surround-link .icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}
.surround-text {
  flex: 1;
  min-width: 0;
}
.surround-text .title {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.surround-text .date {
  font-size: 0.65rem;
  color: var(--c-text-2);
  margin-top: 2px;
  display: block;
}
.surround-link.align-end {
  text-align: right;
}
.surround-link.no-link {
  cursor: default;
  opacity: 0.6;
}
.surround-link.no-link:hover {
  transform: none;
  box-shadow: none;
}

/* ===== Comment Section ===== */
.comment-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 32px 0 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.z-comment {
  margin-bottom: 24px;
}

/* Comment Form Card */
.comment-form-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px var(--ld-shadow);
}
.comment-form-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.comment-form-avatar img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.comment-form-tabs {
  display: flex;
  gap: 2px;
  background: var(--c-bg-2);
  border-radius: 8px;
  padding: 2px;
}
.comment-form-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s;
}
.comment-form-tabs button.active {
  background: var(--c-bg-1);
  color: var(--c-primary);
  box-shadow: 0 1px 3px var(--ld-shadow);
}
.comment-form-tabs button .icon {
  font-size: 0.75rem;
}
.comment-form-body {
  margin-bottom: 12px;
}
.comment-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.82rem;
  outline: none;
  resize: none;
  transition: border 0.2s;
  line-height: 1.6;
}
.comment-textarea:focus {
  border-color: var(--c-primary);
}
.comment-textarea::placeholder {
  color: var(--c-text-3);
}
.comment-preview {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--c-bg-1);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--c-text);
  min-height: 80px;
  margin-bottom: 12px;
}
.comment-form-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comment-form-fields {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 120px;
  background: var(--c-bg-1);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 0 8px;
  transition: border 0.2s;
}
.field-row:focus-within {
  border-color: var(--c-primary);
}
.field-icon {
  color: var(--c-text-3);
  font-size: 0.8rem;
  display: flex;
}
.comment-input {
  flex: 1;
  padding: 7px 4px;
  border: none;
  background: transparent;
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.78rem;
  outline: none;
}
.comment-input::placeholder {
  color: var(--c-text-3);
}
.form-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.comment-remember {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  cursor: pointer;
}
.comment-remember input {
  accent-color: var(--c-primary);
}
.comment-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.comment-submit:hover {
  opacity: 0.9;
}
.comment-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.comment-submit .icon {
  font-size: 0.85rem;
}

/* Comment Stats */
.comment-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.comment-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--c-text-1);
  font-weight: 600;
}
.comment-count-badge .icon {
  color: var(--c-primary);
}
.comment-sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  cursor: pointer;
  transition: color 0.15s;
}
.comment-sort:hover {
  color: var(--c-primary);
}

/* Comment Empty */
.comment-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--c-text-3);
}
.comment-empty .empty-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
  opacity: 0.5;
}
.comment-empty p {
  font-size: 0.82rem;
}

/* Comment List */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comment-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--ld-bg-card);
  border-radius: 12px;
  box-shadow: 0 1px 3px var(--ld-shadow);
  transition: all 0.2s;
}
.comment-item.comment-hot {
  border-left: 3px solid #f59e0b;
}
.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
}
.comment-body {
  flex: 1;
  min-width: 0;
}
.comment-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.comment-author {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
}
.comment-badge {
  display: inline-block;
  font-size: 0.55rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.comment-badge.hot {
  background: #f59e0b20;
  color: #f59e0b;
}
.comment-badge.author {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.comment-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: var(--c-text-3);
  margin-left: auto;
}
.comment-time .icon {
  font-size: 0.6rem;
}
.comment-text {
  font-size: 0.82rem;
  color: var(--c-text-1);
  line-height: 1.6;
  margin-bottom: 8px;
}
.comment-actions {
  display: flex;
  gap: 12px;
}
.comment-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  border: none;
  background: none;
  color: var(--c-text-3);
  font-family: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: color 0.15s;
}
.comment-action-btn:hover {
  color: var(--c-primary);
}
.comment-action-btn .icon {
  font-size: 0.75rem;
}

/* Comment Replies */
.comment-replies {
  margin-top: 10px;
  padding: 10px 0 0 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reply-item {
  display: flex;
  gap: 8px;
}
.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.reply-body {
  flex: 1;
  min-width: 0;
}
.reply-author {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--c-text);
  margin-right: 6px;
}
.reply-time {
  font-size: 0.6rem;
  color: var(--c-text-3);
}
.reply-text {
  font-size: 0.78rem;
  color: var(--c-text-1);
  line-height: 1.5;
  margin-top: 2px;
}
.comment-reply-form {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  align-items: center;
}
.reply-input {
  flex: 1;
  padding: 6px 10px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.75rem;
  outline: none;
  transition: border 0.2s;
}
.reply-input:focus {
  border-color: var(--c-primary);
}
.reply-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
}
.reply-submit:hover {
  opacity: 0.9;
}

/* Load More */
.comment-more {
  text-align: center;
  margin-top: 14px;
}
.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.load-more-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

/* Transitions */
.comment-fade-enter-active,
.comment-fade-leave-active {
  transition: all 0.3s ease;
}
.comment-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.comment-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ===== Right Sidebar ===== */
.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sidebar-right::-webkit-scrollbar {
  display: none;
}

/* ===== TOC Widget ===== */
.widget.toc-widget {
  display: none;
}
.widget-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.title-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text);
  flex: 1;
  letter-spacing: 0.05em;
}
.widget-title a {
  color: var(--c-text-2);
  text-decoration: none;
  font-size: 0.8rem;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
.widget-title a:hover {
  color: var(--c-primary);
}
.widget-title a.liked {
  color: #ef4444;
}
.like-count {
  font-size: 0.6rem;
  margin-left: 2px;
}
.toc-body {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}
.toc-body::-webkit-scrollbar {
  display: none;
}
.toc-nav ol {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
.toc-nav ol ol {
  padding-left: 14px;
}
.toc-nav li {
  margin-bottom: 2px;
}
.toc-nav li.active > .toc-item-wrapper a {
  color: var(--c-primary);
  border-left-color: var(--c-primary);
}
.toc-nav li.has-active > .toc-item-wrapper a {
  color: var(--c-primary);
}
.toc-item-wrapper {
  display: flex;
  align-items: center;
}
.toc-item-wrapper a {
  flex: 1;
  display: block;
  padding: 4px 0 4px 8px;
  font-size: 0.74rem;
  color: var(--c-text-2);
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: all 0.15s;
  line-height: 1.5;
}
.toc-item-wrapper a:hover {
  color: var(--c-primary);
  border-left-color: var(--c-primary);
}
.toc-toggle {
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.6rem;
  color: var(--c-text-3);
  transition: transform 0.15s;
  user-select: none;
}
.toc-expanded > .toc-item-wrapper .toc-toggle {
  transform: rotate(90deg);
}
.toc-collapsed > .toc-children {
  display: none;
}
.no-toc {
  font-size: 0.72rem;
  color: var(--c-text-3);
  padding: 8px 0;
  display: none;
}

/* ===== Footer ===== */
.z-footer {
  margin-top: auto;
  padding-top: 20px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  text-align: center;
}
.footer-inject {
  margin-bottom: 8px;
}
</style>
