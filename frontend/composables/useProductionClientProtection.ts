import type { Ref } from 'vue'

export function useProductionClientProtection(isAdmin: Ref<boolean>) {
  let lastNoticeAt = 0

  function notifyBlocked() {
    if (Date.now() - lastNoticeAt < 1500) return
    lastNoticeAt = Date.now()
    useToast().warning('不许窥探阿风的秘密哦~')
  }

  function onKeydown(event: KeyboardEvent) {
    if (isAdmin.value) return
    const key = String(event.key || '').toLowerCase()
    const blocked = event.key === 'F12'
      || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key))
      || (event.ctrlKey && key === 'u')
    if (!blocked) return
    event.preventDefault()
    event.stopImmediatePropagation()
    notifyBlocked()
  }

  function onContextMenu(event: MouseEvent) {
    if (isAdmin.value) return
    if (event.target instanceof Element && event.target.closest('.map-canvas')) return
    event.preventDefault()
    notifyBlocked()
  }

  function start() {
    if (!import.meta.env.PROD) return
    document.addEventListener('keydown', onKeydown, true)
    document.addEventListener('contextmenu', onContextMenu, true)
  }

  function stop() {
    if (!import.meta.env.PROD) return
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('contextmenu', onContextMenu, true)
  }

  return { start, stop }
}
