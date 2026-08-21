function clearHighlights(root: ParentNode) {
  root.querySelectorAll("mark.search-highlight").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

function findScrollContainer(element: HTMLElement) {
  return (
    element.closest<HTMLElement>(".article-main, .main-content, .page-scroll") ||
    element.parentElement
  );
}

export function focusSearchHighlight(query: string, root: HTMLElement | null) {
  if (!root || !query.trim() || typeof document === "undefined") return false;
  const normalized = query.trim().slice(0, 80).toLocaleLowerCase();
  clearHighlights(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null = null;
  while (walker.nextNode()) {
    const current = walker.currentNode as Text;
    const parent = current.parentElement;
    if (parent?.closest("script,style,textarea,button,a")) continue;
    if (current.textContent?.toLocaleLowerCase().includes(normalized)) {
      node = current;
      break;
    }
  }
  if (!node?.textContent) return false;
  const start = node.textContent.toLocaleLowerCase().indexOf(normalized);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + normalized.length);
  const mark = document.createElement("mark");
  mark.className = "search-highlight";
  range.surroundContents(mark);
  const container = findScrollContainer(mark);
  if (container) {
    const bounds = container.getBoundingClientRect();
    const target = mark.getBoundingClientRect();
    container.scrollTo({
      top: Math.max(0, container.scrollTop + target.top - bounds.top - 72),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  window.setTimeout(() => mark.classList.add("is-settled"), 900);
  return true;
}
