import type { Ref } from 'vue'

interface ThemeContext {
  theme: Ref<string>
  setTheme: (mode: string) => void
  init: () => void
}

let instance: ThemeContext | null = null

export function useTheme(): ThemeContext {
  if (instance) return instance

  const theme: Ref<string> = useState('theme', () => 'light')

  function setFavicon(mode: string) {
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
    const href = mode === 'dark' ? '/logo-dark.svg' : '/logo.svg'
    links.forEach(el => { el.href = href })
    // Force re-fetch by updating href (for browsers that cache)
    const fav = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (fav) {
      fav.href = ''
      fav.href = href
    }
  }

  function applyTheme() {
    const mode = theme.value
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
      setFavicon('dark')
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark')
      setFavicon('light')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
      setFavicon(prefersDark ? 'dark' : 'light')
    }
  }

  function setTheme(mode: string) {
    theme.value = mode
    localStorage.setItem('theme', mode)
    applyTheme()
  }

  function init() {
    const saved = localStorage.getItem('theme') || 'light'
    theme.value = saved
    applyTheme()

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

  instance = { theme, setTheme, init }
  return instance
}
