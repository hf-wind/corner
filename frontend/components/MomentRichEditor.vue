<template>
  <div
    ref="rootRef"
    class="moment-rich-editor"
    contenteditable="true"
    role="textbox"
    aria-multiline="true"
    :aria-label="placeholder"
    :data-placeholder="placeholder"
    spellcheck="true"
    @input="syncModel"
    @click="onClick"
    @keydown="onKeydown"
    @beforeinput="onBeforeInput"
    @paste="onPaste"
    @focus="rememberSelection"
    @keyup="rememberSelection"
    @mouseup="rememberSelection"
  />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  autofocus?: boolean
}>(), {
  modelValue: '',
  placeholder: '写下这一刻。',
  autofocus: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { mediaUrl } = useMediaUrl()
const rootRef = ref<HTMLElement | null>(null)
let lastSerialized = ''
let savedRange: Range | null = null

const TOKEN_RE = /!\[([^\]]*)\]\(([^)\n]+)\)|\[\[emoji:([^\]|\n]+)(?:\|([^\]\n]*))?\]\]/g
const CURSOR_MARKER = '\u200b'

function appendText(fragment: DocumentFragment, text: string) {
  text.split('\n').forEach((line, index) => {
    if (index > 0) fragment.append(document.createElement('br'))
    if (line) fragment.append(document.createTextNode(line))
  })
}

function createTokenNode(token: string, imageAlt?: string, imageUrl?: string, emojiUrl?: string, emojiLabel?: string) {
  const node = document.createElement('span')
  node.contentEditable = 'false'
  node.dataset.token = token

  if (imageUrl) {
    node.className = 'moment-rich-image'
    const image = document.createElement('img')
    image.src = mediaUrl(imageUrl)
    image.alt = imageAlt || '瞬间图片'
    image.loading = 'lazy'
    const caption = document.createElement('span')
    caption.className = 'moment-rich-caption'
    caption.textContent = imageAlt || '瞬间图片'
    node.append(image, caption, createRemoveButton('移除图片'))
    return node
  }

  node.className = 'moment-rich-emoji'
  node.title = emojiLabel || '表情'
  const image = document.createElement('img')
  image.src = mediaUrl(emojiUrl || '')
  image.alt = emojiLabel || '表情'
  node.append(image, createRemoveButton('移除表情'))
  return node
}

function createRemoveButton(label: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'moment-rich-remove'
  button.dataset.removeToken = 'true'
  button.tabIndex = -1
  button.setAttribute('aria-label', label)
  button.title = label
  button.textContent = '×'
  return button
}

function contentNodes(content: string) {
  const fragment = document.createDocumentFragment()
  let cursor = 0
  for (const match of content.matchAll(TOKEN_RE)) {
    const index = match.index || 0
    if (index > cursor) appendText(fragment, content.slice(cursor, index))
    fragment.append(document.createTextNode(CURSOR_MARKER))
    fragment.append(createTokenNode(match[0], match[1], match[2], match[3], match[4]))
    fragment.append(document.createTextNode(CURSOR_MARKER))
    cursor = index + match[0].length
  }
  if (cursor < content.length) appendText(fragment, content.slice(cursor))
  return fragment
}

function rebuild(content: string) {
  const root = rootRef.value
  if (!root) return
  root.replaceChildren(contentNodes(content))
  lastSerialized = content
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (!(node instanceof HTMLElement)) return ''
  if (node.dataset.token) return node.dataset.token
  if (node.tagName === 'BR') return '\n'
  const content = Array.from(node.childNodes).map(serializeNode).join('')
  return /^(DIV|P)$/.test(node.tagName) ? `${content}\n` : content
}

function serialize() {
  const root = rootRef.value
  if (!root) return ''
  return Array.from(root.childNodes)
    .map(serializeNode)
    .join('')
    .replace(/\u00a0/g, ' ')
    .replaceAll(CURSOR_MARKER, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n$/, '')
}

function syncModel() {
  const value = serialize()
  lastSerialized = value
  emit('update:modelValue', value)
  rememberSelection()
}

function rememberSelection() {
  const root = rootRef.value
  const selection = window.getSelection()
  if (!root || !selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (root.contains(range.commonAncestorContainer)) savedRange = range.cloneRange()
}

function insertionRange() {
  const root = rootRef.value
  if (!root) return null
  if (savedRange && root.contains(savedRange.commonAncestorContainer)) return savedRange.cloneRange()
  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  return range
}

function insertContent(content: string) {
  const root = rootRef.value
  const range = insertionRange()
  if (!root || !range) return
  root.focus()
  range.deleteContents()
  const fragment = contentNodes(content)
  if (content.endsWith('\n')) fragment.append(document.createTextNode(CURSOR_MARKER))
  const last = fragment.lastChild
  range.insertNode(fragment)
  if (last) {
    range.setStartAfter(last)
    range.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    savedRange = range.cloneRange()
  }
  syncModel()
}

function onClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-remove-token]')
  if (!button) return
  event.preventDefault()
  button.closest<HTMLElement>('[data-token]')?.remove()
  syncModel()
  rootRef.value?.focus()
}

