import { normalizeEmojiSource, twemojiCharacter } from './emoji-source';

describe('emoji source normalization', () => {
  it('maps legacy QQ CDN assets to bundled upload paths', () => {
    expect(
      normalizeEmojiSource('https://koishi.js.org/QFace/gif/s74.gif'),
    ).toBe('/uploads/emoji/qq/gif/s74.gif');
  });

  it('keeps compatibility with old proxy tokens without fetching remotely', () => {
    const proxy =
      '/api/emoji-packs/asset?url=https%3A%2F%2Fkoishi.js.org%2FQFace%2Fstatic%2Fs333.png';
    expect(normalizeEmojiSource(proxy)).toBe(
      '/uploads/emoji/qq/static/s333.png',
    );
  });

  it('uses the real PNG format for mislabeled legacy assets', () => {
    expect(
      normalizeEmojiSource('https://koishi.js.org/QFace/gif/s327.gif'),
    ).toBe('/uploads/emoji/qq/static/s327.png');
  });

  it('converts Twemoji asset addresses back to Unicode', () => {
    expect(
      twemojiCharacter(
        'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png',
      ),
    ).toBe('👍');
  });
});
