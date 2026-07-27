const IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/g
const EMOJI_RE = /\[\[emoji:[^\]|]+(?:\|[^\]]*)?\]\]/g

export function extractMomentImages(content?: string | null) {
  return Array.from(String(content || '').matchAll(IMAGE_RE))
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[]
}

export function stripMomentImages(content?: string | null) {
  return String(content || '').replace(IMAGE_RE, '').trim()
}

export function momentPlainText(content?: string | null) {
  return stripMomentImages(content)
    .replace(EMOJI_RE, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`>#-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function momentPreviewText(content?: string | null, maxLen = 140) {
  const plain = momentPlainText(content)
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen).replace(/\s+\S*$/, '')}...`
}

export function buildMomentTitle(raw?: string | null) {
  const plain = momentPlainText(raw)
  return plain.slice(0, 28) || `Moment ${new Date().toISOString().slice(0, 10)}`
}
