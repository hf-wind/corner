export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  visible: boolean
}

let counter = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const removalTimers = new Map<number, ReturnType<typeof setTimeout>>()

export function useToast() {
  const toasts = useSharedState<ToastItem[]>('global-toasts', () => [])

  function add(type: ToastType, message: string, duration = 3000) {
    const id = ++counter
    const toast: ToastItem = { id, type, message, visible: false }
    toasts.value = [...toasts.value.slice(-4), toast]
    requestAnimationFrame(() => {
      const t = toasts.value.find(t => t.id === id)
      if (t) t.visible = true
    })
    if (duration > 0) timers.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    const previousRemoval = removalTimers.get(id)
    if (previousRemoval) clearTimeout(previousRemoval)
    const t = toasts.value.find(t => t.id === id)
    if (t) t.visible = false
    const removal = setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
      removalTimers.delete(id)
    }, 260)
    removalTimers.set(id, removal)
  }

  return {
    toasts,
    success: (msg: string, duration?: number) => add('success', msg, duration),
    error: (msg: string, duration?: number) => add('error', msg, duration),
    info: (msg: string, duration?: number) => add('info', msg, duration),
    warning: (msg: string, duration?: number) => add('warning', msg, duration),
    dismiss,
  }
}
