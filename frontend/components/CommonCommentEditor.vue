<template>
  <div class="comment-form-card">
    <template v-if="isLoggedIn">
      <div class="comment-form-header">
        <div class="comment-form-avatar">
          <img v-if="user?.avatar" :src="mediaUrl(user.avatar)" alt="" />
          <Icon v-else name="ph:user-circle-fill" class="avatar-fallback" />
        </div>
        <span class="comment-form-username">{{ user?.username || '用户' }}</span>
        <div class="comment-form-tabs">
          <button type="button" :class="{ active: tab === 'write' }" @click="tab = 'write'">
            <Icon name="ph:pencil-bold" />撰写
          </button>
          <button type="button" :class="{ active: tab === 'preview' }" @click="switchPreview">
            <Icon name="ph:eye-bold" />预览
          </button>
        </div>
      </div>

      <div v-show="tab === 'write'" class="comment-form-body">
        <div
          ref="editorRef"
          contenteditable="true"
          class="comment-editor"
          data-placeholder="写下你的评论..."
          @input="onInput"
          @paste="onPaste"
        />
        <div class="comment-toolbar">
          <button ref="emojiButtonRef" type="button" class="emoji-btn" :class="{ active: emojiOpen }" @click="emojiOpen = !emojiOpen" title="插入表情">
            <Icon name="ph:smiley-bold" />
          </button>
          <EmojiPalette :open="emojiOpen" :anchor="emojiButtonRef" placement="top" @select="insertEmoji" @close="emojiOpen = false" />
        </div>
      </div>
      <div v-show="tab === 'preview'" class="comment-preview" v-html="renderContent(previewContent)" />

      <div class="comment-form-actions">
        <button type="button" class="comment-submit" :disabled="!hasContent || submitting" @click="submit">
          <Icon name="ph:paper-plane-right-fill" />
          <span>{{ submitting ? '提交中...' : '发表评论' }}</span>
        </button>
      </div>
    </template>

    <div v-else class="comment-login-prompt">
      <Icon name="ph:chat-centered-dots-bold" class="prompt-icon" />
      <p class="prompt-text">请登录后发表评论</p>
      <div class="prompt-actions">
        <AppLink to="/login" class="prompt-btn prompt-btn-primary">去登录</AppLink>
        <AppLink to="/register" class="prompt-btn prompt-btn-secondary">注册</AppLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderCommentContent } from '@/utils/commentContent'

const props = withDefaults(defineProps<{
  submitting?: boolean
}>(), {
  submitting: false,
})

const emit = defineEmits<{
  submit: [content: string]
}>()

const { mediaUrl } = useMediaUrl()
const { user, isLoggedIn } = useAuth()
function renderContent(text: string) { return renderCommentContent(text, mediaUrl) }

const tab = ref<'write' | 'preview'>('write')
const emojiOpen = ref(false)
const hasContent = ref(false)

watch(() => props.submitting, (cur, prev) => {
  if (prev === true && cur === false) clearEditor()
})
const editorRef = ref<HTMLDivElement | null>(null)
const emojiButtonRef = ref<HTMLButtonElement | null>(null)
const previewContent = ref('')

function onInput() {
  const editor = editorRef.value
  hasContent.value = editor ? editor.textContent?.trim().length > 0 : false
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  range.insertNode(document.createTextNode(text))
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
  onInput()
}

function serialize(): string {
  const editor = editorRef.value
  if (!editor) return ''
  const parts: string[] = []
  const walk = (nodes: NodeListOf<ChildNode>) => {
    for (const node of Array.from(nodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || '')
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.tagName === 'IMG') {
          const src = (el as HTMLImageElement).dataset.emojiSrc || ''
          if (src) {
            const label = (el as HTMLImageElement).dataset.emojiLabel || '表情'
            parts.push(`[[emoji:${src}|${label}]]`)
          }
        } else if (el.tagName === 'BR') {
          parts.push('\n')
        } else if (el.tagName === 'DIV') {
          walk(el.childNodes)
          parts.push('\n')
        } else {
          walk(el.childNodes)
        }
      }
    }
  }
  walk(editor.childNodes)
  return parts.join('')
}

