import { onMounted, onUnmounted, type Ref } from 'vue'

export function useScrollReveal(root: Ref<HTMLElement | null>, selector = '[data-reveal], .reveal-block') {
  let observer: IntersectionObserver | null = null
  let mutationObserver: MutationObserver | null = null

  onMounted(async () => {
    await nextTick()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      root.value?.querySelectorAll<HTMLElement>(selector).forEach((node) => node.classList.add('is-visible'))
      return
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting))
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    const scan = () => root.value?.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      if (!node.dataset.revealObserved) {
        node.dataset.revealObserved = '1'
        observer?.observe(node)
      }
    })
    scan()
    if (root.value && 'MutationObserver' in window) {
      mutationObserver = new MutationObserver(scan)
      mutationObserver.observe(root.value, { childList: true, subtree: true })
    }
  })

  onUnmounted(() => { observer?.disconnect(); mutationObserver?.disconnect() })
}
