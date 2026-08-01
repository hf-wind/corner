type ViewTransitionHandle = { finished: Promise<void> }
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransitionHandle
}

export function useCosmicNavigation() {
  const router = useRouter()
  const navigating = ref(false)

  async function navigate(path: string) {
    if (navigating.value) return
    navigating.value = true

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const viewDocument = document as ViewTransitionDocument
    const destination = path === '/time/constellation' ? 'constellation' : 'home'

    if (reducedMotion || !viewDocument.startViewTransition) {
      await router.push(path)
      navigating.value = false
      return
    }

    document.documentElement.dataset.cosmicTransition = destination
    const transition = viewDocument.startViewTransition(async () => {
      await router.push(path)
      await nextTick()
    })

    try {
      await transition.finished
    } finally {
      delete document.documentElement.dataset.cosmicTransition
      navigating.value = false
    }
  }

  return { navigating: readonly(navigating), navigate }
}
