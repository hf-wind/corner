export type AiContentCard = {
  type: string;
  sourceId: string;
  title: string;
  href: string;
  excerpt?: string | null;
  image?: string | null;
  occurredAt?: string | null;
};

const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/i;
const RAW_IMAGE_RE =
  /(?:(?:https?:\/\/)|(?:https?%3a%2f%2f)|(?:\/uploads\/)|(?:%2fuploads%2f))[^\s<>()]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:(?:\?|%3f)[^\s<>()]*)?/i;

export function aiCardImage(card?: Partial<AiContentCard> | null) {
  if (card?.image) return String(card.image).trim();
  const excerpt = String(card?.excerpt || "");
  return (
    excerpt.match(MARKDOWN_IMAGE_RE)?.[1]?.trim() ||
    excerpt.match(RAW_IMAGE_RE)?.[0]?.trim() ||
    ""
  );
}

export function cleanAiExcerpt(value?: string | null) {
  return String(value || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(
      /(?:(?:https?:\/\/)|(?:https?%3a%2f%2f)|(?:\/uploads\/)|(?:%2fuploads%2f))[^\s<>()]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:(?:\?|%3f)[^\s<>()]*)?/gi,
      " ",
    )
    .replace(/[*_`>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
