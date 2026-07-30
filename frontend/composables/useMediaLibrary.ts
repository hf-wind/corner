const state = reactive({
  visible: false,
  resolve: null as ((urls: string[]) => void) | null,
  multiple: false,
  folder: '' as string,
  compressAnimated: false,
  returnItems: false,
  resolveItems: null as ((items: any[]) => void) | null,
})

export function useMediaLibrary() {
  function open(options?: { multiple?: boolean; folder?: string; compressAnimated?: boolean }): Promise<string[]> {
    state.multiple = options?.multiple ?? false
    state.folder = options?.folder || ''
    state.compressAnimated = options?.compressAnimated ?? false
    state.returnItems = false
    state.visible = true
    return new Promise((resolve) => {
      state.resolve = resolve
    })
  }

  function openItems(options?: { multiple?: boolean; folder?: string }): Promise<any[]> {
    state.multiple = options?.multiple ?? true
    state.folder = options?.folder || ''
    state.compressAnimated = false
    state.returnItems = true
    state.visible = true
    return new Promise((resolve) => {
      state.resolveItems = resolve
    })
  }

  function onConfirm(payload: any[]) {
    if (state.returnItems) state.resolveItems?.(payload)
    else state.resolve?.(payload as string[])
    state.resolve = null
    state.resolveItems = null
    state.returnItems = false
    state.visible = false
  }

  function onCancel() {
    state.resolve?.([])
    state.resolveItems?.([])
    state.resolve = null
    state.resolveItems = null
    state.returnItems = false
    state.visible = false
  }

  return { state, open, openItems, onConfirm, onCancel }
}
