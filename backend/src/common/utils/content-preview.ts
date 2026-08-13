export function contentPreview(value?: string | null, maxLength = 160) {
  const normalized = String(value || '')
    .replace(/◆emoji:([^◆]+)◆/g, '【表情】')
    .replace(
      /\[\[emoji:[^\]|]+(?:\|([^\]]*))?\]\]/g,
      (_match, label) => `【表情：${label || '表情'}】`,
    )
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '【图片】')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '（无文字内容）';
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trimEnd()}…`
    : normalized;
}
