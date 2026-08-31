const QQ_FACE_RE =
  /^https:\/\/koishi\.js\.org\/QFace\/(gif|static)\/([^/?#]+)$/i;
const TWEMOJI_RE = /\/([0-9a-f]+(?:-[0-9a-f]+)*)\.(?:png|svg)(?:\?|$)/i;
const QQ_PNG_MASQUERADING_AS_GIF = new Set([
  's327.gif',
  's328.gif',
  's329.gif',
  's330.gif',
  's331.gif',
]);

export function normalizeEmojiSource(value?: string | null) {
  let source = String(value || '').trim();
  if (!source) return '';
  if (source.startsWith('/api/emoji-packs/asset')) {
    try {
      source =
        new URL(source, 'https://corner.local').searchParams.get('url') ||
        source;
    } catch {
      return source;
    }
  }
  const qq = source.match(QQ_FACE_RE);
  if (qq) {
    const folder = qq[1].toLowerCase();
    const filename = qq[2].toLowerCase();
    if (folder === 'gif' && QQ_PNG_MASQUERADING_AS_GIF.has(filename)) {
      return `/uploads/emoji/qq/static/${filename.replace(/\.gif$/i, '.png')}`;
    }
    return `/uploads/emoji/qq/${folder}/${qq[2]}`;
  }
  return source;
}

export function twemojiCharacter(value?: string | null) {
  const source = String(value || '').trim();
  if (!/twemoji/i.test(source)) return '';
  const codepoints = source.match(TWEMOJI_RE)?.[1];
  if (!codepoints) return '';
  try {
    return String.fromCodePoint(
      ...codepoints.split('-').map((part) => Number.parseInt(part, 16)),
    );
  } catch {
    return '';
  }
}
