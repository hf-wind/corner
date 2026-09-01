import type { Ref } from 'vue'

interface ThemeContext {
  theme: Ref<string>
  resolvedTheme: Ref<'light' | 'dark'>
  setTheme: (mode: string) => void
  init: () => void
}

let instance: ThemeContext | null = null
let initialized = false
let transitionTimer: ReturnType<typeof setTimeout> | null = null

export function useTheme(): ThemeContext {
  if (instance) return instance

  const clientState = useClientState()
  const initialTheme = typeof window === 'undefined' ? 'auto' : String(clientState.get('site', 'theme', 'auto'))
  const initialResolved = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  const theme: Ref<string> = useSharedState('theme', () => initialTheme)
  const resolvedTheme = useSharedState<'light' | 'dark'>('resolved-theme', () => initialResolved)

  function applyTheme() {
    const mode = theme.value
    const resolved: 'light' | 'dark' = mode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode === 'dark' ? 'dark' : 'light'

    resolvedTheme.value = resolved
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#030b18' : '#eaf5ff')
  }

  function setTheme(mode: string) {
    const next = ['light', 'dark', 'auto'].includes(mode) ? mode : 'auto'
    document.documentElement.classList.add('theme-switching')
    theme.value = next
    clientState.set('site', 'theme', next)
    applyTheme()
    if (transitionTimer) clearTimeout(transitionTimer)
    transitionTimer = setTimeout(() => {
      document.documentElement.classList.remove('theme-switching')
    }, 520)
  }

  function init() {
    const saved = String(clientState.get('site', 'theme', 'auto'))
    theme.value = saved
    applyTheme()

    if (initialized) return
    initialized = true

    // Remove no-transition class after first paint (re-enable smooth transitions)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition')
      })
    })

    // Listen for system theme changes in auto mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'auto') applyTheme()
    })
  }

  instance = { theme, resolvedTheme, setTheme, init }
  return instance
}
