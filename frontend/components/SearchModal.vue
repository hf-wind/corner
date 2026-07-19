<template>
  <Teleport to="body">
    <div v-if="visible" class="search-overlay" @click.self="close" @keydown.esc="close">
      <div class="search-panel" ref="panelRef">
        <div class="search-input-wrap">
          <svg class="search-prefix" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref="inputRef" v-model="query" type="text" placeholder="搜索文章..." @input="onInput" class="search-input">
          <kbd class="search-esc" @click="close">ESC</kbd>
        </div>
        <div class="search-hints" v-if="!query">输入关键词搜索文章...</div>
        <div class="search-results" v-if="query && filtered.length > 0">
          <NuxtLink v-for="r in filtered" :key="r.title" :to="r.to" class="search-result-row" @click="close">
            <div class="search-row-icon"><Icon name="ph:file-text-bold" /></div>
            <div class="search-row-body">
              <div class="search-row-title" v-html="r.title"></div>
              <div class="search-row-desc">{{ r.desc }}</div>
            </div>
          </NuxtLink>
        </div>
        <div class="search-empty" v-if="query && filtered.length === 0">未找到相关文章</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const query = ref('')
const inputRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLDivElement>()

const allArticles = [
  { title: '用 Rust 重写我的个人博客系统', desc: '从 Node.js 迁移到 Rust，系统架构的重构之旅', to: '/article/rust-blog' },
  { title: '深夜写代码时的那些胡思乱想', desc: '凌晨的屏幕光映在脸上，思绪飘向远方', to: '/article/late-night-coding' },
  { title: '云南行记：在丽江古城寻找慢生活', desc: '放下键盘，背上行囊，寻找慢生活', to: '/article/yunnan-travel' },
  { title: 'WebAssembly 实战：浏览器中的高性能计算', desc: '探索 WASM 在前端的无限可能', to: '/article/wasm-practice' },
  { title: 'AI 时代的创作者：工具还是伙伴？', desc: '当 AI 可以写诗作画编程，人类创作者的价值在哪', to: '/article/ai-creator' },
  { title: '星空下的代码：程序员的浪漫夜晚', desc: '在山间小屋写下最后一行代码，抬头是漫天繁星', to: '/article/starry-night-code' },
  { title: '山间晨雾与一杯清茶的对话', desc: '晨雾、清茶、代码，最宁静的写作时光', to: '/article/morning-mountain-tea' },
  { title: '春日漫步：从代码到自然的出走', desc: '从 IDE 到山野，一次心灵的出走', to: '/article/spring-walk' },
  { title: '深度学习：从零到一的思维转变', desc: '深入浅出地理解深度学习背后的思维方式', to: '/article/deep-learning' },
]

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return []
  return allArticles.filter(a =>
    a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
  )
})

function onInput() {}

function close() {
  query.value = ''
  emit('close')
}

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => inputRef.value?.focus())
  }
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  backdrop-filter: blur(2px);
}
.search-panel {
  width: min(580px, 90vw);
  background: var(--ld-bg-card);
  border-radius: 14px;
  box-shadow: 0 8px 40px var(--ld-shadow), 0 0 0 1px var(--border);
  overflow: hidden;
  animation: slide-down 0.2s ease-out;
}
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}
.search-prefix {
  width: 18px; height: 18px;
  color: var(--c-text-2);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
}
.search-input::placeholder { color: var(--c-text-3); }
.search-esc {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  color: var(--c-text-2);
  cursor: pointer;
}
.search-hints {
  padding: 28px 18px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--c-text-2);
}
.search-results {
  max-height: 360px;
  overflow-y: auto;
}
.search-result-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}
.search-result-row:hover {
  background: var(--c-primary-soft);
}
.search-result-row + .search-result-row {
  border-top: 1px solid var(--border);
}
.search-row-icon {
  font-size: 1rem;
  margin-top: 2px;
  flex-shrink: 0;
}
.search-row-body {
  flex: 1;
  min-width: 0;
}
.search-row-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.4;
  margin-bottom: 2px;
}
.search-row-desc {
  font-size: 0.75rem;
  color: var(--c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-empty {
  padding: 28px 18px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--c-text-2);
}
</style>
