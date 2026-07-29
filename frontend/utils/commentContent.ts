type MediaResolver = (source?: string | null) => string

const EMOJI_TOKEN_RE = /(?:◆emoji:([^◆]+)◆|\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\])/g
const URL_RE = /(?:https?:\/\/|\/uploads\/)[^\s<]+/g
const IMAGE_URL_RE = /\.(?:png|gif|jpe?g|webp|svg|apng|avif)(?:\?[^\s<]*)?$/i

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emojiImage(source: string, label: string, resolveMedia: MediaResolver) {
  return `<img src="${escapeHtml(resolveMedia(source))}" alt="${escapeHtml(label || 'emoji')}" class="inline-emoji" loading="lazy" />`
}

export function renderCommentContent(text: string, resolveMedia: MediaResolver) {
  const emojis: Array<{ source: string; label: string }> = []
  const tokenized = String(text || '').replace(EMOJI_TOKEN_RE, (_, oldSource, source, label) => {
    const index = emojis.push({
      source: String(oldSource || source || '').trim(),
      label: String(label || 'emoji').trim(),
    }) - 1
    return `COMMENT_EMOJI_${index}`
  })

  return escapeHtml(tokenized)
    .replace(/\n/g, '<br>')
    .replace(URL_RE, (url) => {
      const cleanUrl = url.replace(/[),.!?;:]+$/, '')
      const suffix = url.slice(cleanUrl.length)
      if (IMAGE_URL_RE.test(cleanUrl) || cleanUrl.includes('cdn.jsdelivr.net/gh/twitter/twemoji')) {
        return `${emojiImage(cleanUrl, 'emoji', resolveMedia)}${suffix}`
      }
      return `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleanUrl)}</a>${suffix}`
    })
    .replace(/COMMENT_EMOJI_(\d+)/g, (_, rawIndex) => {
      const emoji = emojis[Number(rawIndex)]
      return emoji?.source ? emojiImage(emoji.source, emoji.label, resolveMedia) : ''
    })
    .replace(/(^|>)(@[^\s<]+)/g, '$1<span class="reply-mention">$2</span>')
}
