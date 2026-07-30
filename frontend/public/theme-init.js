!function () {
  try {
    var root = document.documentElement
    root.classList.add('no-transition')
    root.dataset.font = localStorage.getItem('font-preset') || 'rounded'

    var theme = localStorage.getItem('theme') || 'auto'
    var dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', dark)
    root.dataset.theme = dark ? 'dark' : 'light'
    root.style.colorScheme = dark ? 'dark' : 'light'

    var favicon = document.querySelector('link[rel="icon"]')
    if (favicon) favicon.href = dark ? '/logo-dark.svg' : '/logo.svg'
  } catch (_) {}
}()
