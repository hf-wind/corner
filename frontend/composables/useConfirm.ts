export type ConfirmOptions = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export type ConfirmState = Required<ConfirmOptions> & { id: number }

const state = useState<ConfirmState | null>('light-confirm-state', () => null)
let resolver: ((value: boolean) => void) | null = null
let sequence = 0

export function useConfirm() {
  function confirm(options: ConfirmOptions = {}) {
    if (resolver) resolver(false)
    const promise = new Promise<boolean>((resolve) => {
      resolver = resolve
    })
    state.value = {
      id: ++sequence,
      title: options.title || '确认操作',
      message: options.message || '确定继续吗？',
      confirmText: options.confirmText || '确认',
      cancelText: options.cancelText || '取消',
      danger: !!options.danger,
    }
    return promise
  }

  function settle(value: boolean) {
    const current = resolver
    resolver = null
    state.value = null
    current?.(value)
  }

  return { state, confirm, settle }
}