function insertEmoji(payload: { char?: string; imageUrl?: string; label?: string }) {
  const editor = editorRef.value
  if (!editor) return
  editor.focus()
  const sel = window.getSelection()
  let range: Range
  if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0)
    range.deleteContents()
  } else {
    range = document.createRange()
    range.setStart(editor, editor.childNodes.length || 0)
    range.collapse(false)
  }
  if (payload.imageUrl) {
    const img = document.createElement('img')
    img.src = mediaUrl(payload.imageUrl)
    img.alt = 'emoji'
    img.className = 'inline-emoji'
    img.dataset.emojiSrc = payload.imageUrl
    img.dataset.emojiLabel = payload.label || ''
    range.insertNode(img)
  } else if (payload.char) {
    range.insertNode(document.createTextNode(payload.char))
  }
  range.collapse(false)
  if (sel) { sel.removeAllRanges(); sel.addRange(range) }
  editor.focus()
  onInput()
  emojiOpen.value = false
}

function switchPreview() {
  previewContent.value = serialize()
  tab.value = 'preview'
}

function submit() {
  const content = serialize()
  if (!content.trim()) return
  emit('submit', content)
}

function clearEditor() {
  if (editorRef.value) editorRef.value.innerHTML = ''
  hasContent.value = false
  tab.value = 'write'
}
defineExpose({ clearEditor })
</script>

<style scoped>
.comment-form-card {
  background: var(--ld-bg-card);
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--ld-shadow) 55%, transparent);
}
.comment-form-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.comment-form-avatar img,
.avatar-fallback {
  width: 32px; height: 32px;
  border-radius: 50%;
  object-fit: cover;
  color: var(--c-text-3);
}
.comment-form-username {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
  margin-right: auto;
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
.comment-form-body { margin-bottom: 12px; position: relative; }
.comment-editor :deep(.inline-emoji) {
  display: inline;
  width: auto;
  height: 1.8em;
  vertical-align: -0.25em;
  object-fit: contain;
  border-radius: 3px;
}
.comment-editor {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font-family: inherit;
  font-size: 0.82rem;
  outline: none;
  line-height: 1.6;
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 0.2s;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
}
.comment-editor:focus { box-shadow: inset 0 0 0 1.5px var(--c-primary); }
.comment-editor:empty:before {
  content: attr(data-placeholder);
  color: var(--c-text-3);
  pointer-events: none;
}
.comment-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px 4px 0;
  gap: 6px;
}
.emoji-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}
.emoji-btn:hover, .emoji-btn.active { color: var(--c-primary); background: var(--c-primary-soft); }
.comment-preview {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--c-bg-1);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--c-text);
  min-height: 80px;
  margin-bottom: 12px;
}
.comment-form-actions { display: flex; flex-direction: column; gap: 10px; }
.comment-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 28%, transparent);
}
.comment-submit:hover { opacity: 0.92; }
.comment-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.comment-preview :deep(.inline-emoji) {
  display: inline;
  width: auto;
  height: 1.8em;
  vertical-align: -0.25em;
  object-fit: contain;
  border-radius: 3px;
}
.comment-login-prompt {
  text-align: center;
  padding: 32px 16px;
}
.prompt-icon {
  font-size: 2.2rem;
  color: var(--c-text-3);
  opacity: 0.5;
  margin-bottom: 8px;
  display: block;
}
.prompt-text {
  font-size: 0.85rem;
  color: var(--c-text-2);
  margin-bottom: 16px;
}
.prompt-actions { display: flex; gap: 10px; justify-content: center; }
.prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
}
.prompt-btn-primary {
  background: var(--c-primary);
  color: #fff;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 28%, transparent);
}
.prompt-btn-primary:hover { opacity: 0.92; }
.prompt-btn-secondary {
  background: var(--c-bg-2);
  color: var(--c-text-2);
}
.prompt-btn-secondary:hover { color: var(--c-primary); background: var(--c-primary-soft); }
</style>
