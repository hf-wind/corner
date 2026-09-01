<template>
  <div class="admin-md-editor" :class="[`mode-${mode}`, { dark: theme === 'dark' }]">
    <template v-if="mode === 'edit'">
      <MdEditor
        ref="editorRef"
        :id="editorId"
        :model-value="modelValue"
        language="zh-CN"
        :theme="theme"
        :preview-theme="previewTheme"
        :code-theme="codeTheme"
        :toolbars="editorToolbars"
        :no-mermaid="noMermaid"
        :no-echarts="noEcharts"
        :no-katex="noKatex"
        :placeholder="placeholder"
        :read-only="readOnly"
        @update:model-value="onUpdateValue"
        @on-save="onSave"
        @on-upload-img="onUploadImg"
        @on-html-changed="onHtmlChanged"
      />
    </template>
    <template v-else-if="mode === 'preview'">
      <MdPreview
        :id="editorId"
        :model-value="modelValue"
        language="zh-CN"
        :theme="theme"
        :preview-theme="previewTheme"
        :code-theme="codeTheme"
        :no-mermaid="noMermaid"
        :no-echarts="noEcharts"
        :no-katex="noKatex"
        @on-html-changed="onHtmlChanged"
      />
    </template>
    <template v-else-if="mode === 'htmlPreview'">
      <MdPreview
        :id="editorId"
        :model-value="modelValue"
        language="zh-CN"
        :theme="theme"
        :preview-theme="previewTheme"
        :code-theme="codeTheme"
        :no-mermaid="noMermaid"
        :no-echarts="noEcharts"
        :no-katex="noKatex"
        @on-html-changed="onHtmlChanged"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import type { ExposeParam } from 'md-editor-v3'
import { allToolbar } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import 'md-editor-v3/lib/preview.css'
import '@/assets/styles/markdown-base.css'
import '@/assets/styles/moment-markdown.css'

const MdEditor = defineAsyncComponent(() =>
  import('md-editor-v3').then(m => m.MdEditor)
)
const MdPreview = defineAsyncComponent(() =>
  import('md-editor-v3').then(m => m.MdPreview)
)

export interface Props {
  mode?: 'edit' | 'preview' | 'htmlPreview'
  modelValue?: string
  theme?: 'light' | 'dark'
  editorId?: string
  placeholder?: string
  readOnly?: boolean
  noMermaid?: boolean
  noEcharts?: boolean
  noKatex?: boolean
  previewTheme?: 'default' | 'github' | 'smart-blue' | 'vuepress' | 'mk-cute' | 'cyanosis'
  codeTheme?: 'github' | 'atom' | 'a11y' | 'gradient' | 'kimbie' | 'paraiso' | 'qtcreator' | 'stackoverflow'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'edit',
  modelValue: '',
  theme: 'light',
  editorId: 'admin-md-editor',
  placeholder: '',
  readOnly: false,
  noMermaid: false,
  noEcharts: false,
  noKatex: false,
  previewTheme: 'smart-blue',
  codeTheme: 'github'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'rendered': []
  'htmlChanged': [html: string]
  'save': [value: string, html: Promise<string>]
  'uploadImg': [files: File[], callback: (urls: string[]) => void]
}>()

const editorRef = ref<ExposeParam | null>(null)
const editorToolbars = computed(() => allToolbar.filter(t => t !== 'github'))

function onUpdateValue(value: string) {
  emit('update:modelValue', value)
}

function onSave(value: string, html: Promise<string>) {
  emit('save', value, html)
}

function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  emit('uploadImg', files, callback)
}

function onHtmlChanged(html: string) {
  emit('htmlChanged', html)
}

// 监听深色模式变化
const isDark = ref(props.theme === 'dark')
let themeObserver: MutationObserver | null = null

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => {
  themeObserver?.disconnect()
})

// 暴露方法给父组件
defineExpose({
  editor: editorRef,
  togglePreview: () => editorRef.value?.togglePreview(),
  toggleHtmlPreview: () => editorRef.value?.toggleHtmlPreview(),
  toggleCatalog: () => editorRef.value?.toggleCatalog(),
  triggerSave: () => editorRef.value?.triggerSave(),
  focus: () => editorRef.value?.focus(),
  insert: (callback: (selectedText: string) => { targetValue: string; select?: boolean }) => {
    editorRef.value?.insert(callback)
  }
})
</script>

<style scoped>
.admin-md-editor {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.admin-md-editor :deep(.md-editor) {
  height: 100%;
  min-height: 420px;
  border: none;
  border-radius: 0;
}

.admin-md-editor :deep(.md-editor-toolbar) {
  border-bottom: 1px solid var(--border);
  background: var(--ld-bg-card);
}

.admin-md-editor :deep(.md-editor-toolbar-wrapper) {
  background: transparent;
}

.admin-md-editor :deep(.md-editor-content) {
  min-height: 0;
}

.admin-md-editor :deep(.md-editor-input) {
  min-height: 100%;
}

.admin-md-editor :deep(.md-editor-preview-wrapper) {
  padding: 16px 24px;
}

/* 深色模式适配 */
.admin-md-editor.dark :deep(.md-editor) {
  background: var(--c-bg);
}

.admin-md-editor.dark :deep(.md-editor-toolbar) {
  background: var(--ld-bg-card);
  border-color: var(--border);
}

/* 预览模式样式 */
.admin-md-editor.mode-preview :deep(.md-editor),
.admin-md-editor.mode-htmlPreview :deep(.md-editor) {
  border: none;
  background: transparent;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .admin-md-editor :deep(.md-editor-preview-wrapper) {
    padding: 12px 16px;
  }
}
</style>
