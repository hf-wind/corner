export type NonsenseRule = {
  id: string;
  test: (text: string) => boolean;
  reason: string;
};

const SHORT_MIN_CHARS = 2;
const UNIQUE_RATIO_THRESHOLD = 0.4;

export const NONSENSE_RULES: NonsenseRule[] = [
  {
    id: 'too-short',
    test: (text) => Array.from(text.trim()).length < SHORT_MIN_CHARS,
    reason: '内容过于简短，无法公开展示',
  },
  {
    id: 'pure-symbols',
    test: (text) => /^[\d\p{P}\p{S}]+$/u.test(text.trim()),
    reason: '纯数字或符号，缺少有效内容',
  },
  {
    id: 'repetitive',
    test: (text) => {
      const chars = Array.from(text.trim());
      if (chars.length === 0) return true;
      return new Set(chars).size < chars.length * UNIQUE_RATIO_THRESHOLD;
    },
    reason: '无意义的重复内容',
  },
];

export function checkContentNonsense(text: string): string | null {
  for (const rule of NONSENSE_RULES) {
    if (rule.test(text)) return rule.reason;
  }
  return null;
}
