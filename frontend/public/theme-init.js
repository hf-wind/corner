!function () {
  try {
    var root = document.documentElement
    root.classList.add('no-transition')
    root.dataset.font = localStorage.getItem('font-preset') || 'rounded'

    var theme = localStorage.getItem('theme') || 'auto'
    var dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', dark)
    var spaceRoute = location.pathname === '/' || location.pathname === '/time/constellation'
    root.classList.toggle('space-route', spaceRoute)
    root.dataset.theme = dark ? 'dark' : 'light'
    root.style.colorScheme = dark ? 'dark' : 'light'
    var themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.setAttribute('content', spaceRoute ? (dark ? '#020814' : '#071a2d') : (dark ? '#030b18' : '#eaf5ff'))
  } catch (_) {}
}()
