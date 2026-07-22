const state = reactive({
  visible: false,
  resolve: null as ((urls: string[]) => void) | null,
  multiple: false,
})

export function useMediaLibrary() {
  function open(options?: { multiple?: boolean }): Promise<string[]> {
    state.multiple = options?.multiple ?? false
    state.visible = true
    return new Promise((resolve) => {
      state.resolve = resolve
    })
  }

  function onConfirm(urls: string[]) {
    state.resolve?.(urls)
    state.resolve = null
    state.visible = false
  }

  function onCancel() {
    state.resolve?.([])
    state.resolve = null
    state.visible = false
  }

  return { state, open, onConfirm, onCancel }
}
