/** Build URL-safe slug from title; fallback to time-random for CJK-only titles. */
export function buildSlug(title: string): string {
  const fromTitle = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  if (fromTitle.length >= 2) return fromTitle

  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 6)
  return `p-${t}-${r}`
}

export function ensureSlug(slug: string, title: string) {
  const s = String(slug || '').trim()
  if (s) return s.slice(0, 80)
  return buildSlug(title)
}

export function localExcerpt(title: string, content: string, maxLen = 100) {
  const plain = String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const base = plain || String(title || '').trim()
  if (base.length <= maxLen) return base
  return `${base.slice(0, maxLen).replace(/\s+\S*$/, '')}…`
}
