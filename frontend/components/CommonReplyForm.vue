<template>
  <Transition name="reply-line">
    <div v-if="visible" class="inline-reply">
      <span class="reply-to-label">回复 @{{ replyToName }}</span>
      <div class="reply-input-row">
        <div class="picker-wrap">
          <button ref="emojiButtonRef" type="button" class="icon-button" :class="{ active: emojiOpen }" title="插入表情" @click="emojiOpen = !emojiOpen">
            <Icon name="ph:smiley-bold" />
          </button>
          <EmojiPalette :open="emojiOpen" :anchor="emojiButtonRef" placement="top" @select="insertEmoji" @close="emojiOpen = false" />
        </div>
        <div
          ref="editorRef"
          contenteditable="true"
          class="reply-editor"
          :data-placeholder="`回复 @${replyToName}...`"
          @keydown.enter.prevent="submit"
          @input="onInput"
          @paste="onPaste"
        />
        <button type="button" class="reply-submit" :disabled="!hasContent || submitting" title="发送回复" @click="submit">
          <Icon :name="submitting ? 'ph:spinner-gap' : 'ph:arrow-bend-right-up-bold'" :class="{ spinning: submitting }" />
        </button>
        <button type="button" class="reply-cancel" title="取消" @click="$emit('cancel')">
          <Icon name="ph:x-bold" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  visible?: boolean
  replyToName?: string
  submitting?: boolean
}>(), {
  visible: true,
  replyToName: '',
  submitting: false,
})

const emit = defineEmits<{
  submit: [content: string]
  cancel: []
}>()

const { mediaUrl } = useMediaUrl()

const editorRef = ref<HTMLDivElement | null>(null)
const emojiButtonRef = ref<HTMLButtonElement | null>(null)
const emojiOpen = ref(false)
const hasContent = ref(false)

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
          if (src) parts.push(`[[emoji:${src}|${el.dataset.emojiLabel || '表情'}]]`)
        } else if (el.tagName !== 'BR') {
          walk(el.childNodes)
        }
      }
    }
  }
  walk(editor.childNodes)
  return parts.join('')
}

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

function submit() {
  const content = serialize().trim()
  if (!content || props.submitting) return
  emit('submit', content)
  clearEditor()
}

function clearEditor() {
  if (editorRef.value) editorRef.value.innerHTML = ''
  hasContent.value = false
}

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => editorRef.value?.focus())
  }
}, { immediate: true })

defineExpose({ clearEditor })
</script>

<style scoped>
.inline-reply { margin-top: 8px; padding: 8px; border-radius: 9px; background: var(--c-bg-1); }
.reply-to-label { display: block; margin: 0 0 5px 2px; color: var(--c-primary); font-size: .62rem; }
.reply-input-row {
  position: relative;
  display: flex;
  height: 35px;
  align-items: center;
  gap: 5px;
  padding: 3px 4px 3px 9px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--ld-bg-card);
}
.picker-wrap { position: relative; flex: 0 0 auto; }
.icon-button {
  display: grid; width: 29px; height: 29px;
  place-items: center;
  border: 0; border-radius: 7px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
}
.icon-button:hover, .icon-button.active { background: var(--c-bg-2); color: var(--c-primary); }
.reply-editor :deep(.inline-emoji) {
  display: inline;
  width: auto;
  height: 1.8em;
  vertical-align: -0.25em;
  object-fit: contain;
  border-radius: 3px;
}
.reply-editor {
  min-width: 0; flex: 1;
  max-height: 30px;
  overflow-x: hidden; overflow-y: auto;
  border: 0; outline: 0;
  background: transparent;
  color: var(--c-text);
  font: inherit;
  font-size: .74rem;
  line-height: 1.55;
  white-space: nowrap;
}
.reply-editor:empty::before {
  color: var(--c-text-3);
  content: attr(data-placeholder);
  pointer-events: none;
}
.reply-submit, .reply-cancel {
  display: grid; width: 29px; height: 29px;
  place-items: center;
  border: 0; border-radius: 7px;
  cursor: pointer;
  flex-shrink: 0;
}
.reply-submit { background: var(--c-primary); color: #fff; }
.reply-submit:disabled { background: var(--c-bg-2); color: var(--c-text-3); cursor: not-allowed; }
.reply-cancel { background: var(--c-bg-2); color: var(--c-text-3); }
.spinning { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.reply-line-enter-active, .reply-line-leave-active { transition: opacity .16s ease, transform .16s ease; }
.reply-line-enter-from, .reply-line-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