function insertPlainText(text: string) {
  insertContent(text.replace(/\r\n?/g, '\n'))
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  insertPlainText(event.clipboardData?.getData('text/plain') || '')
}

function onKeydown(event: KeyboardEvent) {
  if ((event.key === 'Backspace' || event.key === 'Delete') && removeAdjacentToken(event.key === 'Backspace' ? -1 : 1)) {
    event.preventDefault()
    syncModel()
    return
  }
  if (event.key !== 'Enter') return
  event.preventDefault()
  insertPlainText('\n')
}

function removeAdjacentToken(direction: -1 | 1) {
  const root = rootRef.value
  const selection = window.getSelection()
  if (!root || !selection?.rangeCount || !selection.isCollapsed) return false
  const range = selection.getRangeAt(0)
  let node: Node | null = range.startContainer
  let offset = range.startOffset
  if (!root.contains(node)) return false

  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length || 0
    if ((direction < 0 && offset > 0) || (direction > 0 && offset < length)) return false
  }

  let candidate: Node | null
  if (node === root) candidate = root.childNodes[offset + (direction < 0 ? -1 : 0)] || null
  else candidate = direction < 0 ? node.previousSibling : node.nextSibling
  while (candidate?.nodeType === Node.TEXT_NODE && !(candidate.textContent || '').replaceAll(CURSOR_MARKER, '')) {
    candidate = direction < 0 ? candidate.previousSibling : candidate.nextSibling
  }
  if (!(candidate instanceof HTMLElement) || !candidate.dataset.token) return false
  const anchor = direction < 0 ? candidate.previousSibling : candidate.nextSibling
  candidate.remove()
  const nextRange = document.createRange()
  if (anchor?.nodeType === Node.TEXT_NODE) nextRange.setStart(anchor, anchor.textContent?.length || 0)
  else {
    nextRange.selectNodeContents(root)
    nextRange.collapse(direction < 0 ? false : true)
  }
  nextRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(nextRange)
  savedRange = nextRange.cloneRange()
  return true
}

function onBeforeInput(event: InputEvent) {
  if (event.inputType !== 'insertParagraph' && event.inputType !== 'insertLineBreak') return
  event.preventDefault()
  insertPlainText('\n')
}

function focus() {
  rootRef.value?.focus()
}

watch(() => props.modelValue, (value) => {
  const next = String(value || '')
  if (next !== lastSerialized) rebuild(next)
})

onMounted(() => {
  rebuild(String(props.modelValue || ''))
  document.addEventListener('selectionchange', rememberSelection)
  if (props.autofocus) nextTick(focus)
})

onUnmounted(() => document.removeEventListener('selectionchange', rememberSelection))

defineExpose({
  focus,
  insertText: insertPlainText,
  insertToken: insertContent,
})
</script>

<style scoped>
.moment-rich-editor {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: text;
}

.moment-rich-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--c-text-3);
  pointer-events: none;
}

.moment-rich-editor :deep(.moment-rich-image) {
  position: relative;
  display: grid;
  width: min(100%, 620px);
  margin: 12px 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-1);
}

.moment-rich-editor :deep(.moment-rich-image img) {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  background: var(--c-bg-2);
}

.moment-rich-editor :deep(.moment-rich-caption) {
  padding: 7px 10px;
  color: var(--c-text-3);
  font-size: .72rem;
  line-height: 1.3;
}

.moment-rich-editor :deep(.moment-rich-emoji) {
  position: relative;
  display: inline-flex;
  width: 2em;
  height: 2em;
  margin: 0 .1em;
  vertical-align: -.45em;
}

.moment-rich-editor :deep(.moment-rich-emoji img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.moment-rich-editor :deep(.moment-rich-remove) {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgb(0 0 0 / 62%);
  cursor: pointer;
  font: 18px/1 sans-serif;
}

.moment-rich-editor :deep(.moment-rich-emoji .moment-rich-remove) {
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  font-size: 12px;
  opacity: 0;
}

.moment-rich-editor :deep(.moment-rich-emoji:hover .moment-rich-remove),
.moment-rich-editor :deep(.moment-rich-emoji:focus-within .moment-rich-remove) {
  opacity: 1;
}
</style>
