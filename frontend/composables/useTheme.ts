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

  const theme: Ref<string> = useState('theme', () => 'auto')
  const resolvedTheme = useState<'light' | 'dark'>('resolved-theme', () => 'light')

  function applyTheme() {
    const mode = theme.value
    const resolved: 'light' | 'dark' = mode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode === 'dark' ? 'dark' : 'light'

    resolvedTheme.value = resolved
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }

  function setTheme(mode: string) {
    const next = ['light', 'dark', 'auto'].includes(mode) ? mode : 'auto'
    document.documentElement.classList.add('theme-switching')
    theme.value = next
    localStorage.setItem('theme', next)
    applyTheme()
    if (transitionTimer) clearTimeout(transitionTimer)
    transitionTimer = setTimeout(() => {
      document.documentElement.classList.remove('theme-switching')
    }, 280)
  }

  function init() {
    const saved = localStorage.getItem('theme') || 'auto'
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
