<template>
  <div class="article-create-page">
    <section class="article-create-hero">
      <div class="hero-copy">
        <p class="hero-eyebrow">Article Draft</p>
        <h1>把灵感整理成一篇文章</h1>
        <p class="hero-desc">
          先写想法、片段、要点或结构，AI 会帮你生成一篇完整草稿，再进入预览和后续编辑。
        </p>
      </div>
      <div class="hero-badges">
        <span>灵感输入</span>
        <span>AI 成稿</span>
        <span>自动建草稿</span>
      </div>
    </section>

    <section class="article-create-card">
      <div class="card-head">
        <div>
          <p class="card-eyebrow">灵感容器</p>
          <h2>不用一开始就写完整，先把最想表达的东西放进来</h2>
        </div>
        <span class="card-count">{{ outline.trim().length }} 字</span>
      </div>

      <a-textarea
        v-model:value="outline"
        :rows="14"
        :disabled="generating"
        class="outline-input"
        placeholder="比如：想写一篇关于最近生活节奏变化的文章。前半部分写为什么开始慢下来，中间写散步、读书、听歌这些具体细节，结尾写自己现在更喜欢这种状态。"
      />

      <div class="idea-presets">
        <button v-for="preset in presets" :key="preset.title" type="button" @click="applyPreset(preset.body)">
          {{ preset.title }}
        </button>
      </div>

      <div class="action-row">
        <a-button size="large" @click="$router.push('/admin/posts')">返回列表</a-button>
        <a-button
          type="primary"
          size="large"
          :loading="generating"
          :disabled="!outline.trim()"
          @click="aiGenerate"
        >
          {{ generating ? '生成中...' : 'AI 生成全文' }}
        </a-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import { buildSlug } from '~/utils/postMeta'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const router = useRouter()
const generating = ref(false)
const outline = ref('')

const presets = [
  {
    title: '生活随笔',
    body: '想写一篇生活随笔。先从今天的一个具体场景写起，再展开最近的心境变化，结尾落在一个小而真实的感受上。',
  },
  {
    title: '观影读书',
    body: '想写一篇读后感或观后感。先概括最打动我的一点，再写为什么会被触动，最后联系到自己的生活经验。',
  },
  {
    title: '阶段复盘',
    body: '想写一篇阶段复盘。按“发生了什么、我学到了什么、接下来打算怎么做”三个层次展开。',
  },
]

function applyPreset(text: string) {
  outline.value = text
}

async function aiGenerate() {
  const content = outline.value.trim()
  if (content.length < 4) {
    toast.warning('请先填写灵感或要点')
    return
  }

  generating.value = true
  try {
    const res = await api.post<any>('/ai/generate-article', { outline: content })
    const title = res.title || content.slice(0, 40)
    const slug = res.slug || buildSlug(title)
    const post = await api.post<any>('/posts', {
      title,
      slug,
      content: res.content || '',
      excerpt: res.excerpt || '',
      coverImage: res.coverImage || '',
      categoryId: res.categoryId || undefined,
      tagIds: res.tagIds || [],
      featured: false,
      type: 'article',
    })

    const finalSlug = post?.slug || slug
    Modal.confirm({
      title: '生成完成',
      content: `《${title}》已保存为草稿，是否前往预览？`,
      okText: '去预览',
      cancelText: '返回列表',
      onOk: () => router.push(`/admin/posts/preview?slug=${encodeURIComponent(finalSlug)}`),
      onCancel: () => router.push('/admin/posts'),
    })
  } catch (e: any) {
    toast.error(`AI 生成失败: ${e.message || ''}`)
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.article-create-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 6px 4px 22px;
}

.article-create-hero,
.article-create-card {
  border-radius: 30px;
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--c-primary) 16%, transparent), transparent 34%),
    linear-gradient(145deg, color-mix(in srgb, var(--ld-bg-card) 96%, white 4%), color-mix(in srgb, var(--c-bg-2) 86%, transparent));
  box-shadow: 0 28px 56px color-mix(in srgb, #000 10%, transparent);
}

.article-create-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
}

.hero-copy {
  max-width: 620px;
}

.hero-eyebrow,
.card-eyebrow {
  margin: 0 0 8px;
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--c-text-3);
}

.hero-copy h1,
.card-head h2 {
  margin: 0;
  color: var(--c-text);
}

.hero-desc {
  margin: 14px 0 0;
  color: var(--c-text-2);
  line-height: 1.85;
}

.hero-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
}

.hero-badges span {
  display: inline-flex;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgb(255 255 255 / 64%);
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  color: var(--c-text-2);
  font-size: 0.8rem;
}

.article-create-card {
  padding: 24px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.card-count {
  color: var(--c-text-3);
  font-size: 0.82rem;
}

.outline-input {
  margin-top: 18px;
}

.idea-presets {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.idea-presets button {
  padding: 10px 14px;
  border: 0;
  border-radius: 16px;
  background: color-mix(in srgb, var(--c-bg-2) 82%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.idea-presets button:hover {
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 10%, var(--c-bg-2));
  transform: translateY(-1px);
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 700px) {
  .article-create-hero,
  .article-create-card {
    border-radius: 22px;
  }

  .article-create-hero {
    flex-direction: column;
    padding: 22px 18px;
  }

  .article-create-card {
    padding: 18px;
  }

  .action-row {
    flex-direction: column;
  }
}
</style>
